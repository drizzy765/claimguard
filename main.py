import io
import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field

from core.chassis import AgentChassis
from core.config import settings
from core.llm import get_llm
from core.pipeline import run_audit, run_audit_from_extracted
from core.schemas import ExtractedBill

load_dotenv()

app = FastAPI(
    title="ClaimGuard",
    description="Nigerian HMO/hospital bill claim auditor on Gemma 4 (agent-factory chassis)",
    version="0.1.0",
)

# allow_credentials + allow_origins=["*"] is invalid per CORS; reflect Vercel/local explicitly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://claimguard-red.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=[
        "*",
        "X-Factory-API-Key",
        "X-Client-OpenRouter-Key",
        "X-Client-Cerebras-Key",
    ],
)

API_KEY_NAME = "X-Factory-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

CLAIMGUARD_PROFILES = (
    "extractor",
    "price_checker",
    "medical_logic",
    "fraud_scorer",
)

MAX_UPLOAD_BYTES = 5 * 1024 * 1024


async def verify_api_key(api_key: str = Depends(api_key_header)):
    master_key = os.getenv("FACTORY_MASTER_KEY") or settings.FACTORY_MASTER_KEY
    if not master_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server misconfiguration: FACTORY_MASTER_KEY environment variable is not set.",
        )
    if not api_key or api_key != master_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials. Invalid or missing API key.",
        )


class AgentRoute(BaseModel):
    destination: str = Field(
        description=(
            "The exact profile name to route to. Must be exactly one of: "
            "'extractor', 'price_checker', 'medical_logic', 'fraud_scorer'."
        )
    )
    reasoning: str = Field(description="A brief 1-sentence explanation of why this agent was chosen.")


def _resize_image(data: bytes, max_side: int = 1280) -> tuple[bytes, str]:
    """Resize with Pillow when available; otherwise pass through as JPEG/PNG."""
    mime = "image/jpeg"
    try:
        from PIL import Image

        img = Image.open(io.BytesIO(data))
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        w, h = img.size
        scale = min(1.0, max_side / max(w, h))
        if scale < 1.0:
            img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue(), "image/jpeg"
    except Exception:
        return data, mime


@app.get("/health")
def health_check():
    return {
        "status": "OK",
        "service": "ClaimGuard",
        "model": settings.LLM_MODEL,
        "profiles": list(CLAIMGUARD_PROFILES),
    }


@app.post("/supervisor", dependencies=[Depends(verify_api_key)])
async def factory_supervisor(user_payload: dict, request: Request):
    user_input = user_payload.get("input", "")
    client_openrouter_key = request.headers.get("X-Client-OpenRouter-Key")
    client_cerebras_key = request.headers.get("X-Client-Cerebras-Key")

    llm = get_llm(
        temperature=0,
        client_openrouter_key=client_openrouter_key,
        client_cerebras_key=client_cerebras_key,
    )

    # Offline / mock path: keyword route without structured LLM
    if not settings.LLM_API_KEY and not settings.LLM_FALLBACK_BASE_URL:
        low = (user_input or "").lower()
        if any(k in low for k in ("price", "tariff", "overcharge", "naira")):
            dest, reason = "price_checker", "Keyword route: pricing/tariff."
        elif any(k in low for k in ("diagnosis", "clinical", "medical", "fit")):
            dest, reason = "medical_logic", "Keyword route: clinical consistency."
        elif any(k in low for k in ("fraud", "score", "verdict", "reject")):
            dest, reason = "fraud_scorer", "Keyword route: fraud scoring."
        else:
            dest, reason = "extractor", "Default route: extraction."
        worker = AgentChassis(
            profile_name=dest,
            client_openrouter_key=client_openrouter_key,
            client_cerebras_key=client_cerebras_key,
        )
        try:
            worker_output = worker.run(user_input)
        except Exception as e:
            worker_output = f"Chassis ready ({dest}). Detail: {e}"
        return {
            "status": "Success",
            "supervisor": {"delegated_to": dest, "reasoning": reason},
            "worker_output": worker_output,
        }

    structured_router = llm.with_structured_output(AgentRoute, method="json_mode")
    routing_prompt = f"""You are the ClaimGuard Floor Supervisor.
Assign the request to exactly one specialist profile based on PRIMARY ACTION.

Respond with JSON keys:
- destination: one of {list(CLAIMGUARD_PROFILES)}
- reasoning: one sentence

Floor plan:
- extractor: OCR / read bill or prescription images into structured line items
- price_checker: compare items to sample Nigerian tariffs
- medical_logic: judge clinical fit of items vs diagnosis
- fraud_scorer: explain fraud score / verdict narrative

User Request: {user_input}"""

    try:
        decision = structured_router.invoke(routing_prompt)
        destination = decision.destination
        if destination not in CLAIMGUARD_PROFILES:
            destination = "extractor"
        worker = AgentChassis(
            profile_name=destination,
            client_openrouter_key=client_openrouter_key,
            client_cerebras_key=client_cerebras_key,
        )
        worker_output = worker.run(user_input)
        return {
            "status": "Success",
            "supervisor": {
                "delegated_to": destination,
                "reasoning": decision.reasoning,
            },
            "worker_output": worker_output,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supervisor Routing Failed: {str(e)}")


@app.post("/upload", dependencies=[Depends(verify_api_key)])
async def upload_document(file: UploadFile = File(...)):
    """
    Accept a bill image or text/csv/pdf note for the workspace.
    RAG/Chroma removed — files are acknowledged only (use POST /audit for claim audit).
    """
    filename = file.filename or "upload.bin"
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 5 MB).")
    return {
        "status": "Success",
        "filename": filename,
        "bytes": len(content),
        "message": (
            f"Received {filename}. Vector RAG is disabled in ClaimGuard; "
            "POST the image to /audit for a full claim audit."
        ),
    }


@app.post("/run/{agent_profile}", dependencies=[Depends(verify_api_key)])
async def execute_agent(agent_profile: str, user_payload: dict, request: Request):
    try:
        client_openrouter_key = request.headers.get("X-Client-OpenRouter-Key")
        client_cerebras_key = request.headers.get("X-Client-Cerebras-Key")
        factory_instance = AgentChassis(
            profile_name=agent_profile,
            client_openrouter_key=client_openrouter_key,
            client_cerebras_key=client_cerebras_key,
        )
        persona = factory_instance.profile.get("personality") or {}
        allocated_tools = factory_instance.profile.get("tools") or []
        user_input = user_payload.get("input", "")
        output = factory_instance.run(user_input)
        return {
            "status": "Success",
            "activated_profile": agent_profile,
            "meta": {
                "role": persona.get("role")
                or factory_instance.profile.get("role")
                or "Unknown Role",
                "allocated_tools_count": len(allocated_tools),
            },
            "output": output,
        }
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Profile '{agent_profile}' does not exist on this floor.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def _audit_upload(file: UploadFile) -> dict:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename.")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 5 MB).")

    lower = file.filename.lower()
    # JSON ground-truth path (offline demo / tests without vision LLM)
    if lower.endswith(".json"):
        import json

        data = json.loads(raw.decode("utf-8"))
        extracted = ExtractedBill.model_validate(data)
        report = run_audit_from_extracted(extracted)
        return report.model_dump()

    if not any(lower.endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif")):
        raise HTTPException(
            status_code=400,
            detail="Upload a bill image (.jpg/.png) or a sample .json ground-truth file.",
        )

    # Offline: if matching JSON sidecar exists under data/sample_bills, prefer rules path
    # when no LLM key is configured (weak laptop / CI).
    if not settings.LLM_API_KEY and not settings.LLM_FALLBACK_BASE_URL:
        stem = os.path.splitext(os.path.basename(file.filename))[0]
        sidecar = os.path.join("data", "sample_bills", f"{stem}.json")
        if os.path.isfile(sidecar):
            import json

            with open(sidecar, encoding="utf-8") as f:
                extracted = ExtractedBill.model_validate(json.load(f))
            report = run_audit_from_extracted(extracted)
            return report.model_dump()

    image_bytes, mime = _resize_image(raw)
    report = await run_audit(image_bytes, mime=mime)
    return report.model_dump()


@app.post("/audit", dependencies=[Depends(verify_api_key)])
async def audit_claim(file: UploadFile = File(...)):
    """POST multipart bill image → AuditReport JSON."""
    return await _audit_upload(file)


@app.post("/claimguard/audit", dependencies=[Depends(verify_api_key)])
async def audit_claim_alias(file: UploadFile = File(...)):
    """Alias matching docs/agent.md path."""
    return await _audit_upload(file)


# --- Serve React build (same-origin deploy on Render / Railway / DO) ---
_FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.isdir(_FRONTEND_DIST):
    from fastapi.responses import FileResponse
    from fastapi.staticfiles import StaticFiles

    _assets = os.path.join(_FRONTEND_DIST, "assets")
    if os.path.isdir(_assets):
        app.mount("/assets", StaticFiles(directory=_assets), name="assets")

    @app.get("/")
    async def spa_index():
        return FileResponse(os.path.join(_FRONTEND_DIST, "index.html"))

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        # Do not shadow API routes (already registered above)
        candidate = os.path.join(_FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(_FRONTEND_DIST, "index.html"))


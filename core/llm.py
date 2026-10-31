"""Provider-agnostic OpenAI-compatible LLM factory for ClaimGuard / Gemma 4."""

from __future__ import annotations

import base64
import json
import re
from typing import Any, List, Optional, Type, TypeVar

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel

from core.config import settings

T = TypeVar("T", bound=BaseModel)


def _groq_llm(temperature: float = 0.0):
    """Build Groq client from env (ChatGroq if available, else OpenAI-compat URL)."""
    if not settings.GROQ_API_KEY or not settings.GROQ_MODEL:
        return None
    try:
        from langchain_groq import ChatGroq

        return ChatGroq(
            model=settings.GROQ_MODEL,
            temperature=temperature,
            api_key=settings.GROQ_API_KEY,
            max_retries=0,
        )
    except Exception:
        return ChatOpenAI(
            model=settings.GROQ_MODEL,
            base_url=settings.GROQ_BASE_URL,
            api_key=settings.GROQ_API_KEY,
            temperature=temperature,
            max_retries=0,
        )


def get_llm(
    model: Optional[str] = None,
    temperature: float = 0.0,
    *,
    client_openrouter_key: Optional[str] = None,
    client_cerebras_key: Optional[str] = None,
):
    """
    Return an LLM client with automatic failover:

      1. Primary: LLM_BASE_URL / LLM_API_KEY / LLM_MODEL (Gemini Gemma 4)
      2. Optional: LLM_FALLBACK_* (self-hosted Ollama/vLLM)
      3. Groq: GROQ_API_KEY + GROQ_MODEL (credit / outage fallback)
      4. Optional Cerebras / OpenRouter if configured
    """
    # Profile may set model: null/empty — treat as "use env LLM_MODEL"
    model_name = (model or "").strip() or settings.LLM_MODEL
    primary_key = (settings.LLM_API_KEY or "").strip()
    primary_base = (settings.LLM_BASE_URL or "").rstrip("/") + "/"
    fallbacks: List[Any] = []

    # --- 1. Primary: Gemini API Gemma (OpenAI-compatible) — only if key set ---
    if primary_key:
        primary = ChatOpenAI(
            model=model_name,
            base_url=primary_base
            or "https://generativelanguage.googleapis.com/v1beta/openai/",
            api_key=primary_key,
            temperature=temperature,
            max_retries=1,
            timeout=60,
        )
    else:
        primary = None

    # --- Self-hosted Ollama / vLLM ---
    if settings.LLM_FALLBACK_BASE_URL:
        fallbacks.append(
            ChatOpenAI(
                model=settings.LLM_FALLBACK_MODEL,
                base_url=settings.LLM_FALLBACK_BASE_URL,
                api_key=settings.LLM_FALLBACK_API_KEY or "ollama",
                temperature=temperature,
                max_retries=0,
                timeout=60,
            )
        )

    # --- Groq credit / fail fallback (always after Gemini when key is set) ---
    groq = _groq_llm(temperature)
    if groq is not None:
        fallbacks.append(groq)

    # --- Optional extras ---
    cerebras_key = client_cerebras_key or settings.CEREBRAS_API_KEY
    if cerebras_key and settings.CEREBRAS_MODEL:
        fallbacks.append(
            ChatOpenAI(
                model=settings.CEREBRAS_MODEL,
                base_url="https://api.cerebras.ai/v1",
                api_key=cerebras_key,
                temperature=temperature,
                max_retries=0,
            )
        )
    openrouter_key = client_openrouter_key or settings.OPENROUTER_API_KEY
    if openrouter_key and settings.OPENROUTER_MODEL:
        fallbacks.append(
            ChatOpenAI(
                model=settings.OPENROUTER_MODEL,
                base_url="https://openrouter.ai/api/v1",
                api_key=openrouter_key,
                temperature=temperature,
                max_retries=0,
            )
        )

    if primary is not None:
        return primary.with_fallbacks(fallbacks) if fallbacks else primary

    # No Gemini key — promote Groq (or first fallback) to primary
    if groq is not None:
        rest = [f for f in fallbacks if f is not groq]
        return groq.with_fallbacks(rest) if rest else groq
    if fallbacks:
        return fallbacks[0].with_fallbacks(fallbacks[1:]) if len(fallbacks) > 1 else fallbacks[0]

    return _MockLLM()


class _MockLLM:
    """Minimal stand-in so /health and mocked tests work without API keys."""

    def invoke(self, messages, **kwargs):
        class _R:
            content = "{}"

        return _R()

    def with_fallbacks(self, _fallbacks):
        return self

    def with_structured_output(self, schema, **kwargs):
        return self


def _extract_json(text: str) -> Any:
    text = (text or "").strip()
    if not text:
        raise ValueError("Empty LLM response")
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start_obj, start_arr = text.find("{"), text.find("[")
        if start_obj == -1 and start_arr == -1:
            raise
        if start_obj == -1 or (start_arr != -1 and start_arr < start_obj):
            start, end_char = start_arr, "]"
        else:
            start, end_char = start_obj, "}"
        end = text.rfind(end_char)
        return json.loads(text[start : end + 1])


def parse_json_response(text: str, schema: Type[T], repair_once: bool = True) -> T:
    """Parse LLM text into a pydantic model; one repair attempt on failure."""
    try:
        data = _extract_json(text)
        return schema.model_validate(data)
    except Exception as first_err:
        if not repair_once:
            raise first_err
        raise ValueError(f"JSON parse failed: {first_err}") from first_err


def vision_json(
    prompt: str,
    image_b64: str,
    schema: Type[T],
    *,
    system: str = "",
    model: Optional[str] = None,
    mime: str = "image/jpeg",
) -> T:
    """
    Send a vision prompt + base64 image; expect JSON matching schema.
    Retries once with a repair prompt if parsing fails.
    On Gemini credit/outage, get_llm() falls through to Groq (text models may
    ignore the image — prefer JSON sample bills if vision fallback is weak).
    """
    # Accept raw base64 or a full data-URL; always emit a clean data URL.
    b64 = (image_b64 or "").strip()
    if b64.startswith("data:"):
        # data:image/jpeg;base64,AAAA...
        comma = b64.find(",")
        if comma != -1:
            header, b64 = b64[:comma], b64[comma + 1 :]
            if ";base64" in header and header.startswith("data:"):
                mime = header[5:].split(";")[0] or mime
    mime = (mime or "image/jpeg").split(";")[0].strip() or "image/jpeg"
    if not b64:
        raise ValueError("Empty image base64 for vision extract")

    llm = get_llm(model=model, temperature=0.0)
    data_url = f"data:{mime};base64,{b64}"
    content = [
        {"type": "text", "text": prompt},
        {
            "type": "image_url",
            "image_url": {"url": data_url},
        },
    ]
    messages = []
    if system:
        messages.append(SystemMessage(content=system))
    messages.append(HumanMessage(content=content))

    try:
        response = llm.invoke(messages)
    except Exception as e:
        raise RuntimeError(f"Vision LLM invoke failed (model={model or settings.LLM_MODEL}): {e}") from e

    raw = getattr(response, "content", None) or str(response)
    # Some providers return a list of content parts
    if isinstance(raw, list):
        parts = []
        for p in raw:
            if isinstance(p, dict) and p.get("type") == "text":
                parts.append(p.get("text") or "")
            else:
                parts.append(str(p))
        raw = "\n".join(parts)

    try:
        return parse_json_response(raw, schema, repair_once=False)
    except Exception:
        repair = [
            SystemMessage(
                content="Return ONLY valid JSON matching the required schema. No markdown."
            ),
            HumanMessage(
                content=f"Fix this into valid JSON only:\n{raw}\n\nSchema hint: {schema.model_json_schema()}"
            ),
        ]
        repaired = llm.invoke(repair)
        repaired_raw = getattr(repaired, "content", None) or str(repaired)
        if isinstance(repaired_raw, list):
            repaired_raw = "\n".join(
                (p.get("text") if isinstance(p, dict) else str(p)) for p in repaired_raw
            )
        return parse_json_response(repaired_raw, schema, repair_once=False)


def text_json(
    prompt: str,
    schema: Type[T],
    *,
    system: str = "",
    model: Optional[str] = None,
) -> T:
    """Text-only JSON call with one repair retry (Gemini → Groq on failure)."""
    llm = get_llm(model=model, temperature=0.0)
    messages = []
    if system:
        messages.append(SystemMessage(content=system))
    messages.append(HumanMessage(content=prompt))
    response = llm.invoke(messages)
    raw = getattr(response, "content", None) or str(response)
    try:
        return parse_json_response(raw, schema, repair_once=False)
    except Exception:
        repair = [
            SystemMessage(content="Return ONLY valid JSON. No markdown."),
            HumanMessage(
                content=f"Fix into valid JSON only:\n{raw}\n\nSchema: {schema.model_json_schema()}"
            ),
        ]
        repaired = llm.invoke(repair)
        repaired_raw = getattr(repaired, "content", None) or str(repaired)
        return parse_json_response(repaired_raw, schema, repair_once=False)


def encode_image_bytes(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")

"""ClaimGuard multi-agent audit pipeline: extract → price‖medical → fraud score."""

from __future__ import annotations

import asyncio
import time
from typing import Optional

from pydantic import BaseModel, Field

from core.config import settings
from core.llm import encode_image_bytes, text_json, vision_json
from core.schemas import (
    AuditReport,
    ExtractedBill,
    FraudResult,
    MedicalResult,
    PricingResult,
)
from core.scoring import compute_fraud_score, fallback_summary
from tools.tariff_lookup import match_item, price_check_lines
from tools.pii_regex_masker import pii_regex_masker


EXTRACTOR_PROMPT = (
    "You read Nigerian hospital bills and prescriptions. Extract every line exactly as written. "
    "Return ONLY JSON matching the schema. Use null if unreadable. Do not invent items. "
    "Amounts in NGN as numbers. Schema keys: hospital, date (YYYY-MM-DD), diagnosis, "
    "items[{line,description,qty,unit_price,amount}], stated_total, confidence (0-1)."
)

MEDICAL_SYSTEM = (
    "You are a clinical claims reviewer for Nigerian HMO bills. "
    "Be conservative; say 'questionable' when unsure. Not medical advice. Return ONLY JSON."
)


class _Suggest(BaseModel):
    suggestion: str = Field(description="Closest generic tariff item name or 'none'")


class _Sum(BaseModel):
    summary: str


async def _run_extractor(image_b64: str, mime: str, model: Optional[str]) -> ExtractedBill:
    def _call():
        bill = vision_json(
            EXTRACTOR_PROMPT,
            image_b64,
            ExtractedBill,
            system="Return ONLY JSON. No markdown.",
            model=model,
            mime=mime or "image/jpeg",
        )
        if not bill.items:
            raise ValueError("Vision returned no line items")
        if bill.hospital:
            bill.hospital = pii_regex_masker.invoke(bill.hospital)
        if bill.diagnosis:
            bill.diagnosis = pii_regex_masker.invoke(bill.diagnosis)
        return bill

    # Hard cap so Render free tier does not hang until gateway 502/500.
    return await asyncio.wait_for(asyncio.to_thread(_call), timeout=75)


async def _run_price_check(extracted: ExtractedBill) -> PricingResult:
    def _call():
        items = [it.model_dump() for it in extracted.items]
        lines = price_check_lines(items)
        if settings.LLM_API_KEY:
            for u in [l for l in lines if l["flag"] == "unknown"][:5]:
                desc = next(
                    (i.description for i in extracted.items if i.line == u["line"]),
                    "",
                )
                if not desc:
                    continue
                try:
                    sug = text_json(
                        f"Suggest the closest generic item name for this hospital line "
                        f"or 'none'. Line: {desc}",
                        _Suggest,
                        system='Return ONLY JSON {"suggestion": "..."}',
                    )
                    if sug.suggestion and sug.suggestion.lower() != "none":
                        rematch = match_item(sug.suggestion)
                        if rematch:
                            ref = float(rematch["ref_price_ngn"])
                            charged = float(u["charged_unit"])
                            over = ((charged - ref) / ref * 100.0) if ref else 0.0
                            u["matched_item"] = rematch.get("matched_item")
                            u["ref_price"] = ref
                            u["overcharge_pct"] = round(over, 2)
                            u["flag"] = "overpriced" if over > 30 else "ok"
                except Exception:
                    continue
        return PricingResult(lines=lines)

    return await asyncio.to_thread(_call)


def _heuristic_medical(extracted: ExtractedBill) -> MedicalResult:
    """Lightweight keyword heuristic when LLM unavailable."""
    dx = (extracted.diagnosis or "").lower()
    lines = []
    for it in extracted.items:
        desc = (it.description or "").lower()
        fit = "ok"
        reason = "Appears consistent with common outpatient care."
        if any(k in dx for k in ("malaria", "fever", "typhoid")):
            if any(
                k in desc
                for k in ("dental", "cataract", "fracture", "cesarean", "c-section")
            ):
                fit = "unrelated"
                reason = "Procedure unrelated to stated infectious diagnosis."
        if "malaria" in dx and any(
            k in desc for k in ("chemotherapy", "dialysis", "mri brain")
        ):
            fit = "unrelated"
            reason = "High-cost specialty item not indicated for malaria."
        lines.append({"line": it.line, "fit": fit, "reason": reason})
    return MedicalResult(lines=lines, diagnosis_supported=True)


async def _run_medical(extracted: ExtractedBill, model: Optional[str]) -> MedicalResult:
    def _call():
        payload = {
            "diagnosis": extracted.diagnosis,
            "items": [it.model_dump() for it in extracted.items],
        }
        prompt = (
            "Given the diagnosis and items, judge whether each item is clinically consistent. "
            'Return JSON: {"lines":[{"line":1,"fit":"ok|questionable|unrelated",'
            '"reason":"str"}], "diagnosis_supported": true|false}\n\n'
            f"Data: {payload}"
        )
        if not settings.LLM_API_KEY and not settings.LLM_FALLBACK_BASE_URL:
            return _heuristic_medical(extracted)
        try:
            return text_json(prompt, MedicalResult, system=MEDICAL_SYSTEM, model=model)
        except Exception:
            return _heuristic_medical(extracted)

    return await asyncio.to_thread(_call)


async def _run_fraud_summary(
    fraud: FraudResult,
    model: Optional[str],
) -> FraudResult:
    def _call():
        if not fraud.flags:
            fraud.summary = fallback_summary(fraud)
            return fraud
        if not settings.LLM_API_KEY and not settings.LLM_FALLBACK_BASE_URL:
            fraud.summary = fallback_summary(fraud)
            return fraud
        try:
            prompt = (
                "Write a 3-sentence claims-audit summary from these rule hits only. "
                "Do not invent new flags. Mention score, verdict, and savings in NGN.\n"
                f"score={fraud.score} verdict={fraud.verdict} "
                f"savings={fraud.potential_savings_ngn} "
                f"flags={[f.model_dump() for f in fraud.flags]}"
            )
            out = text_json(
                prompt,
                _Sum,
                system='Return ONLY JSON {"summary": "..."}. Not medical advice.',
                model=model,
            )
            fraud.summary = out.summary
        except Exception:
            fraud.summary = fallback_summary(fraud)
        return fraud

    return await asyncio.to_thread(_call)


async def run_audit(
    image_bytes: bytes,
    *,
    mime: str = "image/jpeg",
    model: Optional[str] = None,
) -> AuditReport:
    """Full ClaimGuard audit: vision extract → parallel price/medical → fraud rules + summary."""
    t0 = time.perf_counter()
    steps = []
    model_name = model or settings.LLM_MODEL
    image_b64 = encode_image_bytes(image_bytes)

    steps.append("extractor")
    extracted = await _run_extractor(image_b64, mime, model_name)

    steps.append("price_checker")
    steps.append("medical_logic")
    pricing, medical = await asyncio.gather(
        _run_price_check(extracted),
        _run_medical(extracted, model_name),
    )

    steps.append("fraud_scorer")
    fraud = compute_fraud_score(extracted, pricing, medical)
    fraud = await _run_fraud_summary(fraud, model_name)

    latency_ms = int((time.perf_counter() - t0) * 1000)
    return AuditReport(
        extracted=extracted,
        pricing=pricing,
        medical=medical,
        fraud=fraud,
        model=model_name,
        latency_ms=latency_ms,
        steps=steps,
    )


def run_audit_from_extracted(
    extracted: ExtractedBill,
    *,
    model: Optional[str] = None,
) -> AuditReport:
    """Deterministic path for tests: skip vision, run price/medical heuristics + scoring."""
    t0 = time.perf_counter()
    items = [it.model_dump() for it in extracted.items]
    pricing = PricingResult(lines=price_check_lines(items))
    medical = _heuristic_medical(extracted)
    fraud = compute_fraud_score(extracted, pricing, medical)
    fraud.summary = fallback_summary(fraud)
    return AuditReport(
        extracted=extracted,
        pricing=pricing,
        medical=medical,
        fraud=fraud,
        model=model or settings.LLM_MODEL or "rules-only",
        latency_ms=int((time.perf_counter() - t0) * 1000),
        steps=["price_checker", "medical_logic", "fraud_scorer"],
    )

"""Deterministic fraud score and verdict rules (no LLM)."""

from __future__ import annotations

from typing import List

from core.schemas import (
    ExtractedBill,
    FraudFlag,
    FraudResult,
    MedicalResult,
    PricingResult,
)


def compute_fraud_score(
    extracted: ExtractedBill,
    pricing: PricingResult,
    medical: MedicalResult,
) -> FraudResult:
    """
    Python rules → points (clamped 0–100):
      - overpriced >30%: +15 each (max 45)
      - unrelated: +20 each
      - duplicate line description: +15
      - arithmetic mismatch sum≠stated_total >2%: +20
      - extraction confidence <0.6: forces REVIEW (min score 30)
    Verdict: APPROVE (<30) / REVIEW (30–69) / REJECT (≥70)
    """
    flags: List[FraudFlag] = []
    score = 0
    savings = 0.0

    # Overpriced (cap 45)
    over_pts = 0
    for pl in pricing.lines:
        if pl.flag == "overpriced" and pl.overcharge_pct > 30:
            add = min(15, 45 - over_pts)
            if add <= 0:
                break
            over_pts += add
            qty = 1.0
            for it in extracted.items:
                if it.line == pl.line:
                    qty = it.qty or 1
                    break
            savings += max(0.0, (pl.charged_unit - pl.ref_price)) * qty
            flags.append(
                FraudFlag(
                    line=pl.line,
                    type="overpriced",
                    detail=(
                        f"Charged NGN {pl.charged_unit:.0f} vs ref NGN {pl.ref_price:.0f} "
                        f"({pl.overcharge_pct:.0f}% over)"
                    ),
                )
            )
    score += over_pts

    # Unrelated medical items
    for ml in medical.lines:
        if ml.fit == "unrelated":
            score += 20
            flags.append(
                FraudFlag(
                    line=ml.line,
                    type="unrelated",
                    detail=ml.reason or "Item unrelated to diagnosis",
                )
            )

    # Duplicate descriptions (case-insensitive)
    seen = {}
    for it in extracted.items:
        key = (it.description or "").strip().lower()
        if not key:
            continue
        if key in seen:
            score += 15
            flags.append(
                FraudFlag(
                    line=it.line,
                    type="duplicate",
                    detail=f"Duplicate of line {seen[key]}: {it.description}",
                )
            )
        else:
            seen[key] = it.line

    # Arithmetic mismatch
    items_sum = sum(float(it.amount or 0) for it in extracted.items)
    stated = float(extracted.stated_total or 0)
    if stated > 0:
        diff_pct = abs(items_sum - stated) / stated * 100
        if diff_pct > 2:
            score += 20
            flags.append(
                FraudFlag(
                    line=None,
                    type="math",
                    detail=(
                        f"Line items sum NGN {items_sum:.0f} != stated total NGN {stated:.0f} "
                        f"({diff_pct:.1f}% off)"
                    ),
                )
            )

    force_review = False
    if extracted.confidence < 0.6:
        force_review = True
        flags.append(
            FraudFlag(
                line=None,
                type="low_confidence",
                detail=f"Extraction confidence {extracted.confidence:.2f} < 0.6",
            )
        )

    score = int(max(0, min(100, score)))
    verdict = _verdict(score)
    if force_review and verdict == "APPROVE":
        score = max(score, 30)
        verdict = "REVIEW"

    return FraudResult(
        score=score,
        verdict=verdict,
        flags=flags,
        summary="",
        potential_savings_ngn=round(savings, 2),
    )


def _verdict(score: int) -> str:
    if score < 30:
        return "APPROVE"
    if score < 70:
        return "REVIEW"
    return "REJECT"


def fallback_summary(fraud: FraudResult) -> str:
    """Rule-based summary when LLM is unavailable."""
    if not fraud.flags:
        return (
            f"No material fraud signals. Score {fraud.score}/100 -> {fraud.verdict}. "
            "Claim appears consistent with sample tariff ranges."
        )
    types = sorted({f.type for f in fraud.flags})
    return (
        f"Score {fraud.score}/100 -> {fraud.verdict}. "
        f"Flags: {', '.join(types)} ({len(fraud.flags)} total). "
        f"Potential savings ~ NGN {fraud.potential_savings_ngn:,.0f}."
    )

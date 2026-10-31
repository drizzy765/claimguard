"""Pydantic schemas for ClaimGuard audit pipeline I/O."""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class BillLineItem(BaseModel):
    line: int = 1
    description: str = ""
    qty: float = 1
    unit_price: float = 0
    amount: float = 0


class ExtractedBill(BaseModel):
    hospital: Optional[str] = None
    date: Optional[str] = None
    diagnosis: Optional[str] = None
    items: List[BillLineItem] = Field(default_factory=list)
    stated_total: float = 0
    confidence: float = 0.0


class PricingLine(BaseModel):
    line: int = 1
    matched_item: Optional[str] = None
    ref_price: float = 0
    charged_unit: float = 0
    overcharge_pct: float = 0.0
    flag: Literal["ok", "overpriced", "unknown"] = "unknown"


class PricingResult(BaseModel):
    lines: List[PricingLine] = Field(default_factory=list)


class MedicalLine(BaseModel):
    line: int = 1
    fit: Literal["ok", "questionable", "unrelated"] = "questionable"
    reason: str = ""


class MedicalResult(BaseModel):
    lines: List[MedicalLine] = Field(default_factory=list)
    diagnosis_supported: bool = True


class FraudFlag(BaseModel):
    line: Optional[int] = None
    type: Literal["overpriced", "unrelated", "duplicate", "math", "low_confidence"] = "math"
    detail: str = ""


class FraudResult(BaseModel):
    score: int = 0
    verdict: Literal["APPROVE", "REVIEW", "REJECT"] = "REVIEW"
    flags: List[FraudFlag] = Field(default_factory=list)
    summary: str = ""
    potential_savings_ngn: float = 0


class AuditReport(BaseModel):
    extracted: ExtractedBill
    pricing: PricingResult
    medical: MedicalResult
    fraud: FraudResult
    model: str = ""
    latency_ms: int = 0
    steps: List[str] = Field(default_factory=list)

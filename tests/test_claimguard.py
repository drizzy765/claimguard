"""ClaimGuard unit/API tests — scoring is deterministic; LLM is mocked."""

from __future__ import annotations

import json
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure master key before importing app
os.environ.setdefault("FACTORY_MASTER_KEY", "test_master_key_claimguard")
os.environ["LLM_API_KEY"] = ""  # force offline / rules path
os.environ["LLM_FALLBACK_BASE_URL"] = ""

from core.schemas import BillLineItem, ExtractedBill  # noqa: E402
from core.scoring import compute_fraud_score  # noqa: E402
from core.pipeline import run_audit_from_extracted  # noqa: E402
from tools.tariff_lookup import match_item, price_check_lines  # noqa: E402
from main import app  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
SAMPLES = ROOT / "data" / "sample_bills"
HEADERS = {"X-Factory-API-Key": "test_master_key_claimguard"}


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "OK"
    assert body["service"] == "ClaimGuard"


def test_tariff_lookup_paracetamol():
    hit = match_item("Paracetamol 500mg tabs")
    assert hit is not None
    assert hit["ref_price_ngn"] == 50
    assert hit["match_score"] >= 80


def test_price_check_overpriced():
    lines = price_check_lines(
        [{"line": 1, "description": "Paracetamol 500mg", "qty": 10, "unit_price": 300, "amount": 3000}]
    )
    assert lines[0]["flag"] == "overpriced"
    assert lines[0]["overcharge_pct"] > 30


def test_scoring_padded_rejects():
    extracted = ExtractedBill(
        hospital="Sunrise",
        diagnosis="Malaria (uncomplicated)",
        items=[
            BillLineItem(line=1, description="Consultation GP", qty=1, unit_price=10000, amount=10000),
            BillLineItem(line=2, description="Malaria RDT", qty=1, unit_price=6000, amount=6000),
            BillLineItem(line=3, description="Paracetamol 500mg", qty=10, unit_price=300, amount=3000),
            BillLineItem(line=4, description="Injection Diclofenac", qty=2, unit_price=500, amount=1000),
            BillLineItem(line=5, description="Injection Diclofenac", qty=2, unit_price=500, amount=1000),
            BillLineItem(line=6, description="Artemether-Lumefantrine", qty=1, unit_price=2500, amount=2500),
        ],
        stated_total=28000,
        confidence=0.95,
    )
    report = run_audit_from_extracted(extracted)
    assert report.fraud.verdict == "REJECT"
    assert report.fraud.score >= 70
    types = {f.type for f in report.fraud.flags}
    assert "overpriced" in types
    assert "duplicate" in types
    assert "math" in types


def test_scoring_clean_approves():
    extracted = ExtractedBill(
        hospital="Lagos Community Clinic",
        diagnosis="Malaria (uncomplicated)",
        items=[
            BillLineItem(line=1, description="Consultation GP", qty=1, unit_price=3000, amount=3000),
            BillLineItem(line=2, description="Malaria RDT", qty=1, unit_price=1500, amount=1500),
            BillLineItem(line=3, description="Artemether-Lumefantrine", qty=1, unit_price=2500, amount=2500),
            BillLineItem(line=4, description="Paracetamol 500mg", qty=10, unit_price=50, amount=500),
        ],
        stated_total=7500,
        confidence=0.95,
    )
    report = run_audit_from_extracted(extracted)
    assert report.fraud.verdict == "APPROVE"
    assert report.fraud.score < 30


def test_scoring_unrelated_flags():
    extracted = ExtractedBill(
        diagnosis="Malaria (uncomplicated)",
        items=[
            BillLineItem(line=1, description="Consultation GP", qty=1, unit_price=3000, amount=3000),
            BillLineItem(line=2, description="Dental scaling", qty=1, unit_price=15000, amount=15000),
            BillLineItem(line=3, description="MRI Brain", qty=1, unit_price=120000, amount=120000),
        ],
        stated_total=138000,
        confidence=0.9,
    )
    report = run_audit_from_extracted(extracted)
    assert report.fraud.verdict in ("REVIEW", "REJECT")
    assert any(f.type == "unrelated" for f in report.fraud.flags)


def test_audit_json_sample(client):
    path = SAMPLES / "bill_padded.json"
    if not path.exists():
        pytest.skip("sample bills not generated yet")
    with open(path, "rb") as f:
        r = client.post(
            "/audit",
            headers=HEADERS,
            files={"file": ("bill_padded.json", f, "application/json")},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["fraud"]["verdict"] == "REJECT"
    assert len(body["fraud"]["flags"]) >= 2


def test_audit_requires_api_key(client):
    path = SAMPLES / "bill_clean.json"
    if not path.exists():
        pytest.skip("sample bills not generated yet")
    with open(path, "rb") as f:
        r = client.post("/audit", files={"file": ("bill_clean.json", f, "application/json")})
    assert r.status_code == 401

"""Lookup drug/procedure price ranges against illustrative Nigerian sample tariffs."""

from __future__ import annotations

import csv
import os
from functools import lru_cache
from typing import Any, Dict, List, Optional

try:
    from rapidfuzz import fuzz, process
except ImportError:  # pragma: no cover - fallback for weak installs
    fuzz = None
    process = None

from langchain_core.tools import tool

DEFAULT_CSV = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "tariffs_sample.csv"
)
MATCH_THRESHOLD = 80


@lru_cache(maxsize=1)
def _load_tariffs(path: str = DEFAULT_CSV) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    if not os.path.isfile(path):
        return rows
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                price = float(row.get("ref_price_ngn") or row.get("ref_price") or 0)
            except ValueError:
                price = 0.0
            name = (row.get("item") or "").strip()
            if not name:
                continue
            rows.append(
                {
                    "item": name,
                    "category": (row.get("category") or "").strip(),
                    "unit": (row.get("unit") or "").strip(),
                    "ref_price_ngn": price,
                }
            )
    return rows


def match_item(description: str, threshold: int = MATCH_THRESHOLD) -> Optional[Dict[str, Any]]:
    """Fuzzy-match a bill line description to a tariff row (score ≥ threshold)."""
    tariffs = _load_tariffs()
    if not description or not tariffs:
        return None
    names = [t["item"] for t in tariffs]
    if process and fuzz:
        hit = process.extractOne(
            description, names, scorer=fuzz.token_set_ratio, score_cutoff=threshold
        )
        if not hit:
            return None
        matched_name, score, idx = hit[0], hit[1], hit[2]
        row = dict(tariffs[idx])
        row["match_score"] = float(score)
        row["matched_item"] = matched_name
        return row

    # difflib fallback
    import difflib

    matches = difflib.get_close_matches(description, names, n=1, cutoff=threshold / 100.0)
    if not matches:
        # also try casefold contains
        desc_l = description.lower()
        for t in tariffs:
            if t["item"].lower() in desc_l or desc_l in t["item"].lower():
                row = dict(t)
                row["match_score"] = 85.0
                row["matched_item"] = t["item"]
                return row
        return None
    name = matches[0]
    row = dict(next(t for t in tariffs if t["item"] == name))
    row["match_score"] = 90.0
    row["matched_item"] = name
    return row


def price_check_lines(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Deterministic price check for extracted bill lines.
    items: [{line, description, qty, unit_price, amount}, ...]
    """
    results = []
    for it in items:
        desc = it.get("description") or ""
        charged = float(it.get("unit_price") or 0)
        if charged <= 0 and it.get("qty"):
            try:
                charged = float(it.get("amount") or 0) / float(it["qty"])
            except (ZeroDivisionError, ValueError, TypeError):
                charged = float(it.get("amount") or 0)
        match = match_item(desc)
        if not match:
            results.append(
                {
                    "line": it.get("line", 0),
                    "matched_item": None,
                    "ref_price": 0,
                    "charged_unit": charged,
                    "overcharge_pct": 0.0,
                    "flag": "unknown",
                }
            )
            continue
        ref = float(match["ref_price_ngn"])
        over_pct = ((charged - ref) / ref * 100.0) if ref > 0 else 0.0
        flag = "overpriced" if over_pct > 30 else "ok"
        results.append(
            {
                "line": it.get("line", 0),
                "matched_item": match.get("matched_item"),
                "ref_price": ref,
                "charged_unit": charged,
                "overcharge_pct": round(over_pct, 2),
                "flag": flag,
            }
        )
    return results


@tool
def tariff_lookup(query: str) -> str:
    """
    Look up illustrative Nigerian sample tariff price for a drug or procedure name.
    Returns matched item, category, unit, and reference price in NGN (SAMPLE data, not official NHIA).
    """
    hit = match_item(query)
    if not hit:
        return f"No tariff match for '{query}' (threshold {MATCH_THRESHOLD})."
    return (
        f"matched_item={hit['matched_item']}; category={hit.get('category')}; "
        f"unit={hit.get('unit')}; ref_price_ngn={hit['ref_price_ngn']}; "
        f"match_score={hit.get('match_score')}; NOTE=SAMPLE illustrative prices, not official NHIA"
    )

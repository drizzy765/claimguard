"""Generate synthetic Nigerian hospital bill images (PIL) for ClaimGuard demos."""

from __future__ import annotations

import json
import os
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Pillow required: pip install Pillow")
    sys.exit(1)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "sample_bills")
os.makedirs(OUT, exist_ok=True)


BILLS = {
    "bill_clean": {
        "title": "LAGOS COMMUNITY CLINIC — OUTPATIENT BILL (SYNTHETIC)",
        "hospital": "Lagos Community Clinic",
        "date": "2026-03-12",
        "diagnosis": "Malaria (uncomplicated)",
        "patient": "Patient A (synthetic)",
        "items": [
            ("Consultation GP", 1, 3000, 3000),
            ("Malaria RDT", 1, 1500, 1500),
            ("Artemether-Lumefantrine", 1, 2500, 2500),
            ("Paracetamol 500mg", 10, 50, 500),
        ],
        "stated_total": 7500,
        "note": "HONEST sample — prices near illustrative tariff",
    },
    "bill_honest_typhoid": {
        "title": "ABUJA FAMILY HOSPITAL — BILL (SYNTHETIC)",
        "hospital": "Abuja Family Hospital",
        "date": "2026-04-02",
        "diagnosis": "Typhoid fever (suspected)",
        "patient": "Patient B (synthetic)",
        "items": [
            ("Consultation GP", 1, 3000, 3000),
            ("Widal test", 1, 2000, 2000),
            ("FBC", 1, 3500, 3500),
            ("Ciprofloxacin 500mg", 14, 200, 2800),
            ("ORS sachet", 5, 100, 500),
        ],
        "stated_total": 11800,
        "note": "HONEST sample — consistent diagnosis + pricing",
    },
    "bill_padded": {
        "title": "SUNRISE MEDICAL CENTRE — BILL (SYNTHETIC / PADDED)",
        "hospital": "Sunrise Medical Centre",
        "date": "2026-05-18",
        "diagnosis": "Malaria (uncomplicated)",
        "patient": "Patient C (synthetic)",
        "items": [
            ("Consultation GP", 1, 10000, 10000),  # ~3x tariff
            ("Malaria RDT", 1, 6000, 6000),  # 4x tariff
            ("Paracetamol 500mg", 10, 300, 3000),  # 6x tariff
            ("Injection Diclofenac", 2, 500, 1000),
            ("Injection Diclofenac", 2, 500, 1000),  # duplicate
            ("Artemether-Lumefantrine", 1, 2500, 2500),
        ],
        "stated_total": 28000,  # math mismatch vs sum 23500
        "note": "PADDED sample — multi overcharges, duplicate injection, bad total",
    },
    "bill_unrelated": {
        "title": "GREENFIELD HOSPITAL — BILL (SYNTHETIC / SUSPECT)",
        "hospital": "Greenfield Hospital",
        "date": "2026-06-01",
        "diagnosis": "Malaria (uncomplicated)",
        "patient": "Patient D (synthetic)",
        "items": [
            ("Consultation GP", 1, 3000, 3000),
            ("Malaria RDT", 1, 1500, 1500),
            ("Dental scaling", 1, 15000, 15000),  # unrelated
            ("MRI Brain", 1, 120000, 120000),  # unrelated / absurd
            ("Artemether-Lumefantrine", 1, 2500, 2500),
        ],
        "stated_total": 142000,
        "note": "FAKE/padded sample — unrelated dental + MRI on malaria claim",
    },
}


def _font(size: int):
    for name in (
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibri.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ):
        if os.path.isfile(name):
            return ImageFont.truetype(name, size)
    return ImageFont.load_default()


def render_bill(key: str, data: dict) -> None:
    w, h = 900, 1100
    img = Image.new("RGB", (w, h), (252, 250, 245))
    draw = ImageDraw.Draw(img)
    title_f = _font(22)
    body_f = _font(16)
    small_f = _font(13)

    y = 40
    draw.text((40, y), data["title"], fill=(20, 40, 60), font=title_f)
    y += 40
    draw.text((40, y), "SYNTHETIC DEMO DATA — NOT A REAL PATIENT BILL", fill=(160, 40, 40), font=small_f)
    y += 30
    draw.line((40, y, w - 40, y), fill=(180, 180, 180), width=1)
    y += 20

    for label, val in (
        ("Hospital", data["hospital"]),
        ("Date", data["date"]),
        ("Patient", data["patient"]),
        ("Diagnosis", data["diagnosis"]),
    ):
        draw.text((40, y), f"{label}: {val}", fill=(30, 30, 30), font=body_f)
        y += 28

    y += 10
    draw.text((40, y), f"{'#':<4} {'Description':<32} {'Qty':>5} {'Unit':>10} {'Amount':>12}", fill=(0, 0, 0), font=small_f)
    y += 24
    draw.line((40, y, w - 40, y), fill=(200, 200, 200), width=1)
    y += 12

    for i, (desc, qty, unit, amt) in enumerate(data["items"], start=1):
        line = f"{i:<4} {desc:<32} {qty:>5} {unit:>10,.0f} {amt:>12,.0f}"
        draw.text((40, y), line, fill=(25, 25, 25), font=small_f)
        y += 26

    y += 16
    draw.line((40, y, w - 40, y), fill=(120, 120, 120), width=2)
    y += 16
    draw.text((40, y), f"STATED TOTAL (NGN): {data['stated_total']:,.0f}", fill=(0, 60, 40), font=title_f)
    y += 40
    draw.text((40, y), data["note"], fill=(90, 90, 90), font=small_f)
    y += 28
    draw.text((40, y), "SAMPLE PRICES — illustrative only, not official NHIA tariff.", fill=(120, 80, 40), font=small_f)

    path = os.path.join(OUT, f"{key}.jpg")
    img.save(path, "JPEG", quality=92)
    print("wrote", path)

    # Also dump JSON ground truth for offline / mocked tests
    items = [
        {
            "line": i,
            "description": d,
            "qty": q,
            "unit_price": u,
            "amount": a,
        }
        for i, (d, q, u, a) in enumerate(data["items"], start=1)
    ]
    meta = {
        "hospital": data["hospital"],
        "date": data["date"],
        "diagnosis": data["diagnosis"],
        "items": items,
        "stated_total": data["stated_total"],
        "confidence": 0.95,
        "note": data["note"],
    }
    jpath = os.path.join(OUT, f"{key}.json")
    with open(jpath, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print("wrote", jpath)


def main():
    for key, data in BILLS.items():
        render_bill(key, data)
    readme = os.path.join(OUT, "README.txt")
    with open(readme, "w", encoding="utf-8") as f:
        f.write(
            "Synthetic demo bills for ClaimGuard.\n"
            "No real patients. Tariff comparisons use data/tariffs_sample.csv\n"
            "(illustrative SAMPLE prices, not official NHIA).\n"
        )
    print("done ->", OUT)


if __name__ == "__main__":
    main()

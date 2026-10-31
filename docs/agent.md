# agent.md — Instructions for the coding agent (ClaimGuard on agent-factory)

## Hard rules
- NEVER commit `.env`, keys, or print them. Update `.env.template` with placeholders only.
- Don't break engine endpoints (`/health`, `/supervisor`, `/run/{profile}`, `/upload`). ClaimGuard profiles replace the old demo agents.
- Small commits, each runnable. Synthetic data only — no real patient info.
- User is on **Windows PowerShell**, weak laptop: no local model, no heavy deps. Use `;` not `&&`.
- Keep the repo MIT-licensed (add `LICENSE` if missing) — required for the Open-Source prize.

## PowerShell commands
```powershell
python -m venv .venv; .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
curl.exe http://127.0.0.1:8000/health
curl.exe -X POST http://127.0.0.1:8000/audit -H "X-Factory-API-Key: $env:FACTORY_MASTER_KEY" -F "file=@data/sample_bills/bill_padded.json"
python -m pytest -q
cd frontend; npm install; npm run dev
```
(Check main.py for the exact API key header name used by `api_key_header` and use that.)

## New env vars (.env.template)
```
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
LLM_API_KEY=
LLM_MODEL=gemma-4-31b-it
LLM_FALLBACK_BASE_URL=
LLM_FALLBACK_API_KEY=ollama
LLM_FALLBACK_MODEL=gemma4:12b
```
Add `pydantic-settings` fields in `core/config.py`. Add `rapidfuzz` and `Pillow` to requirements.txt.

## Files to create
- `core/llm.py`, `core/pipeline.py`, `core/schemas.py` (pydantic models below)
- `profiles/10_cg_extractor.yaml`, `11_cg_price_checker.yaml`, `12_cg_medical_logic.yaml`, `13_cg_fraud_scorer.yaml` (add `model:` and `output_schema:` keys)
- `tools/tariff_lookup.py` (register in `AgentChassis.tool_registry`)
- `data/tariff_ng.csv` — columns `item,category,unit,ref_price_ngn` (~40 rows: Paracetamol 500mg, Artemether-Lumefantrine, Amoxicillin 500mg, Malaria RDT, FBC, Widal, consultation GP/specialist, bed/day, IV fluids, etc. Label as **illustrative sample prices**, not an official NHIA tariff.)
- `samples/` 3 synthetic bills (clean, padded, unrelated-items) — generate as images with PIL.
- `main.py`: `POST /claimguard/audit`; `frontend/src/ClaimGuard.jsx`; `tests/test_claimguard.py` (mock LLM).

## Agents (prompts + IO)
All LLM calls: temperature 0, ask for JSON only, parse with pydantic, 1 repair retry on invalid JSON.

### 1. Extractor (vision)
Prompt: "You read Nigerian hospital bills and prescriptions. Extract every line exactly as written. Return ONLY JSON matching the schema. Use null if unreadable. Do not invent items. Amounts in NGN as numbers."
```json
{"hospital": "str|null", "date": "YYYY-MM-DD|null", "diagnosis": "str|null",
 "items": [{"line": 1, "description": "str", "qty": 1, "unit_price": 0, "amount": 0}],
 "stated_total": 0, "confidence": 0.0}
```
### 2. Price checker (tool: tariff_lookup)
Python matches each item to CSV (rapidfuzz score ≥80). LLM only for unmatched lines: "Suggest the closest generic item name for this hospital line or 'none'."
```json
{"lines": [{"line": 1, "matched_item": "str|null", "ref_price": 0, "charged_unit": 0, "overcharge_pct": 0.0, "flag": "ok|overpriced|unknown"}]}
```
### 3. Medical logic
Prompt: "You are a clinical claims reviewer. Given the diagnosis and items, judge whether each item is clinically consistent. Be conservative; say 'questionable' when unsure. Not medical advice."
```json
{"lines": [{"line": 1, "fit": "ok|questionable|unrelated", "reason": "str"}], "diagnosis_supported": true}
```
### 4. Fraud scorer
Python rules → points: overpriced >30% (+15 each, max 45), unrelated (+20 each), duplicate line (+15), arithmetic mismatch sum≠stated_total >2% (+20), low extraction confidence <0.6 (forces REVIEW). Clamp 0–100. LLM writes 3-sentence summary from the rule hits only.
```json
{"score": 0, "verdict": "APPROVE|REVIEW|REJECT", "flags": [{"line": 1, "type": "overpriced|unrelated|duplicate|math", "detail": "str"}],
 "summary": "str", "potential_savings_ngn": 0}
```
### AuditReport (endpoint response)
`{"extracted":..., "pricing":..., "medical":..., "fraud":..., "model": "LLM_MODEL", "latency_ms": 0}`

## Done = 
`/claimguard/audit` on `samples/bill_padded.jpg` returns REJECT with ≥2 flags; clean bill returns APPROVE; works with both Gemini and Ollama base URLs by changing only env.

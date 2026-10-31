# ClaimGuard

**Nigerian HMO / hospital bill claim auditor** built on the agent-factory LangGraph chassis, powered by **Gemma 4** (vision + reasoning).

Hacktoberfest Hack Day · MIT License

## Problem

HMOs in Nigeria still review hospital claims largely by hand. Inflated drug prices, duplicate lines, unrelated procedures, and arithmetic that does not add up slip through — costing payers real naira every day.

## Solution

ClaimGuard runs a **four-agent pipeline** on a bill photo:

1. **Extractor** (Gemma 4 vision) → structured line items  
2. **Price checker** → fuzzy match against **illustrative sample tariffs** (not official NHIA)  
3. **Medical logic** → clinical fit of items vs diagnosis  
4. **Fraud scorer** → **deterministic Python rules** for score/verdict + Gemma summary  

```text
User bill photo → POST /audit → Extractor → (Price ‖ Medical) → Fraud rules → AuditReport JSON
                                                              ↑
                                              data/tariffs_sample.csv
```

## Gemma 4 usage

| Mode | Env | Model |
|------|-----|--------|
| **Gemini API** (demo primary) | `LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/` | `gemma-4-26b-a4b-it` |
| **Self-hosted Ollama** | `LLM_BASE_URL=http://<host>:11434/v1` | `gemma4:12b` |

Switch providers by changing only `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL`. See [docs/gemma.md](docs/gemma.md).

Without an API key, `/audit` still works on `data/sample_bills/*.json` (and image uploads that have a matching JSON sidecar) using **rules-only** scoring — useful for CI and weak laptops.

## Architecture

Kept from agent-factory: FastAPI `main.py`, `core/chassis.py` (LangGraph react agent + tool registry), `X-Factory-API-Key` auth, `/health`, `/supervisor`, `/run/{profile}`, `/upload`.

ClaimGuard adds: `core/llm.py`, `core/pipeline.py`, `core/scoring.py`, `core/schemas.py`, profiles, `tools/tariff_lookup.py`, `POST /audit`.

## Quick start

### PowerShell

```powershell
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env: set FACTORY_MASTER_KEY and optionally LLM_API_KEY
python scripts/make_samples.py
$env:PYTHONPATH="."; $env:FACTORY_MASTER_KEY="dev_key_change_me"
uvicorn main:app --reload --port 8000
```

In another terminal:

```powershell
curl.exe http://127.0.0.1:8000/health
curl.exe -X POST http://127.0.0.1:8000/audit -H "X-Factory-API-Key: $env:FACTORY_MASTER_KEY" -F "file=@data/sample_bills/bill_padded.json"
python -m pytest -q
cd frontend; npm install; npm run dev
```

### bash

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python scripts/make_samples.py
export PYTHONPATH=. FACTORY_MASTER_KEY=dev_key_change_me
uvicorn main:app --reload --port 8000
pytest -q
curl -X POST http://127.0.0.1:8000/audit -H "X-Factory-API-Key: $FACTORY_MASTER_KEY" -F "file=@data/sample_bills/bill_padded.json"
```

### Docker

```bash
docker build -t claimguard .
docker run -p 8000:8000 --env-file .env claimguard
```

## Sample data disclaimer

`data/tariffs_sample.csv` and `data/sample_bills/` are **synthetic / illustrative**. They are **not** official NHIA tariffs and contain **no real patient data**. ClaimGuard is **not medical advice** and is not a production claims adjudicator.

## Demo script (60–90 s)

1. Upload `bill_clean.json` / image → **APPROVE**.  
2. Upload `bill_padded` → agents light up → **REJECT** (overpriced Paracetamol, duplicate injection, math mismatch).  
3. Flip env to self-hosted Gemma 4 → same verdict. Open harness, open weights.

## Roadmap

- Fine-tune Gemma on **anonymised** Nigerian claims (with HMO partners)  
- Official NHIA / private tariff packs (licensed)  
- Batch CSV audit + auditor review queue  
- Stronger vision calibration on low-quality phone photos  

## Docs

- [docs/agent.md](docs/agent.md) — agent instructions & schemas  
- [docs/architecture.md](docs/architecture.md) — system design  
- [docs/implementation.plan.md](docs/implementation.plan.md) — hack day plan  
- [docs/gemma.md](docs/gemma.md) — Gemini API / Ollama / Colab hosting  

## License

[MIT](LICENSE)

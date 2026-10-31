# ClaimGuard — Implementation Plan (~5.5 h, Hacktoberfest Ikeja)
Targets: Best Open-Source AI Project + Best Use of Gemma 4. Repo: drizzy765/agent-factory (branch `claimguard`). Read agent.md + architecture.md first.

## T+0:00–0:30 Setup & model
- [ ] `git checkout -b claimguard`; add MIT `LICENSE`.
- [ ] AI Studio key → `.env` (LLM_* vars, gemma.md §A). Run health curl → "OK".
- [ ] Teammate in parallel: start DO RTX 4000 GPU droplet + Ollama `gemma4:12b` (gemma.md §B). Colab §C if DO GPU blocked.
**Test:** curl returns a Gemma response.

## 0:30–1:15 LLM abstraction
- [ ] `core/config.py` new fields; `core/llm.py` get_llm()+vision_json(); chassis uses get_llm (keep Groq as last fallback).
- [ ] Profile `model:` override.
**Test:** `/run/extractor` loads profile on Gemma; `python -c "from core.llm import vision_json"` on a sample image.

## 1:15–2:15 Data + extractor
- [ ] `data/tariff_ng.csv` (~40 rows, "illustrative"), `samples/` 3 synthetic bills via PIL script `scripts/make_samples.py`.
- [ ] `core/schemas.py`, profile 10 extractor, extractor step.
**Test:** extractor on bill_padded.jpg returns all lines + totals.

## 2:15–3:15 Price, medical, fraud
- [ ] `tools/tariff_lookup.py` (rapidfuzz) + price step; medical step; fraud rules + summary; `core/pipeline.py` with asyncio.gather.
- [ ] `POST /claimguard/audit`.
- [ ] `tests/test_claimguard.py` with mocked LLM (rules deterministic).
**Test:** padded → REJECT, clean → APPROVE, unrelated → REVIEW/REJECT.

## 3:15–4:00 Frontend
- [ ] `frontend/src/ClaimGuard.jsx`: upload, spinner showing 4 agent steps, verdict badge, flagged-lines table, savings ₦, model name shown ("Gemma 4 · self-hosted" / "Gemini API").
**Test:** full flow in browser.

## 4:00–4:30 Deploy
- [ ] Backend → DO App Platform (Dockerfile); frontend → Vercel. Env vars encrypted.
- [ ] Switch LLM_BASE_URL to DO Ollama once, record it works (open-weights proof). Keep Gemini as primary for live demo.

## 4:30–5:15 README, video, pitch
- [ ] README: problem (HMO bill padding), how agent-factory harness works, Gemma 4 usage (vision extraction + reasoning, Gemini API & self-hosted), run steps, architecture diagram, license, disclaimer (not medical advice, sample prices).
- [ ] 2-min demo video.

## 5:15–5:30 Buffer + submit. **Destroy GPU droplet.**

## Demo script (60–90 s)
1. "HMOs in Nigeria pay padded hospital bills every day; reviewers check by hand."
2. Upload clean bill → APPROVE in ~15 s.
3. Upload padded bill → 4 agents light up → REJECT, score 85: Paracetamol 6× tariff, duplicate injection, total doesn't add up, "₦X saved".
4. Flip env to self-hosted Gemma 4 on our DigitalOcean GPU → same verdict. "Open-source harness, open-weight model, runs on your own server — patient data never leaves."

## Submission checklist
- [ ] Public repo, MIT LICENSE, no `.env` in history (`git log -p | Select-String "API_KEY="` empty)
- [ ] README + diagram + Gemma 4 section
- [ ] Live URL + video link
- [ ] Team names on submission
- [ ] Tag `#Hacktoberfest2026`; GPU droplet destroyed

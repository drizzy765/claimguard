# ClaimGuard — Backend / cloud deployment plan

**When:** deploy before the demo (not required for local JSON-sample testing).  
**Goal:** one public URL serving API + UI. No Docker Desktop on your laptop — the cloud builds the repo `Dockerfile`.  
**Repo:** https://github.com/drizzy765/claimguard · branch `main`  
**Spec:** [`.do/app.yaml`](../.do/app.yaml)

---

## Recommendation (hack day)

| Option | Use when | Approx cost | Notes |
|--------|----------|-------------|--------|
| **A. DigitalOcean App Platform** (primary) | You have DO credit / want a stable demo URL | Basic ~$5/mo | Builds Dockerfile from GitHub; UI+API same origin |
| **B. Render Blueprint** (backup) | DO blocked / no credit | Free tier | Cold start after idle — warm `/health` before judges |
| **C. DO Droplet + Docker** | Need SSH / custom port | ~$6/mo | Only if App Platform fails; still no local Docker if you build on the droplet |

**LLM for the live demo:** Gemini API `gemma-4-31b-it` first; Groq automatic fallback. Optional GPU Ollama is a separate story — see [gemma.md](gemma.md).

---

## Pre-flight checklist (do once, offline)

- [ ] Repo `main` is green locally: `pytest` passes; `GET /health` returns `OK`
- [ ] You have keys ready (do **not** commit them; do **not** paste into chat):
  - [ ] `FACTORY_MASTER_KEY` — long random string (same value goes in the UI key field)
  - [ ] `LLM_API_KEY` — Google AI Studio
  - [ ] `GROQ_API_KEY` — Groq console (fallback)
- [ ] Confirmed model ids:
  - Gemini: `gemma-4-31b-it`
  - Groq: `llama-3.3-70b-versatile` (or whatever you set in env)
- [ ] Optional: smoke Gemini from PowerShell (see [gemma.md](gemma.md) §A)

---

## Path A — DigitalOcean App Platform (do this first)

### A1. Create the app (UI, ~10 min)

1. Open https://cloud.digitalocean.com/apps/new  
2. **GitHub** → authorize if needed → select **`drizzy765/claimguard`** → branch **`main`**  
3. Resource detect: **Dockerfile** at repo root  
4. Settings:
   - HTTP port: **8000**
   - Plan: **Basic** smallest (`basic-xxs` in `.do/app.yaml`)
   - Region: closest to judges (e.g. `nyc` / `ams` / `fra`)
5. **Environment variables** (encrypt secrets):

| Key | Example / value | Secret? |
|-----|-----------------|---------|
| `ENVIRONMENT` | `production` | no |
| `PORT` | `8000` | no |
| `FACTORY_MASTER_KEY` | *(your random string)* | **yes** |
| `LLM_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta/openai/` | no |
| `LLM_MODEL` | `gemma-4-31b-it` | no |
| `LLM_API_KEY` | *(AI Studio key)* | **yes** |
| `GROQ_API_KEY` | *(Groq key)* | **yes** |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | no |
| `GROQ_BASE_URL` | `https://api.groq.com/openai/v1` | no |
| `LLM_FALLBACK_BASE_URL` | leave empty unless Ollama droplet is up | optional |
| `LLM_FALLBACK_API_KEY` | `ollama` | no |
| `LLM_FALLBACK_MODEL` | `gemma4:12b` | no |

6. **Create Resources** → wait for build + deploy (first build can take 5–15 min; Node + Python stages).  
7. Copy the live URL: `https://claimguard-xxxxx.ondigitalocean.app`

### A2. Optional CLI (later)

```bash
# Install: https://docs.digitalocean.com/reference/doctl/how-to/install/
doctl auth init
doctl apps create --spec .do/app.yaml
# After create, set SECRET env values in the dashboard or:
# doctl apps update <APP_ID> --spec .do/app.yaml
```

### A3. Verify (PowerShell)

```powershell
$BASE="https://YOUR-APP.ondigitalocean.app"
$KEY="YOUR_FACTORY_MASTER_KEY"

curl.exe -s "$BASE/health"
# expect: {"status":"OK","service":"ClaimGuard",...}

curl.exe -s -X POST "$BASE/audit" -H "X-Factory-API-Key: $KEY" -F "file=@data/sample_bills/bill_padded.json"
# expect: fraud.verdict REJECT (or REVIEW), score populated

# Browser: open $BASE → paste same KEY → upload bill_padded.jpg or .json
```

### A4. Auto-deploys

`.do/app.yaml` sets `deploy_on_push: true` for `main`. After the app exists, pushes to `main` rebuild. Re-check `/health` after each deploy before the pitch.

---

## Path B — Render (backup)

1. https://dashboard.render.com/select-repo?type=blueprint → connect `drizzy765/claimguard` (`render.yaml`)  
2. Set the same secrets as Path A (`FACTORY_MASTER_KEY`, `LLM_API_KEY`, `GROQ_API_KEY`)  
3. Deploy → `https://claimguard-xxxx.onrender.com`  
4. **Before demo:** hit `/health` once (free tier sleeps)

---

## Path C — Cheap DO Droplet (only if App Platform fails)

1. Create a **Basic Droplet** (Ubuntu, ~$6/mo) with Docker preinstalled or install Docker **on the droplet** (still no Docker Desktop on Windows).  
2. SSH in:

```bash
git clone https://github.com/drizzy765/claimguard.git
cd claimguard
# create .env on the server only (scp or nano) — never commit
docker build -t claimguard .
docker run -d -p 80:8000 --env-file .env --name claimguard claimguard
curl -s http://127.0.0.1/health
```

3. Open `http://DROPLET_IP/` (add HTTPS later with Caddy/nginx if time).

---

## What the container serves

| Path | Purpose |
|------|---------|
| `/` | ClaimGuard React UI (built in Docker stage 1) |
| `/health` | Liveness (no API key) |
| `/audit` | Bill audit (`X-Factory-API-Key` required) |
| `/claimguard/audit` | Alias of `/audit` |
| `/run/{profile}`, `/supervisor`, `/upload` | Chassis endpoints (API key) |

Failover chain in `core/llm.py`: **Gemini → optional Ollama → Groq**.

---

## Demo-day runbook (10 min before judges)

1. Confirm DO app status = **Active** (or warm Render `/health`)  
2. Browser → app URL → paste `FACTORY_MASTER_KEY`  
3. Upload `data/sample_bills/bill_clean.*` → expect **APPROVE**  
4. Upload `data/sample_bills/bill_padded.*` → expect **REJECT** + flags  
5. If Gemini 429/credit: Groq should kick in for text steps; for vision, prefer `.json` samples or fix Gemini key  
6. Do **not** destroy the App Platform app until after submission  

Optional open-weights aside: GPU droplet + Ollama per [gemma.md](gemma.md) §B — **destroy the GPU droplet after the demo** (bills while powered off).

---

## Rollback / troubleshooting

| Symptom | Fix |
|---------|-----|
| Build fails on `npm ci` | Confirm `frontend/package-lock.json` is on `main`; retry deploy |
| App up but `/` 404 | Image missing `frontend/dist` — rebuild; check Dockerfile stage copy |
| `/audit` 401 | UI key ≠ `FACTORY_MASTER_KEY` env |
| `/audit` 500 / LLM errors | Check `LLM_API_KEY` / `GROQ_API_KEY`; try JSON sample (rules path if no keys) |
| Health ok, UI blank | Hard refresh; confirm static assets under `/assets` |
| Wrong model | Set `LLM_MODEL=gemma-4-31b-it` and redeploy |

---

## After deploy — record here

| Field | Value |
|-------|--------|
| Host (A / B / C) | |
| Public URL | |
| Deployed commit SHA | |
| Region / plan | |
| Notes | |

---

## Related docs

- [architecture.md](architecture.md) — system diagram  
- [gemma.md](gemma.md) — Gemini / Ollama / GPU hosting  
- [agent.md](agent.md) — schemas & local PowerShell commands  
- [implementation.plan.md](implementation.plan.md) — hack day timeline  

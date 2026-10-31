# ClaimGuard UI Design Plan

**Status:** Plan only — implement next.  
**Product:** Open-source AI claim auditor for Nigerian HMOs (Hacktoberfest Hack Day Ikeja).  
**Stack constraint:** Existing React + Vite frontend; few hours of build time.  
**API contract (do not invent):** `GET /health`, `POST /audit` (also `/claimguard/audit`), header `X-Factory-API-Key`. Report shape from `docs/agent.md`: `extracted`, `pricing`, `medical`, `fraud` (`score`, `verdict: APPROVE|REVIEW|REJECT`, `flags`, `summary`, `potential_savings_ngn`), `model`, `latency_ms`, `steps`.

**UI verdict labels (map from API):**

| API `fraud.verdict` | UI label | Tone |
|---------------------|----------|------|
| `APPROVE` | **CLEAN** | Trust restored |
| `REVIEW` | **REVIEW** | Human needed |
| `REJECT` | **FRAUD RISK** | Stop / escalate |

Never invent partner logos or fake “₦X billion saved” marketing stats.

---

## 0. Skills loaded & rules taken

| Skill / guide | Key rules applied |
|---------------|-------------------|
| **refero-design** | Research before inventing; synthesize a sharp direction (clinical trust), do not average into generic AI purple; lock tokens before build; anti-slop. Refero MCP was **unauthenticated** — used methodology + MCP catalogs instead of live Refero screens. |
| **frontend-ui-engineering** | Production a11y; composition over mega-props; separate data (API) from presentation; WCAG; no “AI aesthetic.” |
| **make-interfaces-feel-better** | Tabular nums for scores/₦; concentric radii; interruptible CSS for hover; spring bounce `0` if using motion; no `transition: all`; motion never sole feedback; 44px hit targets; icon stroke matches type; `prefers-reduced-motion`. |
| **apple-design (HIG principles)** | Clear hierarchy; feedback for loading/progress/errors; colour not sole status channel; calm motion; dark mode as first-class; writing that is direct. |
| **shadcn skill** | Prefer registry components; semantic tokens (`bg-background`, `text-muted-foreground`); full Card composition; Dialog/Sheet always titled. |
| **User frontend design rules** | Brand-first first viewport; no purple-on-white / cream-terracotta / broadsheet clichés; no hero card clutter; one job per section; 2–3 intentional motions; expressive fonts (not Inter/Roboto/Arial). |
| **docs/agent.md + architecture.md** | Four agents; parallel price‖medical after extract; sample tariffs disclaimer; Gemma 4 badge; same-origin deploy possible. |

**Reference lock (dominant direction):** *Clinical claims desk* — deep forest-teal ink, paper neutrals, document-grade type, audit instrument UI (Stripe Dashboard calm + Apple Health clarity + hospital bill seriousness). Secondary borrow only: Linear’s step progress density; Stripe’s table/invoice precision.

---

## 1. Design principles & feeling

1. **Trust before clever.** Every surface should feel like a claims desk instrument, not a startup landing template.  
2. **One job per view.** Landing sells; Audit runs; Report decides; History recalls; About explains + disclaims.  
3. **Evidence over vibes.** Show line items, tariff deltas, flags, and agent steps — not fake KPIs.  
4. **Calm motion with purpose.** Animate only what teaches the pipeline (beams, step advance, score count). Respect reduced motion.  
5. **Open and honest.** “SAMPLE tariffs — not official NHIA,” “Not medical advice,” “Powered by Gemma 4 (open weights)” stay visible, never buried.

**Feeling:** Precise, clinical, premium, Nigerian-context fluent (₦, HMO language), judge-ready in 60 seconds.

---

## 2. Design tokens

### 2.1 Colour

**Light**

| Token | Hex | Role |
|-------|-----|------|
| `--ink` | `#0F3D2C` | Primary brand / headings |
| `--ink-muted` | `#4A5C54` | Secondary text |
| `--paper` | `#F3F6F4` | Page background |
| `--surface` | `#FFFFFF` | Cards / panels |
| `--leaf` | `#1F6B4A` | Primary actions |
| `--leaf-deep` | `#0F3D2C` | Hover / brand mark |
| `--line` | `#0F3D2C14` | Borders (8% ink) |
| `--status-clean` | `#1A6B3C` | CLEAN / APPROVE |
| `--status-review` | `#8A5A12` | REVIEW |
| `--status-fraud` | `#9B2C2C` | FRAUD RISK / REJECT |
| `--status-clean-bg` | `#1A6B3C18` | Banner wash |
| `--status-review-bg` | `#8A5A1218` | Banner wash |
| `--status-fraud-bg` | `#9B2C2C14` | Banner wash |
| `--focus` | `#1F6B4A` | Focus ring |

**Dark**

| Token | Hex | Role |
|-------|-----|------|
| `--ink` | `#E8F0EA` | Text |
| `--ink-muted` | `#9BB0A5` | Secondary |
| `--paper` | `#0B1612` | Page |
| `--surface` | `#12201A` | Panels |
| `--leaf` | `#2F9B6A` | Actions |
| `--leaf-deep` | `#7DDBB0` | Accents / mark |
| `--line` | `#E8F0EA18` | Borders |
| Status hues | Same hue family, lightened for AA on dark surfaces | Always + icon + label |

**Contrast:** Status text on wash backgrounds and solid badges must meet **WCAG AA** (≥4.5:1 for body). Pair every status with Lucide icon + text (`CheckCircle2`, `AlertTriangle`, `ShieldAlert`).

Avoid: purple gradients, neon glow stacks, warm cream + terracotta AI defaults.

### 2.2 Typography

| Role | Family | Notes |
|------|--------|-------|
| Display / brand | **Fraunces** (variable, Google Fonts) | Product name, verdict, hero H1 |
| UI / body | **IBM Plex Sans** | Dense tables, forms; excellent Nigerian/Latin coverage |
| Mono / logs | **IBM Plex Mono** | Agent log lines, JSON export preview |

**Scale (rem @ 16px):** `12 / 14 / 16 / 18 / 24 / 32 / 40` → `xs sm base lg xl 2xl 3xl`.  
Headings: `text-wrap: balance`. Body: `text-wrap: pretty`.  
Scores & ₦: `font-variant-numeric: tabular-nums`.  
Root: `-webkit-font-smoothing: antialiased`.

### 2.3 Spacing, radius, shadow

- **Space scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64  
- **Radius:** control `6px`, panel `10px`, hero media `12px` (outer = inner + padding)  
- **Shadow:** one soft elevation only: `0 1px 2px oklch(0 0 0 / 0.06), 0 8px 24px oklch(0 0 0 / 0.06)` — structure via borders first  
- **Max content width:** landing `1120px`; audit/report `960–1040px`

### 2.4 Icons

**Lucide React** only (`lucide-react`). Stroke **1.75–2** beside semibold labels. `currentColor`. Outline default; fill for active nav.

---

## 3. Motion system

| Token | Value | Use |
|-------|-------|-----|
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | UI transitions |
| `--dur-fast` | `120ms` | Hover / press |
| `--dur-med` | `280ms` | Panel enter |
| `--dur-slow` | `500ms` | Step / beam cycles |
| Press | `scale(0.96)` | Primary buttons |

**Animates (purposeful, max ~3 simultaneous stories):**

1. Landing: **Animated Beam** between four agent nodes.  
2. Audit running: **Border Beam** on active step card + **Animated List** for log lines; logo shield “scan” (SVG stroke-dashoffset loop).  
3. Report: **Number Ticker** for fraud score + **Blur Fade** for verdict banner.

**Never animates:** Table row hover (CSS only), typing in inputs, scroll-jacking, rainbow buttons, continuous sparkles.

**`prefers-reduced-motion: reduce`:** Beams → static connectors; ticker → instant number; list → plain list; logo scan → static mark tinted by verdict.

---

## 4. Brand & logo

**Concept:** Shield (protection for the payer) + document face (the bill) + check (verified). Drafts in `docs/design/logo/`:

| File | Use |
|------|-----|
| `claimguard-mark.svg` | Colour lockup / marketing |
| `claimguard-mark-mono.svg` | One-colour (`currentColor`) |
| `claimguard-mark-dark.svg` | Dark UI |
| `claimguard-icon.svg` | Icon-only / PWA |
| `favicon.svg` | Favicon |

**Wordmark:** “ClaimGuard” in Fraunces semibold beside mark; tagline in Plex: “HMO bill auditor · Gemma 4”.

**Logo motion:** While `/audit` in flight, a vertical scan line (2px leaf) moves top→bottom inside the shield (CSS/SVG, 1.2s loop). On success, scan stops; shield fill/stroke adopts status colour (green / amber / red). Reduced motion: jump to final tint.

---

## 5. Sitemap & screens

```text
/                 Landing
/audit            Upload + live run + report (primary app)
/history          Light local history (localStorage)
/about            How it works + Gemma + SAMPLE disclaimer
```

Client-side React routes (or view state) inside Vite app. Settings (API host + `X-Factory-API-Key`) in header `Dialog`.

---

### 5a. Landing `/`

**Layout (one composition first viewport):** Brand mark + “ClaimGuard” (hero-level) → one headline → one sub → CTA group → dominant agent-pipeline visual (full-bleed atmospheric `Dot Pattern`, not a card collage). Below fold: open-source + Gemma strip, then short “How it works” (4 steps). No stat strip of fake numbers.

**Copy drafts**

- Headline options:  
  1. “Catch padded hospital bills in seconds.”  
  2. “Audit HMO claims before you pay.”  
  3. “Four agents. One clear verdict.”  
- Sub: “ClaimGuard reads a Nigerian hospital bill with Gemma 4, checks sample tariffs and clinical fit, then scores fraud risk — so claims officers spend time on real exceptions.”  
- Primary CTA: “Audit a bill” → `/audit`  
- Secondary: “View on GitHub” → `https://github.com/drizzy765/claimguard`  
- Badge: “Powered by Gemma 4 · open weights”  
- OSS callout: “MIT licensed. Built for Hacktoberfest Hack Day. Synthetic sample bills only — never real patient data.”

**Components**

| Piece | Source | Install | Why |
|-------|--------|---------|-----|
| Dot Pattern | Magic UI | `npx shadcn@latest add "https://magicui.design/r/dot-pattern.json"` | Quiet clinical atmosphere without purple glow |
| Animated Beam | Magic UI | `npx shadcn@latest add "https://magicui.design/r/animated-beam.json"` | Shows Extractor → Price ‖ Medical → Fraud |
| Blur Fade | Magic UI | `npx shadcn@latest add "https://magicui.design/r/blur-fade.json"` | Stagger hero text once |
| Shimmer Button | Magic UI | `npx shadcn@latest add "https://magicui.design/r/shimmer-button.json"` | Single primary CTA presence (not rainbow) |
| Button, Badge | shadcn | `npx shadcn@latest add button badge` | Secondary CTA + Gemma badge |
| Hero structure insp. | 21st Financial Hero / Enterprise Hero | Pattern only — **rebuild** with our tokens | Dual CTA + product visual; avoid 3D sculpture kits |

**States:** Static if reduced motion; health pill from `/health` optional in header (`online` / `offline`).

**Responsive:** Stack CTAs; agent diagram becomes vertical timeline under `md`.

---

### 5b. Audit page `/audit` (build first)

**Layout**

1. Top bar: mark, health, settings (API URL + key).  
2. **Upload zone** + **Try a sample** (4 chips: 2 honest `bill_clean`, `bill_honest_typhoid`; 2 padded/fake `bill_padded`, `bill_unrelated`) pointing at `data/sample_bills/*`.  
3. On submit: **Live run** — 4 step cards (Extractor, Price check, Medical logic, Fraud scorer) with status, elapsed ms (client clock), short log.  
4. On response: scroll to **Report** (5c) on same page.

**Copy**

- Dropzone: “Drop a bill photo or JSON sample” / “JPG, PNG, or sample `.json` · max 5 MB”  
- Samples: “Honest — malaria outpatient”; “Honest — typhoid workup”; “Padded — overcharges + duplicate”; “Suspect — unrelated MRI on malaria”  
- Running: “Agents are reviewing this claim…”  
- Error offline: “Cannot reach the ClaimGuard API. Check the host URL and that the service is awake.”  
- Error 401: “API key rejected. Use the same `FACTORY_MASTER_KEY` as the server.”  
- Error LLM: “Model call failed. Gemini may be rate-limited — Groq fallback should retry; or try a JSON sample.”

**Components**

| Piece | Source | Install | Why |
|-------|--------|---------|-----|
| File Dropzone pattern | 21st `File Dropzone` (joyco, id 19201) / haydenbleasel Dropzone | Prefer **custom thin dropzone** on shadcn Card to avoid paid retrieval; use 21st as **visual reference** | Image preview + validation |
| Border Beam | Magic UI | `…/border-beam.json` | Active step while running |
| Animated List | Magic UI | `…/animated-list.json` | Streaming agent log lines |
| Progress / Skeleton | shadcn | `npx shadcn@latest add progress skeleton` | Indeterminate wait |
| Stepper pattern | 21st Stepper (kevingirelli 35237) / Basic Stepper | Rebuild with shadcn Badge + Progress | 4 named agents match pipeline |
| Alert, Button, Card | shadcn | `npx shadcn@latest add alert button card` | Errors + chrome |
| Toast | shadcn | `npx shadcn@latest add sonner` (or `toast`) | Export / copy success |

**Wire:** `POST ${api}/audit` multipart `file` + `X-Factory-API-Key`. While awaiting, advance UI steps on a timer aligned to `steps` in response when returned. JSON samples work without vision key.

**Responsive:** Samples wrap; steps 2×2 on mobile; log below.

---

### 5c. Audit report (same page, below run)

**Layout**

- **Verdict banner:** label + icon + summary sentence (`fraud.summary`).  
- **Score row:** Number Ticker `fraud.score` / 100; `potential_savings_ngn` as “Potential savings ₦X”; `model` + `latency_ms`.  
- **Line-items table:** description, qty, charged unit, tariff ref, overcharge %, price flag, medical fit, flag detail.  
- **Medical notes:** `diagnosis` + `diagnosis_supported` + per-line reasons.  
- **Evidence:** original preview + list of flagged line numbers (highlights as badges; full image heatmaps out of scope for hack day).  
- Actions: Export JSON (download report), Copy summary, Re-run, “Export PDF” = **print stylesheet** (`window.print`) for hack-day realism.

**Copy**

- Banner CLEAN: “No material fraud signals on sample tariffs.”  
- REVIEW: “Send to a human claims officer before payment.”  
- FRAUD RISK: “Do not auto-approve. Investigate flagged lines.”  
- Table empty flags: “No line-level flags.”  
- Disclaimer under table: “Tariff ranges are illustrative SAMPLE data, not official NHIA prices. Not medical advice.”

**Components**

| Piece | Source | Install | Why |
|-------|--------|---------|-----|
| Table | shadcn | `npx shadcn@latest add table` | Core report; invoice-table insp. from 21st Invoice History |
| Badge | shadcn | `npx shadcn@latest add badge` | CLEAN / REVIEW / FRAUD RISK + line flags |
| Number Ticker | Magic UI | `…/number-ticker.json` | Score emphasis for judges |
| Tabs | shadcn | `npx shadcn@latest add tabs` | Lines / Medical / Raw JSON |
| Alert | shadcn | `npx shadcn@latest add alert` | Disclaimer |
| Card | shadcn | `npx shadcn@latest add card` | Verdict + savings |

**States:** Success populated; partial (unknown prices) shows `unknown` badges; error already handled upstream.

---

### 5d. History `/history` (light)

**Layout:** Three mini stats (CLEAN / REVIEW / FRAUD RISK counts) + table of past audits from **localStorage** only (no backend history API). Columns: time, hospital, verdict, score, savings ₦, open.

**Copy:** “Stored only in this browser. Clearing site data removes history.”  
Empty: “No audits yet. Run your first bill.”

**Components:** shadcn `Card` + `Table` + `Badge`. Optional Magic UI Number Ticker on totals. Stat card **pattern** from 21st Statistics Card — rebuild, don’t pull heavy chart kits.

---

### 5e. About `/about`

**Layout:** Architecture mermaid (static SVG export of docs diagram) → Gemma 4 story (Gemini API + self-host) → MIT / GitHub → **SAMPLE tariff disclaimer** callout → “Not medical advice.”

**Copy (disclaimer):** “`data/tariffs_sample.csv` holds illustrative naira price ranges for demos. It is not an official NHIA tariff schedule. ClaimGuard does not replace licensed clinical or claims adjudication.”

**Components:** shadcn `Card`, `Alert`, `Separator`, `Button` (GitHub).

---

## 6. Accessibility & performance

- Keyboard: dropzone activatable; steps readable; dialogs labelled; focus rings `--focus`.  
- Screen readers: live region `aria-live="polite"` for agent status; verdict announced on complete.  
- Colour + icon + text for all statuses.  
- Target **Lighthouse ≥90** Performance/A11y on desktop: lazy-import Magic UI motion pieces; code-split routes; compress sample previews; no autoplaying video.  
- Weak laptop: default reduced motion if `navigator.hardwareConcurrency ≤ 4` optional soft-gate (user can still enable); keep animation count low.  
- Fonts: `display=swap`; subset Latin.

---

## 7. Component inventory

| Component | Source | Install command | Where used |
|-----------|--------|-----------------|------------|
| `button` | shadcn | `npx shadcn@latest add button` | Global CTAs |
| `badge` | shadcn | `npx shadcn@latest add badge` | Verdict, Gemma chip, flags |
| `card` | shadcn | `npx shadcn@latest add card` | Steps, verdict, about |
| `table` | shadcn | `npx shadcn@latest add table` | Report, history |
| `tabs` | shadcn | `npx shadcn@latest add tabs` | Report sections |
| `dialog` | shadcn | `npx shadcn@latest add dialog` | API settings |
| `progress` | shadcn | `npx shadcn@latest add progress` | Run progress |
| `tooltip` | shadcn | `npx shadcn@latest add tooltip` | Flag type help |
| `skeleton` | shadcn | `npx shadcn@latest add skeleton` | Loading report |
| `alert` | shadcn | `npx shadcn@latest add alert` | Errors, disclaimers |
| `separator` | shadcn | `npx shadcn@latest add separator` | Layout |
| `sonner` (toast) | shadcn | `npx shadcn@latest add sonner` | Export feedback |
| `dot-pattern` | Magic UI | `npx shadcn@latest add "https://magicui.design/r/dot-pattern.json"` | Landing atmosphere |
| `animated-beam` | Magic UI | `npx shadcn@latest add "https://magicui.design/r/animated-beam.json"` | Landing agent graph |
| `border-beam` | Magic UI | `npx shadcn@latest add "https://magicui.design/r/border-beam.json"` | Active audit step |
| `animated-list` | Magic UI | `npx shadcn@latest add "https://magicui.design/r/animated-list.json"` | Agent logs |
| `number-ticker` | Magic UI | `npx shadcn@latest add "https://magicui.design/r/number-ticker.json"` | Fraud score |
| `blur-fade` | Magic UI | `npx shadcn@latest add "https://magicui.design/r/blur-fade.json"` | Hero / verdict enter |
| `shimmer-button` | Magic UI | `npx shadcn@latest add "https://magicui.design/r/shimmer-button.json"` | Primary CTA |
| Dropzone (custom) | Inspired by 21st File Dropzone (joyco) | Build in-repo | `/audit` upload |
| Stepper (custom) | Inspired by 21st Stepper | Build in-repo | Live agent steps |
| lucide-react | npm | `npm i lucide-react` | Icons |
| motion | npm (via Magic UI) | pulled by Magic UI add | Beams / ticker |

**Explicitly skip for time:** Halo Dropzone, rainbow/pulsating buttons, Advanced Stats charts, 3D hero sculpture, paid 21st code retrieval unless quota is intentional.

**Prerequisite:** `npx shadcn@latest init` in `frontend/` (Tailwind + CSS variables mapped to tokens above).

---

## 8. Build order (testable checklist)

**Phase A — Foundation (shared)**

1. [ ] Init shadcn + Tailwind; map CSS variables to §2 tokens; dark class strategy.  
2. [ ] Add lucide; copy logo SVGs to `frontend/public/`; set favicon.  
3. [ ] Shell layout: `AppShell` (nav: Audit, History, About, GitHub) + settings `Dialog` (API URL, key, `/health` pill).

**Phase B — Audit + Report first (demo path)**

4. [ ] `AuditPage`: dropzone + 4 sample chips → `POST /audit`.  
5. [ ] `AgentRunRail`: 4 steps + Border Beam + Animated List logs + reduced-motion path.  
6. [ ] `AuditReport`: verdict banner, Number Ticker score, savings ₦, line `Table`, medical tab, JSON download, print CSS, disclaimer `Alert`.  
7. [ ] Wire empty / loading / 401 / network / success states; verify with `bill_padded.json` → FRAUD RISK and `bill_clean.json` → CLEAN.

**Phase C — Landing**

8. [ ] `LandingPage`: brand-first hero, copy, Shimmer CTA, Dot Pattern, Animated Beam agent diagram, Gemma badge, OSS callout.  
9. [ ] Blur Fade once on load; Lighthouse pass.

**Phase D — History + About**

10. [ ] Persist last N audits to localStorage; History stats + table.  
11. [ ] About architecture + SAMPLE / NHIA disclaimer + Gemma story.

**Phase E — Polish**

12. [ ] Logo scan during run → verdict tint; `prefers-reduced-motion` audit.  
13. [ ] Responsive pass (375 / 768 / 1280); keyboard + axe smoke.

### Files to create under `frontend/` (planned)

```text
frontend/
  components.json                 # shadcn
  src/
    main.jsx
    App.jsx                       # router / views
    index.css                     # tokens
    lib/utils.js                  # cn()
    components/
      ui/                         # shadcn + magicui generated
      AppShell.jsx
      HealthPill.jsx
      SettingsDialog.jsx
      ClaimGuardMark.jsx
      landing/Hero.jsx
      landing/AgentPipeline.jsx
      audit/Dropzone.jsx
      audit/SampleBills.jsx
      audit/AgentRunRail.jsx
      audit/AuditReport.jsx
      audit/LineItemsTable.jsx
      history/HistoryView.jsx
      about/AboutView.jsx
    pages/
      LandingPage.jsx
      AuditPage.jsx
      HistoryPage.jsx
      AboutPage.jsx
    hooks/
      useAudit.js
      useLocalHistory.js
      useHealth.js
  public/
    favicon.svg
    brand/claimguard-*.svg
```

Replace today’s monolithic `ClaimGuard.jsx` gradually; keep `/audit` working after each commit.

---

## 9. References browsed & inspiration

| Source | Link / id | Inspired |
|--------|-----------|----------|
| Magic UI Animated Beam | https://magicui.design/docs/components/animated-beam · install `…/animated-beam.json` | Landing agent data-passing story |
| Magic UI Border Beam | `…/border-beam.json` | Active audit step |
| Magic UI Number Ticker | `…/number-ticker.json` | Fraud score reveal |
| Magic UI Animated List | `…/animated-list.json` | Live agent logs |
| Magic UI Dot Pattern | `…/dot-pattern.json` | Quiet clinical background |
| Magic UI Blur Fade / Shimmer Button | respective `/r/*.json` | Hero enter + primary CTA |
| 21st File Dropzone (joyco) | id `19201` | Upload UX reference (rebuild) |
| 21st Stepper (kevingirelli) | id `35237` | Accessible multi-step status |
| 21st Invoice / History tables | ids `28473`, `22187`, `25152` | Claims line-item density |
| 21st Financial Hero | id `19056` | Dual CTA + product visual (not copy visuals) |
| 21st Enterprise Hero | id `8156` | Theme-aware dual CTA structure |
| 21st Statistics cards | ids `4245` etc. | History KPI chip layout (rebuild light) |
| shadcn/ui docs | https://ui.shadcn.com | Card, Table, Badge, Tabs, Dialog, Alert, Progress, Skeleton |
| ClaimGuard docs | `docs/agent.md`, `architecture.md`, `implementation.plan.md` | API, agents, disclaimer, Gemma story |
| Logo drafts | `docs/design/logo/*` | Brand mark variants |

---

## 10. Decision ledger (locked for build)

1. **Palette:** deep teal / forest clinical — not purple, not cream-terracotta.  
2. **Type:** Fraunces + IBM Plex Sans/Mono.  
3. **Verdict UX labels:** CLEAN / REVIEW / FRAUD RISK ← API APPROVE / REVIEW / REJECT.  
4. **Motion budget:** beam + border-beam/list + score ticker only.  
5. **shadcn + Magic UI + custom dropzone/stepper**; 21st as reference, not mandatory paid pulls.  
6. **Audit+Report before Landing.**  
7. **History = localStorage only** for hack day.  
8. **SAMPLE tariff + not medical advice** always visible on report and about.

---

*End of plan. Next step: Phase A foundation → Phase B audit/report.*

# ClaimGuard Demo Video Script

## Overview
**Duration:** 3-4 minutes  
**Target Audience:** Hackathon judges, HMOs, healthcare administrators, developers  
**Tone:** Professional, energetic, problem-solution oriented  
**Visual Style:** Split-screen (UI demo + code/architecture highlights)

---

## Scene 1: Hook - The Problem (0:00-0:30)

### Visuals:
- Nigerian hospital with busy reception
- Montage of handwritten receipts, paper bills
- Animated text: "Millions of Naira lost daily"

### Narration:
> "In Nigeria, HMOs process thousands of hospital claims every day. But there's a catch — most are still reviewed by hand. Inflated drug prices slip through. Duplicate line items go unnoticed. Math errors multiply. And payers lose real money."

### Key Message:
- Manual claim review is inefficient
- Financial leakage is a major problem
- Need for intelligent automation

---

## Scene 2: Solution Intro - Meet ClaimGuard (0:30-0:50)

### Visuals:
- Logo animation with sound effect
- Clean UI interface preview
- Quick flash of the four agents

### Narration:
> "Enter ClaimGuard — an AI-powered claim auditor built for Nigerian HMOs. Powered by Google's Gemma 4 vision model and built on the LangGraph agent chassis. Four specialized agents. One powerful pipeline. Results in seconds."

### On-Screen Text:
- "4 AI Agents"
- "Gemma 4 Vision + Reasoning"
- "Built for Nigerian Healthcare"

---

## Scene 3: Architecture Overview (0:50-1:30)

### Visuals:
- Animated flowchart showing the pipeline
- Code snippets from `core/pipeline.py`
- Terminal showing FastAPI running

### Animation Sequence:
```
[Bill Image] → [Extractor Agent] → (Parallel) → [Price Checker] → [Fraud Scorer] → [Verdict]
                          ↓           [Medical Logic]            ↑
                    (Gemma 4 Vision)   (Sample Tariffs)     (Deterministic Rules)
```

### Narration:
> "Here's how it works. When a bill is uploaded, four agents spring into action. First, the Extractor uses Gemma 4's vision capabilities to read the bill image and convert it to structured data. Then two agents run in parallel — the Price Checker compares items against sample Nigerian tariffs, while the Medical Logic agent judges clinical consistency with the diagnosis. Finally, the Fraud Scorer applies deterministic Python rules to calculate a risk score and deliver a verdict: Approve, Review, or Reject."

### Code Highlight:
```python
# From core/pipeline.py
async def run_audit(image_bytes: bytes) -> AuditReport:
    extracted = await _run_extractor(image_b64)
    pricing, medical = await asyncio.gather(
        _run_price_check(extracted),
        _run_medical(extracted)
    )
    fraud = compute_fraud_score(extracted, pricing, medical)
    return AuditReport(...)
```

---

## Scene 4: Live Demo - Clean Bill (1:30-2:10)

### Visuals:
- Screen recording of the ClaimGuard UI
- Upload `bill_clean.jpg` (Lagos Community Clinic)
- Real-time agent progress animation
- Result panel showing APPROVE

### Narration:
> "Let's see it in action. First, a clean bill from Lagos Community Clinic — consultation, malaria test, antimalarial drugs, and paracetamol. Prices align with our sample tariffs. The agents extract, check, and validate. And just like that — APPROVE. Score 15 out of 100. No flags. Total processing time under 2 seconds."

### UI Elements Shown:
1. Drag-and-drop upload
2. Agent step progression (4 steps lighting up)
3. Verdict badge: **APPROVE** (green)
4. Score: 15/100
5. Extracted items table
6. Price flag: "ok"
7. Clinical fit: "ok"

### Key Data Points Displayed:
- Hospital: Lagos Community Clinic
- Diagnosis: Malaria (uncomplicated)
- Stated Total: ₦7,500
- Items: 4 lines
- Verdict: **APPROVE**

---

## Scene 5: Live Demo - Fraudulent Bill (2:10-3:00)

### Visuals:
- Upload `bill_padded.jpg` (Sunrise Medical Centre)
- Highlight each flag as it's detected
- Verdict: REJECT (red)
- Flag details table

### Narration:
> "Now for a padded bill. Sunrise Medical Centre — same malaria diagnosis, but look at these prices. Consultation at 10,000 Naira. Malaria test at 6,000. Paracetamol at 300 per tablet — six times the reference price. But that's not all — notice the duplicate injection entries on lines 4 and 5. And the math? Lines add up to 23,500, not the stated 28,000. ClaimGuard catches every issue."

### Detected Flags (Visual Highlights):
| Line | Type | Detail |
|------|------|--------|
| 1 | overpriced | Charged NGN 10,000 vs ref NGN 3,000 |
| 2 | overpriced | Charged NGN 6,000 vs ref NGN 1,500 |
| 3 | overpriced | Charged NGN 300 vs ref NGN 50 |
| 5 | duplicate | Duplicate of line 4 |
| — | math | Sum NGN 23,500 ≠ stated NGN 28,000 |

### Narration Continues:
> "Final score: 80 out of 100. Verdict: **REJECT**. Potential savings: 4,500 Naira. Every flag is explained, every discrepancy documented."

---

## Scene 6: Technical Highlights (3:00-3:30)

### Visuals:
- Split screen: UI on left, code on right
- Profile configuration YAML
- FastAPI Swagger docs
- Docker deployment

### Narration:
> "Under the hood, ClaimGuard is built for flexibility. The agent profiles are YAML-configured — extractor, price checker, medical logic, fraud scorer. The API is pure FastAPI with automatic OpenAPI documentation. Run it locally with uvicorn, or deploy to the cloud with Docker in minutes. And it's model-agnostic — switch between Gemini API or self-hosted Ollama just by changing environment variables."

### Code Shown:
```yaml
# profiles/fraud_scorer.yaml
personality:
  role: fraud_scoring_agent
  tone: clinical
  verbosity: concise
tools: []
supervisor_only: false
```

```python
# Environment-based model switching
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
LLM_MODEL=gemma-4-31b-it
```

---

## Scene 7: Flexibility Demo - Rules-Only Mode (3:30-3:50)

### Visuals:
- Terminal showing app starting without API key
- Same bills being processed offline
- Results showing "rules-only" model label

### Narration:
> "No API key? No problem. ClaimGuard runs in rules-only mode — deterministic Python scoring, no LLM calls required. Perfect for CI pipelines, offline environments, or when you just need consistent, explainable results."

### Terminal Commands:
```bash
# No API key needed
export FACTORY_MASTER_KEY=dev_key
python main.py
# Loads sample bills → rules-only scoring
```

---

## Scene 8: Closing - Impact & Roadmap (3:50-4:00)

### Visuals:
- Animated stats: "₦ Millions Saved", "4 Agents", "< 3s Response"
- GitHub repo URL
- MIT License badge
- Contact info

### Narration:
> "ClaimGuard — Nigerian healthcare claims, audited by AI. Open source. Ready to deploy. Built for the real world."

### On-Screen Text:
- **GitHub:** github.com/drizzy765/claimguard
- **License:** MIT
- **Hacktoberfest Hack Day 2026**

### Final CTA:
> "Try the demo. Review the code. Let's build the future of healthcare claims — together."

---

## Appendix: Sample Bills Reference

### bill_clean.json - The "Good" Bill
```json
{
  "hospital": "Lagos Community Clinic",
  "diagnosis": "Malaria (uncomplicated)",
  "items": [
    {"description": "Consultation GP", "qty": 1, "unit_price": 3000},
    {"description": "Malaria RDT", "qty": 1, "unit_price": 1500},
    {"description": "Artemether-Lumefantrine", "qty": 1, "unit_price": 2500},
    {"description": "Paracetamol 500mg", "qty": 10, "unit_price": 50}
  ],
  "stated_total": 7500
}
```

### bill_padded.json - The "Bad" Bill
```json
{
  "hospital": "Sunrise Medical Centre",
  "diagnosis": "Malaria (uncomplicated)",
  "items": [
    {"description": "Consultation GP", "qty": 1, "unit_price": 10000},  // 3x overpriced
    {"description": "Malaria RDT", "qty": 1, "unit_price": 6000},      // 4x overpriced
    {"description": "Paracetamol 500mg", "qty": 10, "unit_price": 300}, // 6x overpriced
    {"description": "Injection Diclofenac", "qty": 2, "unit_price": 500},
    {"description": "Injection Diclofenac", "qty": 2, "unit_price": 500}, // DUPLICATE
    {"description": "Artemether-Lumefantrine", "qty": 1, "unit_price": 2500}
  ],
  "stated_total": 28000  // Wrong! Actual sum is 23,500
}
```

---

## Production Notes

### Recording Requirements:
- Screen recorder (OBS/Camtasia)
- Clean browser profile
- Terminal with dark theme
- VS Code with syntax highlighting
- Backend running locally on port 8000
- Frontend running on port 5173

### Timing Cues:
- [0:00] Title card fade in
- [0:30] Logo reveal
- [1:30] UI demo starts
- [2:10] Second demo (padded bill)
- [3:00] Code montage
- [3:50] Final screen with CTA

### Music:
- Opening: Upbeat tech/startup instrumental
- Demo sections: Light ambient background
- Closing: Crescendo to logo

### Voiceover Tips:
- Energetic but professional
- Pause after key points
- Emphasize numbers ("80 out of 100", "4,500 Naira")
- Clear pronunciation of technical terms

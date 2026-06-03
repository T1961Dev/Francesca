# RaiseWise product spec (client doc alignment)

## Plans

| Plan | Price | Deck | Financial model | Investor matching |
|------|-------|------|-----------------|-------------------|
| Free | £0 | Overall score only, 1 upload ever | Locked | Locked |
| Starter | £29/mo | Full analysis + PDF | Full model + PDF | Locked |
| Pro | £79/mo | Full | Full | 10 runs/mo, 35 matches/run, outreach sequences |
| Lifetime | £349 once | Full (5 uploads/mo) | Full (5/mo) | **2 runs/mo**, 50 matches/run, **30 founders max** |

## Module 1 — Pitch deck analyser

- Eight weighted dimensions (overall score computed in code, not by the model).
- Financial signals extracted from deck text (`financial_signals` on `deck_analyses`).
- Free users: overall score + dimension names only; paid: full feedback.

## Module 2 — Financial model

- 36-month CFO-style projection from wizard inputs.
- Prefill from profile + latest deck `financial_signals`.
- Generation uses deck context when a completed analysis exists.

## Module 3 — Investor matching

- Worldwide discovery (all supported countries) with optional geo boost when profile is a specific country.
- Deck + financial model context in ranking and outreach (CFO loop).
- **3-step outreach sequence** per investor (intro, follow-up day 5, bump day 12).

## Free journey

Signup → onboarding (5 questions) → upload deck → overall score → **score-ready email** → paywall → if dismissed: **upgrade prompt email** + **one re-engagement email** (24h later, via Resend cron). See `docs/RESEND-EMAILS.md`.

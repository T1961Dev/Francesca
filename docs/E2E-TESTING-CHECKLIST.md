# RaiseWise — end-to-end testing checklist

Use this document to walk through the whole product before launch or after a major release. Work top to bottom; mark each item **Pass / Fail / Skip** and note bugs in the Notes column.

**Starting at password reset?** Use [`E2E-TESTING-FROM-RESET-PASSWORD.md`](./E2E-TESTING-FROM-RESET-PASSWORD.md) — full flow from forgot-password through the rest of the app.

For race conditions, cron jobs, and Stripe webhook edge cases, also run [`pre-launch-tests.md`](./pre-launch-tests.md).

---

## Before you start

### Environment

- [ ] All migrations in `supabase/migrations/` applied in numeric order (including `20260602120000_product_completion.sql`).
- [ ] Staging (or local) env vars set — see env list in [`pre-launch-tests.md`](./pre-launch-tests.md).
- [ ] Stripe in **test mode** with webhook forwarding to your staging URL (`stripe listen --forward-to …/api/stripe/webhook`).
- [ ] OpenAI, Apify, and Resend keys valid (investor matching and emails need real API calls).
- [ ] At least one **PDF pitch deck** ready (10–30 slides, text-based — not a scanned image PDF).

### Test accounts to create

| Label | Purpose | Suggested plan |
|-------|---------|----------------|
| **Free-A** | First-time founder journey | Free |
| **Free-B** | Second upload soft prompt | Free |
| **Starter** | Deck + financial model | Starter |
| **Pro** | Full investor matching | Pro |
| **Lifetime** | Lifetime limits (2 match runs/mo, 5 deck/mo) | Lifetime |
| **Admin** | Admin panel (email in `ADMIN_EMAILS`) | Any |
| **Non-admin** | Admin 404 check | Any |

Use **fresh emails** for signup tests (e.g. `you+free1@yourdomain.com`).

### Stripe test card

- Success: `4242 4242 4242 4242`, any future expiry, any CVC, any postcode.
- Decline: `4000 0000 0000 0002`.

### Browser setup

- [ ] Test in **Chrome** (primary) and one other browser (Safari or Firefox).
- [ ] Test **logged-out** and **logged-in** in separate windows or profiles.
- [ ] Optional: narrow viewport (~390px) for mobile layout spot-checks.

---

## 1. Public site & marketing

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 1.1 | Visit `/` | Landing loads; **full page scrolls** (hero → modules → pricing → FAQ). | | |
| 1.2 | Scroll pricing section | Starter / Pro / Lifetime cards show correct GBP prices (£29 / £79 / £349). | | |
| 1.3 | Click FAQ items | Accordions open/close without layout jump. | | |
| 1.4 | Visit `/pricing` while logged out | Pricing page loads; CTAs go to signup or checkout as designed. | | |
| 1.5 | Visit `/about` | No “placeholder” or internal dev warnings visible. | | |
| 1.6 | Visit `/privacy` and `/terms` | Readable copy; no amber “pending review” banners. | | |
| 1.7 | Footer links | About, Privacy, Terms, support email link work. | | |

---

## 2. Auth & route protection

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 2.1 | While **logged out**, open `/dashboard` | **No dashboard flash** — immediate redirect to `/login`. | | |
| 2.2 | While logged out, open `/dashboard/deck-analyser`, `/settings`, `/admin` | Redirect to login (no protected content flash). | | |
| 2.3 | Visit `/signup` | Form shows **full name, email, password only** — **no company name field**. Copy mentions company details come next. | | |
| 2.4 | Sign up as **Free-A** | Redirect to **`/onboarding`** (not dashboard). Profile created with `plan = free`. | | |
| 2.5 | Visit `/signup` while logged in | Redirect away (dashboard). | | |
| 2.6 | Log out → `/login` | “Sign in” copy; placeholder `you@company.com`. | | |
| 2.7 | Wrong password | Clear error on login page. | | |
| 2.8 | Correct login | Lands on dashboard (or onboarding if incomplete). | | |
| 2.9 | `/forgot-password` → submit email | “Check your email” (or equivalent); no crash. | | |
| 2.10 | Complete password reset via email link | Lands on `/reset-password`; new password works on login. | | |
| 2.11 | Email verification flow (if confirm email enabled) | Link in email → `/auth/callback` → **`/onboarding`** for new signups. | | |

---

## 3. Onboarding (5 steps)

Complete as **Free-A** immediately after signup.

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 3.1 | Step 1 — Company name | Required; saves and advances. | | |
| 3.2 | Step 2 — Sector | Dropdown (SaaS, FinTech, …). | | |
| 3.3 | Step 3 — Stage | Pre-seed / Seed / Series A radio. | | |
| 3.4 | Step 4 — Target raise + currency | Number + GBP/EUR/USD. | | |
| 3.5 | Step 5 — Geography | Country list including Worldwide. | | |
| 3.6 | After step 5 | “You’re all set” → **Go to dashboard**. | | |
| 3.7 | Before finishing, manually visit `/dashboard/deck-analyser` | Redirect back to **`/onboarding`** until all 5 fields saved. | | |
| 3.8 | Progress bar | Updates 20% → 100% across steps. | | |

---

## 4. Dashboard shell & layout

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 4.1 | Dashboard home | “Welcome back, {first name}” (or company if no name). Plan badge shows `free`. | | |
| 4.2 | Sidebar navigation | Deck Analyser, Financial Model, Investor Matching, Billing, Settings all reachable. | | |
| 4.3 | **Scroll behaviour** | Dashboard pages: **main area fixed**; list panels (history, jobs) scroll **inside** their cards — page body does not scroll. | | |
| 4.4 | Landing `/` only | Only the marketing homepage scrolls the full window. | | |
| 4.5 | Log out from sidebar | Session cleared; redirect to login. | | |

---

## 5. Module 1 — Deck analyser (Free)

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 5.1 | `/dashboard/deck-analyser` | Upload card visible; **Analysis history** list (empty or prior). | | |
| 5.2 | Hero card on deck page | **No** “Start analysis” button linking to the same page. | | |
| 5.3 | Upload PDF (Free-A, first upload) | Progress shown; analysis completes (may take 1–3 min). | | |
| 5.4 | Open completed analysis | **Locked view**: overall score visible; **8 dimension names** visible; scores/feedback **blurred or locked**. Upgrade CTA present. | | |
| 5.5 | Paywall modal | Appears after analysis; plans shown; **“Maybe later”** dismisses. | | |
| 5.6 | Analysis history | New row appears; list scrolls internally if many items. | | |
| 5.7 | Re-open analysis from history | Same locked view; score consistent. | | |

### Free second upload prompt (Free-B)

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 5.8 | Upload 2nd deck on Free (after 1st) | Soft prompt: "You've used your free analysis. Upgrade to upload again." | | |
| 5.9 | Click upgrade CTA | Upgrade flow opens; no second free upload starts. | | |

---

## 6. Billing & upgrades

### Starter upgrade

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 6.1 | From paywall or `/pricing`, choose **Starter** | Stripe Checkout opens (test mode). | | |
| 6.2 | Complete payment | Redirect back; webhook sets `profiles.plan = starter`. | | |
| 6.3 | Return to deck analysis | **Full analysis unlocked**; success banner if `?checkout=success`. | | |
| 6.4 | `/dashboard/billing` | Shows Starter; **Manage billing** opens Stripe portal. | | |

### Pro upgrade (use **Pro** account or upgrade Starter → Pro)

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 6.5 | Upgrade to Pro | `plan = pro`; investor matching unlocked. | | |
| 6.6 | `/dashboard/investor-matching` intro copy | Mentions **worldwide** search (not “region and US” only). | | |

### Lifetime

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 6.7 | `/pricing` Lifetime card | Shows 30-founder cap messaging. | | |
| 6.8 | Purchase Lifetime | `plan = lifetime`; no cancel subscription CTA on billing. | | |
| 6.9 | When inventory full (30 sold) | Lifetime hidden or checkout returns sold-out error. | | |

### Subscription lifecycle

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 6.10 | Cancel Starter/Pro via Stripe portal | `plan_cancels_at` set; features remain until period end. | | |
| 6.11 | After subscription deleted (Stripe test clock or CLI) | `plan` reverts to `free`; full deck locks again. | | |

---

## 7. Module 1 — Deck analyser (Paid)

On **Starter** or **Pro** account with a completed upload:

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 7.1 | Full analysis view | Overall score + **8 categories** with scores, feedback, and **weight %** (e.g. “20% wt” on Traction). | | |
| 7.2 | Slideshow / sections | Suggested fixes, priority actions, narrative sections render. | | |
| 7.3 | **Export PDF** | Downloads readable PDF with company name and scores. | | |
| 7.4 | Upload within monthly limit | Succeeds; usage counter increments. | | |
| 7.5 | Exceed monthly deck limit | 402 / limit modal — clear message, upgrade path. | | |

---

## 8. Module 2 — Financial model

On **Starter+** account (ideally after a deck analysis exists):

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 8.1 | `/dashboard/financial-model` while Free | Locked / redirect to pricing. | | |
| 8.2 | Open on Starter+ | 4-step wizard loads; **prefill** from profile (company, sector, geography, raise). | | |
| 8.3 | Deck prefill hint | If deck analysis exists, hint that financial signals from deck were applied. | | |
| 8.4 | Try **Generate** with empty required fields | Validation blocks; user stays on step with error. | | |
| 8.5 | Complete all steps → Generate | Job runs; result page with 36-month slideshow. | | |
| 8.6 | Charts / tables | Revenue, burn, runway sensible; no blank slides. | | |
| 8.7 | **Export PDF** | Downloads successfully. | | |
| 8.8 | Form scroll on long steps | Wizard scrolls inside panel on small viewport. | | |
| 8.9 | Monthly limit (Lifetime: 5/mo) | 5th run OK; 6th blocked with limit message. | | |

---

## 9. Module 3 — Investor matching

On **Pro** or **Lifetime** account with a **completed deck analysis**.

### Manual launch

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 9.1 | `/dashboard/investor-matching` while Starter | Locked state / pricing redirect. | | |
| 9.2 | Open on Pro | **Recent jobs** list scrolls internally; launcher to pick deck. | | |
| 9.3 | Start match from launcher | Job created; progress UI updates (polling). | | |
| 9.4 | Wait for completion | Status → `completed`; ranked investors appear. | | |
| 9.5 | Match count | **25** on Pro or Lifetime when enough qualified leads exist. | | |
| 9.6 | Open a match row | Fit explanation, firm, partner details visible. | | |

### Auto-start after deck upload (Pro/Lifetime)

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 9.7 | Upload new deck on Pro (quota available) | Matching job starts **silently** in background (check Recent jobs). | | |
| 9.8 | Upload when monthly match quota exhausted | Deck analysis still completes; **no** failed match noise in UI. | | |

### Outreach sequences

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 9.9 | Outreach editor on a match | **3 steps**: Intro (day 0), Follow-up (day 5), Final bump (day 12). | | |
| 9.10 | Edit subject/body → Save | Persists on refresh. | | |
| 9.11 | Regenerate with instruction | New copy generated; no `[Name]` placeholders. | | |
| 9.12 | Copy to clipboard | Toast / success feedback. | | |

### Export & job controls

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 9.13 | **Export CSV** and **Export PDF** | Files download with investor list. | | |
| 9.14 | **Cancel** running job | Job → `cancelled`; progress stops. | | |
| 9.15 | **Retry** failed job | New attempt starts; error message was shown on failure. | | |
| 9.16 | Lifetime: 2 match runs in same month | 3rd run blocked with clear limit message. | | |

---

## 10. Settings & profile

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 10.1 | `/dashboard/settings` | Page scrolls internally; form + billing summary visible. | | |
| 10.2 | Email field | Read-only; copy says sign-in email ( **not** “Supabase Auth”). | | |
| 10.3 | Profile fields | **No duplicates**: single Sector, Stage, Geography (not separate Industry / Funding stage / Location). | | |
| 10.4 | Edit company name → Save | Success alert; sidebar/context updates after refresh. | | |
| 10.5 | Values match onboarding | Same company, sector, stage, raise, geography. | | |
| 10.6 | **Download my data** | JSON/ZIP export downloads. | | |
| 10.7 | **Delete account** → confirm | Logged out immediately; profile soft-deleted. | | |

---

## 11. Admin (admin email only)

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 11.1 | Non-admin visits `/admin` | **404** (not forbidden page with data leak). | | |
| 11.2 | Admin visits `/admin` | Users list loads. | | |
| 11.3 | Search user by email | Filters correctly. | | |
| 11.4 | User detail `/admin/users/[id]` | Profile, usage, exports visible. | | |
| 11.5 | `/admin/revenue`, `/admin/funnel`, `/admin/costs`, `/admin/failures`, `/admin/lifetime` | Each page loads without error. | | |

---

## 12. Emails (Resend)

See [`RESEND-EMAILS.md`](./RESEND-EMAILS.md). Requires `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, verified domain.

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 12.1 | Complete onboarding → open dashboard | **Welcome** email; CTA → `/onboarding` or dashboard. | | |
| 12.2 | Deck analysis completes | **Score ready** email; CTA → `/dashboard/deck-analyser/{id}`. | | |
| 12.3 | Locked deck → paywall → **Maybe later** | **Upgrade prompt** email (once per analysis). | | |
| 12.4 | Same as 12.3, wait 24h or force `scheduled_for` in DB + run re-engagement cron | **Re-engagement** email; CTA → analysis. | | |
| 12.5 | Stripe test: fail payment 1–2× | **Payment failed** email with billing link. | | |
| 12.6 | Third failed payment | **Subscription paused** email; plan → free. | | |

---

## 13. Cross-cutting UX polish (regression)

Quick pass after the recent UX fixes:

| # | Check | Pass | Notes |
|---|-------|------|-------|
| 13.1 | Signup has no company name field | | |
| 13.2 | Login/signup use consistent “Sign in” / “Create account” wording | | |
| 13.3 | No self-referential CTAs (button on page A that links to page A) | | |
| 13.4 | No visible “placeholder” dev copy on public pages | | |
| 13.5 | Logged-out dashboard visit — zero flash of authenticated UI | | |
| 13.6 | Investor matching copy says worldwide | | |
| 13.7 | Settings profile — no duplicate field labels | | |

---

## 14. Plan limits reference (verify during tests)

| Plan | Deck uploads | Financial models | Match runs / month | Matches / run |
|------|-------------|------------------|-------------------|---------------|
| **Free** | 1 ever | Locked | Locked | — |
| **Starter** | 10 / month | 10 / month | Locked | — |
| **Pro** | 25 / month | 25 / month | 10 | 25 |
| **Lifetime** | 5 / month | 5 / month | **2** | 25 |

Free deck: overall score + dimension **names** only. Paid: full feedback, PDF export, financial model, and (Pro+) matching.

---

## 15. Sign-off

| Area | Tester | Date | Pass / Fail |
|------|--------|------|-------------|
| Public & auth | | | |
| Onboarding | | | |
| Deck analyser | | | |
| Billing / Stripe | | | |
| Financial model | | | |
| Investor matching | | | |
| Settings / GDPR | | | |
| Admin | | | |
| Emails | | | |
| UX regression | | | |

**Release recommendation:** Do not ship until all **critical** paths pass (sections 2–9, 6, 10.7) and [`pre-launch-tests.md`](./pre-launch-tests.md) technical tests pass.

---

## Bug log template

| ID | Section | Steps to reproduce | Expected | Actual | Severity |
|----|---------|-------------------|----------|--------|----------|
| 1 | | | | | P0 / P1 / P2 |

**Severity:** P0 = blocks launch (auth, payment, data loss). P1 = major feature broken. P2 = polish / edge case.

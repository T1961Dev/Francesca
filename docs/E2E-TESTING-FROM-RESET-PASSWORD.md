# RaiseWise — E2E testing from password reset onwards

Use this checklist when you already have (or had) test accounts and want to start at **forgot / reset password**, then run through the rest of the app. Mark each row **Pass / Fail / Skip** and use the bug log at the bottom.

For signup, landing page, and full pre-reset auth, see [`E2E-TESTING-CHECKLIST.md`](./E2E-TESTING-CHECKLIST.md) sections 1–2.

For Stripe race conditions and cron edge cases, see [`pre-launch-tests.md`](./pre-launch-tests.md).

---

## Before you start (reset + app)

### Prerequisites

- [ ] App running (`npm run dev` or staging URL).
- [ ] `NEXT_PUBLIC_APP_URL` matches the URL you test in the browser (e.g. `http://localhost:3000`).
- [ ] Supabase **redirect URLs** configured — see [`SUPABASE-AUTH-REDIRECTS.md`](./SUPABASE-AUTH-REDIRECTS.md).
- [ ] At least one **existing user** in Supabase Auth with a known email (from a prior signup test).
- [ ] `RESEND_API_KEY` + `RESEND_FROM_EMAIL` set (for product emails after deck upload).
- [ ] Stripe test mode + webhook forwarding if testing billing.
- [ ] One **text-based PDF** deck ready for upload tests.

### Supabase dashboard (password reset)

| Setting | Local value |
|---------|-------------|
| Site URL | `http://localhost:3000` |
| Redirect URLs | `http://localhost:3000/auth/callback`, `http://localhost:3000/auth/callback/**` |

### Test accounts (reuse or create after reset)

| Label | Email pattern | Plan to test |
|-------|---------------|--------------|
| **Reset-user** | `you+reset@yourdomain.com` | Use for sections 1–2; then continue as Free |
| **Free-A** | Fresh email if needed for full free journey | Free |
| **Starter** | After upgrade from Free | Starter |
| **Pro** | Separate account or upgrade | Pro |

**Tip:** If Supabase shows “email rate limit exceeded”, wait ~1 hour, use `you+reset2@…`, or disable **Confirm email** for dev (see auth redirects doc).

### Stripe test card

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

---

## 1. Password reset (Supabase + app)

Use **Reset-user** — an account that already exists. Stay **logged out** in the browser (or use a private window).

### 1A — Request reset link

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 1.1 | Open `/login` → **Forgot your password?** | Goes to `/forgot-password`. | | |
| 1.2 | Submit a **valid** registered email | “Check your inbox” / sent state; no crash. | | |
| 1.3 | Submit an **unregistered** email | Same neutral “check your inbox” (no email enumeration). | | |
| 1.4 | Submit invalid email format | Validation error on forgot-password page. | | |
| 1.5 | Spam reset requests quickly | App message “Too many attempts…” (app rate limit) OR Supabase rate limit message if hit. | | |

### 1B — Email link → new password

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 1.6 | Open reset email (use **private window** if link fails first time) | Link goes through Supabase verify, **not** stuck on landing `/` only. | | |
| 1.7 | After click, URL briefly hits `/auth/callback?…` then **`/reset-password`** | “Choose a new password” form visible. | | |
| 1.8 | If link lands on `/` with `?code=` | Page should forward to callback → reset-password (auto). | | |
| 1.9 | Enter password & confirm **mismatch** | Error on `/reset-password`; stay on form. | | |
| 1.10 | Enter password **&lt; 8 characters** | Validation error. | | |
| 1.11 | Enter matching passwords (8+) → submit | Redirect to **`/login?message=password-updated`** (or equivalent success). | | |
| 1.12 | Sign in with **old** password | Fails (“Incorrect email or password”). | | |
| 1.13 | Sign in with **new** password | Success → dashboard or onboarding if profile incomplete. | | |

### 1C — Reset edge cases

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 1.14 | Open `/reset-password` **without** going through email link | Redirect to forgot-password with “link expired” style message. | | |
| 1.15 | Re-use **same** reset link after success | Error / login redirect (one-time link). | | |
| 1.16 | Open expired link (wait or use old email) | Login error or forgot-password prompt; no crash. | | |
| 1.17 | While logged in, visit `/forgot-password` | Works or redirects sensibly (no duplicate session confusion). | | |

---

## 2. Sign in & route protection (post-reset)

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 2.1 | Log out if needed → visit `/dashboard` | **No dashboard flash** → `/login`. | | |
| 2.2 | Logged out: `/dashboard/settings`, `/admin`, `/onboarding` | Redirect to login (or auth gate). | | |
| 2.3 | Sign in with new password | Dashboard (or `/onboarding` if 5 fields missing). | | |
| 2.4 | Visit `/login` while logged in | Redirect to dashboard. | | |
| 2.5 | Wrong password on login | Clear error; no crash. | | |
| 2.6 | `/settings` (short URL) while logged in | Redirect to `/dashboard/settings`. | | |
| 2.7 | Random URL `/nope` logged in | Redirect to `/dashboard`. | | |
| 2.8 | Random URL logged out (after visiting `/login` once) | Back to login (or last auth page visited). | | |

---

## 3. Onboarding (only if profile incomplete)

Skip if **Reset-user** already completed onboarding.

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 3.1 | Steps 1–5: company, sector, stage, raise, geography | Each saves; progress 20%→100%. | | |
| 3.2 | Try `/dashboard` mid-onboarding | Redirect to `/onboarding`. | | |
| 3.3 | Finish step 5 | “You’re all set” → dashboard. | | |

---

## 4. Dashboard shell & layout

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 4.1 | Dashboard home | Welcome line + plan badge (`free` / paid). | | |
| 4.2 | Sidebar: Deck, Financial model, Investor matching, Billing, Settings | All open without error. | | |
| 4.3 | List panels (deck history, match jobs) | Scroll **inside** card; page body does not scroll. | | |
| 4.4 | `/` landing while logged in | Can open; full-page scroll on marketing only. | | |
| 4.5 | Log out from sidebar | Session cleared → login. | | |

---

## 5. Welcome email (Resend)

After onboarding complete, first dashboard load triggers welcome (once).

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 5.1 | Open dashboard after onboarding | **Welcome** email in inbox (check Resend dashboard logs). | | |
| 5.2 | Refresh dashboard repeatedly | No duplicate welcome (`welcome_email_sent` in DB). | | |

---

## 6. Module 1 — Deck analyser (Free)

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 6.1 | `/dashboard/deck-analyser` | Upload card + analysis history. | | |
| 6.2 | Upload PDF (1st time on Free) | Completes; processing UI OK. | | |
| 6.3 | **Score ready** email | Arrives with link to `/dashboard/deck-analyser/{id}`. | | |
| 6.4 | Open analysis | Locked: score + 8 dimension **names**; feedback locked. | | |
| 6.5 | Paywall → **Maybe later** | Modal closes; **no** re-engagement scheduled on page load alone. | | |
| 6.6 | After Maybe later | **Upgrade prompt** email (once per analysis). | | |
| 6.7 | History list | New row; internal scroll if many items. | | |

### Free second upload prompt (optional second Free account)

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 6.8 | 2nd upload on Free | Soft prompt: "You've used your free analysis. Upgrade to upload again." | | |
| 6.9 | Click upgrade CTA | Upgrade flow opens; no second free upload starts. | | |

---

## 7. Re-engagement email (24h)

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 7.1 | After 6.6, in Supabase SQL: `update re_engagement_emails set scheduled_for = now() where user_id = '<uuid>'` | Row exists for user. | | |
| 7.2 | `POST /api/cron/re-engagement` with `Authorization: Bearer $CRON_SECRET` | `{ sent: 1 }` (if still on free). | | |
| 7.3 | Inbox | Re-engagement email; CTA opens analysis. | | |
| 7.4 | Upgrade to Starter before cron | Email **cancelled** / not sent (still free check). | | |

---

## 8. Billing & upgrades

### Starter

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 8.1 | Paywall or `/pricing` → **Starter** → pay | Stripe Checkout (test). | | |
| 8.2 | Return to app | `plan = starter`; deck **full** analysis unlocked. | | |
| 8.3 | `/dashboard/billing` | Starter shown; **Manage billing** → Stripe portal. | | |

### Pro (optional)

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 8.4 | Upgrade to Pro | Investor matching unlocked. | | |
| 8.5 | Investor matching intro | Copy mentions **worldwide** search. | | |

### Subscription lifecycle (optional)

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 8.6 | Cancel in Stripe portal | `plan_cancels_at` set; access until period end. | | |
| 8.7 | After subscription ends | `plan = free`; deck locks again. | | |
| 8.8 | Failed payment 1–2× (test card) | **Payment failed** Resend email. | | |
| 8.9 | 3rd failed payment | Downgrade to free + final email. | | |

---

## 9. Module 1 — Deck analyser (Paid)

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 9.1 | Full analysis | 8 categories with scores, feedback, **weight %**. | | |
| 9.2 | Slideshow / fixes / actions | Renders completely. | | |
| 9.3 | Export PDF | Downloads; readable. | | |
| 9.4 | Exceed monthly deck limit | Limit modal / 402; upgrade path. | | |

---

## 10. Module 2 — Financial model

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 10.1 | Free plan | Locked or pricing redirect. | | |
| 10.2 | Starter+: wizard opens | Prefill from profile (+ deck hint if analysis exists). | | |
| 10.3 | Generate with empty required fields | Blocked with validation. | | |
| 10.4 | Complete wizard → Generate | 36-month result / slideshow. | | |
| 10.5 | Export PDF | Downloads. | | |

---

## 11. Module 3 — Investor matching (Pro / Lifetime)

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 11.1 | Starter | Locked / pricing. | | |
| 11.2 | Pro: start match from launcher | Job runs; progress updates. | | |
| 11.3 | Job completes | 25 matches on Pro or Lifetime when enough qualified leads exist. | | |
| 11.4 | Outreach editor | 3 steps (day 0 / 5 / 12); save + regenerate. | | |
| 11.5 | Export CSV + PDF | Download. | | |
| 11.6 | Cancel / retry failed job | Works as expected. | | |
| 11.7 | Pro: upload deck with match quota | Auto job in Recent jobs (silent). | | |
| 11.8 | Lifetime: 3rd match run same month | Blocked with clear limit. | | |

---

## 12. Settings & GDPR

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 12.1 | `/dashboard/settings` | Internal scroll; profile + billing summary. | | |
| 12.2 | Email field | Read-only; no “Supabase Auth” jargon. | | |
| 12.3 | Profile fields | Single Sector / Stage / Geography (no duplicates). | | |
| 12.4 | Save profile change | Success alert. | | |
| 12.5 | Download my data | Export downloads. | | |
| 12.6 | Delete account → confirm | Logged out; cannot sign in with same session. | | |

**After 12.6:** use a **new** email if you need to repeat sections 6–11.

---

## 13. Admin (if your email is in `ADMIN_EMAILS`)

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| 13.1 | Non-admin → `/admin` | 404. | | |
| 13.2 | Admin → `/admin` | Users list loads. | | |
| 13.3 | User search + detail page | Data visible. | | |
| 13.4 | Revenue, funnel, costs, failures, lifetime | Pages load. | | |

---

## 14. Plan limits quick reference

| Plan | Deck | Financial model | Match runs/mo | Matches/run |
|------|------|-----------------|---------------|-------------|
| Free | 1 ever | — | — | — |
| Starter | 10/mo | 10/mo | — | — |
| Pro | 25/mo | 25/mo | 10 | 25 |
| Lifetime | 5/mo | 5/mo | **2** | 25 |

---

## 15. Recommended test order (one session)

1. **Section 1** — Full password reset on Reset-user  
2. **Section 2** — Sign in + 404 redirects  
3. **Sections 4–6** — Dashboard, welcome, free deck + emails  
4. **Section 7** — Re-engagement (SQL + cron)  
5. **Sections 8–9** — Upgrade Starter, full deck  
6. **Section 10** — Financial model  
7. **Sections 8 + 11** — Pro upgrade, investor matching (if time)  
8. **Section 12** — Settings (delete last if you need the account again)

---

## 16. Sign-off

| Area | Tester | Date | Pass / Fail |
|------|--------|------|-------------|
| Password reset | | | |
| Auth & routes | | | |
| Dashboard / deck (Free) | | | |
| Resend emails | | | |
| Billing | | | |
| Deck (Paid) | | | |
| Financial model | | | |
| Investor matching | | | |
| Settings / GDPR | | | |
| Admin | | | |

---

## Bug log

| ID | Section | Steps to reproduce | Expected | Actual | Severity |
|----|---------|-------------------|----------|--------|----------|
| 1 | | | | | P0 / P1 / P2 |

**Severity:** P0 = auth/payment/data loss. P1 = major feature broken. P2 = polish.

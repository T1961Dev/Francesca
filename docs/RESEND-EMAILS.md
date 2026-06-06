# Resend transactional emails

RaiseWise uses [Resend](https://resend.com/docs/send-with-nextjs) for product emails. Auth emails (signup confirm, password reset) are sent by **Supabase Auth** unless you configure Resend as Supabase SMTP.

## Environment

**Render + local (`.env.local`, never commit):**

```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="RaiseWise <hello@yourdomain.com>"
RESEND_REPLY_TO=support@yourdomain.com   # optional
CRON_SECRET=...                          # required for cron routes
ADMIN_EMAILS=you@company.com             # health-check digest
```

Domain must be verified in [Resend → Domains](https://resend.com/domains). For local smoke tests only you may use `onboarding@resend.dev` (not for production).

### Verify after deploy

```
GET https://your-app.com/api/health/resend
```

Expect `"ok": true` with `apiKeyPresent` and `fromPresent` true.

## Email catalogue (product scope)

| Type | When | Deduped |
|------|------|---------|
| `welcome` | Onboarding step 5 complete + dashboard bootstrap fallback | `welcome_email_sent` + idempotency `welcome/{userId}` |
| `score_ready` | Deck analysis completes | Per `analysisId` in `email_events` |
| `upgrade_prompt` | Free user dismisses paywall (Maybe later) | Per `analysisId`; sets `upgrade_prompt_sent` |
| `re_engagement` | 24h after paywall dismiss (still free) | One row per user (`re_engagement_emails`) |
| `payment_failed` | Stripe invoice payment failed (attempts 1–2) | Per attempt idempotency key |
| `payment_failed_final` | Third failed payment → downgraded to free | Per attempt |
| `lifetime_refund_race` | Lifetime checkout lost race | Stripe webhook |
| `health_check` | Daily admin digest | Cron → `ADMIN_EMAILS` |

## Free journey (spec)

1. Signup → onboarding → upload deck  
2. **Score ready** email with link to `/dashboard/deck-analyser/{id}`  
3. Paywall → user clicks **Maybe later** → `POST /api/paywall/dismiss` with `{ dismissed: true, analysisId, score }`  
4. **Upgrade prompt** sent immediately (once per analysis)  
5. **Re-engagement** scheduled +24h; cron `/api/cron/re-engagement` every 5 minutes sends if still on free  

## Implementation

- `lib/resend/send.ts` — Resend SDK, `{ data, error }` handling, idempotency keys, tags, plain-text fallback  
- `lib/resend/emails.ts` — typed send helpers  
- `lib/resend/templates.ts` — HTML bodies with CTA buttons  

## QA API routes (authenticated)

- `POST /api/resend/welcome`  
- `POST /api/resend/score-ready` — body `{ analysisId, score? }`  
- `POST /api/resend/upgrade-prompt` — body `{ analysisId? }`  

## Cron (Vercel or Render)

`vercel.json` schedules crons on **Vercel only**. On **Render**, use [cron-job.org](https://cron-job.org) or Render Cron Jobs:

| Schedule | URL | Header |
|----------|-----|--------|
| `*/5 * * * *` | `https://your-app.com/api/cron/re-engagement` | `Authorization: Bearer {CRON_SECRET}` |
| `0 8 * * *` | `https://your-app.com/api/cron/health-check` | same |

`CRON_SECRET` must be set or cron routes return 401.

## Auth emails (Supabase → Resend SMTP)

Signup confirm and password reset are sent by **Supabase Auth**. Point Supabase at Resend SMTP so auth and product mail share one provider — see `docs/SUPABASE-AUTH-REDIRECTS.md` (Resend SMTP section).

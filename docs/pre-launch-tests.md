# RaiseWise pre-launch tests

Run all 10 tests in a staging environment using **live-mode** Stripe keys (test
cards, not real money). Do not launch until every test passes.

Before starting:

- Apply every migration in `supabase/migrations/` in numeric order.
- Set all env vars below in the staging environment.
- Configure Sentry alerts (see the bottom of this file).

## Required env vars

```
NEXT_PUBLIC_APP_URL=https://staging.raisewise.app
APP_URL=https://staging.raisewise.app
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRICE_STARTER_GBP=...
STRIPE_PRICE_STARTER_EUR=...
STRIPE_PRICE_STARTER_USD=...
STRIPE_PRICE_PRO_GBP=...
STRIPE_PRICE_PRO_EUR=...
STRIPE_PRICE_PRO_USD=...
STRIPE_PRICE_LIFETIME_GBP=...
STRIPE_PRICE_LIFETIME_EUR=...
STRIPE_PRICE_LIFETIME_USD=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL="RaiseWise <hello@raisewise.app>"
OPENAI_API_KEY=...
APIFY_TOKEN=...
APIFY_WEBHOOK_SECRET=...
CRON_SECRET=...
ADMIN_EMAILS=tomasjonesdev@gmail.com
NEXT_PUBLIC_SUPPORT_EMAIL=tomasjonesdev@gmail.com
SENTRY_DSN=...
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=...
```

## Tests

1. **Lifetime race condition**

   - In Supabase SQL: `update public.lifetime_inventory set current_count = 29`.
   - Open two browsers as two different users on `/pricing`. Click **Choose Lifetime**
     in both within 1 second. Use Stripe test cards `4242 4242 4242 4242`.
   - Expect: exactly one Checkout succeeds, the other gets a 409
     "Lifetime is sold out" response **or** completes payment and is automatically
      refunded with an apology email. After confirmation, `current_count = 30`,
     `/pricing` and `/dashboard/billing` no longer show the Lifetime card, and
     the Lifetime price is `active = false` in Stripe (check the Stripe dashboard
     or `stripe.prices.retrieve(...)`). Repeat 5×.

2. **Stripe subscription cycle (Starter)**

   - Sign up Free → upload deck → see paywall → click **Choose Starter** → pay.
   - Expect: webhook fires `checkout.session.completed`, `profiles.plan = 'starter'`,
     `profiles.stripe_customer_id` and `profiles.stripe_subscription_id` populated.
   - Visit `/dashboard/financial-model` → confirm Module 2 is unlocked.
   - Open `/dashboard/billing` → **Manage billing** → cancel from Stripe portal.
   - Expect: `plan_cancels_at` set, Module 2 still works until period end.
   - Use Stripe CLI to advance time / trigger `customer.subscription.deleted`:
     expect `profiles.plan = 'free'` immediately.

3. **Stripe subscription cycle (Pro)** — repeat test 2 with Pro plan and verify
   `/dashboard/investor-matching` unlocks/locks accordingly.

4. **Lifetime full cycle**

   - Sign up Free → buy Lifetime → confirm `profiles.plan = 'lifetime'`,
     `lifetime_purchased_at` set, `current_count` incremented by 1.
   - Confirm `/dashboard/billing` does not show a "Cancel" CTA.
   - Trigger a refund manually from the Stripe dashboard.
   - Expect (per business policy): the user remains Lifetime in your DB unless
     you wire a refund handler — document this for the client.

5. **Usage limit race**

   - As a Starter user with `deck_uploads_this_month = 9` in `user_usage`,
     fire two simultaneous `POST /api/deck/upload` requests (curl & a second
     curl backgrounded).
   - Expect: one returns 200 (`success: true`), one returns 402 with
     `error: "limit_reached"`.

6. **Free user paywall flow**

   - New email → sign up → complete onboarding → upload deck → see blurred
     analysis + lock icons + Upgrade CTA.
   - Click "Maybe later" on the paywall modal.
   - In Supabase: `update public.re_engagement_emails set scheduled_for = now()
     where user_id = '<uuid>'`.
   - Hit `POST /api/cron/re-engagement` with `Authorization: Bearer $CRON_SECRET`.
   - Expect: email arrives within 1 minute in Gmail, Outlook, and Apple Mail.
     Clicking the CTA lands on the paywall.

7. **Free second upload prompt**

   - Sign up Free → upload 1 deck → try to upload a 2nd → expect:
     "You've used your free analysis. Upgrade to upload again."
   - Click the upgrade CTA → expect the upgrade flow; no second free upload starts.

8. **Cost ceiling**

   - As a Pro user with real Apify + OpenAI billing, run one investor match
     end-to-end. After completion confirm
     `select total_cost_usd from investor_matching_jobs where id = '<job>'`
     matches Apify dashboard charges within $0.50.

9. **Onboarding gate**

   - New user → after signup, manually visit `/dashboard` → expect a redirect
     to `/onboarding`. Cannot reach any protected page until all 5 fields are
     saved.

10. **Admin access**

    - Log in as a non-admin email → visit `/admin` → expect a 404.
    - Log in as `tomasjonesdev@gmail.com` → visit `/admin` → expect Users page
      to load.

11. **GDPR delete**

    - From Settings → Danger Zone → Delete my account → confirm modal.
    - Expect: immediate logout, `profiles.deleted_at` set.
    - `update public.profiles set deleted_at = now() - interval '31 days' where
      id = '<uuid>'` then `POST /api/cron/hard-delete` with the cron secret.
    - Expect: user is fully removed from `auth.users`, related rows cascade,
      Stripe subscription cancelled.

## Sentry alerts to wire up in the Sentry dashboard

Create the following alerts with **route to**: admin email list and Slack channel
if available.

- **Investor pipeline failures** — Event filter: `route:investors-*` OR
  `route:deck-upload-investor-matching` OR `pipeline_stage:start_failed`.
  Trigger: 1 event in 1 minute.
- **Deck analysis failures** — Event filter: `route:deck-upload` OR
  `route:deck-analyse`. Trigger: 1 event in 1 minute.
- **Stripe webhook non-200** — Event filter: `route:stripe-webhook`. Trigger:
  3 events in 5 minutes.
- **Cron failures** — Event filter: `route:cron-*`. Trigger: 1 event in 15 minutes.

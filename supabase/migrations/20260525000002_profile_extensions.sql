-- Production hardening: extend profiles with all columns required by the
-- Stripe lifecycle, onboarding wizard, paywall, WhatsApp capture, welcome
-- email, and GDPR delete flows.

alter table public.profiles
  add column if not exists stripe_subscription_id text,
  add column if not exists plan_cancels_at timestamptz,
  add column if not exists failed_payment_count integer default 0 not null,
  add column if not exists lifetime_purchased_at timestamptz,
  add column if not exists paywall_dismissed_at timestamptz,
  add column if not exists welcome_email_sent boolean default false not null,
  -- Onboarding wizard fields (some already exist as legacy columns).
  add column if not exists sector text,
  add column if not exists geography text,
  add column if not exists target_raise_currency text,
  -- WhatsApp capture flow (Part 8).
  add column if not exists whatsapp_number text,
  -- GDPR soft delete (Part 16). A daily job hard-deletes after 30 days.
  add column if not exists deleted_at timestamptz;

create index if not exists profiles_stripe_subscription_id_idx
  on public.profiles(stripe_subscription_id);

create index if not exists profiles_deleted_at_idx
  on public.profiles(deleted_at)
  where deleted_at is not null;

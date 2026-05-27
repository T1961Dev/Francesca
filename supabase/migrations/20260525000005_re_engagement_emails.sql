-- Part 9: Re-engagement email queue. One email per user (deduped).

create table if not exists public.re_engagement_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  analysis_id uuid,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  cancelled_at timestamptz,
  subject text not null,
  body jsonb not null,
  created_at timestamptz default now() not null
);

create unique index if not exists re_engagement_emails_user_unique
  on public.re_engagement_emails(user_id);

create index if not exists re_engagement_emails_cron_idx
  on public.re_engagement_emails(scheduled_for, sent_at, cancelled_at);

alter table public.re_engagement_emails enable row level security;

drop policy if exists "re_engagement_emails_read_own" on public.re_engagement_emails;
create policy "re_engagement_emails_read_own"
  on public.re_engagement_emails
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Writes are service-role only.

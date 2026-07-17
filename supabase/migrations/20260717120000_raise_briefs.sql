-- Raise Brief: versioned strategy + production outputs for investor teasers

create table if not exists public.raise_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  deck_analysis_id uuid references public.deck_analyses (id) on delete set null,
  financial_model_id uuid references public.financial_models (id) on delete set null,
  investor_match_job_id uuid references public.investor_matching_jobs (id) on delete set null,
  investor_key text,
  status text not null default 'strategy_pending'
    check (status in (
      'strategy_pending',
      'strategy_ready',
      'producing',
      'ready',
      'failed'
    )),
  strategy jsonb,
  production jsonb,
  workspace_snapshot jsonb,
  overall_quality jsonb,
  founder_notes text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_raise_briefs_user_created
  on public.raise_briefs (user_id, created_at desc);

create index if not exists idx_raise_briefs_user_status
  on public.raise_briefs (user_id, status);

alter table public.raise_briefs enable row level security;

create policy "Users read own raise briefs" on public.raise_briefs
for select to authenticated using (auth.uid() = user_id);

create policy "Users insert own raise briefs" on public.raise_briefs
for insert to authenticated with check (auth.uid() = user_id);

create policy "Users update own raise briefs" on public.raise_briefs
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users delete own raise briefs" on public.raise_briefs
for delete to authenticated using (auth.uid() = user_id);

create policy "Service role full raise briefs access" on public.raise_briefs
for all to service_role using (true) with check (true);

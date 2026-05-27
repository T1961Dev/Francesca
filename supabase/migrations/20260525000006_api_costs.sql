-- Part 14: API cost tracking. One row per external call; admin dashboards roll
-- these up by user / plan / run.

create table if not exists public.api_costs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  run_id uuid,
  run_type text check (run_type in ('deck_analysis', 'financial_model', 'investor_match')),
  provider text check (provider in ('apify', 'openai')),
  actor_or_model text,
  cost_usd numeric not null default 0,
  metadata jsonb,
  created_at timestamptz default now() not null
);

create index if not exists api_costs_user_created_idx
  on public.api_costs(user_id, created_at desc);
create index if not exists api_costs_run_type_created_idx
  on public.api_costs(run_type, created_at desc);
create index if not exists api_costs_run_id_idx
  on public.api_costs(run_id);

alter table public.api_costs enable row level security;

drop policy if exists "api_costs_read_own" on public.api_costs;
create policy "api_costs_read_own"
  on public.api_costs
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Writes are service-role only.

alter table public.investor_matching_jobs
  add column if not exists total_cost_usd numeric default 0;

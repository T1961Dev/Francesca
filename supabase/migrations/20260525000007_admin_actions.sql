-- Part 15: Admin action audit log + lightweight status/error columns on the
-- existing module tables so /admin/failures can list everything in one place.

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb,
  created_at timestamptz default now() not null
);

create index if not exists admin_actions_created_idx on public.admin_actions(created_at desc);

alter table public.admin_actions enable row level security;

-- No SELECT/INSERT policies → reads/writes happen via service-role only.

alter table public.deck_analyses
  add column if not exists status text default 'completed',
  add column if not exists error text;

alter table public.financial_models
  add column if not exists status text default 'completed',
  add column if not exists error text;

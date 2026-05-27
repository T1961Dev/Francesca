-- Part 4: Lifetime inventory hard cap. Single-row table protected by RLS so
-- only the service role can write; authenticated users can read the counter.

create table if not exists public.lifetime_inventory (
  id integer primary key check (id = 1),
  current_count integer not null default 0 check (current_count >= 0),
  max_count integer not null default 50 check (max_count >= 0),
  updated_at timestamptz not null default now()
);

insert into public.lifetime_inventory (id, current_count, max_count)
values (1, 0, 50)
on conflict (id) do nothing;

alter table public.lifetime_inventory enable row level security;

drop policy if exists "lifetime_inventory_read_authenticated"
  on public.lifetime_inventory;

create policy "lifetime_inventory_read_authenticated"
  on public.lifetime_inventory
  for select
  to authenticated
  using (true);

-- Writes are service-role only (no policy granted to authenticated).

-- Race-safe slot check used before Stripe Checkout. Returns true iff capacity
-- remains. Uses SELECT ... FOR UPDATE inside a single PL/pgSQL transaction.
create or replace function public.lifetime_slot_available()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  cur integer;
  cap integer;
begin
  select current_count, max_count into cur, cap
  from public.lifetime_inventory
  where id = 1
  for update;

  return coalesce(cur, 0) < coalesce(cap, 0);
end;
$$;

revoke all on function public.lifetime_slot_available() from public;
grant execute on function public.lifetime_slot_available() to authenticated, service_role;

-- Atomically reserves and increments one slot. Returns the new count or -1 if
-- the cap was already reached (race). Called only from the Stripe webhook with
-- service-role credentials.
create or replace function public.confirm_lifetime_purchase()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cur integer;
  cap integer;
  next_count integer;
begin
  select current_count, max_count into cur, cap
  from public.lifetime_inventory
  where id = 1
  for update;

  if coalesce(cur, 0) >= coalesce(cap, 0) then
    return -1;
  end if;

  next_count := cur + 1;
  update public.lifetime_inventory
    set current_count = next_count,
        updated_at = now()
    where id = 1;

  return next_count;
end;
$$;

revoke all on function public.confirm_lifetime_purchase() from public;
grant execute on function public.confirm_lifetime_purchase() to service_role;

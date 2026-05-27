-- Part 17: Lightweight rate-limiting + idempotency store in Postgres. Upstash
-- Redis / Vercel KV are not assumed to be present, so we use Postgres as the
-- source of truth. Both tables are small and auto-pruned.

create table if not exists public.rate_limit_buckets (
  bucket_key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket_key, window_start)
);

create index if not exists rate_limit_buckets_window_idx
  on public.rate_limit_buckets(window_start);

create table if not exists public.idempotency_keys (
  key text primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  scope text not null,
  response jsonb,
  expires_at timestamptz not null,
  created_at timestamptz default now() not null
);

create index if not exists idempotency_keys_expires_idx
  on public.idempotency_keys(expires_at);

-- Per-user in-flight flag (used for "one in flight" semantics).
alter table public.profiles
  add column if not exists processing_jobs jsonb default '{}'::jsonb;

/**
 * Atomic rate-limit increment. Returns the new hit count after incrementing.
 * Callers compare against their limit and decide whether to block.
 */
create or replace function public.bump_rate_limit_bucket(
  p_bucket_key text,
  p_window_start timestamptz
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_hits integer;
begin
  insert into public.rate_limit_buckets (bucket_key, window_start, hits)
  values (p_bucket_key, p_window_start, 1)
  on conflict (bucket_key, window_start)
  do update set hits = public.rate_limit_buckets.hits + 1
  returning hits into new_hits;
  return new_hits;
end;
$$;

revoke all on function public.bump_rate_limit_bucket(text, timestamptz) from public;
grant execute on function public.bump_rate_limit_bucket(text, timestamptz) to service_role;

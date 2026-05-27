-- Shared scrape cache for investor discovery (ICP filter hash).
-- Per-user ranked results remain in investor_matches (deck-aware cache_key).

create table if not exists public.investor_scrape_cache (
  id uuid primary key default gen_random_uuid(),
  filter_hash text not null unique,
  filter_payload jsonb not null,
  candidates jsonb not null,
  enriched_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists investor_scrape_cache_filter_hash_idx
  on public.investor_scrape_cache (filter_hash);

create index if not exists investor_scrape_cache_expires_at_idx
  on public.investor_scrape_cache (expires_at);

alter table public.investor_scrape_cache enable row level security;

-- Service role only (pipeline uses admin client).
drop policy if exists "investor_scrape_cache_service_role" on public.investor_scrape_cache;
create policy "investor_scrape_cache_service_role"
  on public.investor_scrape_cache
  for all
  to service_role
  using (true)
  with check (true);

alter table public.investor_matches
  add column if not exists filter_hash text,
  add column if not exists scrape_cache_id uuid references public.investor_scrape_cache(id) on delete set null;

create index if not exists investor_matches_filter_hash_idx
  on public.investor_matches (filter_hash);

create index if not exists investor_matches_scrape_cache_id_idx
  on public.investor_matches (scrape_cache_id);

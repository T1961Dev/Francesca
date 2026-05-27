alter table public.investor_matching_jobs
  add column if not exists pipeline_stage text,
  add column if not exists cache_key text,
  add column if not exists crunchbase_run_id text,
  add column if not exists crunchbase_dataset_id text,
  add column if not exists linkedin_run_id text,
  add column if not exists linkedin_dataset_id text,
  add column if not exists enriched_candidate_count integer default 0,
  add column if not exists shortlisted_count integer default 0,
  add column if not exists investor_signals jsonb,
  add column if not exists enriched_investors jsonb,
  add column if not exists shortlisted_investors jsonb,
  add column if not exists linkedin_signals jsonb,
  add column if not exists apify_actor_runs jsonb;

create index if not exists investor_matching_jobs_cache_key_idx
  on public.investor_matching_jobs(cache_key);

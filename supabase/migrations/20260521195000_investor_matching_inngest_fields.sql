alter table public.investor_matching_jobs
  add column if not exists profile_hash text,
  add column if not exists limited_data boolean default false not null;

alter table public.investor_matches
  add column if not exists limited_data boolean default false not null;

create index if not exists investor_matching_jobs_profile_hash_idx
  on public.investor_matching_jobs(profile_hash);

create index if not exists investor_matches_job_id_idx
  on public.investor_matches(job_id);

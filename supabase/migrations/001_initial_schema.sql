create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company_name text,
  website text,
  role text,
  industry text,
  stage text,
  location text,
  funding_stage text,
  target_raise numeric,
  description text,
  stripe_customer_id text,
  plan text default 'free' not null,
  subscription_status text default 'inactive' not null,
  upgrade_prompt_sent boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.deck_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  file_name text not null,
  file_type text not null,
  file_path text not null,
  file_size integer,
  status text default 'uploaded' not null,
  extracted_text text,
  text_extraction_error text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.deck_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  deck_upload_id uuid references public.deck_uploads(id) on delete cascade,
  overall_score integer,
  summary text,
  category_scores jsonb,
  strengths jsonb,
  weaknesses jsonb,
  missing_sections jsonb,
  investor_readiness text,
  suggested_fixes jsonb,
  priority_actions jsonb,
  fundraising_risks jsonb,
  raw_openai_response jsonb,
  status text default 'pending' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.financial_models (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  inputs jsonb not null,
  projection jsonb,
  narrative text,
  investor_summary text,
  risks jsonb,
  assumptions jsonb,
  use_of_funds jsonb,
  charts_data jsonb,
  raw_openai_response jsonb,
  status text default 'completed' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.investor_matching_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  deck_analysis_id uuid references public.deck_analyses(id) on delete cascade,
  status text default 'pending' not null,
  error text,
  apify_actor_id text,
  apify_actor_run_id text,
  apify_dataset_id text,
  candidate_count integer default 0,
  started_at timestamptz,
  scraping_completed_at timestamptz,
  scoring_completed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.investor_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  deck_analysis_id uuid references public.deck_analyses(id) on delete cascade,
  job_id uuid references public.investor_matching_jobs(id) on delete cascade,
  apify_actor_input jsonb,
  apify_query jsonb,
  matches jsonb,
  normalised_candidates jsonb,
  raw_apify_response jsonb,
  raw_openai_response jsonb,
  cache_key text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  email_type text not null,
  sent_to text not null,
  status text not null,
  metadata jsonb,
  created_at timestamptz default now() not null
);

create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  stripe_event_id text unique,
  event_type text,
  payload jsonb,
  created_at timestamptz default now() not null
);

create table public.pdf_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  source_type text not null,
  source_id uuid not null,
  file_path text not null,
  created_at timestamptz default now() not null
);

create index profiles_stripe_customer_id_idx on public.profiles(stripe_customer_id);
create index deck_uploads_user_id_idx on public.deck_uploads(user_id);
create index deck_analyses_user_id_idx on public.deck_analyses(user_id);
create index financial_models_user_id_idx on public.financial_models(user_id);
create index investor_matching_jobs_user_id_idx on public.investor_matching_jobs(user_id);
create index investor_matches_cache_key_idx on public.investor_matches(cache_key);

create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger set_deck_uploads_updated_at before update on public.deck_uploads
for each row execute function public.set_updated_at();
create trigger set_deck_analyses_updated_at before update on public.deck_analyses
for each row execute function public.set_updated_at();
create trigger set_financial_models_updated_at before update on public.financial_models
for each row execute function public.set_updated_at();
create trigger set_investor_matching_jobs_updated_at before update on public.investor_matching_jobs
for each row execute function public.set_updated_at();
create trigger set_investor_matches_updated_at before update on public.investor_matches
for each row execute function public.set_updated_at();

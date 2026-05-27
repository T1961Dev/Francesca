-- Part 5: Usage tracking. One row per user. Atomic increments via SQL function.

create table if not exists public.user_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  deck_uploads_this_month integer not null default 0,
  financial_model_runs_this_month integer not null default 0,
  investor_match_runs_this_month integer not null default 0,
  total_deck_uploads_ever integer not null default 0,
  whatsapp_bonus_used boolean not null default false,
  last_reset_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_usage enable row level security;

drop policy if exists "user_usage_select_own" on public.user_usage;
create policy "user_usage_select_own"
  on public.user_usage
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Writes are service-role only.

create trigger set_user_usage_updated_at
  before update on public.user_usage
  for each row execute function public.set_updated_at();

-- Auto-create a usage row whenever a profile is created (signup flow).
create or replace function public.ensure_user_usage_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_usage (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_create_user_usage on public.profiles;
create trigger profiles_create_user_usage
  after insert on public.profiles
  for each row execute function public.ensure_user_usage_row();

-- Backfill existing users.
insert into public.user_usage (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

/**
 * Atomic increment-if-under-limit. Returns true if the increment happened,
 * false if the user is at or over their limit.
 *
 * Actions:
 *   - 'deck_upload'        bumps deck_uploads_this_month (+ total_deck_uploads_ever)
 *   - 'financial_model_run' bumps financial_model_runs_this_month
 *   - 'investor_match_run' bumps investor_match_runs_this_month
 *
 * Set p_use_ever_counter = true to compare against total_deck_uploads_ever
 * instead of the monthly counter (Free plan deck upload semantics).
 */
create or replace function public.increment_usage_if_under_limit(
  p_user_id uuid,
  p_action text,
  p_limit integer,
  p_use_ever_counter boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  monthly integer;
  ever integer;
begin
  -- Ensure a row exists for legacy users that pre-date the trigger.
  insert into public.user_usage (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select
    case p_action
      when 'deck_upload' then deck_uploads_this_month
      when 'financial_model_run' then financial_model_runs_this_month
      when 'investor_match_run' then investor_match_runs_this_month
      else null
    end,
    total_deck_uploads_ever
  into monthly, ever
  from public.user_usage
  where user_id = p_user_id
  for update;

  if monthly is null then
    raise exception 'Unknown usage action: %', p_action;
  end if;

  if p_use_ever_counter then
    if coalesce(ever, 0) >= coalesce(p_limit, 0) then
      return false;
    end if;
  else
    if coalesce(monthly, 0) >= coalesce(p_limit, 0) then
      return false;
    end if;
  end if;

  if p_action = 'deck_upload' then
    update public.user_usage
      set deck_uploads_this_month = deck_uploads_this_month + 1,
          total_deck_uploads_ever = total_deck_uploads_ever + 1,
          updated_at = now()
      where user_id = p_user_id;
  elsif p_action = 'financial_model_run' then
    update public.user_usage
      set financial_model_runs_this_month = financial_model_runs_this_month + 1,
          updated_at = now()
      where user_id = p_user_id;
  elsif p_action = 'investor_match_run' then
    update public.user_usage
      set investor_match_runs_this_month = investor_match_runs_this_month + 1,
          updated_at = now()
      where user_id = p_user_id;
  end if;

  return true;
end;
$$;

revoke all on function public.increment_usage_if_under_limit(uuid, text, integer, boolean) from public;
grant execute on function public.increment_usage_if_under_limit(uuid, text, integer, boolean) to service_role;

/**
 * Decrement a counter. Used when a downstream step fails (e.g. Apify could not
 * start, OpenAI rejected the input) so the user isn't charged for a no-op.
 */
create or replace function public.decrement_usage(
  p_user_id uuid,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_action = 'deck_upload' then
    update public.user_usage
      set deck_uploads_this_month = greatest(deck_uploads_this_month - 1, 0),
          total_deck_uploads_ever = greatest(total_deck_uploads_ever - 1, 0),
          updated_at = now()
      where user_id = p_user_id;
  elsif p_action = 'financial_model_run' then
    update public.user_usage
      set financial_model_runs_this_month = greatest(financial_model_runs_this_month - 1, 0),
          updated_at = now()
      where user_id = p_user_id;
  elsif p_action = 'investor_match_run' then
    update public.user_usage
      set investor_match_runs_this_month = greatest(investor_match_runs_this_month - 1, 0),
          updated_at = now()
      where user_id = p_user_id;
  else
    raise exception 'Unknown usage action: %', p_action;
  end if;
end;
$$;

revoke all on function public.decrement_usage(uuid, text) from public;
grant execute on function public.decrement_usage(uuid, text) to service_role;

/**
 * Monthly reset. Zeroes the three monthly counters for ALL users. Lifetime
 * customers reset too — their cap is monthly, not annual. total_deck_uploads_ever
 * and whatsapp_bonus_used are preserved deliberately.
 */
create or replace function public.reset_monthly_usage()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.user_usage
    set deck_uploads_this_month = 0,
        financial_model_runs_this_month = 0,
        investor_match_runs_this_month = 0,
        last_reset_at = now(),
        updated_at = now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.reset_monthly_usage() from public;
grant execute on function public.reset_monthly_usage() to service_role;

-- Schedule the monthly reset via pg_cron if available. Safe to run repeatedly:
-- the cron extension may not be enabled in every environment.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'raisewise_monthly_usage_reset',
      '0 0 1 * *',
      $$select public.reset_monthly_usage();$$
    );
  end if;
exception when others then
  -- Don't block the migration if cron isn't available.
  null;
end$$;

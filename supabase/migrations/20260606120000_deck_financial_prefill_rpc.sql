-- Financial model prefill reads summary + financial_signals from deck_analyses.
-- Direct SELECT on those columns was revoked in 20260525200000 (plan-gated reads).

create or replace function public.fetch_latest_deck_financial_prefill()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_plan text;
  v_row public.deck_analyses%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(plan, 'free') into v_plan
  from public.profiles
  where id = v_uid;

  if v_plan not in ('starter', 'pro', 'lifetime') then
    return null;
  end if;

  select * into v_row
  from public.deck_analyses
  where user_id = v_uid
    and status = 'completed'
  order by created_at desc
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'summary', v_row.summary,
    'financial_signals', v_row.financial_signals
  );
end;
$$;

grant execute on function public.fetch_latest_deck_financial_prefill() to authenticated;

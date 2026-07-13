-- Performance: slim deck reads and lightweight status polling.

create or replace function public.fetch_deck_analysis_row(p_analysis_id uuid)
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

  select * into v_row
  from public.deck_analyses
  where id = p_analysis_id and user_id = v_uid;

  if not found then
    return null;
  end if;

  select coalesce(plan, 'free') into v_plan
  from public.profiles
  where id = v_uid;

  if v_plan in ('starter', 'pro', 'lifetime') then
    return jsonb_build_object(
      'id', v_row.id,
      'user_id', v_row.user_id,
      'deck_upload_id', v_row.deck_upload_id,
      'overall_score', v_row.overall_score,
      'summary', v_row.summary,
      'category_scores', v_row.category_scores,
      'financial_signals', v_row.financial_signals,
      'strengths', v_row.strengths,
      'weaknesses', v_row.weaknesses,
      'missing_sections', v_row.missing_sections,
      'investor_readiness', v_row.investor_readiness,
      'suggested_fixes', v_row.suggested_fixes,
      'priority_actions', v_row.priority_actions,
      'fundraising_risks', v_row.fundraising_risks,
      'status', v_row.status,
      'created_at', v_row.created_at,
      'updated_at', v_row.updated_at
    );
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'user_id', v_row.user_id,
    'deck_upload_id', v_row.deck_upload_id,
    'overall_score', v_row.overall_score,
    'status', v_row.status,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at,
    'locked', true,
    'category_scores', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'category', coalesce(elem->>'category', elem->>'name')
          )
        )
        from jsonb_array_elements(coalesce(v_row.category_scores, '[]'::jsonb)) elem
      ),
      '[]'::jsonb
    )
  );
end;
$$;

create or replace function public.fetch_deck_analysis_status(p_analysis_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_job_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select status into v_status
  from public.deck_analyses
  where id = p_analysis_id and user_id = v_uid;

  if not found then
    return null;
  end if;

  if v_status = 'completed' then
    select id into v_job_id
    from public.investor_matching_jobs
    where deck_analysis_id = p_analysis_id
      and user_id = v_uid
      and status not in ('failed', 'cancelled')
    order by created_at desc
    limit 1;
  end if;

  return jsonb_build_object(
    'status', v_status,
    'investorMatching', case
      when v_job_id is not null then jsonb_build_object('started', true, 'jobId', v_job_id)
      else jsonb_build_object('started', false)
    end
  );
end;
$$;

grant execute on function public.fetch_deck_analysis_status(uuid) to authenticated;

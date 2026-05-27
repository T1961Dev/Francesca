-- Plan-gated deck analysis reads.
-- Free users cannot SELECT sensitive columns directly from PostgREST / the browser
-- Supabase client. They must use the RPC helpers below, which only expose score +
-- dimension names.

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
    return to_jsonb(v_row);
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

create or replace function public.list_deck_analysis_rows(p_limit integer default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_plan text;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(plan, 'free') into v_plan
  from public.profiles
  where id = v_uid;

  if v_plan in ('starter', 'pro', 'lifetime') then
    select coalesce(jsonb_agg(row_data order by sort_at desc), '[]'::jsonb) into v_result
    from (
      select
        jsonb_build_object(
          'id', a.id,
          'overall_score', a.overall_score,
          'status', a.status,
          'summary', a.summary,
          'created_at', a.created_at,
          'deck_uploads', (
            select jsonb_build_object('file_name', u.file_name)
            from public.deck_uploads u
            where u.id = a.deck_upload_id
          )
        ) as row_data,
        a.created_at as sort_at
      from public.deck_analyses a
      where a.user_id = v_uid
      order by a.created_at desc
      limit greatest(p_limit, 1)
    ) sub;
  else
    select coalesce(jsonb_agg(row_data order by sort_at desc), '[]'::jsonb) into v_result
    from (
      select
        jsonb_build_object(
          'id', a.id,
          'overall_score', a.overall_score,
          'status', a.status,
          'created_at', a.created_at,
          'locked', true,
          'deck_uploads', (
            select jsonb_build_object('file_name', u.file_name)
            from public.deck_uploads u
            where u.id = a.deck_upload_id
          )
        ) as row_data,
        a.created_at as sort_at
      from public.deck_analyses a
      where a.user_id = v_uid
      order by a.created_at desc
      limit greatest(p_limit, 1)
    ) sub;
  end if;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

revoke select on public.deck_analyses from authenticated;

grant execute on function public.fetch_deck_analysis_row(uuid) to authenticated;
grant execute on function public.list_deck_analysis_rows(integer) to authenticated;

-- Fix deck upload writes after plan-gated read migration.
--
-- The previous migration revoked table-level SELECT, which breaks
-- `INSERT ... RETURNING` in PostgREST. Writes now insert without RETURNING;
-- this migration documents the intended privilege model.
--
-- Safe columns only — sensitive fields (summary, category_scores, etc.) must
-- be read through fetch_deck_analysis_row() / list_deck_analysis_rows().

grant select (id, user_id, deck_upload_id, overall_score, status, created_at, updated_at)
  on public.deck_analyses to authenticated;

grant insert on public.deck_analyses to authenticated;
grant update on public.deck_analyses to authenticated;

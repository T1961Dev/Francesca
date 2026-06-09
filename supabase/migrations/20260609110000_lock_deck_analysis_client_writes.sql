-- Deck analyses are produced by trusted server routes after OpenAI analysis.
-- Authenticated browser clients should read through the plan-gated RPCs only
-- and must not be able to forge or mutate scores/report fields directly.

revoke insert on public.deck_analyses from authenticated;
revoke update on public.deck_analyses from authenticated;

drop policy if exists "Users insert own analyses" on public.deck_analyses;
drop policy if exists "Users update own analyses" on public.deck_analyses;

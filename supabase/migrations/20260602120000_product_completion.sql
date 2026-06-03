-- Product completion: deck financial signals + lifetime cap per client spec (30 founders).

alter table public.deck_analyses
  add column if not exists financial_signals jsonb;

comment on column public.deck_analyses.financial_signals is
  'Structured numbers extracted from pitch deck text during analysis (MRR, burn, raise, etc.).';

update public.lifetime_inventory
set max_count = 30
where id = 1 and max_count > 30;

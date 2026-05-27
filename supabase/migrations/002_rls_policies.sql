alter table public.profiles enable row level security;
alter table public.deck_uploads enable row level security;
alter table public.deck_analyses enable row level security;
alter table public.financial_models enable row level security;
alter table public.investor_matching_jobs enable row level security;
alter table public.investor_matches enable row level security;
alter table public.email_events enable row level security;
alter table public.billing_events enable row level security;
alter table public.pdf_exports enable row level security;

create policy "Users read own profile" on public.profiles
for select to authenticated using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles
for insert to authenticated with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles
for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users read own uploads" on public.deck_uploads
for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own uploads" on public.deck_uploads
for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own uploads" on public.deck_uploads
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read own analyses" on public.deck_analyses
for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own analyses" on public.deck_analyses
for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own analyses" on public.deck_analyses
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read own models" on public.financial_models
for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own models" on public.financial_models
for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own models" on public.financial_models
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read own matching jobs" on public.investor_matching_jobs
for select to authenticated using (auth.uid() = user_id);

create policy "Users read own investor matches" on public.investor_matches
for select to authenticated using (auth.uid() = user_id);

create policy "Users read own email events" on public.email_events
for select to authenticated using (auth.uid() = user_id);

create policy "Users read own billing events" on public.billing_events
for select to authenticated using (auth.uid() = user_id);

create policy "Users read own PDF exports" on public.pdf_exports
for select to authenticated using (auth.uid() = user_id);

create policy "Service role full profiles access" on public.profiles
for all to service_role using (true) with check (true);
create policy "Service role full uploads access" on public.deck_uploads
for all to service_role using (true) with check (true);
create policy "Service role full analyses access" on public.deck_analyses
for all to service_role using (true) with check (true);
create policy "Service role full models access" on public.financial_models
for all to service_role using (true) with check (true);
create policy "Service role full matching jobs access" on public.investor_matching_jobs
for all to service_role using (true) with check (true);
create policy "Service role full investor matches access" on public.investor_matches
for all to service_role using (true) with check (true);
create policy "Service role full email events access" on public.email_events
for all to service_role using (true) with check (true);
create policy "Service role full billing events access" on public.billing_events
for all to service_role using (true) with check (true);
create policy "Service role full PDF exports access" on public.pdf_exports
for all to service_role using (true) with check (true);

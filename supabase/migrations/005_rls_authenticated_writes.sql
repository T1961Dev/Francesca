-- Allow authenticated users to create/update their own investor jobs, match rows, and PDF export records.
-- (Previously only SELECT was allowed, so API routes using the anon-authenticated client failed silently.)

create policy "Users insert own matching jobs" on public.investor_matching_jobs
for insert to authenticated with check (auth.uid() = user_id);

create policy "Users update own matching jobs" on public.investor_matching_jobs
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users insert own investor matches" on public.investor_matches
for insert to authenticated with check (auth.uid() = user_id);

create policy "Users update own investor matches" on public.investor_matches
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users insert own PDF exports" on public.pdf_exports
for insert to authenticated with check (auth.uid() = user_id);

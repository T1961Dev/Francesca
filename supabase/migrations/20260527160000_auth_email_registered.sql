-- Server-only lookup: does an auth.users row exist for this email?
-- Used at signup to block duplicate registrations with a clear message.
-- Callable only by service_role (never exposed to anon/authenticated clients).

create or replace function public.auth_email_registered(check_email text)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users
    where email is not null
      and lower(email) = lower(trim(check_email))
  );
$$;

revoke all on function public.auth_email_registered(text) from public;
revoke all on function public.auth_email_registered(text) from anon;
revoke all on function public.auth_email_registered(text) from authenticated;
grant execute on function public.auth_email_registered(text) to service_role;

-- Keep login email on public.profiles so the app can show it reliably via RLS (same row as name, company, plan).

alter table public.profiles add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or p.email is distinct from u.email);

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, plan, subscription_status)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    'free',
    'inactive'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(profiles.full_name, excluded.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_sync_profile on auth.users;
create trigger on_auth_user_created_sync_profile
  after insert on auth.users
  for each row execute function public.sync_profile_from_auth_user();

create or replace function public.sync_profile_email_on_auth_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_sync_profile on auth.users;
create trigger on_auth_user_email_sync_profile
  after update of email on auth.users
  for each row execute function public.sync_profile_email_on_auth_update();

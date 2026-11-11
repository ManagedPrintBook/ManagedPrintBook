-- Phase 6 (v20261111b): password change -> other devices signed out + Admin notification.
-- Run ONCE by the Admin in Supabase -> SQL Editor (after phase5.sql).

alter table public.trusted_devices add column if not exists signout_at timestamptz;

-- a device is "allowed" only if trusted AND it has not been told to sign out since its last login
create or replace function public.device_check(p_device text) returns boolean
language plpgsql security definer set search_path = public as $$
declare r public.trusted_devices;
begin
  if auth.uid() is null then return true; end if;
  select * into r from public.trusted_devices where user_id = auth.uid() and device_id = p_device;
  if not found then return true; end if;
  if not r.trusted then return false; end if;
  if r.signout_at is not null and r.signout_at > r.last_login then return false; end if;
  update public.trusted_devices set last_seen = now() where id = r.id;
  return true;
end $$;

-- called by the device that changed the password: all OTHER devices of this user are signed out, Admin is notified
create or replace function public.password_changed(p_device text, p_name text, p_email text, p_via text) returns void
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  update public.trusted_devices set signout_at = now() + interval '1 second'
    where user_id = auth.uid() and device_id <> coalesce(p_device, '');
  get diagnostics n = row_count;
  insert into public.device_alerts(kind, message)
    values ('password', coalesce(p_name, p_email, 'A user') || ' changed their password' ||
            case when p_via = 'reset' then ' (reset email)' else '' end ||
            '. ' || n || ' other device(s) signed out.');
end $$;
grant execute on function public.device_check(text), public.password_changed(text,text,text,text) to authenticated;

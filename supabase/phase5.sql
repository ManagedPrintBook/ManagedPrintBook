-- Phase 5 (v20261111a): Trusted devices + last login device + admin device alerts.
-- Run ONCE by the Admin in Supabase -> SQL Editor.

create table if not exists public.trusted_devices (
  id          bigint generated always as identity primary key,
  user_id     uuid not null,
  device_id   text not null,
  name        text,
  email       text,
  role        text,
  device_name text,
  trusted     boolean not null default true,
  first_seen  timestamptz not null default now(),
  last_login  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  unique (user_id, device_id)
);
alter table public.trusted_devices enable row level security;
drop policy if exists "dev read" on public.trusted_devices;
create policy "dev read" on public.trusted_devices for select
  using (user_id = auth.uid() or public.my_role() = 'admin');
-- no insert/update/delete policies: every change goes through the functions below

create table if not exists public.device_alerts (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  kind    text,
  message text not null,
  seen    boolean not null default false
);
alter table public.device_alerts enable row level security;
drop policy if exists "alert read" on public.device_alerts;
create policy "alert read" on public.device_alerts for select using (public.my_role() = 'admin');

-- called at every sign-in: records the device, returns whether it is trusted
create or replace function public.device_register(p_device text, p_device_name text, p_name text, p_email text, p_role text)
returns json language plpgsql security definer set search_path = public as $$
declare r public.trusted_devices; isnew boolean := false;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into r from public.trusted_devices where user_id = auth.uid() and device_id = p_device;
  if not found then
    insert into public.trusted_devices(user_id, device_id, name, email, role, device_name)
      values (auth.uid(), p_device, p_name, p_email, p_role, p_device_name) returning * into r;
    isnew := true;
    insert into public.device_alerts(kind, message)
      values ('new', coalesce(p_name, p_email) || ' signed in from a new device: ' || coalesce(p_device_name, 'Unknown device'));
  elsif r.trusted then
    update public.trusted_devices set last_login = now(), last_seen = now(), device_name = coalesce(p_device_name, device_name),
      name = coalesce(p_name, name), email = coalesce(p_email, email), role = coalesce(p_role, role) where id = r.id;
  end if;
  return json_build_object('trusted', r.trusted, 'new', isnew);
end $$;

-- polled by every signed-in device: is this device still trusted?
create or replace function public.device_check(p_device text) returns boolean
language plpgsql security definer set search_path = public as $$
declare t boolean;
begin
  if auth.uid() is null then return true; end if;
  select trusted into t from public.trusted_devices where user_id = auth.uid() and device_id = p_device;
  if t is null then return true; end if;
  if t then update public.trusted_devices set last_seen = now() where user_id = auth.uid() and device_id = p_device; end if;
  return t;
end $$;

-- Admin ticks / unticks a device
create or replace function public.device_set_trust(p_id bigint, p_trusted boolean) returns json
language plpgsql security definer set search_path = public as $$
declare r public.trusted_devices;
begin
  if public.my_role() <> 'admin' then raise exception 'Only the Admin can change trusted devices'; end if;
  update public.trusted_devices set trusted = p_trusted where id = p_id returning * into r;
  if not found then raise exception 'Device not found'; end if;
  insert into public.device_alerts(kind, message)
    values (case when p_trusted then 'trusted' else 'untrusted' end,
            case when p_trusted then 'Device trusted again: ' else 'Device blocked and signed out: ' end
            || coalesce(r.name, r.email) || ' - ' || coalesce(r.device_name, 'Unknown device'));
  return json_build_object('ok', true);
end $$;

-- a device reports that it signed itself out because it was un-trusted
create or replace function public.device_kicked(p_device text) returns void
language plpgsql security definer set search_path = public as $$
declare r public.trusted_devices;
begin
  select * into r from public.trusted_devices where user_id = auth.uid() and device_id = p_device and trusted = false;
  if found then
    insert into public.device_alerts(kind, message)
      values ('kicked', coalesce(r.name, r.email) || ' was signed out on ' || coalesce(r.device_name, 'Unknown device') || ' (device not trusted)');
  end if;
end $$;

create or replace function public.device_alert_seen(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() <> 'admin' then raise exception 'Admin only'; end if;
  if p_id is null then update public.device_alerts set seen = true; else update public.device_alerts set seen = true where id = p_id; end if;
end $$;

grant execute on function public.device_register(text,text,text,text,text), public.device_check(text),
  public.device_set_trust(bigint,boolean), public.device_kicked(text), public.device_alert_seen(bigint) to authenticated;

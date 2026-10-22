-- Run ONCE in Supabase -> SQL Editor (safe to re-run). Needs schema.sql to have been run before.
-- 1) View-only role for staff who may look at the company data but never change it.
-- 2) Weekly cloud snapshots (rolling backups of the saved data).

-- ---------- 1. view-only role ----------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin','manager','sales','viewer'));

-- the data owner a view-only user reads: the earliest active Admin
create or replace function public.team_owner() returns uuid
language sql security definer stable set search_path = public as
$$ select id from public.profiles where role = 'admin' and active order by created_at limit 1 $$;
revoke all on function public.team_owner() from public;
grant execute on function public.team_owner() to authenticated;

-- read access only: there is NO insert / update / delete policy for the viewer role
drop policy if exists "viewer read team" on public.app_state;
create policy "viewer read team" on public.app_state for select
  using (public.my_role() = 'viewer' and owner = public.team_owner());

-- ---------- 2. weekly cloud snapshots ----------
create table if not exists public.app_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  taken_at timestamptz not null default now(),
  note text,
  data jsonb not null
);
alter table public.app_snapshots enable row level security;
drop policy if exists "snap read"   on public.app_snapshots;
drop policy if exists "snap insert" on public.app_snapshots;
drop policy if exists "snap delete" on public.app_snapshots;
create policy "snap read"   on public.app_snapshots for select using (owner = auth.uid() and public.my_role() in ('admin','manager','sales'));
create policy "snap insert" on public.app_snapshots for insert with check (owner = auth.uid() and public.my_role() in ('admin','manager','sales'));
create policy "snap delete" on public.app_snapshots for delete using (owner = auth.uid() and public.my_role() in ('admin','manager','sales'));

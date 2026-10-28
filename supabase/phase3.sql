-- Phase 3 (v20261027a): shared team tasks, shared saved views, login history.
-- Run ONCE by the Admin in Supabase -> SQL Editor. Safe to run again.
-- Two-step login (authenticator app) needs no SQL: it uses Supabase Auth MFA (TOTP), which is on by default.
-- If it is off: Supabase -> Authentication -> Sign In / Providers (or Multi-Factor) -> enable "TOTP".

-- 1) Team tasks (visible to every active user, so a task can be assigned to a colleague)
create table if not exists public.team_tasks (
  id         text primary key,
  owner      uuid not null default auth.uid(),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.team_tasks enable row level security;
drop policy if exists "tasks read"   on public.team_tasks;
drop policy if exists "tasks insert" on public.team_tasks;
drop policy if exists "tasks update" on public.team_tasks;
drop policy if exists "tasks delete" on public.team_tasks;
create policy "tasks read"   on public.team_tasks for select using (public.my_role() is not null);
create policy "tasks insert" on public.team_tasks for insert with check (public.my_role() in ('admin','manager','sales'));
create policy "tasks update" on public.team_tasks for update using (public.my_role() in ('admin','manager','sales'));
create policy "tasks delete" on public.team_tasks for delete using (owner = auth.uid() or public.my_role() = 'admin');

-- 2) Saved views (personal, or shared with the whole team)
create table if not exists public.saved_views (
  id         text primary key,
  owner      uuid not null default auth.uid(),
  owner_name text,
  name       text not null,
  shared     boolean not null default false,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.saved_views enable row level security;
drop policy if exists "views read"   on public.saved_views;
drop policy if exists "views insert" on public.saved_views;
drop policy if exists "views update" on public.saved_views;
drop policy if exists "views delete" on public.saved_views;
create policy "views read"   on public.saved_views for select using (public.my_role() is not null and (shared or owner = auth.uid() or public.my_role() = 'admin'));
create policy "views insert" on public.saved_views for insert with check (owner = auth.uid() and public.my_role() is not null);
create policy "views update" on public.saved_views for update using (owner = auth.uid() or public.my_role() = 'admin');
create policy "views delete" on public.saved_views for delete using (owner = auth.uid() or public.my_role() = 'admin');

-- 3) Login history (Admin sees everyone, other users see their own)
create table if not exists public.login_log (
  id      bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  name    text,
  email   text,
  role    text,
  ua      text,
  mfa     boolean not null default false,
  at      timestamptz not null default now()
);
alter table public.login_log enable row level security;
drop policy if exists "log read"   on public.login_log;
drop policy if exists "log insert" on public.login_log;
create policy "log read"   on public.login_log for select using (user_id = auth.uid() or public.my_role() = 'admin');
create policy "log insert" on public.login_log for insert with check (user_id = auth.uid());
create index if not exists login_log_at on public.login_log (at desc);

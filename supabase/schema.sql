-- Run in Supabase → SQL Editor. One JSON document per signed-in user (the whole app database).
create table if not exists public.app_state (
  owner uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.app_state enable row level security;
create policy "owner can read"   on public.app_state for select using (owner = auth.uid());
create policy "owner can insert" on public.app_state for insert with check (owner = auth.uid());
create policy "owner can update" on public.app_state for update using (owner = auth.uid());

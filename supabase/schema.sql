-- Run ONCE in Supabase -> SQL Editor (safe to re-run). Adds users, roles (admin / manager / sales) and approval.
create table if not exists public.app_state (
  owner uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.app_state enable row level security;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'sales' check (role in ('admin','manager','sales')),
  active boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.my_role() returns text
language sql security definer stable set search_path = public as
$$ select role from public.profiles where id = auth.uid() and active $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as
$$
declare first_user boolean;
begin
  first_user := not exists (select 1 from public.profiles);
  insert into public.profiles (id, email, display_name, role, active)
  values (new.id, new.email,
          coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1)),
          case when first_user then 'admin' else 'sales' end, first_user)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- accounts that already exist: the earliest becomes Admin
insert into public.profiles (id, email, display_name, role, active)
select u.id, u.email, coalesce(nullif(u.raw_user_meta_data->>'display_name',''), split_part(u.email,'@',1)),
       case when row_number() over (order by u.created_at) = 1 and not exists (select 1 from public.profiles) then 'admin' else 'sales' end,
       (row_number() over (order by u.created_at) = 1 and not exists (select 1 from public.profiles))
from auth.users u on conflict (id) do nothing;

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select
  using (id = auth.uid() or public.my_role() in ('admin','manager'));
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles for update
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

drop policy if exists "owner can read"   on public.app_state;
drop policy if exists "owner can insert" on public.app_state;
drop policy if exists "owner can update" on public.app_state;
drop policy if exists "team can read"    on public.app_state;
create policy "owner can read"   on public.app_state for select using (owner = auth.uid() and public.my_role() is not null);
create policy "owner can insert" on public.app_state for insert with check (owner = auth.uid() and public.my_role() is not null);
create policy "owner can update" on public.app_state for update using (owner = auth.uid() and public.my_role() is not null);
create policy "team can read"    on public.app_state for select using (public.my_role() in ('admin','manager'));

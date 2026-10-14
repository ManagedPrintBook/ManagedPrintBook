-- Run ONCE in Supabase -> SQL Editor (safe to re-run).
-- One company-wide secure key: only the ADMIN can set/change it, it is stored hashed (bcrypt) on the server,
-- checked on the server, and brute-force limited (5 wrong tries = locked 5 minutes). Nobody can read it back.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.app_security (
  id int primary key default 1 check (id = 1),
  key_hash text not null,
  set_by uuid,
  updated_at timestamptz not null default now()
);
create table if not exists public.secure_key_attempts (
  uid uuid primary key,
  fails int not null default 0,
  locked_until timestamptz
);
alter table public.app_security enable row level security;
alter table public.secure_key_attempts enable row level security;
revoke all on public.app_security from anon, authenticated;
revoke all on public.secure_key_attempts from anon, authenticated;

create or replace function public.secure_key_status() returns jsonb
language plpgsql security definer stable set search_path = public as $$
begin
  if auth.uid() is null or public.my_role() is null then return jsonb_build_object('error','not allowed'); end if;
  return jsonb_build_object('set', exists(select 1 from public.app_security where id = 1));
end $$;

create or replace function public.secure_key_verify(p_key text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a public.secure_key_attempts; h text; ok boolean;
begin
  if auth.uid() is null or public.my_role() is null then return jsonb_build_object('ok', false, 'error', 'not allowed'); end if;
  insert into public.secure_key_attempts(uid) values (auth.uid()) on conflict do nothing;
  select * into a from public.secure_key_attempts where uid = auth.uid() for update;
  if a.locked_until is not null and a.locked_until > now() then
    return jsonb_build_object('ok', false, 'wait', ceil(extract(epoch from (a.locked_until - now())))::int);
  end if;
  select key_hash into h from public.app_security where id = 1;
  if h is null then return jsonb_build_object('ok', false, 'error', 'no key set'); end if;
  ok := (h = crypt(coalesce(p_key, ''), h));
  if ok then
    update public.secure_key_attempts set fails = 0, locked_until = null where uid = auth.uid();
    return jsonb_build_object('ok', true);
  end if;
  update public.secure_key_attempts
     set fails = case when a.fails + 1 >= 5 then 0 else a.fails + 1 end,
         locked_until = case when a.fails + 1 >= 5 then now() + interval '5 minutes' else null end
   where uid = auth.uid();
  return jsonb_build_object('ok', false, 'left', greatest(0, 4 - a.fails), 'wait', case when a.fails + 1 >= 5 then 300 else 0 end);
end $$;

create or replace function public.secure_key_set(p_new text, p_old text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare h text; v jsonb;
begin
  if auth.uid() is null or public.my_role() is distinct from 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Only the admin can set the secure key.');
  end if;
  if p_new is null or p_new !~ '^[0-9]{6,8}$' then
    return jsonb_build_object('ok', false, 'error', 'Use 6 to 8 digits.');
  end if;
  select key_hash into h from public.app_security where id = 1;
  if h is not null then
    v := public.secure_key_verify(p_old);
    if coalesce((v->>'ok')::boolean, false) = false then
      return jsonb_build_object('ok', false, 'error', case when v ? 'wait' and (v->>'wait')::int > 0 then 'Too many wrong tries. Wait '||(v->>'wait')||' seconds.' else 'The current key is wrong.' end);
    end if;
  end if;
  insert into public.app_security(id, key_hash, set_by) values (1, crypt(p_new, gen_salt('bf')), auth.uid())
  on conflict (id) do update set key_hash = excluded.key_hash, set_by = auth.uid(), updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.secure_key_status(), public.secure_key_verify(text), public.secure_key_set(text, text) from public, anon;
grant execute on function public.secure_key_status(), public.secure_key_verify(text), public.secure_key_set(text, text) to authenticated;
-- Forgot the key? In SQL Editor run:  delete from public.app_security;  then the admin sets a new one at next sign-in.

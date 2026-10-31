-- Run ONCE in Supabase -> SQL Editor (safe to re-run). Online quote acceptance links.
create table if not exists public.quote_links (
  token text primary key,
  owner uuid not null references auth.users(id) on delete cascade,
  qid text not null,
  qno text,
  snapshot jsonb not null,
  active boolean not null default true,
  status text not null default 'sent',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);
create table if not exists public.quote_inbox (
  id bigint generated always as identity primary key,
  token text not null references public.quote_links(token) on delete cascade,
  owner uuid not null,
  qid text not null,
  action text not null check (action in ('accepted','declined')),
  name text,
  sig text,
  note text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
alter table public.quote_links enable row level security;
alter table public.quote_inbox enable row level security;

drop policy if exists "qlinks team" on public.quote_links;
create policy "qlinks team" on public.quote_links for all
  using (owner = auth.uid() and public.my_role() in ('admin','manager','sales'))
  with check (owner = auth.uid() and public.my_role() in ('admin','manager','sales'));
drop policy if exists "qinbox team" on public.quote_inbox;
create policy "qinbox team" on public.quote_inbox for all
  using (owner = auth.uid() and public.my_role() in ('admin','manager','sales'))
  with check (owner = auth.uid() and public.my_role() in ('admin','manager','sales'));

-- Public (token) access: the quote page can only call these two functions. The link holds a frozen copy of the quote only.
create or replace function public.quote_get(t text) returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare l public.quote_links; r public.quote_inbox;
begin
  select * into l from public.quote_links where token = t and active and expires_at > now();
  if not found then return null; end if;
  select * into r from public.quote_inbox where token = t order by id desc limit 1;
  return jsonb_build_object(
    'no', l.snapshot->>'no', 'customer', l.snapshot->>'customer', 'company', l.snapshot->>'company',
    'total', l.snapshot->'total', 'exp', l.snapshot->>'exp', 'html', l.snapshot->>'html',
    'answered', case when r.id is null then null else r.action end,
    'answered_at', r.created_at);
end $$;

create or replace function public.quote_respond(t text, a text, n text, s text, note text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare l public.quote_links;
begin
  select * into l from public.quote_links where token = t and active and expires_at > now();
  if not found then return jsonb_build_object('ok', false, 'error', 'This link is not valid or has expired.'); end if;
  if a not in ('accepted','declined') then return jsonb_build_object('ok', false, 'error', 'Bad request'); end if;
  if exists (select 1 from public.quote_inbox where token = t) then return jsonb_build_object('ok', false, 'error', 'This quotation has already been answered.'); end if;
  if a = 'accepted' and (coalesce(length(trim(n)),0) < 2) then return jsonb_build_object('ok', false, 'error', 'Please type your name.'); end if;
  if length(coalesce(s,'')) > 300000 or length(coalesce(n,'')) > 200 or length(coalesce(note,'')) > 1000 then return jsonb_build_object('ok', false, 'error', 'Too large'); end if;
  insert into public.quote_inbox(token, owner, qid, action, name, sig, note) values (t, l.owner, l.qid, a, left(n,200), s, left(note,1000));
  update public.quote_links set status = a where token = t;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.quote_get(text), public.quote_respond(text,text,text,text,text) from public;
grant execute on function public.quote_get(text), public.quote_respond(text,text,text,text,text) to anon, authenticated;

-- Run ONCE in Supabase -> SQL Editor (safe to re-run). Customer self-service portal.
create table if not exists public.portal_links (
  token text primary key,
  owner uuid not null references auth.users(id) on delete cascade,
  cid text not null,
  label text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.portal_inbox (
  id bigint generated always as identity primary key,
  token text not null references public.portal_links(token) on delete cascade,
  owner uuid not null,
  cid text not null,
  kind text not null check (kind in ('reading','toner','ticket')),
  payload jsonb not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
alter table public.portal_links enable row level security;
alter table public.portal_inbox enable row level security;

drop policy if exists "links team" on public.portal_links;
create policy "links team" on public.portal_links for all
  using (owner = auth.uid() and public.my_role() in ('admin','manager'))
  with check (owner = auth.uid() and public.my_role() in ('admin','manager'));
drop policy if exists "inbox team" on public.portal_inbox;
create policy "inbox team" on public.portal_inbox for all
  using (owner = auth.uid() and public.my_role() in ('admin','manager'))
  with check (owner = auth.uid() and public.my_role() in ('admin','manager'));

-- Public (token) access: the portal page can only call these two functions.
create or replace function public.portal_get(t text) returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare l public.portal_links; d jsonb; c jsonb;
begin
  select * into l from public.portal_links where token = t and active;
  if not found then return null; end if;
  select data into d from public.app_state where owner = l.owner;
  if d is null then return null; end if;
  select x into c from jsonb_array_elements(coalesce(d->'customers','[]'::jsonb)) x where x->>'id' = l.cid limit 1;
  if c is null then return null; end if;
  return jsonb_build_object(
    'company', jsonb_build_object('name', d#>>'{company,name}', 'phone', d#>>'{company,phone}', 'email', d#>>'{company,email}'),
    'customer', jsonb_build_object('name', c->>'name'),
    'machines', coalesce((select jsonb_agg(jsonb_build_object('id', m->>'id', 'model', m->>'model', 'serial', m->>'serial', 'dept', m->>'department',
        'last', (select jsonb_build_object('date', r->>'date', 'month', r->>'month', 'me', r->'me', 'ce', r->'ce') from jsonb_array_elements(coalesce(m->'readings','[]'::jsonb)) r order by r->>'month' desc limit 1)))
        from jsonb_array_elements(coalesce(c->'machines','[]'::jsonb)) m where coalesce(m->>'status','Active') = 'Active'), '[]'::jsonb),
    'invoices', coalesce((select jsonb_agg(jsonb_build_object('no', v->>'no', 'date', v->>'date', 'due', v->>'due', 'total', v->'total') order by v->>'date' desc)
        from jsonb_array_elements(coalesce(d->'invoices','[]'::jsonb)) v where v->>'cid' = l.cid), '[]'::jsonb),
    'ledger', coalesce((select jsonb_agg(jsonb_build_object('date', x->>'date', 'type', x->>'type', 'amount', x->'amount', 'ref', x->>'ref'))
        from jsonb_array_elements(coalesce(d->'ledger','[]'::jsonb)) x where x->>'cid' = l.cid), '[]'::jsonb)
  );
end $$;

create or replace function public.portal_submit(t text, k text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare l public.portal_links;
begin
  select * into l from public.portal_links where token = t and active;
  if not found then return jsonb_build_object('ok', false, 'error', 'Link is not valid'); end if;
  if k not in ('reading','toner','ticket') then return jsonb_build_object('ok', false, 'error', 'Bad request'); end if;
  if length(p::text) > 400000 then return jsonb_build_object('ok', false, 'error', 'Too large'); end if;
  if (select count(*) from public.portal_inbox where token = t and status = 'new') >= 40 then
    return jsonb_build_object('ok', false, 'error', 'Too many pending requests — please call us.');
  end if;
  insert into public.portal_inbox(token, owner, cid, kind, payload) values (t, l.owner, l.cid, k, p);
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.portal_get(text), public.portal_submit(text, text, jsonb) from public;
grant execute on function public.portal_get(text), public.portal_submit(text, text, jsonb) to anon, authenticated;

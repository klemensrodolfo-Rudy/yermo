-- YERMO · mundo del grupo en la nube (Supabase)
-- Pegar todo en Supabase → SQL Editor → New query → Run. Se puede volver a correr sin problema.

create table if not exists public.yermo_worlds (
  id text primary key,
  name text not null,
  seed bigint not null,
  world_type text not null default 'normal',
  mode text not null default 'survival',
  meta jsonb not null default '{}'::jsonb,
  owner uuid default auth.uid() references auth.users(id) on delete set null,
  host_token text,
  host_code text,
  host_name text,
  host_seen timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.yermo_chunks (
  world_id text not null references public.yermo_worlds(id) on delete cascade,
  key text not null,
  data text not null,
  updated_at timestamptz not null default now(),
  primary key (world_id, key)
);

create table if not exists public.yermo_players (
  world_id text not null references public.yermo_worlds(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (world_id, user_id)
);

alter table public.yermo_worlds enable row level security;
alter table public.yermo_chunks enable row level security;
alter table public.yermo_players enable row level security;

-- cualquiera con cuenta juega en los mundos del grupo; borrar un mundo sólo su creador
drop policy if exists "yermo worlds read" on public.yermo_worlds;
drop policy if exists "yermo worlds insert" on public.yermo_worlds;
drop policy if exists "yermo worlds update" on public.yermo_worlds;
drop policy if exists "yermo worlds delete" on public.yermo_worlds;
create policy "yermo worlds read" on public.yermo_worlds for select to authenticated using (true);
create policy "yermo worlds insert" on public.yermo_worlds for insert to authenticated with check (owner = auth.uid());
create policy "yermo worlds update" on public.yermo_worlds for update to authenticated using (true) with check (true);
create policy "yermo worlds delete" on public.yermo_worlds for delete to authenticated using (owner = auth.uid());

drop policy if exists "yermo chunks read" on public.yermo_chunks;
drop policy if exists "yermo chunks write" on public.yermo_chunks;
drop policy if exists "yermo chunks update" on public.yermo_chunks;
create policy "yermo chunks read" on public.yermo_chunks for select to authenticated using (true);
create policy "yermo chunks write" on public.yermo_chunks for insert to authenticated with check (true);
create policy "yermo chunks update" on public.yermo_chunks for update to authenticated using (true) with check (true);

-- el progreso de cada jugador sólo lo escribe ese jugador
drop policy if exists "yermo players read" on public.yermo_players;
drop policy if exists "yermo players insert" on public.yermo_players;
drop policy if exists "yermo players update" on public.yermo_players;
create policy "yermo players read" on public.yermo_players for select to authenticated using (true);
create policy "yermo players insert" on public.yermo_players for insert to authenticated with check (user_id = auth.uid());
create policy "yermo players update" on public.yermo_players for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- anfitrión: el primero que entra; se libera si no da señales por 25 s ----------
create or replace function public.yermo_claim_host(w text, tok text, hname text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  update yermo_worlds set host_token = tok, host_code = null, host_name = hname, host_seen = now()
   where id = w and (host_token is null or host_token = tok or host_seen < now() - interval '25 seconds');
  return found;
end $$;

create or replace function public.yermo_set_host_code(w text, tok text, code text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  update yermo_worlds set host_code = code, host_seen = now() where id = w and host_token = tok;
  return found;
end $$;

create or replace function public.yermo_host_beat(w text, tok text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  update yermo_worlds set host_seen = now() where id = w and host_token = tok;
  return found;
end $$;

create or replace function public.yermo_release_host(w text, tok text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  update yermo_worlds set host_token = null, host_code = null, host_name = null where id = w and host_token = tok;
end $$;

create or replace function public.yermo_alive_host(w text) returns table (code text, name text)
language sql security definer set search_path = public as $$
  select host_code, host_name from yermo_worlds
   where id = w and auth.uid() is not null and host_token is not null and host_seen > now() - interval '25 seconds';
$$;

create or replace function public.yermo_list_worlds() returns table (id text, name text, seed bigint, world_type text, mode text, updated_at timestamptz, playing text, owner uuid, players bigint)
language sql security definer set search_path = public as $$
  select w.id, w.name, w.seed, w.world_type, w.mode, w.updated_at,
         case when w.host_token is not null and w.host_seen > now() - interval '25 seconds' then w.host_name end,
         w.owner, (select count(*) from yermo_players p where p.world_id = w.id)
    from yermo_worlds w where auth.uid() is not null order by w.updated_at desc;
$$;

revoke all on function public.yermo_claim_host(text, text, text) from public, anon;
revoke all on function public.yermo_set_host_code(text, text, text) from public, anon;
revoke all on function public.yermo_host_beat(text, text) from public, anon;
revoke all on function public.yermo_release_host(text, text) from public, anon;
revoke all on function public.yermo_alive_host(text) from public, anon;
revoke all on function public.yermo_list_worlds() from public, anon;
grant execute on function public.yermo_claim_host(text, text, text) to authenticated;
grant execute on function public.yermo_set_host_code(text, text, text) to authenticated;
grant execute on function public.yermo_host_beat(text, text) to authenticated;
grant execute on function public.yermo_release_host(text, text) to authenticated;
grant execute on function public.yermo_alive_host(text) to authenticated;
grant execute on function public.yermo_list_worlds() to authenticated;

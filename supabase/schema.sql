-- YERMO · mundo del grupo en la nube (Supabase)
-- Pegar todo en Supabase → SQL Editor → New query → Run. Se puede volver a correr sin problema
-- (actualiza una base ya creada sin perder mundos ni progreso).
--
-- Mundos PRIVADOS: cada mundo sólo lo ven y lo juegan sus miembros. Para sumarse hace falta el código
-- de invitación, que sólo ve el creador del mundo. Todo lo controla la base (seguridad por filas).

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
alter table public.yermo_worlds add column if not exists invite text;
update public.yermo_worlds set invite = upper(substr(md5(random()::text || id), 1, 6)) where invite is null;
alter table public.yermo_worlds alter column invite set default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

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

create table if not exists public.yermo_members (
  world_id text not null references public.yermo_worlds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (world_id, user_id)
);

-- ¿el usuario actual es miembro del mundo?
create or replace function public.yermo_is_member(w text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from yermo_members where world_id = w and user_id = auth.uid());
$$;

-- nombre visible de un usuario
create or replace function public.yermo_username(u uuid) returns text
language sql stable security definer set search_path = public, auth as $$
  select coalesce(raw_user_meta_data->>'username', split_part(email, '@', 1)) from auth.users where id = u;
$$;

-- el creador queda como miembro (dueño) automáticamente
create or replace function public.yermo_add_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.owner is not null then
    insert into yermo_members (world_id, user_id, name, role) values (new.id, new.owner, yermo_username(new.owner), 'owner')
    on conflict (world_id, user_id) do update set role = 'owner';
  end if;
  return new;
end $$;
drop trigger if exists yermo_worlds_owner on public.yermo_worlds;
create trigger yermo_worlds_owner after insert on public.yermo_worlds for each row execute function public.yermo_add_owner();
-- mundos creados antes de esta versión: su creador pasa a ser miembro
insert into public.yermo_members (world_id, user_id, name, role)
  select id, owner, public.yermo_username(owner), 'owner' from public.yermo_worlds where owner is not null
  on conflict (world_id, user_id) do nothing;

alter table public.yermo_worlds enable row level security;
alter table public.yermo_chunks enable row level security;
alter table public.yermo_players enable row level security;
alter table public.yermo_members enable row level security;

-- el código de invitación no se puede leer directo (sólo el dueño, con yermo_get_invite)
revoke select on public.yermo_worlds from authenticated, anon;
grant select (id, name, seed, world_type, mode, meta, owner, host_token, host_code, host_name, host_seen, created_at, updated_at) on public.yermo_worlds to authenticated;
-- desde el juego sólo se puede actualizar el nombre y el estado guardado del mundo
revoke update on public.yermo_worlds from authenticated, anon;
grant update (name, meta, updated_at) on public.yermo_worlds to authenticated;

drop policy if exists "yermo worlds read" on public.yermo_worlds;
drop policy if exists "yermo worlds insert" on public.yermo_worlds;
drop policy if exists "yermo worlds update" on public.yermo_worlds;
drop policy if exists "yermo worlds delete" on public.yermo_worlds;
create policy "yermo worlds read" on public.yermo_worlds for select to authenticated using (public.yermo_is_member(id));
create policy "yermo worlds insert" on public.yermo_worlds for insert to authenticated with check (owner = auth.uid());
create policy "yermo worlds update" on public.yermo_worlds for update to authenticated using (public.yermo_is_member(id)) with check (public.yermo_is_member(id));
create policy "yermo worlds delete" on public.yermo_worlds for delete to authenticated using (owner = auth.uid());

drop policy if exists "yermo chunks read" on public.yermo_chunks;
drop policy if exists "yermo chunks write" on public.yermo_chunks;
drop policy if exists "yermo chunks update" on public.yermo_chunks;
create policy "yermo chunks read" on public.yermo_chunks for select to authenticated using (public.yermo_is_member(world_id));
create policy "yermo chunks write" on public.yermo_chunks for insert to authenticated with check (public.yermo_is_member(world_id));
create policy "yermo chunks update" on public.yermo_chunks for update to authenticated using (public.yermo_is_member(world_id)) with check (public.yermo_is_member(world_id));

-- el progreso de cada jugador sólo lo escribe ese jugador (y sólo en mundos donde es miembro)
drop policy if exists "yermo players read" on public.yermo_players;
drop policy if exists "yermo players insert" on public.yermo_players;
drop policy if exists "yermo players update" on public.yermo_players;
create policy "yermo players read" on public.yermo_players for select to authenticated using (public.yermo_is_member(world_id));
create policy "yermo players insert" on public.yermo_players for insert to authenticated with check (user_id = auth.uid() and public.yermo_is_member(world_id));
create policy "yermo players update" on public.yermo_players for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.yermo_is_member(world_id));

-- miembros: se ven entre ellos; uno puede irse; el dueño puede echar. Sumarse, sólo con código (función)
drop policy if exists "yermo members read" on public.yermo_members;
drop policy if exists "yermo members leave" on public.yermo_members;
create policy "yermo members read" on public.yermo_members for select to authenticated using (public.yermo_is_member(world_id));
create policy "yermo members leave" on public.yermo_members for delete to authenticated
  using ((user_id = auth.uid() and role <> 'owner') or exists (select 1 from yermo_worlds w where w.id = world_id and w.owner = auth.uid() and yermo_members.user_id <> auth.uid()));

-- ---------- invitaciones ----------
create or replace function public.yermo_join_world(code text) returns table (id text, name text)
language plpgsql security definer set search_path = public as $$
declare w yermo_worlds;
begin
  if auth.uid() is null then return; end if;
  select * into w from yermo_worlds where upper(invite) = upper(trim(code)) limit 1;
  if not found then return; end if;
  insert into yermo_members (world_id, user_id, name) values (w.id, auth.uid(), yermo_username(auth.uid()))
    on conflict (world_id, user_id) do nothing;
  return query select w.id, w.name;
end $$;

create or replace function public.yermo_get_invite(w text) returns text
language sql security definer set search_path = public as $$
  select invite from yermo_worlds where id = w and owner = auth.uid();
$$;

create or replace function public.yermo_new_invite(w text) returns text
language plpgsql security definer set search_path = public as $$
declare c text := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
begin
  update yermo_worlds set invite = c where id = w and owner = auth.uid();
  if not found then return null; end if;
  return c;
end $$;

-- ---------- anfitrión: el primero que entra; se libera si no da señales por 25 s ----------
create or replace function public.yermo_claim_host(w text, tok text, hname text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not yermo_is_member(w) then return false; end if;
  update yermo_worlds set host_token = tok, host_code = null, host_name = hname, host_seen = now()
   where id = w and (host_token is null or host_token = tok or host_seen < now() - interval '25 seconds');
  return found;
end $$;

create or replace function public.yermo_set_host_code(w text, tok text, code text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not yermo_is_member(w) then return false; end if;
  update yermo_worlds set host_code = code, host_seen = now() where id = w and host_token = tok;
  return found;
end $$;

create or replace function public.yermo_host_beat(w text, tok text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not yermo_is_member(w) then return false; end if;
  update yermo_worlds set host_seen = now() where id = w and host_token = tok;
  return found;
end $$;

create or replace function public.yermo_release_host(w text, tok text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not yermo_is_member(w) then return; end if;
  update yermo_worlds set host_token = null, host_code = null, host_name = null where id = w and host_token = tok;
end $$;

create or replace function public.yermo_alive_host(w text) returns table (code text, name text)
language sql security definer set search_path = public as $$
  select host_code, host_name from yermo_worlds
   where id = w and yermo_is_member(w) and host_token is not null and host_seen > now() - interval '25 seconds';
$$;

drop function if exists public.yermo_list_worlds();
create or replace function public.yermo_list_worlds() returns table (id text, name text, seed bigint, world_type text, mode text, updated_at timestamptz, playing text, owner uuid, players bigint)
language sql security definer set search_path = public as $$
  select w.id, w.name, w.seed, w.world_type, w.mode, w.updated_at,
         case when w.host_token is not null and w.host_seen > now() - interval '25 seconds' then w.host_name end,
         w.owner, (select count(*) from yermo_members m where m.world_id = w.id)
    from yermo_worlds w
   where exists (select 1 from yermo_members m where m.world_id = w.id and m.user_id = auth.uid())
   order by w.updated_at desc;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'yermo_is_member(text)', 'yermo_username(uuid)', 'yermo_join_world(text)', 'yermo_get_invite(text)', 'yermo_new_invite(text)',
    'yermo_claim_host(text, text, text)', 'yermo_set_host_code(text, text, text)', 'yermo_host_beat(text, text)',
    'yermo_release_host(text, text)', 'yermo_alive_host(text)', 'yermo_list_worlds()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

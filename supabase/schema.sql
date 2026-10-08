-- TraversleDaily player accounts.
-- Paste this whole file into Supabase → SQL Editor → New query, then press Run.
-- Safe to run again: it only creates what is missing.

-- One row per player: everything the game used to keep only in the browser.
create table if not exists public.players (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 24),
  results      jsonb not null default '{}'::jsonb,   -- one entry per puzzle day ("2026-10-08": {...}), same shape as localStorage traverse.v1.results
  profile      jsonb not null default '{}'::jsonb,   -- small extras (badges seen, settings); no real names or contact details
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Paid perks (Traversle +). Players can read their own row but never write it:
-- only a payment webhook running with the service key will grant or revoke it.
create table if not exists public.entitlements (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  plus       boolean not null default false,
  plus_since timestamptz,
  source     text,                                    -- e.g. 'stripe', 'lemonsqueezy', 'gift'
  updated_at timestamptz not null default now()
);

alter table public.players      enable row level security;
alter table public.entitlements enable row level security;

drop policy if exists "players read own"   on public.players;
drop policy if exists "players insert own" on public.players;
drop policy if exists "players update own" on public.players;
drop policy if exists "players delete own" on public.players;
create policy "players read own"   on public.players for select using (auth.uid() = user_id);
create policy "players insert own" on public.players for insert with check (auth.uid() = user_id);
create policy "players update own" on public.players for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "players delete own" on public.players for delete using (auth.uid() = user_id);

drop policy if exists "entitlements read own" on public.entitlements;
create policy "entitlements read own" on public.entitlements for select using (auth.uid() = user_id);

-- Keep rows to a sane size so nobody can use the database as free storage.
alter table public.players drop constraint if exists players_size;
alter table public.players add constraint players_size check (pg_column_size(results) < 2000000 and pg_column_size(profile) < 20000);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists players_touch on public.players;
create trigger players_touch before update on public.players for each row execute function public.touch_updated_at();

-- "Delete my account" on the profile page calls this. It removes the login and,
-- through the cascades above, every row that belongs to the player.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- The game calls this to save. It merges instead of overwriting, so two devices
-- never wipe each other's history: a day already saved on the server keeps its
-- first official result, new days are added. Runs as the player, so the policies
-- above still apply. Returns the merged copy for the browser to keep.
create or replace function public.save_progress(p_results jsonb, p_name text default null)
returns jsonb language plpgsql set search_path = public as $$
declare r public.players;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.players (user_id, results, display_name)
  values (auth.uid(), coalesce(p_results, '{}'::jsonb), nullif(trim(p_name), ''))
  on conflict (user_id) do update
    set results      = excluded.results || public.players.results,
        display_name = coalesce(excluded.display_name, public.players.display_name)
  returning * into r;
  return jsonb_build_object('results', r.results, 'display_name', r.display_name, 'updated_at', r.updated_at);
end $$;
revoke all on function public.save_progress(jsonb, text) from public, anon;
grant execute on function public.save_progress(jsonb, text) to authenticated;

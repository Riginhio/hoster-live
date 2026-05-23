-- HOSTER LIVE - Supabase Realtime schema bootstrap
-- Run this in the Supabase SQL editor for the project that backs HOSTER LIVE.
--
-- LocalStorage remains the primary source of truth for the current app version.
-- This table prepares cross-device synchronization for manager and TV screens.

create extension if not exists "pgcrypto";

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text not null,
  restaurant_name text not null,
  status text not null default 'active',
  autoplay_status text not null default 'idle',
  mode text not null,
  active_tables int not null default 0,
  table_price numeric not null default 0,
  gross_revenue numeric not null default 0,
  commission_hl_percent numeric not null default 0,
  commission_restaurant_percent numeric not null default 0,
  commission_net_percent numeric not null default 0,
  commission_hl_amount numeric not null default 0,
  commission_restaurant_amount numeric not null default 0,
  commission_net_amount numeric not null default 0,
  prize_amount numeric not null default 0,
  called_cards jsonb not null default '[]'::jsonb,
  winner_folio text,
  winner_cards jsonb not null default '[]'::jsonb,
  -- Runtime fields used by the current HOSTER LIVE countdown/autoplay flow.
  autoplay_interval_seconds int not null default 5,
  pre_start_countdown_seconds int not null default 60,
  pre_start_started_at timestamptz,
  autoplay_started_at timestamptz,
  active_promotions jsonb not null default '[]'::jsonb,
  play_started_at timestamptz,
  play_ended_at timestamptz,
  duration_seconds int not null default 0,
  last_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists game_sessions_restaurant_active_idx
  on public.game_sessions (restaurant_id, status, created_at desc);

create index if not exists game_sessions_last_updated_idx
  on public.game_sessions (last_updated_at desc);

alter table public.game_sessions enable row level security;

-- DEV DIAGNOSTIC OPTION:
-- If inserts/selects are still blocked while diagnosing browser-only Realtime,
-- run the next line manually in development only. Do not use this in production.
-- alter table public.game_sessions disable row level security;

-- Development policy for browser-only prototype.
-- Tighten this before production by scoping access to authenticated users,
-- venue roles, or service-side RPC functions.
drop policy if exists "hoster live dev read game sessions" on public.game_sessions;
create policy "hoster live dev read game sessions"
  on public.game_sessions
  for select
  using (true);

drop policy if exists "hoster live dev insert game sessions" on public.game_sessions;
create policy "hoster live dev insert game sessions"
  on public.game_sessions
  for insert
  with check (true);

drop policy if exists "hoster live dev update game sessions" on public.game_sessions;
create policy "hoster live dev update game sessions"
  on public.game_sessions
  for update
  using (true)
  with check (true);

-- Enable Supabase Realtime for this table.
-- If the table is already in the publication, Supabase may report a duplicate;
-- that is safe to ignore.
alter publication supabase_realtime add table public.game_sessions;

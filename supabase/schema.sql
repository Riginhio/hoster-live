-- HOSTER LIVE - Supabase Realtime schema bootstrap
-- Run this in the Supabase SQL editor for the project that backs HOSTER LIVE.
--
-- LocalStorage remains the primary source of truth for the current app version.
-- This table prepares cross-device synchronization for manager and TV screens.

create extension if not exists "pgcrypto";

create table if not exists public.restaurants (
  id text primary key,
  slug text not null,
  name text not null,
  logo_url text not null default '',
  active boolean not null default true,
  is_active boolean not null default true,
  business_type text not null,
  manager_name text not null default '',
  manager_whatsapp text not null default '',
  manager_email text not null default '',
  owner_name text not null default '',
  owner_whatsapp text not null default '',
  address text not null default '',
  google_maps_url text not null default '',
  instagram_url text not null default '',
  facebook_url text not null default '',
  tiktok_url text not null default '',
  average_hostesses int not null default 0,
  strong_days jsonb not null default '[]'::jsonb,
  estimated_games_per_week int not null default 0,
  audience_type jsonb not null default '[]'::jsonb,
  audience_notes text not null default '',
  notes text not null default '',
  restaurant_commission_percent numeric not null default 0,
  hl_commission_mode text not null default 'fixed',
  hl_commission_value numeric not null default 0,
  hl_fixed_fee numeric not null default 0,
  accumulated_enabled boolean not null default false,
  accumulated_amount_per_game numeric not null default 0,
  accumulated_day text not null default 'lunes',
  accumulated_table_price numeric not null default 300,
  accumulated_table_count int not null default 30,
  active_deck text not null default 'loteria',
  commission_percent numeric not null default 0,
  commission_hl_percent numeric not null default 0,
  commission_restaurant_percent numeric not null default 0,
  allowed_table_counts jsonb not null default '[]'::jsonb,
  allowed_prices jsonb not null default '[]'::jsonb,
  allowed_modes jsonb not null default '[]'::jsonb,
  enabled_games jsonb not null default '[]'::jsonb,
  active_games jsonb not null default '[]'::jsonb,
  enabled_decks jsonb not null default '[]'::jsonb,
  primary_color text not null default '#d9a441',
  secondary_color text not null default '#1fa187',
  accent_color text not null default '#c0392b',
  autoplay_default boolean not null default true,
  autoplay_interval int not null default 5000,
  show_clock boolean not null default true,
  show_sponsors boolean not null default true,
  show_promotions boolean not null default true,
  show_qr_promo boolean not null default true,
  promo_title text not null default '',
  promo_subtitle text not null default '',
  promo_image_url text not null default '',
  standby_title text not null default '',
  standby_subtitle text not null default '',
  standby_image_url text not null default '',
  standby_promo_text text not null default '',
  standby_cta_text text not null default '',
  standby_cta_qr_url text not null default '',
  standby_rotate_promotions boolean not null default true,
  instagram text not null default '',
  facebook text not null default '',
  tiktok text not null default '',
  qr_campaign_id text not null default '',
  theme jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.manager_users (
  id text primary key,
  username text not null unique,
  password text not null,
  name text not null,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  role text not null default 'manager',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists manager_users_restaurant_idx
  on public.manager_users (restaurant_id, active);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text not null,
  restaurant_name text not null,
  status text not null default 'active',
  autoplay_status text not null default 'idle',
  deck_id text not null default 'loteria',
  mode text not null,
  active_tables int not null default 0,
  table_price numeric not null default 0,
  restaurant_commission_percent numeric not null default 0,
  restaurant_commission_amount numeric not null default 0,
  hl_commission_mode text not null default 'fixed',
  hl_commission_value numeric not null default 0,
  hl_commission_amount numeric not null default 0,
  commission_total_percent numeric not null default 0,
  commission_total_amount numeric not null default 0,
  hl_fixed_fee numeric not null default 0,
  restaurant_net_amount numeric not null default 0,
  gross_revenue numeric not null default 0,
  commission_hl_percent numeric not null default 0,
  commission_restaurant_percent numeric not null default 0,
  commission_net_percent numeric not null default 0,
  commission_hl_amount numeric not null default 0,
  commission_restaurant_amount numeric not null default 0,
  commission_net_amount numeric not null default 0,
  prize_amount numeric not null default 0,
  base_prize_amount numeric not null default 0,
  accumulated_contribution_amount numeric not null default 0,
  accumulated_prize_amount numeric not null default 0,
  game_type text not null default 'normal',
  called_cards jsonb not null default '[]'::jsonb,
  winner_folio text,
  winner_cards jsonb not null default '[]'::jsonb,
  -- Runtime fields used by the current HOSTER LIVE countdown/autoplay flow.
  autoplay_interval_seconds int not null default 5,
  pre_start_countdown_seconds int not null default 60,
  pre_start_started_at timestamptz,
  autoplay_started_at timestamptz,
  active_promotions jsonb not null default '[]'::jsonb,
  operator_user_id text,
  operator_username text,
  operator_role text,
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

alter table public.restaurants
  add column if not exists accumulated_enabled boolean not null default false,
  add column if not exists accumulated_amount_per_game numeric not null default 0,
  add column if not exists accumulated_day text not null default 'lunes',
  add column if not exists accumulated_table_price numeric not null default 300,
  add column if not exists accumulated_table_count int not null default 30;

alter table public.game_sessions
  add column if not exists base_prize_amount numeric not null default 0,
  add column if not exists accumulated_contribution_amount numeric not null default 0,
  add column if not exists accumulated_prize_amount numeric not null default 0,
  add column if not exists game_type text not null default 'normal';

alter table public.restaurants enable row level security;
alter table public.manager_users enable row level security;
alter table public.game_sessions enable row level security;

drop policy if exists "hoster live dev read restaurants" on public.restaurants;
create policy "hoster live dev read restaurants"
  on public.restaurants
  for select
  using (true);

drop policy if exists "hoster live dev write restaurants" on public.restaurants;
create policy "hoster live dev write restaurants"
  on public.restaurants
  for all
  using (true)
  with check (true);

drop policy if exists "hoster live dev read manager users" on public.manager_users;
create policy "hoster live dev read manager users"
  on public.manager_users
  for select
  using (true);

drop policy if exists "hoster live dev write manager users" on public.manager_users;
create policy "hoster live dev write manager users"
  on public.manager_users
  for all
  using (true)
  with check (true);

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

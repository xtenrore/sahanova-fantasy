-- SahaNova production schema for Supabase/Postgres.
-- Demo mode does not require Supabase; this schema enables durable multi-user persistence.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Menajer',
  fantasy_team_name text not null default 'Yeni Takım',
  favorite_club text,
  avatar_url text,
  role text not null default 'manager' check (role in ('manager','admin')),
  language text not null default 'tr' check (language in ('tr','en')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.clubs (
  id text primary key, name text not null, short_name text not null, city text, primary_color text, secondary_color text, strength smallint not null default 3 check(strength between 1 and 5), active boolean not null default true
);
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(), provider_id text unique, club_id text references public.clubs(id), name text not null,
  position text not null check(position in ('GK','DEF','MID','FWD')), price numeric(5,1) not null, total_points int not null default 0,
  form numeric(4,1) not null default 0, ownership numeric(5,2) not null default 0, status text not null default 'available',
  minutes int not null default 0, goals int not null default 0, assists int not null default 0, clean_sheets int not null default 0,
  saves int not null default 0, yellow_cards int not null default 0, red_cards int not null default 0, updated_at timestamptz not null default now()
);
create table if not exists public.gameweeks (
  id int primary key, starts_at timestamptz not null, ends_at timestamptz not null, deadline_at timestamptz not null, status text not null default 'upcoming'
);
create table if not exists public.fixtures (
  id uuid primary key default gen_random_uuid(), provider_id text unique, gameweek_id int references public.gameweeks(id), home_club_id text references public.clubs(id), away_club_id text references public.clubs(id),
  starts_at timestamptz not null, status text not null default 'scheduled', home_score int not null default 0, away_score int not null default 0, minute int, updated_at timestamptz not null default now()
);
create table if not exists public.fantasy_teams (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null,
  formation text not null default '4-4-2', budget numeric(5,1) not null default 100, captain_id uuid references public.players(id), vice_captain_id uuid references public.players(id),
  current_gameweek int references public.gameweeks(id), total_points int not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id)
);
create table if not exists public.squad_players (
  team_id uuid references public.fantasy_teams(id) on delete cascade, player_id uuid references public.players(id) on delete cascade,
  is_starting boolean not null default false, bench_order smallint, purchase_price numeric(5,1) not null, primary key(team_id,player_id)
);
create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id), name text not null, join_code text not null unique default upper(substr(encode(gen_random_bytes(6),'hex'),1,8)), private boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.league_members (
  league_id uuid references public.leagues(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade, joined_at timestamptz not null default now(), primary key(league_id,user_id)
);
create table if not exists public.gameweek_scores (
  team_id uuid references public.fantasy_teams(id) on delete cascade, gameweek_id int references public.gameweeks(id) on delete cascade, score int not null default 0, rank int, primary key(team_id,gameweek_id)
);
create table if not exists public.app_config (
  key text primary key, value jsonb not null, updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.fantasy_teams enable row level security;
alter table public.squad_players enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.gameweek_scores enable row level security;

create policy "profiles own read" on public.profiles for select using (auth.uid() = id);
create policy "profiles own update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "teams own all" on public.fantasy_teams for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "squad via own team" on public.squad_players for all using (exists(select 1 from public.fantasy_teams t where t.id=team_id and t.user_id=auth.uid())) with check (exists(select 1 from public.fantasy_teams t where t.id=team_id and t.user_id=auth.uid()));
create policy "league members read" on public.leagues for select using (not private or owner_id=auth.uid() or exists(select 1 from public.league_members m where m.league_id=id and m.user_id=auth.uid()));
create policy "league owners write" on public.leagues for all using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy "memberships own" on public.league_members for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "scores visible to authenticated" on public.gameweek_scores for select to authenticated using (true);

-- Public read-only football catalog.
alter table public.clubs enable row level security;
alter table public.players enable row level security;
alter table public.gameweeks enable row level security;
alter table public.fixtures enable row level security;
create policy "clubs public read" on public.clubs for select using (true);
create policy "players public read" on public.players for select using (true);
create policy "gameweeks public read" on public.gameweeks for select using (true);
create policy "fixtures public read" on public.fixtures for select using (true);

-- Admin writes should only be performed server-side using a service-role key after verifying profiles.role='admin'.

-- OE Picks — normalized market data (INSTRUCTIONS.md §4, §7).
-- Providers are swappable: we store our own shape, not a vendor's.

-- Teams carry their Elo rating (the §6 model baseline). Keyed by canonical name,
-- which matches the team strings the odds/stats feeds use (e.g. "Oklahoma City Thunder").
create table if not exists teams (
  sport          text not null,
  name           text not null,
  abbreviation   text,
  elo_rating     numeric not null default 1500,   -- MODEL_ELO_BASE; cold-start prior, not a fetched stat
  elo_updated_at timestamptz,
  created_at     timestamptz not null default now(),
  primary key (sport, name)
);

-- One row per game/event. external_id is the provider's stable event id.
create table if not exists games (
  id            uuid primary key default gen_random_uuid(),
  sport         text not null,
  provider      text not null,                 -- e.g. 'the-odds-api'
  external_id   text not null,                 -- provider event id
  commence_time timestamptz not null,
  home_team     text not null,
  away_team     text not null,
  status        text not null default 'scheduled',  -- scheduled | live | final
  home_score    int,
  away_score    int,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (provider, external_id)
);
create index if not exists games_sport_commence_idx on games (sport, commence_time);

-- Line snapshots: append-only history. Enables line-movement + CLV analysis (§7).
create table if not exists odds_snapshots (
  id               uuid primary key default gen_random_uuid(),
  game_id          uuid not null references games(id) on delete cascade,
  provider         text not null,
  bookmaker        text not null,              -- draftkings | fanduel | ...
  market           text not null,              -- h2h | spreads | totals
  outcome          text not null,              -- team name | Over | Under
  price_american   int not null,
  point            numeric,                    -- spread/total line; null for h2h
  bookmaker_update timestamptz,                -- book's own last_update
  captured_at      timestamptz not null default now()
);
create index if not exists odds_snapshots_game_market_idx
  on odds_snapshots (game_id, market, captured_at desc);

-- Keep games.updated_at fresh on upsert.
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists games_set_updated_at on games;
create trigger games_set_updated_at before update on games
  for each row execute function set_updated_at();

-- RLS: single-user app. Service role (Edge Functions) bypasses RLS; the authed
-- user (OE) gets full access. A leaked anon URL then can't read/write.
alter table teams          enable row level security;
alter table games          enable row level security;
alter table odds_snapshots enable row level security;

create policy "authenticated full access" on teams
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on games
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on odds_snapshots
  for all to authenticated using (true) with check (true);

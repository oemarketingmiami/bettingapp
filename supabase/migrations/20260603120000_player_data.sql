-- Player data layer for prop grading (Phase 1).
-- nba_players: name -> API-SPORTS id index (seeded from team rosters).
-- player_stats_cache: cached game logs per player/season (refreshed on a TTL)
-- so re-grading the same players doesn't burn the API-SPORTS daily quota.

create table if not exists nba_players (
  api_id      int primary key,
  full_name   text not null,
  search_name text not null,          -- lowercased "first last" for matching
  first_name  text,
  last_name   text,
  team        text,
  season      int not null,
  updated_at  timestamptz not null default now()
);
create index if not exists nba_players_search_idx on nba_players (search_name);

create table if not exists player_stats_cache (
  api_id     int not null,
  season     int not null,
  logs       jsonb not null,          -- normalized array: [{date,pts,reb,ast,min,...}]
  fetched_at timestamptz not null default now(),
  primary key (api_id, season)
);

alter table nba_players       enable row level security;
alter table player_stats_cache enable row level security;
create policy "authenticated full access" on nba_players
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on player_stats_cache
  for all to authenticated using (true) with check (true);

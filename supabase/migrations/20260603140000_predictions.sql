-- Per-game model predictions, written by generate-card and settled by
-- settle-results. This is the flywheel: (predicted prob, actual outcome) pairs
-- that future calibration runs learn from, plus CLV/accuracy tracking.

create table if not exists predictions (
  game_id          uuid primary key references games(id) on delete cascade,
  sport            text,
  home_team        text,
  away_team        text,
  commence_time    timestamptz,
  model_home_prob  numeric,   -- calibrated model P(home win) at card time
  no_vig_home_prob numeric,   -- de-vigged market P(home win)
  home_edge        numeric,   -- model - market
  created_at       timestamptz not null default now(),
  -- settlement (filled by settle-results)
  home_score       int,
  away_score       int,
  home_won         boolean,
  settled          boolean not null default false,
  settled_at       timestamptz
);

alter table predictions enable row level security;
create policy "authenticated full access" on predictions
  for all to authenticated using (true) with check (true);

-- OE Picks — cards, picks, parlays, profile (INSTRUCTIONS.md §7, verbatim shape).
-- The app reads these; generate-card writes them once per slate.

create table if not exists cards (
  id                uuid primary key default gen_random_uuid(),
  card_date         date not null,
  slate_quality     text,            -- Strong | Medium | Weak | Pass
  day_type          text,            -- straight | prop | parlay | pass
  five_leg_justified bool,
  summary           jsonb,           -- final_verdict block
  created_at        timestamptz default now(),
  unique (card_date)                 -- one card per slate (§5 cost control)
);

create table if not exists picks (
  id                  uuid primary key default gen_random_uuid(),
  card_id             uuid references cards(id) on delete cascade,
  sport text, matchup text, market text, pick text,
  line_or_odds        text,
  card_type           text,          -- safer | aggressive | longshot | prop | total
  bet_grade           numeric,       -- 0-100
  est_win_prob        numeric,       -- %
  confidence          numeric,       -- 1-10
  edge_rating         text,          -- Small | Moderate | Strong | Elite
  suggested_units     numeric,
  reasoning           text,
  risk_flags          text[],
  alternatives_rejected text[],
  placed              bool default false,
  result              text,          -- Win | Loss | Push | null
  units_delta         numeric,
  closing_line        text,
  clv_won             bool
);
create index if not exists picks_card_idx on picks (card_id);

create table if not exists parlays (
  id            uuid primary key default gen_random_uuid(),
  card_id       uuid references cards(id) on delete cascade,
  legs          jsonb,               -- [{pick, grade, prob, justification}]
  weakest_leg   text,
  overall_risk  text,
  result        text,
  units_delta   numeric
);
create index if not exists parlays_card_idx on parlays (card_id);

create table if not exists profile (
  id          uuid primary key references auth.users(id),
  unit_size   numeric default 50,
  created_at  timestamptz default now()
);

-- RLS (§7): only the authed user reads/writes; service role bypasses for jobs.
alter table cards   enable row level security;
alter table picks   enable row level security;
alter table parlays enable row level security;
alter table profile enable row level security;

create policy "authenticated full access" on cards
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on picks
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on parlays
  for all to authenticated using (true) with check (true);
create policy "own profile only" on profile
  for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

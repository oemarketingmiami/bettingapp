// One-off: compute current NBA Elo ratings from historical results (balldontlie)
// and write them to teams.elo_rating. Mirrors services/model/app/elo.py exactly
// (base 1500, K 20, home advantage 65, 538-style margin-of-victory multiplier) so
// the seeded ratings are consistent with what /v1/predict expects.
//
// Run: export the 3 env vars then `node scripts/seedElo.mts`
import { createClient } from "@supabase/supabase-js";

const SEASONS = [2023, 2024, 2025]; // balldontlie season = start year; processed oldest->newest
const ELO_BASE = 1500, K = 20, HOME_ADV = 65, REGRESS = 0.25; // 25% regression to mean each new season

// balldontlie -> Odds API canonical name fixups (only where they differ).
const NAME_FIX: Record<string, string> = { "LA Clippers": "Los Angeles Clippers" };
const canon = (n: string) => NAME_FIX[n] ?? n;

interface Game { date: string; season: number; status: string; home: string; away: string; hs: number; as: number }

async function fetchSeason(season: number, key: string): Promise<Game[]> {
  const out: Game[] = [];
  let cursor: number | null = null;
  for (;;) {
    const url = new URL("https://api.balldontlie.io/v1/games");
    url.searchParams.set("seasons[]", String(season));
    url.searchParams.set("per_page", "100");
    if (cursor != null) url.searchParams.set("cursor", String(cursor));
    const res = await fetch(url, { headers: { Authorization: key } });
    if (res.status === 429) { await sleep(13000); continue; } // free-tier rate limit backoff
    if (!res.ok) throw new Error(`balldontlie ${res.status}: ${await res.text()}`);
    const json = await res.json();
    for (const g of json.data ?? []) {
      if (g.status !== "Final") continue;
      out.push({
        date: g.date, season: g.season, status: g.status,
        home: canon(g.home_team.full_name), away: canon(g.visitor_team.full_name),
        hs: g.home_team_score, as: g.visitor_team_score,
      });
    }
    cursor = json.meta?.next_cursor ?? null;
    if (cursor == null) break;
    await sleep(200);
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function expected(a: number, b: number, ha: number) { return 1 / (1 + 10 ** (-((a + ha) - b) / 400)); }
function mov(margin: number, winnerDiff: number) { return Math.log(Math.abs(margin) + 1) * (2.2 / (winnerDiff * 0.001 + 2.2)); }

function applyGame(R: Map<string, number>, g: Game) {
  const home = R.get(g.home) ?? ELO_BASE, away = R.get(g.away) ?? ELO_BASE;
  const exp = expected(home, away, HOME_ADV);
  let actual: number, winnerDiff: number;
  if (g.hs > g.as) { actual = 1; winnerDiff = (home + HOME_ADV) - away; }
  else if (g.hs < g.as) { actual = 0; winnerDiff = away - (home + HOME_ADV); }
  else { actual = 0.5; winnerDiff = 0; }
  const margin = Math.abs(g.hs - g.as);
  const mult = margin > 0 ? mov(margin, winnerDiff) : 1;
  const delta = K * mult * (actual - exp);
  R.set(g.home, home + delta);
  R.set(g.away, away - delta);
}

async function main() {
  const url = process.env.SUPABASE_URL!, svc = process.env.SUPABASE_SERVICE_ROLE_KEY!, bdl = process.env.BALLDONTLIE_API_KEY!;
  if (!url || !svc || !bdl) throw new Error("Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BALLDONTLIE_API_KEY");

  console.log("Fetching seasons", SEASONS.join(", "), "…");
  const bySeason = new Map<number, Game[]>();
  for (const s of SEASONS) {
    const games = await fetchSeason(s, bdl);
    bySeason.set(s, games.sort((a, b) => a.date.localeCompare(b.date)));
    console.log(`  season ${s}: ${games.length} final games`);
  }

  const R = new Map<string, number>();
  for (const s of SEASONS) {
    if (R.size) for (const [t, r] of R) R.set(t, r * (1 - REGRESS) + ELO_BASE * REGRESS); // regress between seasons
    for (const g of bySeason.get(s)!) applyGame(R, g);
  }

  const rows = [...R.entries()]
    .map(([name, elo_rating]) => ({ sport: "basketball_nba", name, elo_rating: Math.round(elo_rating * 10) / 10, elo_updated_at: new Date().toISOString() }))
    .sort((a, b) => b.elo_rating - a.elo_rating);

  console.log(`\nComputed ${rows.length} team ratings (top 5 / bottom 5):`);
  rows.slice(0, 5).forEach((r) => console.log(`  ${r.elo_rating}  ${r.name}`));
  console.log("  …");
  rows.slice(-5).forEach((r) => console.log(`  ${r.elo_rating}  ${r.name}`));

  const db = createClient(url, svc, { auth: { persistSession: false } });
  const { error } = await db.from("teams").upsert(rows, { onConflict: "sport,name" });
  if (error) throw new Error("upsert failed: " + error.message);
  console.log(`\n✅ Wrote ${rows.length} ratings to teams.`);
}

main().catch((e) => { console.error(e); process.exit(1); });

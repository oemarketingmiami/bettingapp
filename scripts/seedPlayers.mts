// Seed nba_players (name -> API-SPORTS id) from team rosters.
// One-time-ish; re-run when rosters change. Free tier: seasons 2022-2024 only.
// Run: export API_SPORTS_KEY SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY; node scripts/seedPlayers.mts
import { createClient } from "@supabase/supabase-js";

const SEASON = 2024; // free-tier max; bump to current once on a paid plan
const HOST = "https://v2.nba.api-sports.io";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function as(path: string, key: string) {
  const res = await fetch(`${HOST}${path}`, { headers: { "x-apisports-key": key } });
  if (!res.ok) throw new Error(`api-sports ${path} ${res.status}`);
  return res.json();
}

async function main() {
  const url = process.env.SUPABASE_URL!, svc = process.env.SUPABASE_SERVICE_ROLE_KEY!, key = process.env.API_SPORTS_KEY!;
  if (!url || !svc || !key) throw new Error("need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, API_SPORTS_KEY");
  const db = createClient(url, svc, { auth: { persistSession: false } });

  const teamsRes = await as("/teams", key);
  const teams = (teamsRes.response || []).filter((t: { nbaFranchise?: boolean; id: number }) => t.nbaFranchise);
  console.log(`NBA franchises: ${teams.length}`);

  const rows: Record<string, unknown>[] = [];
  for (const t of teams) {
    let attempt = 0;
    for (;;) {
      try {
        const r = await as(`/players?team=${t.id}&season=${SEASON}`, key);
        const errs = r.errors;
        const hasErr = Array.isArray(errs) ? errs.length > 0 : errs && Object.keys(errs).length > 0;
        if ((!r.response || r.response.length === 0) && hasErr && attempt < 3) {
          attempt++; process.stdout.write("~"); await sleep(62000); continue; // rate-limited: wait a minute
        }
        for (const p of r.response || []) {
          const full = `${p.firstname ?? ""} ${p.lastname ?? ""}`.trim();
          if (!p.id || !full) continue;
          rows.push({
            api_id: p.id, full_name: full, search_name: full.toLowerCase(),
            first_name: p.firstname, last_name: p.lastname, team: t.name, season: SEASON,
          });
        }
        process.stdout.write(`${t.name}:${r.response?.length ?? 0} `);
        break;
      } catch {
        if (attempt < 3) { attempt++; await sleep(62000); continue; }
        process.stdout.write(`x `);
        break;
      }
    }
    await sleep(7000); // ~8.5 req/min, under the free 10/min cap
  }
  console.log(`\ncollected ${rows.length} players`);

  // de-dupe by api_id (players can appear on multiple teams after trades)
  const byId = new Map<number, Record<string, unknown>>();
  for (const r of rows) byId.set(r.api_id as number, r);
  const unique = [...byId.values()];

  const { error } = await db.from("nba_players").upsert(unique, { onConflict: "api_id" });
  if (error) throw new Error("upsert failed: " + error.message);
  console.log(`✅ seeded ${unique.length} unique players (season ${SEASON})`);
}

main().catch((e) => { console.error(e); process.exit(1); });

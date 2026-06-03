import "server-only";
import { adminDb } from "@/lib/db";

// Phase 1 prop-data layer. Free API-SPORTS tier => season 2024 (last completed).
// Bump SEASON once on a paid plan for current-season logs.
export const SEASON = 2024;
const HOST = "https://v2.nba.api-sports.io";
const CACHE_TTL_MS = 24 * 3600_000;

export interface ExtractedProp { player: string; stat: string; line: number; side?: string }

interface GameRow { gid: number; min: number; pts: number; reb: number; ast: number; tpm: number; stl: number; blk: number; tov: number }

const clean = (s: string) => s.toLowerCase().replace(/[.\-']/g, "").replace(/\s+/g, " ").trim();
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const parseMin = (v: unknown) => (v == null ? 0 : parseInt(String(v), 10) || 0);

async function resolvePlayer(name: string): Promise<{ api_id: number; full_name: string } | null> {
  const parts = clean(name).split(" ");
  const last = parts[parts.length - 1];
  const firstInit = parts[0]?.[0] ?? "";
  if (!last) return null;
  const { data } = await adminDb().from("nba_players").select("api_id, full_name").ilike("search_name", `%${last}%`);
  if (!data?.length) return null;
  if (data.length === 1) return data[0];
  return data.find((p) => clean(p.full_name).split(" ")[0]?.[0] === firstInit) ?? data[0];
}

async function getLogs(apiId: number): Promise<GameRow[]> {
  const db = adminDb();
  const { data: cached } = await db.from("player_stats_cache").select("logs, fetched_at").eq("api_id", apiId).eq("season", SEASON).maybeSingle();
  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS) {
    return cached.logs as GameRow[];
  }
  const key = process.env.API_SPORTS_KEY;
  if (!key) throw new Error("API_SPORTS_KEY not set");
  const res = await fetch(`${HOST}/players/statistics?id=${apiId}&season=${SEASON}`, { headers: { "x-apisports-key": key } });
  if (!res.ok) throw new Error(`api-sports statistics ${res.status}`);
  const json = await res.json();
  const logs: GameRow[] = (json.response || []).map((s: Record<string, unknown>) => ({
    gid: num((s.game as { id?: number })?.id), min: parseMin(s.min),
    pts: num(s.points), reb: num(s.totReb), ast: num(s.assists),
    tpm: num(s.tpm), stl: num(s.steals), blk: num(s.blocks), tov: num(s.turnovers),
  })).sort((a: GameRow, b: GameRow) => a.gid - b.gid);
  await db.from("player_stats_cache").upsert({ api_id: apiId, season: SEASON, logs, fetched_at: new Date().toISOString() }, { onConflict: "api_id,season" });
  return logs;
}

// Map a free-text PrizePicks/Underdog stat label to a value getter. null => unsupported.
function statGetter(stat: string): ((g: GameRow) => number) | null {
  const s = stat.toLowerCase();
  const has = (...w: string[]) => w.some((x) => s.includes(x));
  const pts = has("point", "pts"), reb = has("rebound", "reb"), ast = has("assist", "ast");
  if (pts && reb && ast) return (g) => g.pts + g.reb + g.ast;
  if (pts && reb) return (g) => g.pts + g.reb;
  if (pts && ast) return (g) => g.pts + g.ast;
  if (reb && ast) return (g) => g.reb + g.ast;
  if (has("three", "3-pt", "3pt", "3-point", "3 point")) return (g) => g.tpm;
  if (has("block")) return (g) => g.blk;
  if (has("steal")) return (g) => g.stl;
  if (has("turnover")) return (g) => g.tov;
  if (reb) return (g) => g.reb;
  if (ast) return (g) => g.ast;
  if (pts) return (g) => g.pts;
  return null; // fantasy score, combos we don't model, etc.
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const r1 = (n: number) => Math.round(n * 10) / 10;

export async function buildPropData(props: ExtractedProp[]): Promise<string> {
  if (!props.length) return "";
  const lines: string[] = [
    `PLAYER PROP DATA (API-SPORTS, ${SEASON}-${(SEASON + 1) % 100} season — last completed; current-season needs a paid plan):`,
  ];

  for (const p of props) {
    const label = `${p.player} — ${p.stat} ${p.line}${p.side ? ` (${p.side})` : ""}`;
    try {
      const pl = await resolvePlayer(p.player);
      if (!pl) { lines.push(`• ${label}: no player match in DB — NO DATA, grade on rubric only.`); continue; }
      const get = statGetter(p.stat);
      if (!get) { lines.push(`• ${label}: stat not in data layer (e.g. fantasy/combo) — NO DATA.`); continue; }
      const logs = (await getLogs(pl.api_id)).filter((g) => g.min > 0);
      if (!logs.length) { lines.push(`• ${label}: no ${SEASON} game logs — NO DATA.`); continue; }

      const vals = logs.map(get);
      const last10 = vals.slice(-10), last5 = vals.slice(-5);
      const over = last10.filter((v) => v > p.line).length;
      const push = last10.filter((v) => v === p.line).length;
      lines.push(
        `• ${pl.full_name} — ${p.stat} ${p.line}${p.side ? ` (${p.side})` : ""}: ` +
        `season avg ${r1(avg(vals))} over ${vals.length} G; last10 ${r1(avg(last10))}, last5 ${r1(avg(last5))}; ` +
        `cleared the line ${over}/${last10.length}${push ? ` (${push} push)` : ""} recent (${Math.round((over / last10.length) * 100)}% over); ` +
        `last10: [${last10.map(r1).join(", ")}]`
      );
    } catch (e) {
      lines.push(`• ${label}: data fetch failed (${String(e)}) — grade on rubric only.`);
    }
  }
  lines.push(`Use these hit-rates and averages as the projection basis. Still unknown: confirmed injuries/minutes — caveat those.`);
  return lines.join("\n");
}

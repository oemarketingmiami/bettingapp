// Pure normalizer: The Odds API v4 response -> our normalized shape.
// No Deno/Node globals so it's testable under plain Node and runnable under Deno.
// Integrity rule (INSTRUCTIONS.md §4): malformed/missing fields are SKIPPED,
// never back-filled with invented numbers.

export interface OddsApiOutcome { name: string; price: number; point?: number }
export interface OddsApiMarket { key: string; last_update?: string; outcomes: OddsApiOutcome[] }
export interface OddsApiBookmaker { key: string; title?: string; last_update?: string; markets: OddsApiMarket[] }
export interface OddsApiEvent {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: OddsApiBookmaker[];
}

export interface NormGame {
  provider: string;
  external_id: string;
  sport: string;
  commence_time: string;
  home_team: string;
  away_team: string;
}
export interface NormTeam { sport: string; name: string }
export interface NormSnapshot {
  external_id: string;     // resolved to game_id after upsert
  provider: string;
  bookmaker: string;
  market: string;
  outcome: string;
  price_american: number;
  point: number | null;
  bookmaker_update: string | null;
}
export interface Normalized { games: NormGame[]; teams: NormTeam[]; snapshots: NormSnapshot[] }

const SUPPORTED_MARKETS = new Set(["h2h", "spreads", "totals"]);

export function normalizeOdds(events: OddsApiEvent[], provider = "the-odds-api"): Normalized {
  const games: NormGame[] = [];
  const snapshots: NormSnapshot[] = [];
  const teams = new Map<string, NormTeam>();

  for (const ev of events ?? []) {
    // A game needs an id, both teams, and a tip time. Anything missing => skip it.
    if (!ev?.id || !ev.home_team || !ev.away_team || !ev.commence_time) continue;
    const sport = ev.sport_key;

    games.push({
      provider,
      external_id: ev.id,
      sport,
      commence_time: ev.commence_time,
      home_team: ev.home_team,
      away_team: ev.away_team,
    });
    for (const name of [ev.home_team, ev.away_team]) {
      teams.set(`${sport}|${name}`, { sport, name });
    }

    for (const bk of ev.bookmakers ?? []) {
      for (const mkt of bk.markets ?? []) {
        if (!SUPPORTED_MARKETS.has(mkt.key)) continue;
        for (const oc of mkt.outcomes ?? []) {
          if (typeof oc.price !== "number") continue; // no price => skip, don't fabricate
          snapshots.push({
            external_id: ev.id,
            provider,
            bookmaker: bk.key,
            market: mkt.key,
            outcome: oc.name,
            price_american: oc.price,
            point: typeof oc.point === "number" ? oc.point : null,
            bookmaker_update: bk.last_update ?? null,
          });
        }
      }
    }
  }

  return { games, teams: [...teams.values()], snapshots };
}

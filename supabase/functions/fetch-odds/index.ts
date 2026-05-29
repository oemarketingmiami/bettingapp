// fetch-odds — pull NBA lines from The Odds API, normalize, store snapshots.
// INSTRUCTIONS.md §7: run on a schedule; append-only snapshots enable CLV +
// line-movement analysis. Edge Function => uses the service role, server-side only.
//
// Deploy:  supabase functions deploy fetch-odds
// Secrets: supabase secrets set THE_ODDS_API_KEY=... (SUPABASE_URL + SERVICE_ROLE
//          are injected automatically in the Functions runtime).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeOdds, type OddsApiEvent } from "../_shared/oddsNormalize.ts";
import { isServiceRole } from "../_shared/auth.ts";

const SPORT = "basketball_nba";
const ODDS_HOST = "https://api.the-odds-api.com";

Deno.serve(async (req) => {
  // Lock the function to the service role (cron / authed caller). A leaked URL
  // alone can't burn Odds API credits.
  if (!isServiceRole(req)) return json({ error: "unauthorized" }, 401);
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const oddsKey = Deno.env.get("THE_ODDS_API_KEY");
  if (!oddsKey) return json({ error: "THE_ODDS_API_KEY not set" }, 500);

  // 1) Fetch live lines.
  const url = new URL(`${ODDS_HOST}/v4/sports/${SPORT}/odds`);
  url.searchParams.set("regions", "us");
  url.searchParams.set("markets", "h2h,totals");
  url.searchParams.set("oddsFormat", "american");
  url.searchParams.set("apiKey", oddsKey);

  const res = await fetch(url);
  if (!res.ok) {
    return json({ error: "odds_api_error", status: res.status, body: await res.text() }, 502);
  }
  const events = (await res.json()) as OddsApiEvent[];
  const creditsRemaining = res.headers.get("x-requests-remaining");

  // 2) Normalize (pure, tested).
  const { games, teams, snapshots } = normalizeOdds(events);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

  // 3) Upsert teams — never clobber an existing Elo rating.
  if (teams.length) {
    const { error } = await supabase
      .from("teams")
      .upsert(teams, { onConflict: "sport,name", ignoreDuplicates: true });
    if (error) return json({ error: "teams_upsert", detail: error.message }, 500);
  }

  // 4) Upsert games; get back id<->external_id so snapshots can reference game_id.
  const { data: gameRows, error: gErr } = await supabase
    .from("games")
    .upsert(games, { onConflict: "provider,external_id" })
    .select("id, external_id");
  if (gErr) return json({ error: "games_upsert", detail: gErr.message }, 500);

  const idByExternal = new Map<string, string>();
  for (const g of gameRows ?? []) idByExternal.set(g.external_id, g.id);

  // 5) Insert line snapshots (append-only history).
  const rows = snapshots
    .map(({ external_id, ...rest }) => ({ ...rest, game_id: idByExternal.get(external_id) }))
    .filter((r) => r.game_id);
  let inserted = 0;
  if (rows.length) {
    const { error, count } = await supabase
      .from("odds_snapshots")
      .insert(rows, { count: "exact" });
    if (error) return json({ error: "snapshots_insert", detail: error.message }, 500);
    inserted = count ?? rows.length;
  }

  return json({
    ok: true,
    sport: SPORT,
    events: events.length,
    games_upserted: gameRows?.length ?? 0,
    teams_seen: teams.length,
    snapshots_inserted: inserted,
    odds_api_credits_remaining: creditsRemaining,
  });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

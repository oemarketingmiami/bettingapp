// settle-results — for finished games: pull the final score, mark the game final,
// grade the recorded prediction (flywheel for calibration), and roll team Elo
// forward so ratings stay current. Scores come from balldontlie (free /games).
//
// Deploy:  supabase functions deploy settle-results
// Secret:  supabase secrets set BALLDONTLIE_API_KEY=...  (SUPABASE_* + MODEL_SERVICE_URL already set)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isServiceRole } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (!isServiceRole(req)) return json({ error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const bdl = Deno.env.get("BALLDONTLIE_API_KEY");
  const modelUrl = Deno.env.get("MODEL_SERVICE_URL");
  if (!bdl) return json({ error: "BALLDONTLIE_API_KEY not set" }, 500);

  const supabase = createClient(url, serviceKey);

  // Games that have started (+2h buffer) but aren't marked final yet.
  const cutoff = new Date(Date.now() - 2 * 3600_000).toISOString();
  const { data: games, error } = await supabase
    .from("games")
    .select("id, sport, home_team, away_team, commence_time, status")
    .lt("commence_time", cutoff)
    .neq("status", "final")
    .order("commence_time")
    .limit(50);
  if (error) return json({ error: "games_query", detail: error.message }, 500);
  if (!games?.length) return json({ ok: true, settled: 0, note: "nothing to settle" });

  let settled = 0;
  const results: string[] = [];
  const now = new Date().toISOString();

  for (const g of games) {
    const score = await fetchScore(g.commence_time, g.home_team, g.away_team, bdl);
    if (!score) continue;
    const homeWon = score.home > score.away;

    await supabase.from("games").update({ status: "final", home_score: score.home, away_score: score.away }).eq("id", g.id);
    await supabase.from("predictions").update({
      home_score: score.home, away_score: score.away, home_won: homeWon, settled: true, settled_at: now,
    }).eq("game_id", g.id);

    // Roll Elo forward (keeps ratings current as results come in).
    if (modelUrl) {
      const rating = async (name: string) =>
        (await supabase.from("teams").select("elo_rating").eq("sport", g.sport).eq("name", name).maybeSingle()).data?.elo_rating ?? 1500;
      const [hr, ar] = [await rating(g.home_team), await rating(g.away_team)];
      try {
        const res = await fetch(`${modelUrl}/v1/elo/update`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ home_rating: hr, away_rating: ar, home_score: score.home, away_score: score.away, neutral: false }),
        });
        if (res.ok) {
          const u = await res.json();
          await supabase.from("teams").upsert([
            { sport: g.sport, name: g.home_team, elo_rating: u.home_rating_new, elo_updated_at: now },
            { sport: g.sport, name: g.away_team, elo_rating: u.away_rating_new, elo_updated_at: now },
          ], { onConflict: "sport,name" });
        }
      } catch { /* non-fatal */ }
    }

    settled++;
    results.push(`${g.away_team} ${score.away} @ ${g.home_team} ${score.home}`);
  }

  return json({ ok: true, settled, checked: games.length, results });
});

async function fetchScore(commenceIso: string, home: string, away: string, bdl: string): Promise<{ home: number; away: number } | null> {
  const d = new Date(commenceIso);
  const day = (off: number) => new Date(d.getTime() + off * 86400_000).toISOString().slice(0, 10);
  const u = new URL("https://api.balldontlie.io/v1/games");
  for (const dd of [day(-1), day(0)]) u.searchParams.append("dates[]", dd);
  u.searchParams.set("per_page", "100");
  const r = await fetch(u, { headers: { Authorization: bdl } });
  if (!r.ok) return null;
  const j = await r.json();
  const m = (j.data ?? []).find((x: { status: string; home_team: { full_name: string }; visitor_team: { full_name: string } }) =>
    x.status === "Final" && x.home_team.full_name === home && x.visitor_team.full_name === away);
  if (!m) return null;
  return { home: m.home_team_score, away: m.visitor_team_score };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

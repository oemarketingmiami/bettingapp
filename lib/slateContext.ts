import "server-only";
import { adminDb } from "@/lib/db";

// Builds the text SLATE CONTEXT block the chat analyst reasons over: upcoming
// games with team Elo, current odds, and the model's win prob (computed inline
// with the same Elo formula the service uses — no network round-trip per chat).
const HOME_ADV = 65;
const expected = (home: number, away: number) => 1 / (1 + 10 ** (-((home + HOME_ADV) - away) / 400));
const americanToDecimal = (a: number) => (a > 0 ? 1 + a / 100 : 1 + 100 / Math.abs(a));
const impliedFromAmerican = (a: number) => 1 / americanToDecimal(a);

export async function buildSlateContext(): Promise<string> {
  const db = adminDb();
  const nowIso = new Date(Date.now() - 6 * 3600_000).toISOString(); // include games that just started

  const [{ data: games }, { data: teams }, { data: cardRow }] = await Promise.all([
    db.from("games").select("id, sport, home_team, away_team, commence_time")
      .gte("commence_time", nowIso).order("commence_time").limit(15),
    db.from("teams").select("name, elo_rating"),
    db.from("cards").select("card_date, summary").order("card_date", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const eloOf = (name: string) => teams?.find((t) => t.name === name)?.elo_rating ?? 1500;

  if (!games?.length) {
    return "SLATE CONTEXT: no upcoming games currently in the database. Tell the user you have no live slate loaded and analyze only what they provide (e.g. a screenshot).";
  }

  const lines: string[] = [`SLATE CONTEXT — ${games.length} upcoming game(s):`];
  for (const g of games) {
    const homeElo = eloOf(g.home_team), awayElo = eloOf(g.away_team);
    const pHome = expected(homeElo, awayElo);

    const { data: snaps } = await db.from("odds_snapshots")
      .select("market, outcome, price_american, point, captured_at")
      .eq("game_id", g.id).order("captured_at", { ascending: false }).limit(40);

    const h2hHome = snaps?.find((s) => s.market === "h2h" && s.outcome === g.home_team);
    const h2hAway = snaps?.find((s) => s.market === "h2h" && s.outcome === g.away_team);
    const total = snaps?.find((s) => s.market === "totals");

    let edgeStr = "";
    if (h2hHome && h2hAway) {
      const ih = impliedFromAmerican(h2hHome.price_american), ia = impliedFromAmerican(h2hAway.price_american);
      const fairHome = ih / (ih + ia);
      edgeStr = ` | ML ${g.home_team} ${fmt(h2hHome.price_american)} / ${g.away_team} ${fmt(h2hAway.price_american)} | model P(home)=${(pHome * 100).toFixed(1)}% vs fair ${(fairHome * 100).toFixed(1)}% → home edge ${((pHome - fairHome) * 100).toFixed(1)}%`;
    }
    const totalStr = total?.point != null ? ` | total ${total.point}` : "";
    lines.push(`• ${g.away_team} @ ${g.home_team} (${g.commence_time}) — Elo ${Math.round(awayElo)}/${Math.round(homeElo)}${edgeStr}${totalStr}`);
  }

  const card = cardRow?.summary as { slate_quality?: string; final_verdict?: { summary?: string } } | undefined;
  if (card) {
    lines.push(`\nLatest generated card (${cardRow!.card_date}): ${card.slate_quality} slate. Verdict: ${card.final_verdict?.summary ?? ""}`);
  }
  lines.push(`\nNote: model probabilities are TEAM win probs only — no player-prop projections.`);
  return lines.join("\n");
}

const fmt = (a: number) => (a > 0 ? `+${a}` : `${a}`);

// Integration test: real fixture odds -> model /v1/predict -> /v1/edge.
// Proves the generate-card data path against the running Python service.
// Skips automatically if the service isn't up (so it's CI-safe).
//   Start it:  (cd services/model && .venv/Scripts/uvicorn app.main:app --port 8000)
//   Run:       MODEL_SERVICE_URL=http://localhost:8000 node --test modelClient.integration.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { normalizeOdds, type OddsApiEvent } from "./oddsNormalize.ts";
import { computeEdge, predict } from "./modelClient.ts";

const BASE = process.env.MODEL_SERVICE_URL ?? "http://localhost:8000";

async function up(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/health`);
    return r.ok;
  } catch {
    return false;
  }
}

test("real odds -> predict -> edge", { skip: (await up()) ? false : `model service not reachable at ${BASE}` }, async () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const events: OddsApiEvent[] = JSON.parse(
    readFileSync(join(here, "__fixtures__", "nba_odds_sample.json"), "utf8"),
  );
  const { games, snapshots } = normalizeOdds(events);
  const game = games[0];

  // First book's h2h prices for this game.
  const h2h = snapshots.filter((s) => s.external_id === game.external_id && s.market === "h2h");
  const homeOdds = h2h.find((s) => s.outcome === game.home_team)!;
  const awayOdds = h2h.find((s) => s.outcome === game.away_team)!;
  assert.ok(homeOdds && awayOdds, "fixture has h2h prices for both sides");

  // No ratings yet -> Elo base for both; predict still returns a coherent split.
  const p = await predict(BASE, {
    home_team: game.home_team,
    away_team: game.away_team,
    home_rating: 1500,
    away_rating: 1500,
  });
  assert.ok(Math.abs(p.home_win_prob + p.away_win_prob - 1) < 1e-9);
  assert.ok(p.home_win_prob > p.away_win_prob, "home edge from home-court advantage");

  const edge = await computeEdge(BASE, [
    { label: game.home_team, model_prob: p.home_win_prob, american_odds: homeOdds.price_american },
    { label: game.away_team, model_prob: p.away_win_prob, american_odds: awayOdds.price_american },
  ]);

  assert.equal(edge.outcomes.length, 2);
  assert.ok(edge.market_hold > 0, "real book prices carry vig");
  const sumFair = edge.outcomes.reduce((a, o) => a + o.no_vig_prob, 0);
  assert.ok(Math.abs(sumFair - 1) < 1e-9, "de-vigged probs sum to 1");
  for (const o of edge.outcomes) {
    assert.equal(typeof o.edge, "number");
    assert.equal(o.recommend, o.edge > 0);
  }
});

// Run: node --test supabase/functions/_shared/oddsNormalize.test.ts
// Tests the parser against a REAL trimmed Odds API payload (not invented data).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { normalizeOdds, type OddsApiEvent } from "./oddsNormalize.ts";

const here = dirname(fileURLToPath(import.meta.url));
const sample: OddsApiEvent[] = JSON.parse(
  readFileSync(join(here, "__fixtures__", "nba_odds_sample.json"), "utf8"),
);

test("maps every event to a game", () => {
  const { games } = normalizeOdds(sample);
  assert.equal(games.length, sample.length);
  for (const g of games) {
    assert.equal(g.provider, "the-odds-api");
    assert.ok(g.external_id && g.home_team && g.away_team && g.commence_time);
    assert.equal(g.sport, "basketball_nba");
  }
});

test("collects unique teams across events", () => {
  const { teams } = normalizeOdds(sample);
  const names = new Set(teams.map((t) => t.name));
  assert.equal(names.size, teams.length); // no dupes
  assert.ok(teams.length >= 2);
});

test("extracts h2h and totals snapshots with prices", () => {
  const { snapshots } = normalizeOdds(sample);
  assert.ok(snapshots.length > 0);
  const h2h = snapshots.filter((s) => s.market === "h2h");
  const totals = snapshots.filter((s) => s.market === "totals");
  assert.ok(h2h.length > 0 && totals.length > 0);
  for (const s of h2h) {
    assert.equal(typeof s.price_american, "number");
    assert.equal(s.point, null); // h2h has no line
  }
  for (const s of totals) {
    assert.equal(typeof s.point, "number"); // totals carry the line
  }
});

test("skips malformed events instead of inventing data", () => {
  const dirty = [
    ...sample,
    { id: "", sport_key: "basketball_nba", commence_time: "x", home_team: "", away_team: "", bookmakers: [] },
    { id: "ok", sport_key: "basketball_nba", commence_time: "2026-01-01T00:00:00Z", home_team: "A", away_team: "B", bookmakers: [
      { key: "bk", markets: [ { key: "h2h", outcomes: [ { name: "A", price: undefined as unknown as number }, { name: "B", price: 120 } ] } ] },
    ] },
  ] as OddsApiEvent[];
  const { games, snapshots } = normalizeOdds(dirty);
  assert.equal(games.length, sample.length + 1);          // empty-id event dropped
  const aPrice = snapshots.find((s) => s.outcome === "A" && s.market === "h2h");
  const bPrice = snapshots.find((s) => s.outcome === "B" && s.market === "h2h");
  assert.equal(aPrice, undefined); // missing price dropped
  assert.ok(bPrice);               // valid price kept
});

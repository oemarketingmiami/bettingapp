// Verifies pick_schema.json compiles and enforces the card contract.
// Run: node --test supabase/functions/generate-card/pickSchema.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(readFileSync(join(here, "prompts", "pick_schema.json"), "utf8"));

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

// A minimal, honest "Pass day" card — valid against the contract.
const passCard = {
  slate_date: "2026-05-29",
  slate_quality: "Pass",
  day_type: "pass",
  five_leg_justified: false,
  picks: [],
  parlay: null,
  bets_to_avoid: [{ matchup: "SAS @ OKC", market: "h2h", reason: "no positive edge vs fair line" }],
  payout_table: [
    { stake: 50, to_win: 0, total_return: 50 },
    { stake: 100, to_win: 0, total_return: 100 },
    { stake: 200, to_win: 0, total_return: 200 },
    { stake: 300, to_win: 0, total_return: 300 },
    { stake: 500, to_win: 0, total_return: 500 },
    { stake: 1000, to_win: 0, total_return: 1000 },
  ],
  final_verdict: { summary: "Thin slate, no edges cleared threshold.", best_bet: "None — pass.", discipline_note: "Passing is a winning decision." },
};

// A card with one graded straight pick — valid.
const actionCard = {
  ...passCard,
  slate_quality: "Medium",
  day_type: "straight",
  picks: [{
    sport: "basketball_nba", matchup: "SAS @ OKC", market: "h2h", pick: "Oklahoma City Thunder",
    line_or_odds: "-155", card_type: "safer", bet_grade: 74, est_win_prob: 64, confidence: 7,
    edge_rating: "Moderate", suggested_units: 1.0, reasoning: "Model edge over de-vigged fair price; rest advantage.",
    risk_flags: ["back-to-back fatigue"], alternatives_rejected: ["SAS +3.5"],
  }],
};

test("valid Pass card passes", () => {
  assert.ok(validate(passCard), JSON.stringify(validate.errors));
});

test("valid action card passes", () => {
  assert.ok(validate(actionCard), JSON.stringify(validate.errors));
});

test("rejects units over the 2.0 cap", () => {
  const bad = structuredClone(actionCard);
  bad.picks[0].suggested_units = 3.0;
  assert.equal(validate(bad), false);
});

test("rejects an unknown risk flag", () => {
  const bad = structuredClone(actionCard);
  bad.picks[0].risk_flags = ["vibes"];
  assert.equal(validate(bad), false);
});

test("rejects bet_grade over 100", () => {
  const bad = structuredClone(actionCard);
  bad.picks[0].bet_grade = 142;
  assert.equal(validate(bad), false);
});

test("rejects a non-standard payout stake", () => {
  const bad = structuredClone(passCard);
  bad.payout_table[0].stake = 75;
  assert.equal(validate(bad), false);
});

test("rejects missing final_verdict", () => {
  const bad = structuredClone(passCard);
  delete bad.final_verdict;
  assert.equal(validate(bad), false);
});

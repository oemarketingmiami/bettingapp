// generate-card — assemble today's slate, enrich it with model probabilities +
// de-vigged edges (§6), hand it to Claude with the analyst system prompt, validate
// the JSON against pick_schema.json, and persist once per slate (§5).
//
// STATUS: the data path (games -> /v1/predict -> /v1/edge -> context) is complete.
// The Claude call is BLOCKED until prompts/ are provided — see loadPrompts().
//
// Deploy:  supabase functions deploy generate-card
// Secrets: ANTHROPIC_API_KEY, THE_ODDS_API_KEY (SUPABASE_* injected); MODEL_SERVICE_URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Ajv from "https://esm.sh/ajv@8";
import addFormats from "https://esm.sh/ajv-formats@3";
import { computeEdge, predict } from "../_shared/modelClient.ts";

const ELO_BASE = 1500;

Deno.serve(async (req) => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if ((req.headers.get("Authorization") ?? "") !== `Bearer ${serviceKey}`) {
    return json({ error: "unauthorized" }, 401);
  }

  const modelUrl = Deno.env.get("MODEL_SERVICE_URL");
  if (!modelUrl) return json({ error: "MODEL_SERVICE_URL not set" }, 500);

  // Slate date: ?date=YYYY-MM-DD, else today (UTC).
  const dateParam = new URL(req.url).searchParams.get("date");
  const slateDate = dateParam ?? new Date().toISOString().slice(0, 10);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

  // 1) Games for the slate.
  const dayStart = `${slateDate}T00:00:00Z`;
  const dayEnd = `${slateDate}T23:59:59Z`;
  const { data: games, error: gErr } = await supabase
    .from("games")
    .select("id, sport, home_team, away_team, commence_time")
    .gte("commence_time", dayStart)
    .lte("commence_time", dayEnd)
    .order("commence_time");
  if (gErr) return json({ error: "games_query", detail: gErr.message }, 500);
  if (!games?.length) return json({ ok: true, slate_date: slateDate, note: "no games", games: 0 });

  // 2) Team Elo ratings (cold-start to base if unseen — honest "no data yet").
  const { data: teamRows } = await supabase.from("teams").select("sport, name, elo_rating");
  const ratingOf = (sport: string, name: string) =>
    teamRows?.find((t) => t.sport === sport && t.name === name)?.elo_rating ?? ELO_BASE;

  // 3) Latest h2h snapshot per game (reference price for the edge calc).
  const enriched = [];
  for (const g of games) {
    const { data: snaps } = await supabase
      .from("odds_snapshots")
      .select("outcome, price_american, bookmaker, captured_at")
      .eq("game_id", g.id)
      .eq("market", "h2h")
      .order("captured_at", { ascending: false });
    const home = snaps?.find((s) => s.outcome === g.home_team);
    const away = snaps?.find((s) => s.outcome === g.away_team);
    if (!home || !away) continue; // no usable price -> skip; never invent a line

    const p = await predict(modelUrl, {
      home_team: g.home_team,
      away_team: g.away_team,
      home_rating: ratingOf(g.sport, g.home_team),
      away_rating: ratingOf(g.sport, g.away_team),
    });
    const edge = await computeEdge(modelUrl, [
      { label: g.home_team, model_prob: p.home_win_prob, american_odds: home.price_american },
      { label: g.away_team, model_prob: p.away_win_prob, american_odds: away.price_american },
    ]);
    enriched.push({ game: g, model: p, market: edge });
  }

  // 4) Hand to Claude with the analyst prompt + schema (colocated under ./prompts).
  const prompts = await loadPrompts();
  const card = await generateAndValidate(prompts, { slate_date: slateDate, games: enriched });

  // 5) Persist once per slate. Final per-pick column mapping is finalized against
  // pick_schema.json once that file lands; for now the validated card is stored whole.
  const { error: cErr } = await supabase
    .from("cards")
    .upsert({ card_date: slateDate, summary: card }, { onConflict: "card_date" });
  if (cErr) return json({ error: "card_persist", detail: cErr.message }, 500);

  return json({ ok: true, slate_date: slateDate, games: enriched.length });
});

// --- Claude wiring (verbatim prompt + schema; no hand-rolled rubric) ----------

async function loadPrompts() {
  // Files are colocated under this function dir so Supabase bundles them on deploy.
  const system = await Deno.readTextFile(new URL("./prompts/system_prompt.txt", import.meta.url));
  const schema = JSON.parse(await Deno.readTextFile(new URL("./prompts/pick_schema.json", import.meta.url)));
  return { system, schema: schema as Record<string, unknown> };
}

async function generateAndValidate(
  prompts: { system: string; schema: Record<string, unknown> },
  context: unknown,
): Promise<unknown> {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(prompts.schema);

  let lastErrors = "";
  // Up to 3 tries: Claude must return JSON that validates against pick_schema.json.
  for (let attempt = 0; attempt < 3; attempt++) {
    const userMsg = attempt === 0
      ? `Today's slate context (games, model probabilities, de-vigged market edges):\n\n${JSON.stringify(context, null, 2)}\n\nProduce today's card as JSON matching the schema. JSON only.`
      : `Your previous output failed schema validation:\n${lastErrors}\n\nReturn corrected JSON only, matching the schema exactly.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 8000,
        system: prompts.system,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("");

    let parsed: unknown;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      lastErrors = "Output was not valid JSON.";
      continue;
    }
    if (validate(parsed)) return parsed;
    lastErrors = JSON.stringify(validate.errors, null, 2);
  }
  throw new Error(`Card failed schema validation after 3 attempts:\n${lastErrors}`);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

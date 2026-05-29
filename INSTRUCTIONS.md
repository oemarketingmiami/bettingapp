# INSTRUCTIONS.md — OE Picks (Personal Sports Analytics App)

> **Scope:** a **personal-use** AI sports analytics + picks tool for one user (you). No app store, no public users, no monetization. Distribution is a private web app you open on your phone/desktop (optionally TestFlight later). This changes the architecture — see §2.

> **Audience for this file:** an AI coding agent (Claude Code / Cursor) or a developer. Source of truth for stack, data sources, the AI pick engine, and the schema. The grading logic and output contract already exist in this project — `betting_bot_pick_schema.json` and the betting-bot system prompt. The app is a UI + data pipeline wrapped around that engine. Don't reinvent the grading model; implement it.

---

## 1. What It Does

Open the app, get today's slate:

- **Slate quality** read (Strong / Medium / Weak / Pass day)
- **Safer / Aggressive / Longshot** cards
- **Player props** and **totals** (over/unders)
- **Moneyline** singles and a **5-leg parlay only when 5 legs independently qualify**
- **Payout table** for $50 / $100 / $200 / $300 / $500 / $1,000
- **Bets to avoid** + **final verdict**
- A **tracking log** that auto-grades picks after games finish (yesterday / weekly / monthly record + units)

Tuned for Underdog Fantasy / PrizePicks–style picks, props, over/unders, and parlays.

---

## 2. Tech Stack (personal-use, web/PWA-first)

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js (App Router) + React** | Web app. Open in browser, "Add to Home Screen" → installs as a **PWA** with an app icon. No store, no Apple account. |
| Styling | **Tailwind CSS** | Direct, no NativeWind needed since this is web. |
| Hosting | **Vercel** | GitHub push → auto-deploy. Free tier is plenty for one user. |
| Backend / DB / Auth | **Supabase** (Postgres, Auth, RLS, Edge Functions, cron, Storage) | Single backend. |
| AI | **Claude API** | Pick generation + reasoning + summaries. |
| Source control / CI | **GitHub → Vercel** | `main` = prod. |
| Forecasting/modeling | **Python service** (FastAPI) | The numbers (see §6). |

**PWA = your "app."** Add a `manifest.json` + service worker (Next.js `next-pwa` or a manual one). On iOS Safari → Share → Add to Home Screen. You get a full-screen icon'd app that reads today's card. This is the right call for personal use: instant, free, no review, no expiry.

**TestFlight only if you want true native.** It requires an Apple Developer account ($99/yr), an Expo/EAS build pipeline, and Apple beta review; TestFlight builds also expire ~every 90 days and need re-submitting. For a picks-reader, the PWA gives you 95% of the feel for 0% of that overhead. Skip unless you need native device APIs.

---

## 3. Repository Structure

```
oe-picks/
├─ app/                      # Next.js App Router
│  ├─ (auth)/login           # single-user login (cost protection, see §10)
│  ├─ page.tsx               # home: today's card
│  ├─ props/  parlays/  tracker/  account/
│  └─ pick/[id]/page.tsx     # single pick detail + reasoning
├─ components/               # BetCard, PayoutTable, EdgeBadge, RiskFlags...
├─ lib/
│  ├─ supabase.ts
│  ├─ anthropic.ts           # Claude calls — server-side only
│  └─ odds.ts                # odds/stats clients
├─ supabase/
│  ├─ migrations/            # SQL schema (§7)
│  └─ functions/             # Edge Functions: generate-card, settle-results, fetch-odds
├─ services/model/           # Python forecasting microservice (§6)
├─ prompts/
│  ├─ system_prompt.txt      # the betting-bot analyst prompt (already written)
│  └─ pick_schema.json       # structured-output contract (already written)
├─ public/manifest.json      # PWA manifest
├─ .env.example
└─ INSTRUCTIONS.md
```

---

## 4. Sports Data APIs (the inputs)

Two kinds of data: **odds/lines** and **stats/box scores**. Normalize both into your own tables so providers are swappable. Free tiers are fine for one user.

### Odds / lines (moneyline, spreads, totals, props)

| Provider | Why | Pricing signal |
|---|---|---|
| **The Odds API** | Best entry point. 70+ sports, 40+ books (DraftKings, FanDuel, BetMGM, Pinnacle), moneyline/spread/total/props, historical snapshots back to 2020 for backtesting. Simple REST. | Free ~500 credits/mo; paid from ~$30/mo. |
| **SharpAPI** | US-focused, SSE streaming, **built-in +EV / arbitrage detection** (saves you building it). TS SDK. | Free tier (12 req/min). |
| **SportsGameOdds** | Transparent pricing, WebSocket, returns settlement/results (useful for auto-grading). | Free "Amateur" tier. |
| **OddsBlaze** | Fast raw odds, deep player props. | From ~$29/mo. |

**Start with The Odds API** (coverage + historical for backtesting). Add SharpAPI if you want streaming + ready-made +EV signals.

### Stats / box scores / advanced metrics

Feeds the handicapping factors in `sport_metrics_reference.md` (Net Rating, EPA/play, xG, xFIP, etc.).

- **API-SPORTS (api-sports.io)** — broadest coverage, generous free tier, sub-1s live fixtures.
- **balldontlie** — free NBA stats, ideal for an MVP.
- **TheSportsDB** — logos/schedules/visuals, cheap/free.
- **ESPN undocumented JSON endpoints** — free schedules/scores; unofficial, can break — fallback only.

> **Integrity rule (from your system prompt):** never display a number you didn't fetch. If a feed is stale or missing, the engine lowers confidence or passes — it does not invent the gap.

---

## 5. AI Integration — Claude API (the brain)

The differentiator: picks are generated and explained by Claude using **your existing analyst system prompt and JSON schema**. Reuse them verbatim.

### Models (current as of writing — verify at https://docs.claude.com)

| Model ID | Use for |
|---|---|
| `claude-opus-4-8` | Heavy reasoning: full slate handicapping, parlay construction, final verdict. |
| `claude-sonnet-4-6` | Balanced default for most pick generation + summaries. |
| `claude-haiku-4-5` | Cheap, high-volume: notes/captions, quick classifications, "explain this pick." |

Aliases: `opus` → Opus 4.8, `sonnet` → Sonnet 4.6. Model IDs are pinned snapshots.

### Pattern (server-side only — never ship the API key to the client)

Run Claude inside a **Supabase Edge Function** (`generate-card`):

1. Pull today's games + odds + stats from your normalized tables.
2. Assemble a structured context block (games, lines, line movement, injuries, rest, metrics).
3. Call Claude with **system** = `prompts/system_prompt.txt`, **user** = slate context + "Produce today's card," and instruct **JSON-only output** matching `pick_schema.json`.
4. Validate JSON against the schema; retry on mismatch.
5. Persist the card to Postgres. The app reads from the DB, not from Claude.

```ts
// supabase/functions/generate-card/index.ts (sketch)
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
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: slateContextBlock }],
  }),
});
const data = await res.json();
const text = data.content.filter(b => b.type === "text").map(b => b.text).join("");
const card = JSON.parse(text.replace(/```json|```/g, "").trim());
// validate against pick_schema.json before saving
```

**Cost control:** generate the card **once per slate** on a schedule, cache it, read from DB. Don't call Claude per page load. Use Haiku for any interactive "explain this pick" calls.

**Division of labor:** Claude writes *reasoning and narrative*. The *probabilities and grades* come from the math layer (§6) and are fed to Claude as inputs — LLMs are weak at raw probability calibration. Reason over numbers; don't conjure them.

---

## 6. Forecasting / Modeling (the numbers)

The layer most picks tools skip — and then output garbage. Small **Python microservice** (FastAPI, deploy on Render/Railway/Fly or a Vercel Python function) that turns stats into **calibrated probabilities** feeding both your grading model and Claude.

**Proven stack — don't overcomplicate:**

1. **Elo ratings (+ variants).** Team strength rating → win prob from the rating gap. Cheap, robust baseline. Add margin-of-victory + home-advantage adjustments.
2. **Poisson / Dixon-Coles** for low-scoring sports (soccer, hockey): models goal rates → scoreline + over/under probabilities. Dixon-Coles fixes Poisson's low-score/draw weakness.
3. **Gradient boosting (XGBoost / LightGBM)** on historical stats. Adds *modest* gains on top of a solid Elo/Poisson base — a well-calibrated Elo beats a sloppy neural net.
4. **Monte Carlo simulation.** Simulate games thousands of times → distributions for parlay hit rates and prop over/unders. Compounds leg probabilities honestly.
5. **Ensemble + market calibration.** Blend the above, then anchor against the **no-vig market-implied probability**. If you're miles off the market, usually *you're* wrong.

**Libraries:** `scikit-learn`, `xgboost`/`lightgbm`, `statsmodels`, `numpy`/`pandas`, `scipy` (Poisson), a small custom Elo module. Soccer: xG-driven Poisson beats shot-count models.

**Odds ↔ probability:** implied prob = `1 / decimal_odds`. Strip the vig before comparing model vs market. **Edge = `model_prob − no_vig_market_prob`.** No positive edge → no bet. That's the whole game.

**Shortcut for MVP:** SharpAPI / OddsJam / OpticOdds expose +EV and no-vig fair odds already. Lean on those first, bring modeling in-house once you want a proprietary edge.

---

## 7. Supabase Schema (starter)

Mirrors your CSV templates (`master_bet_log_template.csv`, `player_prop_tracker_template.csv`, `parlay_tracker_template.csv`) so app + spreadsheets stay compatible.

```sql
create table cards (
  id uuid primary key default gen_random_uuid(),
  card_date date not null,
  slate_quality text,           -- Strong | Medium | Weak | Pass
  day_type text,                -- straight | prop | parlay | pass
  five_leg_justified bool,
  summary jsonb,                -- final_verdict block
  created_at timestamptz default now()
);

create table picks (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references cards(id) on delete cascade,
  sport text, matchup text, market text, pick text,
  line_or_odds text,
  card_type text,               -- safer | aggressive | longshot | prop | total
  bet_grade numeric,            -- 0-100
  est_win_prob numeric,         -- %
  confidence numeric,           -- 1-10
  edge_rating text,             -- Small | Moderate | Strong | Elite
  suggested_units numeric,
  reasoning text,
  risk_flags text[],
  alternatives_rejected text[],
  placed bool default false,
  result text,                  -- Win | Loss | Push | null
  units_delta numeric,
  closing_line text,
  clv_won bool
);

create table parlays (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references cards(id) on delete cascade,
  legs jsonb,                   -- [{pick, grade, prob, justification}]
  weakest_leg text,
  overall_risk text,
  result text,
  units_delta numeric
);

-- single user; mainly stores your unit size + preferences
create table profile (
  id uuid primary key references auth.users(id),
  unit_size numeric default 50,
  created_at timestamptz default now()
);
```

Enable RLS so only your account reads/writes. (For a true single-user app you can keep it minimal, but RLS-on is free insurance.)

**Scheduled jobs (Supabase cron / Edge Functions):**
- `fetch-odds` — pull lines on schedule, store snapshots (enables CLV + line-movement analysis).
- `generate-card` — produce the daily card after lineups/injuries settle.
- `settle-results` — after games finish, pull results, grade picks, update units, compute CLV.

---

## 8. Environment Variables

```
ANTHROPIC_API_KEY=            # server-side only (Edge Function secret)
SUPABASE_URL=
SUPABASE_ANON_KEY=            # client
SUPABASE_SERVICE_ROLE_KEY=    # server-side only
THE_ODDS_API_KEY=
API_SPORTS_KEY=
SHARP_API_KEY=                # optional
MODEL_SERVICE_URL=
```

Never expose `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or odds keys to the client. All third-party calls go through Edge Functions / the Python service.

---

## 9. Deployment

- **Web/PWA:** GitHub → Vercel, auto-deploy on push to `main`. Add `manifest.json` + service worker; "Add to Home Screen" on your phone.
- **Backend:** Supabase migrations via `supabase db push`; functions via `supabase functions deploy`.
- **Model service:** Render/Railway/Fly container; set `MODEL_SERVICE_URL`.
- **(Optional) TestFlight:** only if you later wrap the web app in Expo and want native — adds an Apple Developer account + EAS build + beta review. Not recommended for personal use.

---

## 10. Personal-Use Notes (not compliance)

Store-listing rules, age gates, and responsible-gambling disclaimers don't apply to a private one-user tool — that burden disappears. Two practical things still matter:

- **Keep a simple login.** Not legal — *financial.* A leaked Vercel URL with no auth lets anyone hit your Claude + odds API keys and run up your bill. Supabase Auth with a single account (email/password or magic link) closes that hole. Restrict Edge Functions to your authed user.
- **Keep the honesty rules in the engine.** Your system prompt's "no fake certainty / no invented data / pass when weak" isn't about regulators here — it's what keeps the tool *useful*. A picks tool that hypes everything is worthless to its own builder.

If scope ever changes — you share it, charge for it, or list it — revisit distribution and compliance before doing so.

---

## 11. Build Order

1. Supabase project + schema + single-user auth.
2. `fetch-odds` Edge Function → one sport (NBA) end-to-end. Prove the pipe.
3. Python model service: Elo baseline + odds→prob conversion + edge calc.
4. `generate-card` Edge Function wiring your **existing system prompt + schema** to Claude (Opus 4.8), validated JSON → DB.
5. Next.js UI: home card (safer/aggressive/longshot), payout table, pick detail. Add PWA manifest → home screen.
6. `settle-results` + tracker (yesterday/weekly/monthly record + units).
7. Props + parlays + totals.
8. Polish.

Ship **NBA-only first.** Add sports once the full loop (fetch → model → grade → display → settle → track) is solid for one.

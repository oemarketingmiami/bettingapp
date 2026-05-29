# OE Picks — Session Handoff (2026-05-29)

Personal, single-user AI sports-betting analyst. Chat-first web app that reads the NBA slate,
grades bets/screenshots against a vetting rubric, and passes when there's no edge.

## Live infrastructure (all working)
| Piece | Where | Status |
|---|---|---|
| Forecasting model service | Render: `https://bettingapp-8w8g.onrender.com` (FastAPI, Elo/odds/edge) | ✅ live |
| Database | Supabase project `cqmwvfwuerywwrqxnxdd` ("Betting App", org OE Marketing) | ✅ 7 tables + RLS |
| Edge Functions | `fetch-odds`, `generate-card` (Supabase) | ✅ deployed + invoked |
| Web app | Next.js 15 (App Router) — local only | ✅ runs at localhost:3000 |
| Repo | `github.com/oemarketingmiami/bettingapp` (private, `main`) | ✅ pushed (HEAD 323f8dc) |

## Pipeline (proven end-to-end)
The Odds API → `fetch-odds` → Postgres (games, odds_snapshots) → model `/predict` + `/edge`
→ `generate-card` (Claude Opus + `pick_schema.json`, ajv-validated) → Postgres (cards) → UI.
Chat path: `/api/chat` (server-side Anthropic, streaming + vision) injects slate context, grades
PrizePicks/Underdog screenshots. Elo seeded from 3 seasons of balldontlie (30 team ratings).

## Run locally
```
npm run dev        # localhost:3000 (reads .env.local automatically)
```
Model service is remote (Render); no local Python needed. No Docker needed anywhere.

## OPEN ITEMS (next session)
1. **UI redesign — TOP PRIORITY.** OE finds the current landing look bad ("horrible"). The
   Ruixen "moon" template + gradient wordmark isn't landing. Rethink the visual design
   (layout, palette, background, type) — functionality is fine, it's purely aesthetic.
2. **Single-user login.** Required before ANY public deploy — chat makes interactive Opus
   calls, so an open URL = runaway API bill. Supabase Auth, one account, lock `/api/chat`.
3. **Deploy to Vercel.** Needs `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   and item 2 first.
4. **Wire Gemini** as image/backup model (`GEMINI_API_KEY` in .env.local, not yet used).
5. **Self-host the chat background** (currently an external R2 URL from the template).
6. **Real picks:** loaded games are Finals/odd-feed data → analyst correctly Passes. A normal
   regular-season slate (run `fetch-odds`, then `generate-card?date=YYYY-MM-DD`) will produce
   actual picks now that Elo is seeded.

## Gotchas / facts to remember
- **GitHub:** `gh` has two accounts; pushes MUST use `oemarketingmiami` (not `1n1h`). If a push
  404s, `gh auth switch`.
- **Supabase keys:** using LEGACY JWT anon/service_role (not the new publishable/secret format).
  Keep code on legacy. Service role works; anon fixed.
- **Migrations:** direct DB host is IPv6-only (won't route locally). Use the SESSION POOLER:
  `postgres.cqmwvfwuerywwrqxnxdd@aws-1-us-east-1.pooler.supabase.com:5432` via
  `supabase db push --db-url ...` (no platform login needed).
- **Edge functions:** deploy needs `SUPABASE_ACCESS_TOKEN`. Prompt/schema must be IMPORTED
  (not read at runtime) so the bundler ships them. Functions gate callers by JWT role claim.
- **Anthropic vision:** rejects tiny images ("Could not process image"); real screenshots are fine.
- **Secrets:** all in `.env.local` (gitignored). DB password was shared in chat earlier; OE chose
  NOT to reset it — leave as-is unless asked.

## Key files
- `services/model/` — FastAPI forecasting service (Elo, odds→prob, edge, EV; 19 tests).
- `supabase/migrations/` — schema. `supabase/functions/` — fetch-odds, generate-card, _shared.
- `supabase/functions/generate-card/prompts/` — analyst system prompt + pick_schema.json.
- `app/` — `page.tsx` (chat home), `card/page.tsx` (daily card), `api/chat/route.ts`.
- `components/Chat.tsx`, `Markdown.tsx`, `ui/`. `lib/` — db, types, slateContext, chatPrompt, utils.
- `scripts/seedElo.mts` — recompute team Elo from balldontlie.

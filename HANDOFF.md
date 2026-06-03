# Prime Picks — Handoff

AI sports-betting analyst. Chat-first web app: users screenshot their PrizePicks/Underdog
picks and get a data-backed grade (which to bet, which to skip, hit-rates + stats). Also a
proactive daily card and an admin dashboard. Single brand: **Prime Picks**.

## Live infrastructure
| Piece | Where | Status |
|---|---|---|
| Web app | Vercel → `bettingapp-beta.vercel.app` (renaming to a bought domain later) | ✅ deployed |
| Repo | `github.com/oemarketingmiami/bettingapp` (private, `main`) | ✅ |
| DB / Auth / Storage | Supabase `cqmwvfwuerywwrqxnxdd` (org "OE Marketing", Free) | ✅ |
| Forecasting model | Render `https://bettingapp-8w8g.onrender.com` (FastAPI Elo/odds/edge) | ✅ |
| Edge Functions | `fetch-odds`, `generate-card` (Supabase) | ✅ |
| Video | Supabase Storage bucket `media/howitworks.mp4` (public) | ✅ |

## What works now
- **Auth (Supabase):** Google OAuth + email magic link, `@supabase/ssr`, middleware protects
  `/app /card /settings /admin`, `/auth/callback`, real logout. Username from session.
- **Chat (`/api/chat`):** streaming + vision. Board upload → extract props → API-SPORTS game
  logs (cached) → hit-rate vs line → graded reply + a visual **recommendation card**.
- **Daily card (`/card`):** generate-card → Claude Opus + pick_schema → Postgres → UI.
- **Landing (`/`):** headline "Bet smarter, not harder"; hero (cursor-repel sportsbook logos in
  `public/headericons`, waitlist form → `waitlist` table), **Prime Picks Features** cards (bg images
  in `public/features`), how-it-works video, **winners carousel** (`public/wins`, cropped phones),
  testimonials, pricing. Copy is plain-English (no betting jargon).
- **Admin (`/admin`):** gated to super-admins (`marganonoirazan@gmail.com`, `bmgaccident@gmail.com`)
  + DB-managed admins. KPIs, signup charts, plans, recent waitlist, add/remove admins.
- **Mobile:** `overflow-x: clip` on html/body kills sideways scroll; responsive throughout (mobile
  nav menu, collapsible sidebar, stacked grids). Not yet device-QA'd end-to-end.
- **Social preview:** OG/Twitter image = `public/logo-full.png` (pp.png). Favicon = `logo.png`.

## Env vars
- **Local** `.env.local` (gitignored): ANTHROPIC, SUPABASE_URL/ANON/SERVICE_ROLE,
  NEXT_PUBLIC_SUPABASE_URL/ANON, THE_ODDS_API_KEY, API_SPORTS_KEY, BALLDONTLIE_API_KEY,
  SHARP_API_KEY, GEMINI_API_KEY, MODEL_SERVICE_URL.
- **Vercel needs only what the Next app reads:** ANTHROPIC_API_KEY, SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, API_SPORTS_KEY.
  (Odds/Sharp/balldontlie live as Supabase function secrets / local scripts, not Vercel.)
- **Supabase secrets** (functions): THE_ODDS_API_KEY, ANTHROPIC_API_KEY, MODEL_SERVICE_URL.

## Daily automation (cron — LIVE)
pg_cron + pg_net run the pipeline automatically (secrets in Supabase **Vault**: `project_url`,
`service_role_key`). Jobs: **`prime-fetch-odds`** every 6h (`0 */6 * * *`, credit-safe), **`prime-generate-card`**
daily 23:00 UTC (`0 23 * * *`). `generate-card` with no `?date` auto-picks the next upcoming slate.
`fetch-odds` prunes stale upcoming games each run. Reconfigure: edit + rerun `scripts/setupCron.mts`
(needs `DATABASE_URL`, `SB_URL`, `SB_SERVICE_ROLE_KEY` env). Monitor: `select * from cron.job_run_details order by start_time desc`.

## Model accuracy (calibration — IN PROGRESS)
- **Elo is now calibrated.** `services/model/scripts/calibrate.py` backtests Elo over 3 seasons
  (balldontlie, free; note 5 req/min limit so it's slow) → fits isotonic regression → saves
  `services/model/app/calibration_data.json`, loaded by `app/calibration.py` and applied in
  `/v1/predict`. Result: raw 0.70 → 0.59 (Elo was overconfident). Brier 0.2177→0.2108. Refresh by
  re-running the script and redeploying the Render service. `model_version` = `elo-cal-v1`.
- **Market anchoring** available: `MODEL_MARKET_ANCHOR` (0–1, default 0) blends the model toward the
  de-vigged market in `/v1/edge`. Set ~0.3 on Render for more conservative edges.
- **Still TODO for #1:** `settle-results` job (log final scores + grade live predictions) to build a
  real flywheel so calibration uses live outcomes, not just backtests.

## ROADMAP (next, OE's list)
1. **Update APIs for data** — current-season player logs/injuries need a paid tier (API-SPORTS
   free caps at 2022-2024; `SEASON` in `lib/props.ts` is the one-line bump). Consider The Odds API
   player props for true de-vig edges, and balldontlie GOAT.
2. **Wire paywall (Stripe)** — checkout + subscriptions; unlocks MRR/churn/plans in the admin
   dashboard (currently placeholders). Pricing tiers already on the landing.
3. **Web search / scraping for the AI** — let the analyst pull up-to-date info (injuries,
   lineups, news) instead of last-season data only.
4. **Live sports stats / news** — real-time feeds surfaced in chat + daily card.
5. **Explore more accurate forecasting models** — beyond Elo: player-prop projection model,
   XGBoost/Poisson, calibration; add `/v1/prop` to the model service.
6. **TTS** — text-to-speech playback of the analyst's responses.
7. **Share the card output** — share/export the recommendation card to Instagram / friends / socials.
8. **In-app alerts** — notifications (line moves, results, new daily card).

## Gotchas
- **GitHub:** `gh` has two accounts; pushes MUST use `oemarketingmiami` (else 404). Git author
  email is set to the noreply that Vercel accepts (Hobby plan blocks unrecognized authors).
- **Domain change:** whenever the app URL changes (e.g., buying a domain), do BOTH:
  (1) **Supabase → Auth → URL Configuration → Redirect URLs** (`https://NEWDOMAIN/**`) + Site URL,
  or sign-in breaks; (2) update `SITE_URL` in `app/layout.tsx` so the OG/social preview image
  resolves to the new domain. Google OAuth redirect points at Supabase's callback, unaffected.
- **Migrations:** direct DB host is IPv6-only; use the **session pooler**
  `postgres.cqmwvfwuerywwrqxnxdd@aws-1-us-east-1.pooler.supabase.com:5432` via `supabase db push --db-url`.
- **Supabase:** legacy JWT anon/service_role keys (not the new format) — keep code on legacy.
- **API-SPORTS free:** ~10 req/min, 100/day, seasons 2022-2024 only. Player logs cached in `player_stats_cache`.
- **Local seed scripts:** `scripts/seedElo.mts` (team Elo), `scripts/seedPlayers.mts` (name→id index).
- **Secrets** all gitignored; `MY STUFF/` (source assets) and the 44MB video gitignored too.

// One-time: schedule the daily pipeline with pg_cron + pg_net.
// Secrets go into Supabase Vault (not into git, not into the cron command).
// Run: export DATABASE_URL=... SB_URL=... SB_SERVICE_ROLE_KEY=... ; node scripts/setupCron.mts
import pg from "pg";

const FETCH_SCHEDULE = "0 */6 * * *";   // every 6h (credit-safe on the free Odds tier)
const CARD_SCHEDULE = "0 23 * * *";     // once daily ~before tip (UTC)
const SETTLE_SCHEDULE = "0 14 * * *";   // daily, after games finish (UTC) -> scores + Elo roll

const fnCall = (path: string) => `
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/${path}',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );`;

async function upsertSecret(c: pg.Client, name: string, value: string) {
  const r = await c.query("select id from vault.secrets where name = $1", [name]);
  if (r.rows.length) await c.query("select vault.update_secret($1, $2)", [r.rows[0].id, value]);
  else await c.query("select vault.create_secret($1, $2)", [value, name]);
}

async function main() {
  const { DATABASE_URL, SB_URL, SB_SERVICE_ROLE_KEY } = process.env;
  if (!DATABASE_URL || !SB_URL || !SB_SERVICE_ROLE_KEY) throw new Error("need DATABASE_URL, SB_URL, SB_SERVICE_ROLE_KEY");

  const c = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  await c.query("create extension if not exists pg_net;");
  await c.query("create extension if not exists pg_cron;");

  await upsertSecret(c, "project_url", SB_URL);
  await upsertSecret(c, "service_role_key", SB_SERVICE_ROLE_KEY);

  // reschedule cleanly
  for (const name of ["prime-fetch-odds", "prime-generate-card", "prime-settle-results"]) {
    await c.query("select cron.unschedule(jobid) from cron.job where jobname = $1", [name]);
  }
  await c.query("select cron.schedule($1, $2, $3)", ["prime-fetch-odds", FETCH_SCHEDULE, fnCall("fetch-odds")]);
  await c.query("select cron.schedule($1, $2, $3)", ["prime-settle-results", SETTLE_SCHEDULE, fnCall("settle-results")]);
  await c.query("select cron.schedule($1, $2, $3)", ["prime-generate-card", CARD_SCHEDULE, fnCall("generate-card")]);

  const jobs = await c.query("select jobname, schedule, active from cron.job where jobname like 'prime-%' order by jobname");
  console.log("Scheduled jobs:");
  jobs.rows.forEach((j: { jobname: string; schedule: string; active: boolean }) => console.log(`  ${j.jobname}  [${j.schedule}]  active=${j.active}`));
  await c.end();
  console.log("✅ cron wired");
}

main().catch((e) => { console.error(e); process.exit(1); });

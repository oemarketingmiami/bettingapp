import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only admin client. Uses the service role key — NEVER import this into a
// client component. (The `server-only` import makes such a build fail loudly.)
// Auth comes later; until then we read the single user's data server-side.
export function adminDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
  return createClient(url, key, { auth: { persistSession: false } });
}

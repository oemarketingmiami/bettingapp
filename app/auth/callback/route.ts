import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth / magic-link return point: exchange the code for a session, then redirect.
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/?signin=1&error=auth`);
}

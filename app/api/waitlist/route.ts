import { NextResponse } from "next/server";
import { adminDb } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let email = "";
  try {
    ({ email } = await req.json());
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  email = (email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }
  // upsert so re-submits don't error; ignore duplicates.
  const { error } = await adminDb()
    .from("waitlist")
    .upsert({ email, source: "landing" }, { onConflict: "email", ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

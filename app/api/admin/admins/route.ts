import { NextResponse } from "next/server";
import { adminDb } from "@/lib/db";
import { requireAdmin, SUPER_ADMINS } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const caller = await requireAdmin();
  if (!caller) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let email = "";
  try { ({ email } = await req.json()); } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }
  email = (email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "invalid email" }, { status: 400 });

  const { error } = await adminDb().from("admins").upsert({ email, added_by: caller }, { onConflict: "email", ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const caller = await requireAdmin();
  if (!caller) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let email = "";
  try { ({ email } = await req.json()); } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }
  email = (email || "").trim().toLowerCase();
  if (SUPER_ADMINS.includes(email)) return NextResponse.json({ error: "cannot remove a super admin" }, { status: 400 });

  const { error } = await adminDb().from("admins").delete().eq("email", email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

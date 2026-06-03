import "server-only";
import { adminDb } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

// Always-on admins (cannot be removed). Others can be added in the dashboard.
export const SUPER_ADMINS = ["marganonoirazan@gmail.com", "bmgaccident@gmail.com"];

export async function getSessionEmail(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email?.toLowerCase() ?? null;
}

export async function isAdminEmail(email: string | null): Promise<boolean> {
  if (!email) return false;
  const e = email.toLowerCase();
  if (SUPER_ADMINS.includes(e)) return true;
  const { data } = await adminDb().from("admins").select("email").eq("email", e).maybeSingle();
  return !!data;
}

export async function requireAdmin(): Promise<string | null> {
  const email = await getSessionEmail();
  return (await isAdminEmail(email)) ? email : null;
}

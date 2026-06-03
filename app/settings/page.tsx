import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";

export const metadata = { title: "Settings — Prime Picks" };
export const dynamic = "force-dynamic";

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 py-4">
      <div>
        <div className="text-sm font-medium text-zinc-100">{label}</div>
        {hint && <div className="text-xs text-zinc-500">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email ?? "—";
  return (
    <div className="min-h-[100dvh] bg-[#0a0b0f] text-zinc-100">
      <main className="mx-auto max-w-2xl px-5 py-10">
        <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200">
          <ArrowLeft className="h-4 w-4" /> Back to chat
        </Link>

        <div className="mt-6 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Prime Picks" className="h-10 w-10 rounded-xl" />
          <h1 className="font-display text-2xl font-bold">Settings</h1>
        </div>

        {/* Account */}
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Account</h2>
          <div className="mt-2 rounded-xl bg-white/[0.03] px-4 ring-1 ring-inset ring-white/10">
            <Row label="Signed in as">
              <span className="text-sm text-zinc-300">{email}</span>
            </Row>
            <Row label="Plan" hint="Manage billing later via Stripe">
              <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-300 ring-1 ring-inset ring-blue-500/30">Free</span>
            </Row>
          </div>
        </section>

        {/* Betting preferences */}
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Betting preferences</h2>
          <div className="mt-2 rounded-xl bg-white/[0.03] px-4 ring-1 ring-inset ring-white/10">
            <Row label="Unit size" hint="Used for suggested stake sizing">
              <span className="text-sm text-zinc-400">$50</span>
            </Row>
            <Row label="Default sport" hint="What the analyst loads first">
              <span className="text-sm text-zinc-400">NBA</span>
            </Row>
            <Row label="Risk profile" hint="Safer / balanced / aggressive">
              <span className="text-sm text-zinc-400">Balanced</span>
            </Row>
          </div>
          <p className="mt-2 px-1 text-xs text-zinc-600">These are display-only for now and become editable once auth + profile storage land.</p>
        </section>

        {/* Data */}
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Data</h2>
          <div className="mt-2 rounded-xl bg-white/[0.03] px-4 ring-1 ring-inset ring-white/10">
            <Row label="Chat history" hint="Currently stored in this browser">
              <span className="text-sm text-zinc-400">Local device</span>
            </Row>
          </div>
        </section>

        <div className="mt-10">
          <LogoutButton className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10">
            Log out
          </LogoutButton>
        </div>
      </main>
    </div>
  );
}

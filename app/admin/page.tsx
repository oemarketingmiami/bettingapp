import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Users, UserCheck, Mail, Activity, DollarSign, TrendingDown, Cpu, CreditCard } from "lucide-react";
import { adminDb } from "@/lib/db";
import { requireAdmin, SUPER_ADMINS } from "@/lib/admin";
import { AdminManager } from "@/components/admin/AdminManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — Prime Picks" };

const DAY = 86400_000;
function last14(dates: string[]) {
  const days: string[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) { const d = new Date(now.getTime() - i * DAY); days.push(d.toISOString().slice(0, 10)); }
  const counts: Record<string, number> = Object.fromEntries(days.map((k) => [k, 0]));
  for (const iso of dates) { const k = (iso || "").slice(0, 10); if (k in counts) counts[k]++; }
  return days.map((k) => ({ day: k, n: counts[k] }));
}

export default async function AdminPage() {
  const email = await requireAdmin();
  if (!email) redirect("/app");
  const db = adminDb();

  // Waitlist
  const { data: waitlist } = await db.from("waitlist").select("email, created_at").order("created_at", { ascending: false });
  const wl = waitlist ?? [];

  // Auth users (service role)
  const { data: usersRes } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = usersRes?.users ?? [];
  const now = Date.now();
  const active30 = users.filter((u) => u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() < 30 * DAY).length;
  const new7 = users.filter((u) => u.created_at && now - new Date(u.created_at).getTime() < 7 * DAY).length;

  // Admins
  const { data: adminRows } = await db.from("admins").select("email, added_by").order("created_at");
  const admins = adminRows ?? [];

  const wlSeries = last14(wl.map((w) => w.created_at as string));
  const userSeries = last14(users.map((u) => u.created_at as string));

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0a0b0f] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-10%] h-[480px] w-[820px] -translate-x-1/2 rounded-full opacity-50" style={{ background: "radial-gradient(closest-side, rgba(37,99,235,0.16), transparent)" }} />
        <div className="absolute right-[-10%] top-[40%] h-[480px] w-[480px] rounded-full opacity-40" style={{ background: "radial-gradient(closest-side, rgba(16,185,129,0.12), transparent)" }} />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0a0b0f]/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-7 w-7 rounded-md" />
            <span className="font-display text-lg font-semibold text-white">Admin</span>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300 ring-1 ring-inset ring-amber-500/30">internal</span>
          </div>
          <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200"><ArrowLeft className="h-4 w-4" /> App</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-display text-2xl font-bold">Overview</h1>
        <p className="mt-1 text-sm text-zinc-500">Signed in as {email}</p>

        {/* KPI cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Mail className="h-5 w-5" />} label="Waitlist" value={wl.length.toString()} sub={`${wlSeries.at(-1)?.n ?? 0} today`} accent="from-blue-500/20 to-indigo-500/10" />
          <Stat icon={<Users className="h-5 w-5" />} label="Total users" value={users.length.toString()} sub={`${new7} new (7d)`} accent="from-sky-500/20 to-blue-500/10" />
          <Stat icon={<UserCheck className="h-5 w-5" />} label="Active (30d)" value={active30.toString()} sub={`${users.length ? Math.round((active30 / users.length) * 100) : 0}% of users`} accent="from-emerald-500/20 to-teal-500/10" />
          <Stat icon={<Activity className="h-5 w-5" />} label="Conversion" value={`${wl.length ? Math.round((users.length / wl.length) * 100) : 0}%`} sub="users / waitlist" accent="from-violet-500/20 to-fuchsia-500/10" />
        </div>

        {/* Revenue row (placeholders until Stripe) */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<DollarSign className="h-5 w-5" />} label="MRR" value="—" sub="Connect Stripe" muted accent="from-emerald-500/10 to-transparent" />
          <Stat icon={<CreditCard className="h-5 w-5" />} label="Paid subs" value="0" sub="Connect Stripe" muted accent="from-emerald-500/10 to-transparent" />
          <Stat icon={<TrendingDown className="h-5 w-5" />} label="Churn (30d)" value="—" sub="Connect Stripe" muted accent="from-rose-500/10 to-transparent" />
          <Stat icon={<Cpu className="h-5 w-5" />} label="API spend (mo)" value="—" sub="Connect billing API" muted accent="from-amber-500/10 to-transparent" />
        </div>

        {/* charts */}
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Panel title="Waitlist signups (14d)"><Bars data={wlSeries} color="bg-blue-500" /></Panel>
          <Panel title="New users (14d)"><Bars data={userSeries} color="bg-emerald-500" /></Panel>
        </div>

        {/* plans + recent waitlist */}
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Panel title="Plans">
            <ul className="space-y-2 text-sm">
              <PlanRow label="Free" count={users.length} total={users.length} color="bg-zinc-400" />
              <PlanRow label="Pro" count={0} total={users.length} color="bg-blue-500" />
              <PlanRow label="Elite" count={0} total={users.length} color="bg-violet-500" />
            </ul>
            <p className="mt-3 text-xs text-zinc-600">Plan tiers populate once Stripe subscriptions are connected.</p>
          </Panel>

          <Panel title={`Recent waitlist (${wl.length})`}>
            {wl.length === 0 ? (
              <p className="text-sm text-zinc-500">No signups yet.</p>
            ) : (
              <ul className="divide-y divide-white/5 text-sm">
                {wl.slice(0, 8).map((w) => (
                  <li key={w.email} className="flex items-center justify-between py-2">
                    <span className="truncate text-zinc-200">{w.email}</span>
                    <span className="shrink-0 text-xs text-zinc-500">{new Date(w.created_at as string).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* admin management */}
        <div className="mt-8">
          <Panel title="Admins">
            <AdminManager initial={admins} superAdmins={SUPER_ADMINS} />
          </Panel>
        </div>
      </main>
    </div>
  );
}

function Stat({ icon, label, value, sub, accent, muted }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent: string; muted?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${accent} p-5 ring-1 ring-inset ring-white/5`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">{label}</span>
        <span className={muted ? "text-zinc-600" : "text-zinc-300"}>{icon}</span>
      </div>
      <div className={`mt-3 font-display text-3xl font-bold ${muted ? "text-zinc-500" : "text-white"}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 ring-1 ring-inset ring-white/5">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">{title}</h2>
      {children}
    </div>
  );
}

function Bars({ data, color }: { data: { day: string; n: number }[]; color: string }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  return (
    <div className="flex h-28 items-end gap-1.5">
      {data.map((d) => (
        <div key={d.day} className="group relative flex-1" title={`${d.day}: ${d.n}`}>
          <div className={`${color} w-full rounded-sm opacity-80 transition-opacity group-hover:opacity-100`} style={{ height: `${Math.max(4, (d.n / max) * 100)}%` }} />
        </div>
      ))}
    </div>
  );
}

function PlanRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <li>
      <div className="flex items-center justify-between"><span className="text-zinc-300">{label}</span><span className="text-zinc-500">{count}</span></div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/5"><div className={`${color} h-full rounded-full`} style={{ width: `${pct}%` }} /></div>
    </li>
  );
}

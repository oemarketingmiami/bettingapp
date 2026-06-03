import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { adminDb } from "@/lib/db";
import type { Card } from "@/lib/types";
import { SlateBadge } from "@/components/badges";
import { BetCard } from "@/components/BetCard";
import { PayoutTable } from "@/components/PayoutTable";

export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">{title}</h2>
      {children}
    </section>
  );
}

export default async function CardPage() {
  const { data, error } = await adminDb()
    .from("cards")
    .select("card_date, summary")
    .order("card_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const card = data?.summary as Card | undefined;
  const fmtDate = card
    ? new Date(card.slate_date + "T00:00:00Z").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })
    : "";

  return (
    <Shell quality={card?.slate_quality}>
      {error ? (
        <p className="text-red-400">Failed to load card: {error.message}</p>
      ) : !card ? (
        <p className="text-zinc-400">No card generated yet. The daily <code className="text-zinc-200">generate-card</code> job produces one per slate.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-white">Today&rsquo;s Card</h1>
              <p className="mt-1 text-sm text-zinc-500">{fmtDate}</p>
            </div>
          </div>

          <Section title="Final verdict">
            <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-b from-blue-950/40 to-white/[0.02] p-5 ring-1 ring-inset ring-white/10 shadow-[0_0_50px_-18px_rgba(37,99,235,0.5)]">
              <p className="text-zinc-100">{card.final_verdict.summary}</p>
              <p className="mt-3 text-sm text-zinc-300"><span className="text-zinc-500">Best bet:</span> {card.final_verdict.best_bet}</p>
              <p className="mt-1 text-sm italic text-zinc-500">{card.final_verdict.discipline_note}</p>
            </div>
          </Section>

          {card.picks.length > 0 ? (
            <Section title={`Picks (${card.picks.length})`}>
              <div className="grid gap-3 sm:grid-cols-2">{card.picks.map((p, i) => <BetCard key={i} pick={p} />)}</div>
            </Section>
          ) : (
            <Section title="Picks">
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-zinc-500">
                No picks today — the slate didn&rsquo;t clear the vetting threshold. Passing is a winning decision.
              </div>
            </Section>
          )}

          {card.parlay && card.parlay.legs?.length > 0 && (
            <Section title="Parlay">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 ring-1 ring-inset ring-white/10">
                <ol className="space-y-2">
                  {card.parlay.legs.map((leg, i) => (
                    <li key={i} className="flex items-start justify-between gap-3 text-sm">
                      <span className="text-zinc-200">{leg.pick}</span>
                      <span className="shrink-0 tabular-nums text-zinc-500">{leg.prob}% · grade {leg.grade}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-xs text-amber-300/80">Weakest leg: {card.parlay.weakest_leg} · Risk: {card.parlay.overall_risk}</p>
              </div>
            </Section>
          )}

          {card.payout_table.length > 0 && (
            <Section title="Payout table"><PayoutTable rows={card.payout_table} /></Section>
          )}

          {card.bets_to_avoid.length > 0 && (
            <Section title="Bets to avoid">
              <ul className="space-y-2">
                {card.bets_to_avoid.map((b, i) => (
                  <li key={i} className="rounded-xl border border-red-500/15 bg-red-500/[0.06] p-4 text-sm">
                    <span className="font-medium text-zinc-100">{b.matchup}</span>
                    <span className="text-zinc-500"> · {b.market}</span>
                    <p className="mt-1 text-zinc-400">{b.reason}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}
    </Shell>
  );
}

function Shell({ quality, children }: { quality?: Card["slate_quality"]; children: React.ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0a0b0f] text-zinc-100">
      {/* brand gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[520px] w-[820px] -translate-x-1/2 rounded-full opacity-60" style={{ background: "radial-gradient(closest-side, rgba(37,99,235,0.18), transparent)" }} />
        <div className="absolute right-[-10%] top-[45%] h-[520px] w-[520px] rounded-full opacity-50" style={{ background: "radial-gradient(closest-side, rgba(99,102,241,0.15), transparent)" }} />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0a0b0f]/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Prime Picks" className="h-7 w-7 rounded-md" />
            <span className="font-display text-lg font-semibold text-white">Prime Picks</span>
          </div>
          <div className="flex items-center gap-3">
            {quality && <SlateBadge quality={quality} />}
            <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200">
              <ArrowLeft className="h-4 w-4" /> Chat
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        {children}
        <footer className="mt-14 border-t border-white/5 pt-5 text-center text-xs text-zinc-600">
          Prime Picks · numbers from the model, reasoning from the AI · no fabricated data
        </footer>
      </main>
    </div>
  );
}

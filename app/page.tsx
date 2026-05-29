import { adminDb } from "@/lib/db";
import type { Card } from "@/lib/types";
import { SlateBadge } from "@/components/badges";
import { BetCard } from "@/components/BetCard";
import { PayoutTable } from "@/components/PayoutTable";

// Always read the freshest card from the DB on each request.
export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">{title}</h2>
      {children}
    </section>
  );
}

export default async function Home() {
  const { data, error } = await adminDb()
    .from("cards")
    .select("card_date, summary")
    .order("card_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return <Shell><p className="text-red-400">Failed to load card: {error.message}</p></Shell>;
  }
  if (!data) {
    return (
      <Shell>
        <p className="text-zinc-400">No card generated yet. Run the daily <code className="text-zinc-200">generate-card</code> job to produce one.</p>
      </Shell>
    );
  }

  const card = data.summary as Card;
  const fmtDate = new Date(card.slate_date + "T00:00:00Z").toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric", timeZone: "UTC",
  });

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Today&rsquo;s Card</h1>
          <p className="text-sm text-zinc-500">{fmtDate}</p>
        </div>
        <SlateBadge quality={card.slate_quality} />
      </div>

      <Section title="Final verdict">
        <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/10">
          <p className="text-zinc-200">{card.final_verdict.summary}</p>
          <p className="mt-2 text-sm text-zinc-400"><span className="text-zinc-500">Best bet:</span> {card.final_verdict.best_bet}</p>
          <p className="mt-1 text-sm italic text-zinc-500">{card.final_verdict.discipline_note}</p>
        </div>
      </Section>

      {card.picks.length > 0 ? (
        <Section title={`Picks (${card.picks.length})`}>
          <div className="grid gap-3">
            {card.picks.map((p, i) => <BetCard key={i} pick={p} />)}
          </div>
        </Section>
      ) : (
        <Section title="Picks">
          <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-zinc-500">
            No picks today — the slate didn&rsquo;t clear the vetting threshold. Passing is a winning decision.
          </div>
        </Section>
      )}

      {card.parlay && card.parlay.legs?.length > 0 && (
        <Section title="Parlay">
          <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/10">
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
              <li key={i} className="rounded-lg bg-red-500/[0.06] p-3 text-sm ring-1 ring-inset ring-red-500/15">
                <span className="font-medium text-zinc-200">{b.matchup}</span>
                <span className="text-zinc-500"> · {b.market}</span>
                <p className="mt-0.5 text-zinc-400">{b.reason}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      {children}
      <footer className="mt-12 border-t border-white/5 pt-4 text-center text-xs text-zinc-600">
        OE Picks · numbers from the model, reasoning from Claude · no fabricated data
      </footer>
    </main>
  );
}

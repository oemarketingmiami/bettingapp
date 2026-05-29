import type { Pick } from "@/lib/types";
import { EdgeBadge, Pill } from "./badges";

const CARD_TYPE_LABEL: Record<string, string> = {
  safer: "Safer", aggressive: "Aggressive", longshot: "Longshot", prop: "Prop", total: "Total",
};

export function BetCard({ pick }: { pick: Pick }) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500">
            {CARD_TYPE_LABEL[pick.card_type] ?? pick.card_type} · {pick.market}
          </div>
          <div className="mt-0.5 text-base font-semibold text-zinc-100">{pick.pick}</div>
          <div className="text-sm text-zinc-400">{pick.matchup}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold tabular-nums text-zinc-100">{pick.line_or_odds}</div>
          <div className="text-xs text-zinc-500">{pick.suggested_units}u</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <EdgeBadge rating={pick.edge_rating} />
        <Pill>Grade {pick.bet_grade}</Pill>
        <Pill>{pick.est_win_prob}% win</Pill>
        <Pill>Conf {pick.confidence}/10</Pill>
      </div>

      {pick.reasoning && <p className="mt-3 text-sm leading-relaxed text-zinc-300">{pick.reasoning}</p>}

      {pick.risk_flags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {pick.risk_flags.map((f) => (
            <span key={f} className="rounded-md bg-red-500/10 px-2 py-0.5 text-xs text-red-300 ring-1 ring-inset ring-red-500/20">
              ⚠ {f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Visual recommendation card the analyst can emit alongside its text.
// The model outputs a ```picks-card {json}``` block; extractCard() pulls it out
// so the prose renders as markdown and this renders as the card.

export interface CardLeg {
  player?: string;
  market?: string;       // "Points", "Reb+Ast", etc.
  line?: number | string;
  side?: string;         // More / Less / Over / Under
  call?: "play" | "lean" | "fade" | "pass";
  edge?: string;         // Small | Moderate | Strong | Elite
  confidence?: number;   // 1-10
  stat?: string;         // "7/10 over · avg 28.4"
}
export interface PicksCardData {
  title?: string;
  matchup?: string;
  verdict?: string;
  legs?: CardLeg[];
  best_core?: string;
  note?: string;
}

const CALL: Record<string, { label: string; cls: string; hint: string }> = {
  play: { label: "PLAY", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30", hint: "PLAY — recommended. The data supports this side." },
  lean: { label: "LEAN", cls: "bg-sky-500/15 text-sky-300 ring-sky-500/30", hint: "LEAN — playable, but lower conviction." },
  fade: { label: "FADE", cls: "bg-red-500/15 text-red-300 ring-red-500/30", hint: "FADE — avoid this side. The data points the other way." },
  pass: { label: "PASS", cls: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30", hint: "PASS — skip it. No edge / coin flip." },
};

// Pull a ```picks-card``` block out of streamed content.
export function extractCard(content: string): { text: string; card: PicksCardData | null; pending: boolean } {
  const start = content.indexOf("```picks-card");
  if (start === -1) return { text: content, card: null, pending: false };
  const nl = content.indexOf("\n", start);
  const end = content.indexOf("```", nl === -1 ? start + 13 : nl + 1);
  if (end === -1) return { text: content.slice(0, start).trim(), card: null, pending: true }; // still streaming
  const json = content.slice(nl + 1, end).trim();
  const text = (content.slice(0, start) + content.slice(end + 3)).trim();
  try {
    return { text, card: JSON.parse(json) as PicksCardData, pending: false };
  } catch {
    return { text, card: null, pending: false };
  }
}

export function PicksCard({ card }: { card: PicksCardData }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-blue-500/25 bg-gradient-to-b from-blue-950/50 to-black/50 ring-1 ring-inset ring-white/10 backdrop-blur-md shadow-[0_0_40px_-12px_rgba(37,99,235,0.45)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-5 w-5 rounded" />
          <span className="font-display text-sm font-semibold text-white">{card.title || "The Card"}</span>
        </div>
        {card.matchup && <span className="text-xs text-zinc-400">{card.matchup}</span>}
      </div>

      {card.verdict && <p className="px-4 pt-3 text-sm text-zinc-200">{card.verdict}</p>}

      {card.legs && card.legs.length > 0 && (
        <ul className="space-y-2 p-4">
          {card.legs.map((leg, i) => {
            const call = CALL[leg.call ?? "lean"] ?? CALL.lean;
            return (
              <li key={i} className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-zinc-100">{leg.player}</div>
                    <div className="text-xs text-zinc-400">
                      {[leg.market, leg.line != null ? `${leg.line}` : null, leg.side].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <span title={call.hint} className={`shrink-0 cursor-help rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${call.cls}`}>{call.label}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {leg.edge && <span title="Edge rating — value vs the fair line: Small < Moderate < Strong < Elite" className="cursor-help rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-zinc-300 ring-1 ring-inset ring-white/10">{leg.edge}</span>}
                  {leg.confidence != null && <span title="Confidence in this read, 1-10" className="cursor-help rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-zinc-300 ring-1 ring-inset ring-white/10">Conf {leg.confidence}/10</span>}
                  {leg.stat && <span className="text-[11px] text-zinc-500">{leg.stat}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {card.best_core && (
        <div className="mx-4 mb-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          <span className="font-medium">Best core:</span> {card.best_core}
        </div>
      )}
      {card.note && <p className="px-4 pb-3 text-[11px] text-zinc-500">{card.note}</p>}
    </div>
  );
}

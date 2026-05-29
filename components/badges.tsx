import type { EdgeRating, SlateQuality } from "@/lib/types";

const SLATE_STYLES: Record<SlateQuality, string> = {
  Strong: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  Medium: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  Weak: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  Pass: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
};

const EDGE_STYLES: Record<EdgeRating, string> = {
  Elite: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30",
  Strong: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  Moderate: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  Small: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
};

export function SlateBadge({ quality }: { quality: SlateQuality }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${SLATE_STYLES[quality]}`}>
      {quality} slate
    </span>
  );
}

export function EdgeBadge({ rating }: { rating: EdgeRating }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${EDGE_STYLES[rating]}`}>
      {rating} edge
    </span>
  );
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-xs text-zinc-300 ring-1 ring-inset ring-white/10">
      {children}
    </span>
  );
}

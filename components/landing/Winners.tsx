"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WINS = [1, 2, 3, 4];

export function Winners() {
  const trackRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => trackRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });

  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">Proof</p>
        <h2 className="mt-2 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">This week&rsquo;s winners</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">Real cashed tickets from the Prime Picks crew.</p>
      </div>

      <div className="relative mt-12">
        <button onClick={() => scroll(-1)} aria-label="Previous"
          className="absolute -left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-md transition hover:bg-slate-50 sm:block">
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div ref={trackRef} className="no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-1 pb-4">
          {WINS.map((n) => (
            <figure key={n} className="group shrink-0 snap-center">
              <div className="relative">
                <div className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-blue-500/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/wins/${n}.png`} alt="Winning ticket" className="relative h-[480px] w-auto drop-shadow-2xl transition-transform duration-300 group-hover:-translate-y-1.5 sm:h-[540px]" />
              </div>
            </figure>
          ))}
        </div>

        <button onClick={() => scroll(1)} aria-label="Next"
          className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-md transition hover:bg-slate-50 sm:block">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">Past results don&rsquo;t guarantee future outcomes. 21+. Bet responsibly.</p>
    </section>
  );
}

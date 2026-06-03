import Link from "next/link";
import { Gauge, ScanText, Layers, LineChart, ArrowRight } from "lucide-react";

const CAPS = [
  {
    Icon: Gauge,
    title: "Instant grades",
    body: "Send your picks and get a clear grade in seconds: which ones to bet, which to skip, and a confidence score for each. No more guessing.",
    theme: "217 91% 45%", // blue
    image: "/features/1.png",
  },
  {
    Icon: ScanText,
    title: "Just upload a screenshot",
    body: "Snap your PrizePicks or Underdog screen and it reads every pick for you, then tells you which are worth it. Nothing to type in.",
    theme: "160 84% 30%", // emerald
    image: "/features/2.png",
  },
  {
    Icon: Layers,
    title: "Build a stronger ticket",
    body: "Playing more than one pick? It ranks them best to worst, points out your weakest one, and helps you build a smarter combo.",
    theme: "262 70% 48%", // violet
    image: "/features/3.png",
  },
  {
    Icon: LineChart,
    title: "Backed by real stats",
    body: "Every call is based on real player and team numbers, not hype, so you can actually trust the advice you're getting.",
    theme: "25 90% 48%", // amber
    image: "/features/4.png",
  },
];

export function Capabilities() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">Features</p>
        <h2 className="mt-2 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Prime Picks Features</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">Everything Prime Picks does for you, in plain English.</p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {CAPS.map(({ Icon, title, body, theme, image }) => (
          <div
            key={title}
            className="group h-[360px] w-full"
            style={{ ["--tc" as string]: theme }}
          >
            <Link
              href="/app"
              className="relative block h-full w-full overflow-hidden rounded-2xl shadow-lg transition-all duration-500 ease-in-out group-hover:scale-[1.02] group-hover:shadow-[0_0_60px_-15px_hsl(var(--tc)/0.65)]"
              style={{ boxShadow: "0 0 40px -18px hsl(var(--tc) / 0.5)" }}
              aria-label={title}
            >
              {/* image with parallax zoom */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-in-out group-hover:scale-110"
                style={{ backgroundImage: `url(${image})` }}
              />
              {/* themed gradient overlay for readability */}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, hsl(var(--tc)/0.96), hsl(var(--tc)/0.6) 38%, rgba(2,6,23,0.25) 70%, transparent)" }}
              />

              <div className="relative flex h-full flex-col justify-end p-6 text-white">
                <span className="mb-4 inline-grid h-11 w-11 place-items-center rounded-xl border border-white/25 bg-white/15 backdrop-blur-md">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="font-display text-2xl font-bold tracking-tight">{title}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-white/85">{body}</p>

                <div className="mt-5 flex items-center justify-between rounded-lg border border-white/25 bg-white/10 px-4 py-3 backdrop-blur-md transition-all duration-300 group-hover:border-white/40 group-hover:bg-white/20">
                  <span className="text-sm font-semibold tracking-wide">Try it</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

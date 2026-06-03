import Link from "next/link";

const THEME = "217 91% 45%"; // one brand gradient for all cards
const IMAGE = "/features/1.png"; // same image for all cards

const CAPS = [
  {
    title: "Instant grades",
    body: "Send your picks and get a clear grade in seconds: which to bet, which to skip, and a confidence score for each.",
  },
  {
    title: "Just upload a screenshot",
    body: "Snap your PrizePicks or Underdog screen and it reads every pick for you, then tells you which are worth it.",
  },
  {
    title: "Build a stronger ticket",
    body: "Playing more than one pick? It ranks them best to worst and points out your weakest one.",
  },
  {
    title: "Backed by real stats",
    body: "Every call is based on real player and team numbers, not hype, so you can trust the advice.",
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
        {CAPS.map(({ title, body }) => (
          <div key={title} className="group h-[360px] w-full" style={{ ["--tc" as string]: THEME }}>
            <Link
              href="/app"
              className="relative block h-full w-full overflow-hidden rounded-2xl shadow-lg transition-all duration-500 ease-in-out group-hover:scale-[1.02] group-hover:shadow-[0_0_60px_-15px_hsl(var(--tc)/0.65)]"
              style={{ boxShadow: "0 0 40px -18px hsl(var(--tc) / 0.5)" }}
              aria-label={title}
            >
              {/* image fills the card; only the bottom is shaded so more of it shows */}
              <div
                className="absolute inset-0 bg-cover bg-top transition-transform duration-700 ease-in-out group-hover:scale-105"
                style={{ backgroundImage: `url(${IMAGE})` }}
              />
              <div
                className="absolute inset-x-0 bottom-0 h-2/5"
                style={{ background: "linear-gradient(to top, hsl(var(--tc)/0.97), hsl(var(--tc)/0.6) 55%, transparent)" }}
              />
              <div className="relative flex h-full flex-col justify-end p-6 text-white">
                <h3 className="font-display text-2xl font-bold tracking-tight">{title}</h3>
                <p className="mt-1.5 max-w-md text-sm leading-relaxed text-white/90">{body}</p>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

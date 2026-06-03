const TESTIMONIALS = [
  { name: "Marcus T.", role: "NBA bettor", quote: "It told me to pass on a slate I would've hammered. Saved me a unit and change. The discipline is the product.", color: "from-blue-500 to-indigo-500" },
  { name: "Devon R.", role: "PrizePicks grinder", quote: "I screenshot my board and it grades every leg in seconds. Flags the trap legs I keep falling for.", color: "from-emerald-500 to-teal-500" },
  { name: "Priya K.", role: "Props player", quote: "Finally a tool that says 'no model edge here' instead of hyping every pick. I trust it because it's honest.", color: "from-rose-500 to-pink-500" },
  { name: "Sam W.", role: "Parlay builder", quote: "The de-vig edge numbers are the cleanest I've seen. It killed two of my legs and the ticket still cashed.", color: "from-amber-500 to-orange-500" },
  { name: "Jordan L.", role: "NHL/NBA", quote: "Reads the slate faster than I can open three apps. The reasoning actually makes sense.", color: "from-violet-500 to-fuchsia-500" },
  { name: "Chris B.", role: "Weekend bettor", quote: "Feels like having a sharp friend who never gets emotional. Best $/month I spend on betting.", color: "from-cyan-500 to-sky-500" },
];

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(" ").map((p) => p[0]).join("").slice(0, 2);
  return <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br ${color} text-sm font-semibold text-white`}>{initials}</div>;
}

function Card({ t }: { t: (typeof TESTIMONIALS)[number] }) {
  return (
    <figure className="flex w-[340px] shrink-0 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_20px_50px_-20px_rgba(37,99,235,0.45)] sm:w-[400px]">
      <blockquote className="text-pretty text-base leading-relaxed text-slate-700">&ldquo;{t.quote}&rdquo;</blockquote>
      <figcaption className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
        <Avatar name={t.name} color={t.color} />
        <div>
          <div className="text-sm font-semibold text-slate-900">{t.name}</div>
          <div className="text-xs text-slate-500">{t.role}</div>
        </div>
      </figcaption>
    </figure>
  );
}

export function Testimonials() {
  const row = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <section id="testimonials" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">Testimonials</p>
        <h2 className="mt-2 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Bettors who stopped guessing</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">Real discipline beats big cards. Here&rsquo;s what the early crew says.</p>
      </div>

      <div className="marquee-group relative mt-14 overflow-hidden" style={{ maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)" }}>
        <div className="flex w-max animate-marquee gap-5 px-4">
          {row.map((t, i) => <Card key={i} t={t} />)}
        </div>
      </div>
    </section>
  );
}

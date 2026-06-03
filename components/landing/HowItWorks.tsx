import { Database, Brain, MessageSquare } from "lucide-react";

const STEPS = [
  { Icon: Database, title: "Pull the slate", body: "Live odds, lines, and stats flow in and get normalized into one clean source." },
  { Icon: Brain, title: "Model finds the edge", body: "Calibrated probabilities (Elo + market de-vig) surface where the number is wrong." },
  { Icon: MessageSquare, title: "AI grades & explains", body: "The analyst vets every angle, grades it, and passes when there's no real edge." },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">How it works</p>
        <h2 className="mt-2 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">See it in action</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">A quick walkthrough of going from today&rsquo;s slate to a vetted card.</p>
      </div>

      <div className="group relative mx-auto mt-12 max-w-4xl">
        <div className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-r from-blue-500/20 to-indigo-500/20 opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-2xl">
          <video
            className="aspect-video w-full"
            autoPlay
            loop
            muted
            playsInline
            controls
            preload="metadata"
          >
            <source src="https://cqmwvfwuerywwrqxnxdd.supabase.co/storage/v1/object/public/media/howitworks.mp4" type="video/mp4" />
          </video>
        </div>
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-3">
        {STEPS.map(({ Icon, title, body }, i) => (
          <div key={i} className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_20px_50px_-20px_rgba(37,99,235,0.45)]">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Step {i + 1}</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

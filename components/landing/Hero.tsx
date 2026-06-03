"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Trophy } from "lucide-react";

// User-supplied sportsbook / team / league logos (public/headericons).
const ICONS = [
  { src: "/headericons/1draftkings.png", pos: "top-[14%] left-[8%]" },
  { src: "/headericons/8fanduel.png", pos: "top-[22%] right-[9%]" },
  { src: "/headericons/6lakers.png", pos: "top-[60%] left-[6%]" },
  { src: "/headericons/11underdog.png", pos: "bottom-[14%] right-[10%]" },
  { src: "/headericons/2Miami-Heat.png", pos: "top-[10%] left-[28%]" },
  { src: "/headericons/4nfl.png", pos: "top-[12%] right-[28%]" },
  { src: "/headericons/3mlb.png", pos: "bottom-[12%] left-[24%]" },
  { src: "/headericons/14wnba.png", pos: "top-[44%] right-[5%]" },
  { src: "/headericons/10Bulls.png", pos: "top-[48%] left-[4%]" },
  { src: "/headericons/7miamidoplhins.png", pos: "bottom-[22%] right-[26%]" },
  { src: "/headericons/13soccer.jpg", pos: "top-[70%] right-[18%]" },
  { src: "/headericons/9knicks.svg", pos: "top-[78%] left-[20%]" },
  { src: "/headericons/5primepics.png", pos: "top-[30%] left-[16%]" },
  { src: "/headericons/12Yankees.png", pos: "top-[34%] right-[18%]" },
];

function FloatingIcon({ data, index, mouseX, mouseY }: {
  data: (typeof ICONS)[number];
  index: number;
  mouseX: React.MutableRefObject<number>;
  mouseY: React.MutableRefObject<number>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  useEffect(() => {
    const onMove = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dist = Math.hypot(mouseX.current - cx, mouseY.current - cy);
      if (dist < 160) {
        const angle = Math.atan2(mouseY.current - cy, mouseX.current - cx);
        const force = (1 - dist / 160) * 60; // closer cursor = stronger push
        x.set(-Math.cos(angle) * force);
        y.set(-Math.sin(angle) * force);
      } else {
        x.set(0);
        y.set(0);
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [x, y, mouseX, mouseY]);

  const { src, pos } = data;
  return (
    <motion.div ref={ref} style={{ x: springX, y: springY }} className={`absolute ${pos}`}
      initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
      <motion.div
        className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-slate-100 bg-white p-2.5 shadow-[0_12px_30px_-8px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/5"
        animate={{ y: [0, -8, 0, 8, 0], rotate: [0, 4, 0, -4, 0] }}
        transition={{ duration: 6 + (index % 5), repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full object-contain" />
      </motion.div>
    </motion.div>
  );
}

export function Hero() {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);
  const mouseX = useRef(0);
  const mouseY = useRef(0);

  return (
    <section
      onMouseMove={(e) => { mouseX.current = e.clientX; mouseY.current = e.clientY; }}
      className="relative flex min-h-[88vh] w-full items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_30%,rgba(37,99,235,0.10),transparent_70%)]" />

      <div className="pointer-events-none absolute inset-0 hidden md:block">
        {ICONS.map((data, i) => (
          <FloatingIcon key={i} data={data} index={i} mouseX={mouseX} mouseY={mouseY} />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Built on a real forecasting model — not vibes
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.05 }}
          className="font-display text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl md:text-7xl">
          Bet smarter,
          <br />
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">not harder.</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.12 }}
          className="mx-auto mt-6 max-w-xl text-lg text-slate-600">
          Upload a screenshot of your PrizePicks or Underdog picks and get an instant, easy-to-read grade: which bets are worth it, which to skip, and the real stats behind every call.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.2 }} className="mt-9">
          {joined ? (
            <div className="mx-auto inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
              <Trophy className="h-4 w-4" /> You&rsquo;re on the waitlist. We&rsquo;ll be in touch.
            </div>
          ) : (
            <form onSubmit={async (e) => {
                e.preventDefault();
                if (!email.trim()) return;
                try { await fetch("/api/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: email.trim() }) }); } catch {}
                setJoined(true);
              }}
              className="mx-auto flex max-w-md flex-col items-center gap-3 sm:flex-row">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
                className="h-12 w-full flex-1 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
              <button type="submit" className="h-12 w-full rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 px-6 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-[0_10px_30px_-8px_rgba(37,99,235,0.6)] sm:w-auto">
                Join waitlist
              </button>
            </form>
          )}
          <p className="mt-3 text-xs text-slate-400">No spam. Early access to the beta.</p>
        </motion.div>
      </div>
    </section>
  );
}

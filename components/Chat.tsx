"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Paperclip, ArrowUpIcon, Image as ImageIcon, ClipboardList, TrendingUp, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { Markdown } from "@/components/Markdown";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } };

const BG = "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/ruixen_moon_2.png";

interface Img { media_type: string; data: string; preview: string }
interface Msg { role: "user" | "assistant"; content: string; images?: Img[] }

function useAutoResize(min: number, max: number) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const adjust = useCallback((reset?: boolean) => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = `${min}px`;
    if (reset) return;
    ta.style.height = `${Math.max(min, Math.min(ta.scrollHeight, max))}px`;
  }, [min, max]);
  useEffect(() => { if (ref.current) ref.current.style.height = `${min}px`; }, [min]);
  return { ref, adjust };
}

const QUICK = [
  { icon: <TrendingUp className="h-4 w-4" />, label: "What's on the slate?", text: "What's on today's slate and where's the value?" },
  { icon: <ImageIcon className="h-4 w-4" />, label: "Grade my board", text: "I'm about to upload a PrizePicks board — grade each pick." },
  { icon: <ClipboardList className="h-4 w-4" />, label: "Review my slip", text: "Review this bet slip and rate the parlay." },
  { icon: <Layers className="h-4 w-4" />, label: "Best ML value", text: "What's the best moneyline value tonight?" },
];

export function Chat({ slateCount }: { slateCount: number }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Img[]>([]);
  const [streaming, setStreaming] = useState(false);
  const { ref: taRef, adjust } = useAutoResize(48, 150);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streaming]);

  async function addFiles(files: FileList | File[]) {
    const imgs = await Promise.all(
      Array.from(files).filter((f) => f.type.startsWith("image/")).map(
        (f) => new Promise<Img>((res) => {
          const r = new FileReader();
          r.onload = () => { const u = r.result as string; res({ media_type: f.type, data: u.split(",")[1], preview: u }); };
          r.readAsDataURL(f);
        })
      )
    );
    setPending((p) => [...p, ...imgs]);
  }

  async function send() {
    if ((!input.trim() && pending.length === 0) || streaming) return;
    const userMsg: Msg = { role: "user", content: input.trim(), images: pending.length ? pending : undefined };
    const next = [...messages, userMsg];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setPending([]);
    setStreaming(true);
    adjust(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content, images: m.images?.map((i) => ({ media_type: i.media_type, data: i.data })) })),
        }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        setMessages((m) => {
          const c = [...m];
          c[c.length - 1] = { ...c[c.length - 1], content: c[c.length - 1].content + chunk };
          return c;
        });
      }
    } catch (e) {
      setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: `Error: ${String(e)}` }; return c; });
    } finally {
      setStreaming(false);
    }
  }

  const empty = messages.length === 0;

  const InputBox = (
    <div className="w-full">
      {pending.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {pending.map((img, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.preview} alt="pending" className="h-16 w-16 rounded-lg object-cover ring-1 ring-white/15" />
              <button onClick={() => setPending((p) => p.filter((_, j) => j !== i))}
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-neutral-800 text-xs text-neutral-200 ring-1 ring-white/20">×</button>
            </div>
          ))}
        </div>
      )}
      <div className="relative rounded-xl border border-neutral-700 bg-black/60 backdrop-blur-md transition-all duration-300 focus-within:border-sky-500/50 focus-within:shadow-[0_0_30px_-6px_rgba(14,165,233,0.35)]">
        <Textarea
          ref={taRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); adjust(); }}
          onPaste={(e) => { if (e.clipboardData.files.length) addFiles(e.clipboardData.files); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Message the analyst, or drop a board screenshot…"
          className="w-full resize-none border-none bg-transparent px-4 py-3 text-sm text-white placeholder:text-neutral-400 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[48px]"
          style={{ overflow: "hidden" }}
        />
        <div className="flex items-center justify-between p-3">
          <Button variant="ghost" size="icon" className="text-white hover:bg-neutral-700" onClick={() => fileRef.current?.click()} title="Attach screenshot">
            <Paperclip className="h-4 w-4" />
          </Button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
          <Button
            onClick={send}
            disabled={streaming || (!input.trim() && pending.length === 0)}
            className={cn("flex items-center gap-1 rounded-lg px-3 py-2", "bg-sky-600 text-white hover:bg-sky-500 disabled:bg-neutral-700 disabled:text-neutral-400")}
          >
            <ArrowUpIcon className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative flex h-[100dvh] w-full flex-col items-center bg-cover bg-center" style={{ backgroundImage: `url('${BG}')`, backgroundAttachment: "fixed" }}>
      <header className="z-10 w-full">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="font-display text-lg font-semibold text-white drop-shadow">OE Picks</span>
          <a href="/card" className="text-xs text-neutral-300 hover:text-white">Today&rsquo;s card →</a>
        </div>
      </header>

      {empty ? (
        <motion.div variants={stagger} initial="hidden" animate="show"
          className="z-10 flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 pb-[16vh]">
          <div className="relative flex flex-col items-center text-center">
            {/* soft glow behind the wordmark */}
            <div className="hero-glow pointer-events-none absolute -top-10 h-48 w-[28rem] max-w-[90vw] rounded-full bg-indigo-500/25 blur-3xl" />

            <motion.div variants={fadeUp} className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-300 backdrop-blur-md">
                {slateCount > 0 ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    {slateCount} game{slateCount === 1 ? "" : "s"} loaded · live odds + model edges
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-neutral-500" />
                    No live slate · drop a screenshot to analyze
                  </>
                )}
              </span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-gradient font-display mt-5 text-6xl font-bold tracking-tight drop-shadow-[0_4px_28px_rgba(0,0,0,0.75)] sm:text-8xl">
              OE Picks
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-3 max-w-md text-pretty text-neutral-300">
              Your private betting analyst. Reads the slate, grades your boards, and passes when there&rsquo;s no edge.
            </motion.p>
          </div>

          <motion.div variants={fadeUp} className="mt-9 w-full">{InputBox}</motion.div>

          <motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {QUICK.map((q) => (
              <motion.button key={q.label} whileHover={{ y: -2, scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => { setInput(q.text); if (q.label === "Grade my board" || q.label === "Review my slip") fileRef.current?.click(); }}
                className="flex items-center gap-2 rounded-full border border-neutral-700 bg-black/50 px-4 py-2 text-xs text-neutral-300 backdrop-blur-md transition-colors hover:border-sky-500/40 hover:bg-neutral-800 hover:text-white">
                {q.icon}<span>{q.label}</span>
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      ) : (
        <>
          <div className="z-10 w-full flex-1 overflow-y-auto px-4">
            <div className="mx-auto max-w-3xl space-y-4 py-6">
              {messages.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }}
                  className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 backdrop-blur-md",
                    m.role === "user" ? "bg-sky-600/30 ring-1 ring-inset ring-sky-400/30" : "bg-black/55 ring-1 ring-inset ring-white/10")}>
                    {m.images?.length ? (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {m.images.map((img, j) => <img key={j} src={img.preview} alt="upload" className="max-h-44 rounded-lg ring-1 ring-white/15" />)}
                      </div>
                    ) : null}
                    {m.role === "assistant" ? (
                      m.content ? <Markdown>{m.content}</Markdown> : <span className="text-sm text-zinc-400">{streaming && i === messages.length - 1 ? "…" : ""}</span>
                    ) : (
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">{m.content}</div>
                    )}
                  </div>
                </motion.div>
              ))}
              <div ref={endRef} />
            </div>
          </div>
          <div className="z-10 w-full px-4 pb-4">
            <div className="mx-auto max-w-3xl">{InputBox}</div>
            <p className="mx-auto mt-1.5 max-w-3xl text-center text-[11px] text-neutral-400">Reads only what&rsquo;s shown · no fabricated data · model gives team probs, not player props</p>
          </div>
        </>
      )}
    </div>
  );
}

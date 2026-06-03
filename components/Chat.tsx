"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Paperclip, ArrowUpIcon, Image as ImageIcon, ClipboardList, TrendingUp, Layers, Plus, Trash2, MessageSquare, PanelLeft, PanelLeftClose, Settings, LogOut, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Markdown } from "@/components/Markdown";
import { PicksCard, extractCard } from "@/components/PicksCard";
import { LogoutButton } from "@/components/LogoutButton";

const BG = "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/ruixen_moon_2.png";
const LS_KEY = "oe_picks_chats_v1";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } };

interface Img { media_type: string; data: string; preview: string }
interface Msg { role: "user" | "assistant"; content: string; images?: Img[] }
interface Conversation { id: string; title: string; messages: Msg[]; updatedAt: number }

const QUICK = [
  { icon: <ImageIcon className="h-4 w-4" />, label: "Upload a screenshot", text: "I'm uploading a screenshot of my picks. Grade them for me.", upload: true },
  { icon: <Layers className="h-4 w-4" />, label: "Grade my parlay", text: "Grade my parlay and tell me which picks to keep and which to drop.", upload: true },
  { icon: <ClipboardList className="h-4 w-4" />, label: "Review my bets", text: "Review my bets and tell me which ones are worth it.", upload: true },
  { icon: <TrendingUp className="h-4 w-4" />, label: "Best Money Line Value", text: "What's the best Money Line value tonight?", upload: false },
];

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

function makeTitle(m: Msg): string {
  const t = m.content?.trim();
  if (t) return t.length > 42 ? t.slice(0, 42) + "…" : t;
  if (m.images?.length) return "Image analysis";
  return "New chat";
}

export function Chat({ slateCount, username, isAdmin }: { slateCount: number; username: string; isAdmin?: boolean }) {
  const [chats, setChats] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Img[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const { ref: taRef, adjust } = useAutoResize(48, 150);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load / persist history (localStorage — private per device).
  useEffect(() => {
    try { const raw = localStorage.getItem(LS_KEY); if (raw) setChats(JSON.parse(raw)); } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(LS_KEY, JSON.stringify(chats)); }, [chats, loaded]);
  // Start collapsed on small screens so the sidebar doesn't cover the chat on load.
  useEffect(() => { if (typeof window !== "undefined" && window.innerWidth < 640) setSidebarOpen(false); }, []);

  const active = chats.find((c) => c.id === activeId) ?? null;
  const messages = active?.messages ?? [];
  const empty = messages.length === 0;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, streaming]);

  function newChat() { setActiveId(null); setInput(""); setPending([]); setSidebarOpen(false); }
  function selectChat(id: string) { setActiveId(id); setSidebarOpen(false); }
  function deleteChat(id: string) {
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  }

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

    // Resolve target chat (create one on first message).
    let id = activeId;
    const base = chats.find((c) => c.id === id)?.messages ?? [];
    if (!id) {
      id = crypto.randomUUID();
      setChats((prev) => [{ id: id!, title: makeTitle(userMsg), messages: [], updatedAt: Date.now() }, ...prev]);
      setActiveId(id);
    }
    const targetId = id;
    const toSend = [...base, userMsg];

    setChats((prev) => prev.map((c) => c.id === targetId
      ? { ...c, messages: [...toSend, { role: "assistant", content: "" }], updatedAt: Date.now() }
      : c));
    setInput(""); setPending([]); setStreaming(true); adjust(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: toSend.map((m) => ({ role: m.role, content: m.content, images: m.images?.map((i) => ({ media_type: i.media_type, data: i.data })) })) }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        setChats((prev) => prev.map((c) => {
          if (c.id !== targetId) return c;
          const msgs = [...c.messages];
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: msgs[msgs.length - 1].content + chunk };
          return { ...c, messages: msgs, updatedAt: Date.now() };
        }));
      }
    } catch (e) {
      setChats((prev) => prev.map((c) => {
        if (c.id !== targetId) return c;
        const msgs = [...c.messages];
        msgs[msgs.length - 1] = { role: "assistant", content: `Error: ${String(e)}` };
        return { ...c, messages: msgs };
      }));
    } finally {
      setStreaming(false);
    }
  }

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
          <Button onClick={send} disabled={streaming || (!input.trim() && pending.length === 0)}
            className={cn("flex items-center gap-1 rounded-lg px-3 py-2", "bg-sky-600 text-white hover:bg-sky-500 disabled:bg-neutral-700 disabled:text-neutral-400")}>
            <ArrowUpIcon className="h-4 w-4" /><span className="sr-only">Send</span>
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-cover bg-center" style={{ backgroundImage: `url('${BG}')`, backgroundAttachment: "fixed" }}>
      {/* mobile backdrop */}
      {sidebarOpen && <div className="absolute inset-0 z-20 bg-black/60 sm:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="relative z-10 flex h-full">
        {/* Sidebar — dark blue, collapsible on every screen */}
        <aside className={cn(
          "absolute inset-y-0 left-0 z-30 w-64 overflow-hidden border-r border-blue-900/40 bg-[#0a1024]/95 backdrop-blur-xl transition-all duration-200 sm:static sm:translate-x-0",
          sidebarOpen ? "translate-x-0 sm:w-64" : "-translate-x-full sm:w-0 sm:border-r-0"
        )}>
          <div className="flex h-full w-64 flex-col p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 px-1 text-sm font-semibold text-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Prime Picks" className="h-6 w-6 rounded-md" /> Prime Picks
              </span>
              <button onClick={() => setSidebarOpen(false)} title="Collapse sidebar"
                className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-blue-500/10 hover:text-white">
                <PanelLeftClose className="h-5 w-5" />
              </button>
            </div>

            <button onClick={newChat}
              className="flex items-center justify-center gap-2 rounded-lg border border-blue-700/50 bg-blue-600/20 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600/30">
              <Plus className="h-4 w-4" /> New chat
            </button>

            <div className="mt-3 flex-1 space-y-1 overflow-y-auto">
              {chats.length === 0 && <p className="px-2 py-4 text-center text-xs text-zinc-500">No chats yet</p>}
              {chats.map((c) => (
                <div key={c.id} onClick={() => selectChat(c.id)}
                  className={cn("group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm",
                    c.id === activeId ? "bg-blue-600/25 text-white" : "text-zinc-300 hover:bg-blue-500/10")}>
                  <MessageSquare className="h-4 w-4 shrink-0 text-zinc-500" />
                  <span className="flex-1 truncate">{c.title}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteChat(c.id); }}
                    className="text-zinc-500 opacity-0 transition hover:text-red-400 group-hover:opacity-100" title="Delete chat">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-2 space-y-1 border-t border-blue-900/40 pt-2">
              {isAdmin && (
                <Link href="/admin" className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-amber-300 transition-colors hover:bg-amber-500/10">
                  <ShieldCheck className="h-4 w-4" /> Admin
                </Link>
              )}
              <Link href="/settings" className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-zinc-300 transition-colors hover:bg-blue-500/10 hover:text-white">
                <Settings className="h-4 w-4" /> Settings
              </Link>
              <LogoutButton className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-zinc-300 transition-colors hover:bg-blue-500/10 hover:text-white">
                <LogOut className="h-4 w-4" /> Log out
              </LogoutButton>
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex h-full min-w-0 flex-1 flex-col items-center">
          <header className="z-10 w-full">
            <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                {!sidebarOpen && (
                  <button onClick={() => setSidebarOpen(true)} className="text-neutral-300 hover:text-white" title="Open sidebar">
                    <PanelLeft className="h-5 w-5" />
                  </button>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Prime Picks" className="h-7 w-7 rounded-md" />
                <span className="font-display text-lg font-semibold text-white drop-shadow">Prime Picks</span>
              </div>
              <a href="/card" className="text-xs text-neutral-300 hover:text-white">Today&rsquo;s card →</a>
            </div>
          </header>

          {empty ? (
            <motion.div variants={stagger} initial="hidden" animate="show"
              className="z-10 flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 pb-[16vh]">
              <div className="relative flex flex-col items-center text-center">
                <div className="hero-glow pointer-events-none absolute -top-10 h-48 w-[28rem] max-w-[90vw] rounded-full bg-indigo-500/25 blur-3xl" />
                {/* fades in once (via fadeUp); inner layer floats gently in a loop */}
                <motion.div variants={fadeUp} className="relative mb-5">
                  <div className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-indigo-500/25 blur-2xl" />
                  <motion.div
                    animate={{ y: [0, -6, 0, 6, 0], rotate: [0, 2, 0, -2, 0] }}
                    transition={{ duration: 6, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                    className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo-full.png" alt="Prime Picks" className="h-24 w-24 rounded-2xl shadow-2xl ring-1 ring-white/10" />
                  </motion.div>
                </motion.div>
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
                      <><span className="h-2 w-2 rounded-full bg-neutral-500" /> No live slate · drop a screenshot to analyze</>
                    )}
                  </span>
                </motion.div>
                <motion.h1 variants={fadeUp} className="font-display mt-5 text-4xl font-bold tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)] sm:text-5xl">
                  Welcome back, {username}
                </motion.h1>
                <motion.p variants={fadeUp} className="mt-3 max-w-md text-pretty text-neutral-300">
                  Upload your picks and I&rsquo;ll tell you which ones to bet, which to skip, and why.
                </motion.p>
              </div>
              <motion.div variants={fadeUp} className="mt-9 w-full">{InputBox}</motion.div>
              <motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {QUICK.map((q) => (
                  <motion.button key={q.label} whileHover={{ y: -2, scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { setInput(q.text); if (q.upload) fileRef.current?.click(); }}
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
                      {m.role === "user" ? (
                        <div className="max-w-[85%] rounded-2xl bg-sky-600/30 px-4 py-2.5 ring-1 ring-inset ring-sky-400/30 backdrop-blur-md">
                          {m.images?.length ? (
                            <div className="mb-2 flex flex-wrap gap-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {m.images.map((img, j) => <img key={j} src={img.preview} alt="upload" className="max-h-44 rounded-lg ring-1 ring-white/15" />)}
                            </div>
                          ) : null}
                          <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">{m.content}</div>
                        </div>
                      ) : !m.content ? (
                        <div className="rounded-2xl bg-black/55 px-4 py-2.5 text-sm text-zinc-400 ring-1 ring-inset ring-white/10 backdrop-blur-md">{streaming && i === messages.length - 1 ? "…" : ""}</div>
                      ) : (() => {
                        const { text, card, pending } = extractCard(m.content);
                        return (
                          <div className="flex max-w-[85%] flex-col gap-2">
                            {text && <div className="rounded-2xl bg-black/55 px-4 py-2.5 ring-1 ring-inset ring-white/10 backdrop-blur-md"><Markdown>{text}</Markdown></div>}
                            {pending && <div className="px-1 text-xs text-zinc-500">Building recommendation card…</div>}
                            {card && <PicksCard card={card} />}
                          </div>
                        );
                      })()}
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
      </div>
    </div>
  );
}

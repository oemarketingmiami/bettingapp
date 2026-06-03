"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M21.9999 12.24C21.9999 11.4933 21.9333 10.76 21.8066 10.0533H12.3333V14.16H17.9533C17.7333 15.3467 17.0133 16.3733 15.9666 17.08V19.68H19.5266C21.1933 18.16 21.9999 15.4533 21.9999 12.24Z" fill="#4285F4" />
      <path d="M12.3333 22C15.2333 22 17.6866 21.0533 19.5266 19.68L15.9666 17.08C15.0199 17.7333 13.7933 18.16 12.3333 18.16C9.52659 18.16 7.14659 16.28 6.27992 13.84H2.59326V16.5133C4.38659 20.0267 8.05992 22 12.3333 22Z" fill="#34A853" />
      <path d="M6.2799 13.84C6.07324 13.2267 5.9599 12.58 5.9599 11.92C5.9599 11.26 6.07324 10.6133 6.2799 10L2.59326 7.32667C1.86659 8.78667 1.45326 10.32 1.45326 11.92C1.45326 13.52 1.86659 15.0533 2.59326 16.5133L6.2799 13.84Z" fill="#FBBC05" />
      <path d="M12.3333 5.68C13.8933 5.68 15.3133 6.22667 16.3866 7.24L19.6 4.02667C17.68 2.29333 15.2266 1.33333 12.3333 1.33333C8.05992 1.33333 4.38659 3.97333 2.59326 7.32667L6.27992 10C7.14659 7.56 9.52659 5.68 12.3333 5.68Z" fill="#EA4335" />
    </svg>
  );
}

const TABS = [
  { label: "How it works", href: "#how" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Pricing", href: "#pricing" },
];

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Open the sign-in modal when redirected here by the auth middleware.
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("signin")) setAuthOpen(true);
  }, []);

  const redirectTo = () => `${window.location.origin}/auth/callback?next=/app`;

  async function google() {
    setErr(""); setLoading(true);
    const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
    if (error) { setErr(error.message); setLoading(false); }
  }
  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setErr(""); setLoading(true);
    const { error } = await createClient().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo() } });
    setLoading(false);
    if (error) setErr(error.message); else setSent(true);
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Prime Picks" className="h-8 w-8 rounded-lg" />
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">Prime Picks</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {TABS.map((t) => (
              <a key={t.href} href={t.href} className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">{t.label}</a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <button onClick={() => setAuthOpen(true)} className="text-sm font-medium text-slate-700 transition-colors hover:text-slate-900">Sign in</button>
            <button onClick={() => setAuthOpen(true)} className="rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-[0_8px_24px_-8px_rgba(37,99,235,0.6)]">Get started</button>
          </div>

          <button onClick={() => setMenuOpen((v) => !v)} className="text-slate-700 md:hidden" aria-label="Menu">
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {TABS.map((t) => (
                <a key={t.href} href={t.href} onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">{t.label}</a>
              ))}
              <button onClick={() => { setMenuOpen(false); setAuthOpen(true); }} className="mt-2 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">Get started</button>
            </nav>
          </div>
        )}
      </header>

      {authOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={() => setAuthOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Prime Picks" className="mx-auto h-14 w-14 rounded-2xl" />
              <h2 className="mt-3 font-display text-xl font-bold text-slate-900">Welcome to Prime Picks</h2>
              <p className="mt-1 text-sm text-slate-500">Sign in to access your analyst.</p>
            </div>

            {sent ? (
              <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-center text-sm text-emerald-700 ring-1 ring-emerald-200">
                Check <span className="font-medium">{email}</span> for a magic sign-in link.
              </div>
            ) : (
              <>
                <button onClick={google} disabled={loading}
                  className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50">
                  <GoogleMark className="h-5 w-5" /> Continue with Google
                </button>

                <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" />
                </div>

                <form onSubmit={magicLink} className="space-y-2">
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                  <button type="submit" disabled={loading}
                    className="h-11 w-full rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-semibold text-white disabled:opacity-50">
                    {loading ? "Sending…" : "Email me a magic link"}
                  </button>
                </form>
                {err && <p className="mt-2 text-center text-xs text-red-500">{err}</p>}
              </>
            )}

            <button onClick={() => setAuthOpen(false)} className="mt-4 w-full text-center text-xs text-slate-400 hover:text-slate-600">Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}

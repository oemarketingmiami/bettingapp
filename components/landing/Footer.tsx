import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Prime Picks" className="h-8 w-8 rounded-lg" />
            <span className="font-display text-lg font-bold text-slate-900">Prime Picks</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
            <a href="#how" className="hover:text-slate-900">How it works</a>
            <a href="#testimonials" className="hover:text-slate-900">Testimonials</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
            <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-900">Terms</Link>
          </nav>
        </div>
        <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Prime Picks. For entertainment and informational purposes only. Not financial advice. 21+. If you or someone you know has a gambling problem, call 1-800-GAMBLER.</p>
        </div>
      </div>
    </footer>
  );
}

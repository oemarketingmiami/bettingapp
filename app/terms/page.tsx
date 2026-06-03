import Link from "next/link";

export const metadata = { title: "Terms of Service — Prime Picks" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white [color-scheme:light]">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm text-blue-600 hover:underline">← Back to home</Link>
        <h1 className="mt-6 font-display text-4xl font-bold text-slate-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="mt-8 space-y-6 text-slate-700 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_p]:mt-2 [&_p]:leading-relaxed">
          <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
            Template only — review with a lawyer before launch.
          </p>

          <section><h2>Acceptance</h2><p>By using Prime Picks you agree to these terms. If you do not agree, do not use the service.</p></section>
          <section><h2>Not financial or betting advice</h2><p>Prime Picks is for entertainment and informational purposes only. Outputs are probabilistic estimates, not guarantees. You are solely responsible for any wagers you place. Past performance does not predict future results.</p></section>
          <section><h2>Eligibility</h2><p>You must be of legal age to bet in your jurisdiction (21+ where applicable) and responsible for complying with local laws.</p></section>
          <section><h2>Responsible gaming</h2><p>Bet within your means. If gambling stops being fun, get help: 1-800-GAMBLER.</p></section>
          <section><h2>Accounts</h2><p>Keep your login secure. You are responsible for activity under your account.</p></section>
          <section><h2>Subscriptions</h2><p>Paid plans (when available) bill through Stripe. You can cancel anytime; access continues through the paid period.</p></section>
          <section><h2>Limitation of liability</h2><p>The service is provided &ldquo;as is.&rdquo; To the maximum extent permitted by law, we are not liable for losses arising from use of the service.</p></section>
          <section><h2>Changes</h2><p>We may update these terms; continued use means you accept the changes.</p></section>
        </div>
      </main>
    </div>
  );
}

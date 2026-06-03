import Link from "next/link";

export const metadata = { title: "Privacy Policy — Prime Picks" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white [color-scheme:light]">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm text-blue-600 hover:underline">← Back to home</Link>
        <h1 className="mt-6 font-display text-4xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="mt-8 space-y-6 text-slate-700 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_p]:mt-2 [&_p]:leading-relaxed">
          <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
            Template only — review with a lawyer before launch.
          </p>

          <section><h2>Overview</h2><p>Prime Picks (&ldquo;we&rdquo;) provides AI-assisted sports analytics for personal use. This policy explains what we collect and how we use it.</p></section>
          <section><h2>Information we collect</h2><p>Account details (email when you sign in), the messages and screenshots you send to the analyst, and basic usage data. Screenshots you upload are processed to generate analysis and are not sold.</p></section>
          <section><h2>How we use it</h2><p>To operate the service, generate picks and analysis, improve the product, and communicate with you. We do not sell your personal information.</p></section>
          <section><h2>Third parties</h2><p>We use service providers for hosting, the AI model, sports data, and (later) payments. They process data only to provide their service.</p></section>
          <section><h2>Data retention</h2><p>We keep your data while your account is active. You can request deletion at any time.</p></section>
          <section><h2>Your choices</h2><p>You may access, correct, or delete your data by contacting us.</p></section>
          <section><h2>Contact</h2><p>Questions? Reach out via the email associated with your account.</p></section>
        </div>
      </main>
    </div>
  );
}

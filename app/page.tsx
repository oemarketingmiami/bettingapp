import { adminDb } from "@/lib/db";
import { Chat } from "@/components/Chat";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const nowIso = new Date(Date.now() - 6 * 3600_000).toISOString();
    const { count, error } = await adminDb()
      .from("games")
      .select("id", { count: "exact", head: true })
      .gte("commence_time", nowIso);
    if (error) throw new Error("Supabase query failed: " + error.message);
    return <Chat slateCount={count ?? 0} />;
  } catch (e) {
    return <SetupError message={e instanceof Error ? e.message : String(e)} />;
  }
}

// Diagnostic fallback so a misconfigured deploy shows the cause instead of a
// blank 500. Reports only whether each var is PRESENT — never its value.
function SetupError({ message }: { message: string }) {
  const present = (k: string) => (process.env[k] && process.env[k]!.length > 0 ? "✓ set" : "✗ MISSING");
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="font-display text-2xl font-bold text-white">Setup needed</h1>
      <p className="mt-2 text-zinc-400">
        The app loaded but couldn&rsquo;t reach its data. Usually a missing Vercel environment
        variable — add it under Settings → Environment Variables (Production), then redeploy.
      </p>
      <div className="mt-6 rounded-lg bg-white/5 p-4 text-sm ring-1 ring-white/10">
        <div className="font-medium text-zinc-300">Environment variables</div>
        <ul className="mt-2 space-y-1 font-mono text-zinc-200">
          <li>SUPABASE_URL: {present("SUPABASE_URL")}</li>
          <li>SUPABASE_SERVICE_ROLE_KEY: {present("SUPABASE_SERVICE_ROLE_KEY")}</li>
          <li>ANTHROPIC_API_KEY: {present("ANTHROPIC_API_KEY")}</li>
        </ul>
      </div>
      <p className="mt-4 break-words text-xs text-zinc-500">Detail: {message}</p>
    </main>
  );
}

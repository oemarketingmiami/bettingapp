import { adminDb } from "@/lib/db";
import { Chat } from "@/components/Chat";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Lightweight greeting reflecting whether a live slate is loaded.
  const nowIso = new Date(Date.now() - 6 * 3600_000).toISOString();
  const { count } = await adminDb()
    .from("games")
    .select("id", { count: "exact", head: true })
    .gte("commence_time", nowIso);

  return <Chat slateCount={count ?? 0} />;
}

"use client";

import { useState } from "react";
import { Plus, X, ShieldCheck } from "lucide-react";

interface AdminRow { email: string; added_by?: string | null }

export function AdminManager({ initial, superAdmins }: { initial: AdminRow[]; superAdmins: string[] }) {
  const [list, setList] = useState<AdminRow[]>(initial);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    if (!v) return;
    setLoading(true); setErr("");
    const res = await fetch("/api/admin/admins", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: v }) });
    setLoading(false);
    if (!res.ok) { setErr((await res.json()).error || "failed"); return; }
    if (!list.some((a) => a.email === v)) setList([...list, { email: v, added_by: "you" }]);
    setEmail("");
  }

  async function remove(target: string) {
    setList(list.filter((a) => a.email !== target));
    await fetch("/api/admin/admins", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: target }) });
  }

  return (
    <div>
      <ul className="space-y-2">
        {list.map((a) => {
          const sup = superAdmins.includes(a.email);
          return (
            <li key={a.email} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 ring-1 ring-inset ring-white/10">
              <span className="flex items-center gap-2 text-sm text-zinc-200">
                <ShieldCheck className={`h-4 w-4 ${sup ? "text-amber-400" : "text-blue-400"}`} />
                {a.email}
                {sup && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">SUPER</span>}
              </span>
              {!sup && (
                <button onClick={() => remove(a.email)} className="text-zinc-500 hover:text-red-400" title="Remove admin">
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <form onSubmit={add} className="mt-3 flex gap-2">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="new-admin@email.com"
          className="h-10 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-zinc-100 outline-none focus:border-blue-500/50" />
        <button type="submit" disabled={loading}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
          <Plus className="h-4 w-4" /> Add
        </button>
      </form>
      {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
    </div>
  );
}

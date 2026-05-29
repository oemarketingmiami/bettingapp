import type { PayoutRow } from "@/lib/types";

const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function PayoutTable({ rows }: { rows: PayoutRow[] }) {
  if (!rows?.length) return null;
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-inset ring-white/10">
      <table className="w-full text-sm">
        <thead className="bg-white/[0.03] text-zinc-400">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Stake</th>
            <th className="px-4 py-2 text-right font-medium">To win</th>
            <th className="px-4 py-2 text-right font-medium">Total return</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((r) => (
            <tr key={r.stake}>
              <td className="px-4 py-2 font-medium text-zinc-200">{money(r.stake)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-emerald-300">{money(r.to_win)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-zinc-200">{money(r.total_return)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

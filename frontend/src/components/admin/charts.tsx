/*!
  GymHolic Admin Charts — dependency-free SVG bar charts for revenue/analytics.
*/

export function BarChart({
  data,
  valueFormat = (v: number) => String(v),
  height = 180,
}: {
  data: { label: string; value: number }[];
  valueFormat?: (v: number) => string;
  height?: number;
}) {
  if (data.length === 0) {
    return <p className="text-neutral-500 text-sm py-8 text-center">No data yet.</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2 overflow-x-auto pb-2" style={{ height }}>
      {data.map((d) => {
        const barHeight = Math.max((d.value / max) * (height - 40), d.value > 0 ? 4 : 1);
        return (
          <div key={d.label} className="flex flex-col items-center gap-1 min-w-[36px] flex-1">
            <span className="text-[10px] text-neutral-400 whitespace-nowrap">
              {d.value > 0 ? valueFormat(d.value) : ""}
            </span>
            <div
              className="w-full rounded-t bg-emerald-500/70 hover:bg-emerald-400 transition-colors"
              style={{ height: barHeight }}
              title={`${d.label}: ${valueFormat(d.value)}`}
            />
            <span className="text-[10px] text-neutral-500 whitespace-nowrap">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function StatusBreakdown({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts);
  if (entries.length === 0) {
    return <p className="text-neutral-500 text-sm py-8 text-center">No bookings yet.</p>;
  }
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  const colors: Record<string, string> = {
    PENDING: "bg-amber-500",
    CONFIRMED: "bg-emerald-500",
    COMPLETED: "bg-blue-500",
    CANCELLED: "bg-red-500",
    NO_SHOW: "bg-neutral-500",
  };
  return (
    <div className="space-y-3">
      {entries.map(([status, count]) => (
        <div key={status} className="flex items-center gap-3">
          <span className="text-xs text-neutral-400 w-24">{status}</span>
          <div className="flex-1 h-2.5 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${colors[status] ?? "bg-neutral-500"}`}
              style={{ width: `${total ? (count / total) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-neutral-300 w-16 text-right">
            {count} ({total ? Math.round((count / total) * 100) : 0}%)
          </span>
        </div>
      ))}
    </div>
  );
}

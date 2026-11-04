import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import { groupBy, inr, safeDiv, units as fmtUnits, type TxRecord } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { Panel, axisTick, tooltipStyle } from "../shared";
import type { Master } from "../IndiaMap";

const REGIONS = ["North", "South", "East", "West"];
const STATUS_STYLE: Record<string, string> = {
  Optimal: "bg-revenue/15 text-revenue",
  "Near Capacity": "bg-alert/20 text-alert",
  Maintenance: "bg-destructive/15 text-destructive",
};

export function Plants({ rows, master }: { rows: TxRecord[]; master: Master | undefined }) {
  const monthsInView = new Set(rows.map((r) => r.month)).size || 12;
  const byPlant = useMemo(() => groupBy(rows, (r) => r.plant), [rows]);
  const chart = byPlant.map((g) => ({
    plant: g.key,
    sales: +(g.sales / 1e7).toFixed(2),
    units: +(g.units / 1e6).toFixed(2),
  }));

  const matrix = useMemo(() => {
    const m = new Map<string, number>();
    let max = 0;
    for (const r of rows) {
      const k = `${r.plant}|${r.region}`;
      const v = (m.get(k) ?? 0) + r.units;
      m.set(k, v);
      if (v > max) max = v;
    }
    return { m, max };
  }, [rows]);

  return (
    <div className="grid gap-4">
      <Panel title="Plant output" subtitle="Revenue (₹ Cr) and dispatched units (M) by facility">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="plant" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="l"
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                unit=" Cr"
                width={60}
              />
              <YAxis
                yAxisId="r"
                orientation="right"
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                unit="M"
                width={44}
              />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                yAxisId="l"
                dataKey="sales"
                name="Revenue (₹ Cr)"
                fill="var(--ops)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="r"
                dataKey="units"
                name="Units (M)"
                fill="var(--revenue)"
                radius={[4, 4, 0, 0]}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel
        title="Capacity utilisation"
        subtitle="Dispatched units vs annual capacity, pro-rated to the months in view"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(master?.plants ?? []).map((p) => {
            const used = byPlant.find((g) => g.key === p.name)?.units ?? 0;
            const util = Math.min(100, safeDiv(used, (p.capacity * monthsInView) / 12) * 100);
            return (
              <div key={p.name} className="rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">{p.name}</p>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold",
                      STATUS_STYLE[p.status] ?? "bg-muted",
                    )}
                  >
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{p.state}</p>
                <p className="num mt-3 text-2xl font-extrabold">{util.toFixed(0)}%</p>
                <Progress value={util} className="mt-1 h-2" />
                <p className="num mt-2 text-[11px] text-muted-foreground">
                  {fmtUnits(used)} of {fmtUnits(p.capacity)} capacity
                </p>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel
        title="Plant → distributor-region flow matrix"
        subtitle="Units dispatched; darker = higher volume"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="p-2 text-left font-semibold text-muted-foreground">Plant</th>
                {REGIONS.map((r) => (
                  <th key={r} className="p-2 text-right font-semibold text-muted-foreground">
                    {r}
                  </th>
                ))}
                <th className="p-2 text-right font-semibold text-muted-foreground">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {byPlant.map((g) => (
                <tr key={g.key} className="border-t">
                  <td className="p-2 font-semibold">{g.key}</td>
                  {REGIONS.map((reg) => {
                    const v = matrix.m.get(`${g.key}|${reg}`) ?? 0;
                    const a = matrix.max ? v / matrix.max : 0;
                    return (
                      <td
                        key={reg}
                        className="num p-2 text-right"
                        style={{
                          background: `color-mix(in oklab, var(--ops) ${Math.round(a * 70)}%, transparent)`,
                        }}
                      >
                        {v ? fmtUnits(v) : "–"}
                      </td>
                    );
                  })}
                  <td className="num p-2 text-right">{inr(g.sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

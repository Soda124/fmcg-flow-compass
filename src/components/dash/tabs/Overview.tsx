import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import {
  MONTHS,
  groupBy,
  inr,
  perUnit,
  safeDiv,
  units as fmtUnits,
  type Filters,
  type TxRecord,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { PALETTE, Panel, axisTick, tooltipStyle } from "../shared";
import { toggleIn } from "../table-utils";
import type { Master } from "../IndiaMap";

type Props = {
  rows: TxRecord[];
  master: Master | undefined;
  filters: Filters;
  setFilters: (f: Filters) => void;
};

export function Overview({ rows, master, filters, setFilters }: Props) {
  const monthly = useMemo(() => {
    const g = new Map(groupBy(rows, (r) => r.month).map((x) => [x.key, x]));
    return MONTHS.map((m) => ({
      month: m.slice(0, 3),
      sales: +((g.get(m)?.sales ?? 0) / 1e7).toFixed(2),
      units: +((g.get(m)?.units ?? 0) / 1e6).toFixed(2),
    }));
  }, [rows]);
  const categories = useMemo(() => groupBy(rows, (r) => r.category), [rows]);
  const totalSales = categories.reduce((s, c) => s + c.sales, 0);
  const brands = useMemo(() => groupBy(rows, (r) => r.brand).slice(0, 5), [rows]);
  const monthsInView = new Set(rows.map((r) => r.month)).size || 12;

  const plants = useMemo(() => {
    const g = new Map(groupBy(rows, (r) => r.plant).map((x) => [x.key, x]));
    return (master?.plants ?? []).map((p) => {
      const used = g.get(p.name)?.units ?? 0;
      const cap = (p.capacity * monthsInView) / 12;
      return { ...p, util: Math.min(100, safeDiv(used, cap) * 100) };
    });
  }, [rows, master, monthsInView]);

  const velocity = useMemo(() => {
    if (!master) return 0;
    const lead = new Map(master.distributors.map((d) => [d.name, d.leadDays]));
    let w = 0,
      u = 0;
    for (const r of rows) {
      w += (lead.get(r.distributor) ?? 0) * r.units;
      u += r.units;
    }
    return safeDiv(w, u);
  }, [rows, master]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel
        title="Monthly dispatch trajectory"
        subtitle="Revenue (₹ Cr) vs dispatched units (M), April–March"
        className="lg:col-span-2"
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} />
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
                fill="var(--revenue)"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="r"
                dataKey="units"
                name="Units (M)"
                stroke="var(--ops)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Category breakdown" subtitle="Click a slice to filter">
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categories}
                dataKey="sales"
                nameKey="key"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                onClick={(d: { key?: string }) =>
                  d.key && setFilters({ ...filters, category: toggleIn(filters.category, d.key) })
                }
                className="cursor-pointer"
              >
                {categories.map((c, i) => (
                  <Cell
                    key={c.key}
                    fill={PALETTE[i % PALETTE.length]}
                    opacity={
                      filters.category.length && !filters.category.includes(c.key) ? 0.35 : 1
                    }
                  />
                ))}
              </Pie>
              <Tooltip
                {...tooltipStyle}
                formatter={(v: number, _n, p) => [
                  `${inr(v)} · ${(safeDiv(v, totalSales) * 100).toFixed(1)}% · ${perUnit((p.payload as { realization: number }).realization)}`,
                  p.payload.key,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-2 space-y-1.5">
          {categories.map((c, i) => (
            <li key={c.key} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: PALETTE[i % PALETTE.length] }}
                />
                {c.key}
              </span>
              <span className="num text-muted-foreground">
                {(safeDiv(c.sales, totalSales) * 100).toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Top 5 brands" subtitle="Click to filter by brand">
        <ol className="space-y-2">
          {brands.map((b, i) => {
            const on = filters.brand.includes(b.key);
            return (
              <li key={b.key}>
                <button
                  onClick={() => setFilters({ ...filters, brand: toggleIn(filters.brand, b.key) })}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-accent",
                    on && "border-brand bg-brand/10",
                  )}
                >
                  <span className="num w-5 text-xs text-muted-foreground">{i + 1}</span>
                  <span className="flex-1 truncate text-sm font-semibold">{b.key}</span>
                  <span className="num text-xs">{inr(b.sales)}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </Panel>

      <Panel
        title="Operational health"
        subtitle={`Plant capacity utilisation · order fulfilment velocity ${velocity ? velocity.toFixed(1) : "–"} days (volume-weighted lead time)`}
        className="lg:col-span-2"
      >
        <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {plants.map((p) => (
            <div key={p.name}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-semibold">{p.name}</span>
                <span className="num text-muted-foreground">
                  {p.util.toFixed(0)}% · {fmtUnits(p.capacity)} cap
                </span>
              </div>
              <Progress
                value={p.util}
                className={cn(
                  "h-2",
                  p.status === "Maintenance" && "[&>div]:bg-alert",
                  p.status === "Near Capacity" && "[&>div]:bg-ops",
                  p.status === "Optimal" && "[&>div]:bg-revenue",
                )}
              />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

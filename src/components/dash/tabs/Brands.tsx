import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import {
  groupBy,
  inr,
  intIN,
  perUnit,
  safeDiv,
  units as fmtUnits,
  type TxRecord,
} from "@/lib/analytics";
import { Panel, axisTick, tooltipStyle } from "../shared";
import { SortHead, useSort } from "../table-utils";

const QUADRANT = {
  "Star Performers": "var(--revenue)",
  "Margin Diluters": "var(--destructive)",
  "Niche High-Margin": "var(--brand)",
  "Low-Velocity": "var(--muted-foreground)",
} as const;

export function Brands({ rows }: { rows: TxRecord[] }) {
  const [bq, setBq] = useState("");
  const [sq, setSq] = useState("");

  const brandRows = useMemo(() => {
    const cat = new Map(rows.map((r) => [r.brand, r.category]));
    const total = rows.reduce((s, r) => s + r.sales, 0);
    return groupBy(rows, (r) => r.brand).map((g) => ({
      brand: g.key,
      category: cat.get(g.key) ?? "",
      units: g.units,
      sales: g.sales,
      realization: g.realization,
      share: safeDiv(g.sales, total) * 100,
    }));
  }, [rows]);

  const avgUnits = safeDiv(
    brandRows.reduce((s, b) => s + b.units, 0),
    brandRows.length,
  );
  const avgReal = safeDiv(
    brandRows.reduce((s, b) => s + b.sales, 0),
    brandRows.reduce((s, b) => s + b.units, 0),
  );
  const scatter = brandRows.map((b) => ({
    ...b,
    quadrant: (b.units >= avgUnits
      ? b.realization >= avgReal
        ? "Star Performers"
        : "Margin Diluters"
      : b.realization >= avgReal
        ? "Niche High-Margin"
        : "Low-Velocity") as keyof typeof QUADRANT,
  }));

  const brandFiltered = brandRows.filter((b) =>
    `${b.brand} ${b.category}`.toLowerCase().includes(bq.toLowerCase()),
  );
  const bSort = useSort(brandFiltered, "sales");

  const skuRows = useMemo(() => {
    const meta = new Map<string, { name: string; brand: string; tier: string }>();
    for (const r of rows)
      if (!meta.has(r.skuCode))
        meta.set(r.skuCode, { name: r.skuName, brand: r.brand, tier: r.tier });
    return groupBy(rows, (r) => r.skuCode).map((g) => ({
      sku: g.key,
      name: meta.get(g.key)?.name ?? "",
      brand: meta.get(g.key)?.brand ?? "",
      tier: meta.get(g.key)?.tier ?? "",
      units: g.units,
    }));
  }, [rows]);
  const skuFiltered = skuRows.filter((s) =>
    `${s.sku} ${s.name} ${s.brand} ${s.tier}`.toLowerCase().includes(sq.toLowerCase()),
  );
  const sSort = useSort(skuFiltered, "units");

  return (
    <div className="grid gap-4">
      <Panel
        title="High-volume / low-realisation matrix"
        subtitle="Units dispatched vs ₹/unit; crosshairs at the brand average"
      >
        <div className="mb-3 flex flex-wrap gap-3 text-xs">
          {Object.entries(QUADRANT).map(([k, c]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
              {k}
            </span>
          ))}
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ left: 8, right: 16, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                type="number"
                dataKey="units"
                name="Units"
                tick={axisTick}
                tickFormatter={fmtUnits}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="number"
                dataKey="realization"
                name="Realisation"
                tick={axisTick}
                tickFormatter={(v: number) => `₹${v.toFixed(0)}`}
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
                width={56}
              />
              <ZAxis range={[90, 90]} />
              <ReferenceLine x={avgUnits} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
              <ReferenceLine y={avgReal} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
              <Tooltip
                {...tooltipStyle}
                cursor={{ strokeDasharray: "3 3" }}
                content={({ payload }) => {
                  const p = payload?.[0]?.payload as (typeof scatter)[number] | undefined;
                  if (!p) return null;
                  return (
                    <div className="rounded-lg border bg-popover p-2 text-xs shadow">
                      <p className="font-bold">{p.brand}</p>
                      <p className="text-muted-foreground">{p.quadrant}</p>
                      <p className="num">
                        {fmtUnits(p.units)} units · {perUnit(p.realization)}
                      </p>
                    </div>
                  );
                }}
              />
              <Scatter data={scatter}>
                {scatter.map((s) => (
                  <Cell key={s.brand} fill={QUADRANT[s.quadrant]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel
        title="Brand performance matrix"
        action={
          <Input
            value={bq}
            onChange={(e) => setBq(e.target.value)}
            placeholder="Search brand…"
            className="h-8 w-44 text-xs"
          />
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead label="Brand" k="brand" sort={bSort} />
                <SortHead label="Category" k="category" sort={bSort} />
                <SortHead label="Units" k="units" sort={bSort} align="right" />
                <SortHead label="Gross sales" k="sales" sort={bSort} align="right" />
                <SortHead label="₹/unit" k="realization" sort={bSort} align="right" />
                <SortHead label="Revenue share" k="share" sort={bSort} align="right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {bSort.sorted.map((b) => (
                <TableRow key={b.brand}>
                  <TableCell className="font-semibold">{b.brand}</TableCell>
                  <TableCell className="text-muted-foreground">{b.category}</TableCell>
                  <TableCell className="num text-right">{fmtUnits(b.units)}</TableCell>
                  <TableCell className="num text-right">{inr(b.sales)}</TableCell>
                  <TableCell className="num text-right">{perUnit(b.realization)}</TableCell>
                  <TableCell className="num text-right">{b.share.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>

      <Panel
        title="SKU catalogue explorer"
        subtitle={`${intIN(skuFiltered.length)} SKUs${skuFiltered.length > 50 ? " · showing top 50" : ""}`}
        action={
          <Input
            value={sq}
            onChange={(e) => setSq(e.target.value)}
            placeholder="Search SKU, brand, pack…"
            className="h-8 w-52 text-xs"
          />
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead label="SKU code" k="sku" sort={sSort} />
                <SortHead label="Description" k="name" sort={sSort} />
                <SortHead label="Brand" k="brand" sort={sSort} />
                <SortHead label="Pack tier" k="tier" sort={sSort} />
                <SortHead label="Units" k="units" sort={sSort} align="right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sSort.sorted.slice(0, 50).map((s) => (
                <TableRow key={s.sku}>
                  <TableCell className="num">{s.sku}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.brand}</TableCell>
                  <TableCell className="text-muted-foreground">{s.tier}</TableCell>
                  <TableCell className="num text-right">{intIN(s.units)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </div>
  );
}

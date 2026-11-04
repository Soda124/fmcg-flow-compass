import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { groupBy, inr, safeDiv, units as fmtUnits, type TxRecord } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { Panel, tooltipStyle } from "../shared";
import { SortHead, useSort } from "../table-utils";
import type { Master } from "../IndiaMap";

const TIER_STYLE: Record<string, string> = {
  Platinum: "bg-brand/15 text-brand",
  Gold: "bg-alert/20 text-alert",
  Silver: "bg-muted text-muted-foreground",
};
const RISK: Record<string, { label: string; cls: string }> = {
  Platinum: { label: "Low", cls: "text-revenue" },
  Gold: { label: "Moderate", cls: "text-alert" },
  Silver: { label: "Elevated", cls: "text-destructive" },
};

export function Distributors({ rows, master }: { rows: TxRecord[]; master: Master | undefined }) {
  const table = useMemo(() => {
    const meta = new Map((master?.distributors ?? []).map((d) => [d.name, d]));
    const total = rows.reduce((s, r) => s + r.sales, 0);
    return groupBy(rows, (r) => r.distributor).map((g) => {
      const m = meta.get(g.key);
      return {
        distributor: g.key,
        region: m?.region ?? rows.find((r) => r.distributor === g.key)?.region ?? "",
        tier: m?.creditTier ?? "",
        leadDays: m?.leadDays ?? 0,
        sales: g.sales,
        units: g.units,
        share: safeDiv(g.sales, total) * 100,
      };
    });
  }, [rows, master]);
  const sort = useSort(table, "sales");

  const radar = useMemo(() => {
    const ts = rows.reduce((s, r) => s + r.sales, 0),
      tu = rows.reduce((s, r) => s + r.units, 0);
    return groupBy(rows, (r) => r.region).map((g) => ({
      region: g.key,
      sales: +(safeDiv(g.sales, ts) * 100).toFixed(1),
      units: +(safeDiv(g.units, tu) * 100).toFixed(1),
    }));
  }, [rows]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel
        title="Distributor leaderboard"
        subtitle={`${table.length} distributors · click headers to sort`}
        className="lg:col-span-2"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead label="Distributor" k="distributor" sort={sort} />
                <SortHead label="Region" k="region" sort={sort} />
                <SortHead label="Credit tier" k="tier" sort={sort} />
                <SortHead label="Gross sales" k="sales" sort={sort} align="right" />
                <SortHead label="Units" k="units" sort={sort} align="right" />
                <SortHead label="Lead (days)" k="leadDays" sort={sort} align="right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sort.sorted.map((d) => {
                const risk = RISK[d.tier];
                return (
                  <TableRow key={d.distributor}>
                    <TableCell className="font-semibold">{d.distributor}</TableCell>
                    <TableCell className="text-muted-foreground">{d.region}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          TIER_STYLE[d.tier] ?? "bg-muted",
                        )}
                      >
                        {d.tier || "–"}
                      </span>
                      {risk && (
                        <span className={cn("ml-2 text-[11px] font-semibold", risk.cls)}>
                          {risk.label} risk
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="num text-right">{inr(d.sales)}</TableCell>
                    <TableCell className="num text-right">{fmtUnits(d.units)}</TableCell>
                    <TableCell
                      className={cn(
                        "num text-right",
                        d.leadDays >= 6 && "font-bold text-destructive",
                      )}
                    >
                      {d.leadDays || "–"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Panel>

      <Panel title="Regional market share" subtitle="Share of revenue vs share of volume (%)">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radar}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="region" tick={{ fontSize: 12, fill: "var(--foreground)" }} />
              <PolarRadiusAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Radar
                name="Sales %"
                dataKey="sales"
                stroke="var(--revenue)"
                fill="var(--revenue)"
                fillOpacity={0.35}
              />
              <Radar
                name="Units %"
                dataKey="units"
                stroke="var(--ops)"
                fill="var(--ops)"
                fillOpacity={0.25}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip {...tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Risk is inferred from credit tier (Platinum low, Gold moderate, Silver elevated); lead
          times of 6+ days are flagged.
        </p>
      </Panel>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { inr, intIN, units as fmtUnits, type TxRecord } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { Panel, exportCsv, exportXlsx } from "../shared";

export type DbStatus =
  | {
      connected: boolean;
      tables: Record<string, number>;
      totals: { sales_inr: number; units_sold: number; transaction_rows: number };
    }
  | undefined;

export function RawData({
  rows,
  all,
  status,
  source,
}: {
  rows: TxRecord[];
  all: TxRecord[];
  status: DbStatus;
  source: "db" | "upload";
}) {
  const [q, setQ] = useState("");
  const [size, setSize] = useState(25);
  const [page, setPage] = useState(0);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s
      ? rows.filter((r) =>
          `${r.skuCode} ${r.skuName} ${r.brand} ${r.plant} ${r.distributor}`
            .toLowerCase()
            .includes(s),
        )
      : rows;
  }, [rows, q]);
  useEffect(() => setPage(0), [q, size, rows]);
  const pages = Math.max(1, Math.ceil(shown.length / size));
  const slice = shown.slice(page * size, page * size + size);

  const loaded = useMemo(
    () =>
      all.reduce(
        (a, r) => ({
          sales: a.sales + r.sales,
          units: a.units + r.units,
          txRows: a.txRows + r.txRows,
        }),
        { sales: 0, units: 0, txRows: 0 },
      ),
    [all],
  );
  const checks = status?.connected
    ? [
        { label: "Records", db: status.tables["transactions"] ?? 0, app: all.length, fmt: intIN },
        {
          label: "Gross revenue",
          db: status.totals.sales_inr,
          app: loaded.sales,
          fmt: (v: number) => inr(v),
        },
        { label: "Units", db: status.totals.units_sold, app: loaded.units, fmt: fmtUnits },
        {
          label: "Dispatch rows",
          db: status.totals.transaction_rows,
          app: loaded.txRows,
          fmt: intIN,
        },
      ]
    : [];

  return (
    <div className="grid gap-4">
      <Panel
        title="Data integrity reconciliation"
        subtitle={
          source === "upload"
            ? "Custom upload is active — differences from the database are expected"
            : "Records loaded in the app vs PostgreSQL totals"
        }
      >
        {checks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Database status unavailable — cannot reconcile.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {checks.map((c) => {
              const ok = c.db === c.app;
              return (
                <div key={c.label} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    {c.label}
                    {ok ? (
                      <CheckCircle2 className="h-4 w-4 text-revenue" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <p className="num mt-2 text-lg font-extrabold">{c.fmt(c.app)}</p>
                  <p className="num text-[11px] text-muted-foreground">DB: {c.fmt(c.db)}</p>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel
        title="Audit trail"
        subtitle={`${intIN(shown.length)} of ${intIN(all.length)} records`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search SKU, brand, plant, distributor…"
              className="h-8 w-64 text-xs"
            />
            <Button size="sm" variant="outline" onClick={() => exportCsv(shown)}>
              <Download className="mr-1 h-3.5 w-3.5" />
              CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportXlsx(shown)}>
              <Download className="mr-1 h-3.5 w-3.5" />
              Excel
            </Button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {["ID", "Month", "SKU", "Brand", "Plant", "Distributor"].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
                {["Units", "Sales", "Rows"].map((h) => (
                  <TableHead key={h} className="text-right">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {slice.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="num text-muted-foreground">{r.id}</TableCell>
                  <TableCell>
                    {r.month.slice(0, 3)} · {r.quarter}
                  </TableCell>
                  <TableCell className="num">{r.skuCode}</TableCell>
                  <TableCell>{r.brand}</TableCell>
                  <TableCell>{r.plant}</TableCell>
                  <TableCell className="text-muted-foreground">{r.distributor}</TableCell>
                  <TableCell className="num text-right">{intIN(r.units)}</TableCell>
                  <TableCell className="num text-right">{inr(r.sales)}</TableCell>
                  <TableCell className="num text-right">{intIN(r.txRows)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <label className="flex items-center gap-2 text-muted-foreground">
            Rows per page
            <select
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="rounded-md border bg-card px-2 py-1 text-foreground"
            >
              {[25, 50, 100].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Prev
            </Button>
            <span className={cn("num text-muted-foreground")}>
              Page {page + 1} / {pages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pages - 1}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

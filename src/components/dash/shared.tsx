import { useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown, TrendingDown, TrendingUp, Minus } from "lucide-react";
import * as XLSX from "xlsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { pctChange, type TxRecord } from "@/lib/analytics";

export function Panel({ title, subtitle, action, children, className }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("panel p-4 md:p-5", className)}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-sm font-bold tracking-tight">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function MultiSelect({ label, options, value, onChange }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => options.filter((o) => o.toLowerCase().includes(q.toLowerCase())), [options, q]);
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn("flex h-9 w-full items-center justify-between gap-2 rounded-lg border bg-card px-3 text-xs font-semibold transition-colors hover:bg-accent", value.length && "border-revenue text-revenue")}>
          <span className="truncate">{label}{value.length ? ` · ${value.length}` : ""}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        {options.length > 8 && <Input placeholder={`Search ${label.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} className="mb-2 h-8 text-xs" />}
        <div className="max-h-64 overflow-y-auto">
          {shown.map((o) => (
            <button key={o} onClick={() => toggle(o)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent">
              <span className={cn("flex h-4 w-4 items-center justify-center rounded border", value.includes(o) && "border-revenue bg-revenue text-primary-foreground")}>
                {value.includes(o) && <Check className="h-3 w-3" />}
              </span>
              {o}
            </button>
          ))}
        </div>
        {value.length > 0 && <button onClick={() => onChange([])} className="mt-2 w-full rounded-md py-1 text-xs text-muted-foreground hover:bg-accent">Clear</button>}
      </PopoverContent>
    </Popover>
  );
}

export function DeltaPill({ curr, prev, fmt }: { curr: number; prev: number | null | undefined; fmt: (v: number) => string }) {
  if (prev == null) return <span className="text-[11px] text-muted-foreground">No prior period</span>;
  const p = pctChange(curr, prev);
  const diff = curr - prev;
  const up = (p ?? 0) > 0, down = (p ?? 0) < 0;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold num", up && "bg-revenue/15 text-revenue", down && "bg-destructive/15 text-destructive", !up && !down && "bg-muted text-muted-foreground")}>
        {up ? <TrendingUp className="h-3 w-3" /> : down ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
        {p == null ? "n/a" : `${p > 0 ? "+" : ""}${p.toFixed(1)}%`}
      </span>
      <span className="num text-muted-foreground">{diff >= 0 ? "+" : "−"}{fmt(Math.abs(diff))}</span>
      <span className="text-muted-foreground">vs {fmt(prev)}</span>
    </div>
  );
}

const EXPORT_COLS: (keyof TxRecord)[] = ["id", "month", "quarter", "skuCode", "skuName", "tier", "brand", "category", "plant", "warehouse", "distributor", "region", "creditTier", "units", "sales", "txRows"];

export function exportCsv(rows: TxRecord[], name = "fmcg-filtered") {
  const esc = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [EXPORT_COLS.join(","), ...rows.map((r) => EXPORT_COLS.map((c) => esc(r[c])).join(","))].join("\n");
  download(new Blob([csv], { type: "text/csv" }), `${name}.csv`);
}

export function exportXlsx(rows: TxRecord[], name = "fmcg-filtered") {
  const header = ["ID", "Month", "Quarter", "SKU Code", "SKU Name", "Pack Tier", "Brand", "Category", "Plant", "Warehouse", "Distributor", "Region", "Credit Tier", "Units Sold", "Sales (INR)", "Dispatch Rows"];
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows.map((r) => EXPORT_COLS.map((c) => r[c]))]);
  ws["!cols"] = header.map((h) => ({ wch: Math.max(12, h.length + 4) }));
  ws["!autofilter"] = { ref: `A1:P${rows.length + 1}` };
  for (let i = 2; i <= rows.length + 1; i++) {
    const c = ws[`O${i}`]; if (c) c.z = "#,##,##0";
    const u = ws[`N${i}`]; if (u) u.z = "#,##,##0";
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  download(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${name}.xlsx`);
}

function download(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const tooltipStyle = {
  contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--popover-foreground)" },
  labelStyle: { fontWeight: 700 },
};
export const axisTick = { fontSize: 11, fill: "var(--muted-foreground)" };
export const PALETTE = ["var(--revenue)", "var(--ops)", "var(--brand)", "var(--alert)", "var(--chart-5)"];

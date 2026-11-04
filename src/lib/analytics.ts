export type TxRecord = {
  id: number;
  month: string;
  quarter: string;
  monthIndex: number;
  units: number;
  sales: number;
  txRows: number;
  skuCode: string;
  skuName: string;
  tier: string;
  brand: string;
  category: string;
  plant: string;
  warehouse: string;
  zone: string;
  distributor: string;
  region: string;
  creditTier: string;
};

export const MONTHS = ["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"];
export const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

export type Filters = {
  category: string[];
  brand: string[];
  plant: string[];
  distributor: string[];
  quarter: string[];
  month: string[];
};
export const EMPTY_FILTERS: Filters = { category: [], brand: [], plant: [], distributor: [], quarter: [], month: [] };

export function applyFilters(rows: TxRecord[], f: Filters, ignore: (keyof Filters)[] = []) {
  const on = (k: keyof Filters) => f[k].length > 0 && !ignore.includes(k);
  return rows.filter(
    (r) =>
      (!on("category") || f.category.includes(r.category)) &&
      (!on("brand") || f.brand.includes(r.brand)) &&
      (!on("plant") || f.plant.includes(r.plant)) &&
      (!on("distributor") || f.distributor.includes(r.distributor)) &&
      (!on("quarter") || f.quarter.includes(r.quarter)) &&
      (!on("month") || f.month.includes(r.month)),
  );
}

export type Kpi = { sales: number; units: number; realization: number; count: number; txRows: number };
export function kpis(rows: TxRecord[]): Kpi {
  let sales = 0, units = 0, txRows = 0;
  for (const r of rows) { sales += r.sales; units += r.units; txRows += r.txRows; }
  return { sales, units, txRows, count: rows.length, realization: safeDiv(sales, units) };
}

export function safeDiv(a: number, b: number) {
  if (!b || !Number.isFinite(a) || !Number.isFinite(b)) return 0;
  const v = a / b;
  return Number.isFinite(v) ? v : 0;
}

/** Percent change; null when the baseline is zero or invalid. */
export function pctChange(curr: number, prev: number): number | null {
  if (!Number.isFinite(curr) || !Number.isFinite(prev) || prev === 0) return null;
  const v = ((curr - prev) / Math.abs(prev)) * 100;
  return Number.isFinite(v) ? v : null;
}

export type Group = { key: string; sales: number; units: number; realization: number; count: number; txRows: number };
export function groupBy(rows: TxRecord[], key: (r: TxRecord) => string): Group[] {
  const m = new Map<string, Group>();
  for (const r of rows) {
    const k = key(r);
    const g = m.get(k) ?? { key: k, sales: 0, units: 0, realization: 0, count: 0, txRows: 0 };
    g.sales += r.sales; g.units += r.units; g.count += 1; g.txRows += r.txRows;
    m.set(k, g);
  }
  return [...m.values()].map((g) => ({ ...g, realization: safeDiv(g.sales, g.units) })).sort((a, b) => b.sales - a.sales);
}

/** Indian notation: ₹2225.64 Cr, ₹12.40 L, ₹4.5k */
export function inr(v: number, digits = 2) {
  if (!Number.isFinite(v)) return "₹0";
  const a = Math.abs(v), s = v < 0 ? "-" : "";
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(digits)} Cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(digits)} L`;
  if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(1)}k`;
  return `${s}₹${a.toFixed(0)}`;
}
export function units(v: number) {
  if (!Number.isFinite(v)) return "0";
  const a = Math.abs(v), s = v < 0 ? "-" : "";
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${s}${(a / 1e3).toFixed(1)}k`;
  return `${s}${a.toFixed(0)}`;
}
export const perUnit = (v: number) => `₹${(Number.isFinite(v) ? v : 0).toFixed(2)}/u`;
export const intIN = (v: number) => (Number.isFinite(v) ? Math.round(v) : 0).toLocaleString("en-IN");

/** Current vs prior period, using the latest selected (or latest available) quarter/month. */
export function comparison(all: TxRecord[], f: Filters, mode: "QoQ" | "MoM") {
  const base = applyFilters(all, f, ["quarter", "month"]);
  if (mode === "QoQ") {
    const sel = f.quarter.length ? f.quarter : [...new Set(base.map((r) => r.quarter))];
    const idx = Math.max(...sel.map((q) => QUARTERS.indexOf(q)), -1);
    if (idx < 0) return null;
    return { label: QUARTERS[idx], prevLabel: idx > 0 ? QUARTERS[idx - 1] : null, curr: kpis(base.filter((r) => r.quarter === QUARTERS[idx])), prev: idx > 0 ? kpis(base.filter((r) => r.quarter === QUARTERS[idx - 1])) : null };
  }
  const sel = f.month.length ? f.month : [...new Set(base.map((r) => r.month))];
  const idx = Math.max(...sel.map((m) => MONTHS.indexOf(m)), -1);
  if (idx < 0) return null;
  return { label: MONTHS[idx].slice(0, 3), prevLabel: idx > 0 ? MONTHS[idx - 1].slice(0, 3) : null, curr: kpis(base.filter((r) => r.month === MONTHS[idx])), prev: idx > 0 ? kpis(base.filter((r) => r.month === MONTHS[idx - 1])) : null };
}

export const REQUIRED_COLUMNS = ["month", "quarter", "units", "sales", "brand", "category", "plant", "distributor"] as const;

/** Validate and normalise uploaded rows (CSV/Excel). */
export function normaliseUpload(raw: Record<string, unknown>[]): { rows: TxRecord[]; errors: string[] } {
  const errors: string[] = [];
  if (!raw.length) return { rows: [], errors: ["File has no rows."] };
  const lower = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.trim().toLowerCase().replace(/[\s_]/g, ""), v]));
  const alias: Record<string, string[]> = {
    month: ["month", "periodmonth"], quarter: ["quarter", "periodquarter"], units: ["units", "unitssold"], sales: ["sales", "salesinr"],
    brand: ["brand"], category: ["category"], plant: ["plant"], distributor: ["distributor"],
  };
  const first = lower(raw[0]);
  const pick = (o: Record<string, unknown>, k: string) => { for (const a of alias[k] ?? [k.toLowerCase()]) if (a in o) return o[a]; return undefined; };
  for (const c of REQUIRED_COLUMNS) if (pick(first, c) === undefined) errors.push(`Missing column: ${c}`);
  if (errors.length) return { rows: [], errors };
  const rows: TxRecord[] = raw.map((o0, i) => {
    const o = lower(o0);
    const month = String(pick(o, "month") ?? "");
    const n = (v: unknown) => { const x = parseFloat(String(v ?? "0").replace(/[,₹]/g, "")); return Number.isFinite(x) ? x : 0; };
    return {
      id: i + 1, month, quarter: String(pick(o, "quarter") ?? ""), monthIndex: MONTHS.indexOf(month) + 1,
      units: n(pick(o, "units")), sales: n(pick(o, "sales")), txRows: n(o["transactionrows"] ?? 1),
      skuCode: String(o["skucode"] ?? ""), skuName: String(o["skuname"] ?? ""), tier: String(o["tier"] ?? o["weighttier"] ?? ""),
      brand: String(pick(o, "brand")), category: String(pick(o, "category")), plant: String(pick(o, "plant")),
      warehouse: String(o["warehouse"] ?? ""), zone: String(o["zone"] ?? ""), distributor: String(pick(o, "distributor")),
      region: String(o["region"] ?? ""), creditTier: String(o["credittier"] ?? ""),
    };
  });
  return { rows, errors };
}

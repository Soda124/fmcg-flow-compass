import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { TxRecord } from "./analytics";

function db() {
  return createClient<Database>(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
};

async function fetchAll(): Promise<TxRecord[]> {
  const client = db();
  const { count, error } = await client.from("transactions").select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  const pages = Math.ceil((count ?? 0) / 1000);
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      client.from("transaction_details").select("*").order("id").range(i * 1000, i * 1000 + 999),
    ),
  );
  const rows: TxRecord[] = [];
  for (const r of results) {
    if (r.error) throw new Error(r.error.message);
    for (const x of r.data ?? []) {
      rows.push({
        id: num(x.id),
        month: x.period_month ?? "",
        quarter: x.period_quarter ?? "",
        monthIndex: num(x.month_index),
        units: num(x.units_sold),
        sales: num(x.sales_inr),
        txRows: num(x.transaction_rows),
        skuCode: x.sku_code ?? "",
        skuName: x.sku_name ?? "",
        tier: x.weight_tier ?? "",
        brand: x.brand ?? "",
        category: x.category ?? "",
        plant: x.plant ?? "",
        warehouse: x.warehouse ?? "",
        zone: x.warehouse_zone ?? "",
        distributor: x.distributor ?? "",
        region: x.region ?? "",
        creditTier: x.credit_tier ?? "",
      });
    }
  }
  return rows;
}

export const getAllRecords = createServerFn({ method: "GET" }).handler(async () => fetchAll());

export const getStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await db().rpc("analytics_status");
  if (error) return { connected: false, error: error.message, tables: {} as Record<string, number>, totals: { sales_inr: 0, units_sold: 0, transaction_rows: 0 } };
  const d = data as { tables: Record<string, number>; totals: Record<string, number> };
  return {
    connected: true,
    error: null as string | null,
    tables: Object.fromEntries(Object.entries(d.tables).map(([k, v]) => [k, num(v)])),
    totals: { sales_inr: num(d.totals.sales_inr), units_sold: num(d.totals.units_sold), transaction_rows: num(d.totals.transaction_rows) },
  };
});

export const getMaster = createServerFn({ method: "GET" }).handler(async () => {
  const c = db();
  const [plants, warehouses, distributors] = await Promise.all([
    c.from("plants").select("*").order("id"),
    c.from("mother_warehouses").select("*").order("id"),
    c.from("distributors").select("*").order("id"),
  ]);
  const err = plants.error || warehouses.error || distributors.error;
  if (err) throw new Error(err.message);
  return {
    plants: (plants.data ?? []).map((p) => ({ name: p.name, state: p.state, lat: num(p.latitude), lng: num(p.longitude), capacity: num(p.capacity_units), status: p.operational_status })),
    warehouses: (warehouses.data ?? []).map((w) => ({ name: w.name, state: w.state, zone: w.zone, capacity: num(w.capacity_pallets), lat: num(w.latitude), lng: num(w.longitude) })),
    distributors: (distributors.data ?? []).map((d) => ({ name: d.name, region: d.region, creditTier: d.credit_tier, leadDays: num(d.fulfillment_lead_days), lat: num(d.latitude), lng: num(d.longitude) })),
  };
});

type Msg = { role: "user" | "assistant"; content: string };
const DIMS = ["category", "brand", "plant", "distributor", "region", "month", "quarter", "tier", "warehouse", "creditTier", "skuCode"] as const;

function aggregate(rows: TxRecord[], args: { group_by: string; filters?: Record<string, string>; top?: number }) {
  const filtered = rows.filter((r) =>
    Object.entries(args.filters ?? {}).every(([k, v]) => String((r as Record<string, unknown>)[k] ?? "").toLowerCase() === String(v).toLowerCase()),
  );
  const map = new Map<string, { sales: number; units: number; records: number }>();
  for (const r of filtered) {
    const key = String((r as Record<string, unknown>)[args.group_by] ?? "All");
    const e = map.get(key) ?? { sales: 0, units: 0, records: 0 };
    e.sales += r.sales; e.units += r.units; e.records += 1;
    map.set(key, e);
  }
  return [...map.entries()]
    .map(([k, v]) => ({ [args.group_by]: k, sales_inr: v.sales, sales_cr: +(v.sales / 1e7).toFixed(2), units: v.units, realization: v.units ? +(v.sales / v.units).toFixed(2) : 0, records: v.records }))
    .sort((a, b) => b.sales_inr - a.sales_inr)
    .slice(0, args.top ?? 20);
}

export const chatAssistant = createServerFn({ method: "POST" })
  .inputValidator((d: { messages: Msg[] }) => {
    if (!Array.isArray(d?.messages)) throw new Error("messages required");
    return { messages: d.messages.slice(-12).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 4000) })) as Msg[] };
  })
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { reply: "The AI assistant is not configured." };
    const rows = await fetchAll();
    const tools = [{
      type: "function",
      function: {
        name: "query_transactions",
        description: "Aggregate FY2023-24 FMCG transactions from the database. Returns sales_inr, sales_cr (crores), units, realization (INR/unit), records grouped by a dimension.",
        parameters: {
          type: "object",
          properties: {
            group_by: { type: "string", enum: DIMS },
            filters: { type: "object", description: "Exact-match filters keyed by dimension, e.g. {\"quarter\":\"Q2\",\"category\":\"Home Care\"}", additionalProperties: { type: "string" } },
            top: { type: "number" },
          },
          required: ["group_by"],
        },
      },
    }];
    const messages: Array<Record<string, unknown>> = [
      { role: "system", content: "You are a supply chain and revenue analyst for an Indian FMCG company (fiscal year FY2023-24, April–March, Q1=Apr–Jun). Always ground numbers by calling query_transactions. Use Indian units (₹ Cr, Lakhs). Be concise, use short markdown bullet lists. For forecasts, extrapolate from the monthly trend and say it is an estimate." },
      ...data.messages,
    ];
    for (let step = 0; step < 5; step++) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages, tools }),
      });
      if (res.status === 429) return { reply: "The assistant is busy right now — please try again in a moment." };
      if (res.status === 402) return { reply: "AI credits have run out for this workspace. Add credits to keep using the assistant." };
      if (!res.ok) return { reply: `Assistant error (${res.status}).` };
      const json = (await res.json()) as { choices: Array<{ message: { content?: string; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } }> };
      const msg = json.choices[0].message;
      if (!msg.tool_calls?.length) return { reply: msg.content ?? "" };
      messages.push(msg as Record<string, unknown>);
      for (const tc of msg.tool_calls) {
        let out: unknown;
        try { out = aggregate(rows, JSON.parse(tc.function.arguments || "{}")); } catch (e) { out = { error: String(e) }; }
        messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(out) });
      }
    }
    return { reply: "I couldn't complete that analysis — try a more specific question." };
  });

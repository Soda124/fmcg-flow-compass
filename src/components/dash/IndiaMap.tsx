import { useMemo, useState } from "react";
import { units as fmtUnits, inr, type TxRecord } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export type Master = {
  plants: { name: string; state: string; lat: number; lng: number; capacity: number; status: string }[];
  warehouses: { name: string; state: string; zone: string; capacity: number; lat: number; lng: number }[];
  distributors: { name: string; region: string; creditTier: string; leadDays: number; lat: number; lng: number }[];
};

const OUTLINE: [number, number][] = [[68.2,23.7],[70,25.5],[71,27.8],[73.5,29.9],[74.6,31.9],[74,34.5],[75.8,36.8],[77.8,35.5],[79.2,32.5],[78.9,31.2],[80.3,30.1],[81.5,30.4],[84,28.6],[88,27.9],[88.8,27.3],[89.8,26.7],[92,26.9],[94.6,27.6],[97.3,28.2],[96.6,27],[95.2,26],[94.3,24],[93.4,23.5],[92.7,22],[92.3,23.7],[91.5,24.1],[91.9,25.1],[90,25.2],[89.8,26],[88.6,26.4],[88.1,25.1],[88.7,24.2],[88.9,22.2],[87,21.5],[86.8,20.3],[85,19.3],[82.3,16.6],[80.3,15.8],[80.2,13.3],[79.8,10.3],[78.2,8.9],[77.5,8.1],[76.5,9],[75.8,11.3],[74.8,12.9],[74.1,15],[73.4,16.6],[72.8,19.2],[72.9,20.9],[72.6,21.4],[70.5,20.8],[69,22.3]];
const W = 560, H = 620;
const proj = (lng: number, lat: number): [number, number] => [((lng - 67.5) / 30.5) * W, ((37.5 - lat) / 30) * H];

type Edge = { from: string; to: string; units: number; sales: number; kind: "pw" | "wd" };
type NodeKind = "plant" | "warehouse" | "distributor";

export function IndiaMap({ rows, master }: { rows: TxRecord[]; master: Master }) {
  const [selected, setSelected] = useState<{ kind: NodeKind; name: string } | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);

  const nodes = useMemo(() => {
    const m = new Map<string, { x: number; y: number; kind: NodeKind; meta: string }>();
    master.plants.forEach((p) => m.set(p.name, { ...xy(p.lng, p.lat), kind: "plant", meta: `${p.state} · ${p.status}` }));
    master.warehouses.forEach((w) => m.set(w.name, { ...xy(w.lng, w.lat), kind: "warehouse", meta: `${w.zone} zone · ${w.capacity.toLocaleString("en-IN")} pallets` }));
    master.distributors.forEach((d) => m.set(d.name, { ...xy(d.lng, d.lat), kind: "distributor", meta: `${d.region} · ${d.creditTier}` }));
    return m;
  }, [master]);

  const edges = useMemo(() => {
    const m = new Map<string, Edge>();
    for (const r of rows) {
      for (const [from, to, kind] of [[r.plant, r.warehouse, "pw"], [r.warehouse, r.distributor, "wd"]] as const) {
        const k = `${from}|${to}`;
        const e = m.get(k) ?? { from, to, units: 0, sales: 0, kind };
        e.units += r.units; e.sales += r.sales; m.set(k, e);
      }
    }
    return [...m.values()];
  }, [rows]);

  // Routes linked to the selection: for a plant, its warehouses and their downstream distributors restricted to that plant's flows
  const active = useMemo(() => {
    if (!selected) return null;
    const sub = rows.filter((r) => (selected.kind === "plant" ? r.plant : selected.kind === "warehouse" ? r.warehouse : r.distributor) === selected.name);
    const keys = new Set<string>();
    let u = 0, s = 0;
    sub.forEach((r) => { keys.add(`${r.plant}|${r.warehouse}`); keys.add(`${r.warehouse}|${r.distributor}`); u += r.units; s += r.sales; });
    const linked = new Set<string>(sub.flatMap((r) => [r.plant, r.warehouse, r.distributor]));
    return { keys, linked, units: u, sales: s, routes: keys.size };
  }, [selected, rows]);

  const maxU = Math.max(1, ...edges.map((e) => e.units));
  const outline = OUTLINE.map(([a, b]) => proj(a, b).join(",")).join(" ");
  const color = { plant: "var(--ops)", warehouse: "var(--alert)", distributor: "var(--revenue)" } as const;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="relative overflow-hidden rounded-xl bg-surface">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" onMouseLeave={() => setHover(null)}>
          <polygon points={outline} fill="var(--card)" stroke="var(--border)" strokeWidth={2} />
          {edges.map((e) => {
            const a = nodes.get(e.from), b = nodes.get(e.to);
            if (!a || !b) return null;
            const k = `${e.from}|${e.to}`;
            const on = !active || active.keys.has(k);
            const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.15, my = (a.y + b.y) / 2 - (b.x - a.x) * 0.15;
            return (
              <path
                key={k}
                d={`M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`}
                fill="none"
                stroke={e.kind === "pw" ? "var(--ops)" : "var(--revenue)"}
                strokeWidth={0.6 + (e.units / maxU) * 4}
                strokeOpacity={on ? 0.75 : 0.06}
                className={cn(on && "route-flow", "cursor-pointer")}
                onMouseMove={(ev) => setHover({ x: ev.nativeEvent.offsetX, y: ev.nativeEvent.offsetY, text: `${e.from} → ${e.to}\n${fmtUnits(e.units)} units · ${inr(e.sales)}` })}
              />
            );
          })}
          {[...nodes.entries()].map(([name, n]) => {
            const dim = active && !active.linked.has(name);
            const isSel = selected?.name === name;
            const r = n.kind === "warehouse" ? 7 : n.kind === "plant" ? 8 : 6;
            return (
              <g key={name} className="cursor-pointer" opacity={dim ? 0.2 : 1}
                onClick={() => setSelected(isSel ? null : { kind: n.kind, name })}
                onMouseMove={(ev) => setHover({ x: ev.nativeEvent.offsetX, y: ev.nativeEvent.offsetY, text: `${name}\n${n.meta}` })}>
                {isSel && <circle cx={n.x} cy={n.y} r={r + 7} fill={color[n.kind]} opacity={0.25} />}
                {n.kind === "warehouse"
                  ? <rect x={n.x - r} y={n.y - r} width={r * 2} height={r * 2} rx={2} fill={color[n.kind]} stroke="var(--card)" strokeWidth={2} />
                  : <circle cx={n.x} cy={n.y} r={r} fill={color[n.kind]} stroke="var(--card)" strokeWidth={2} />}
              </g>
            );
          })}
        </svg>
        {hover && (
          <div className="pointer-events-none absolute z-10 whitespace-pre rounded-lg border bg-popover px-2.5 py-1.5 text-[11px] font-semibold text-popover-foreground shadow-lg" style={{ left: hover.x + 12, top: hover.y + 12 }}>
            {hover.text}
          </div>
        )}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 rounded-lg bg-card/90 px-3 py-2 text-[11px] font-semibold">
          <Legend c="bg-ops" label="Plants" round /><Legend c="bg-alert" label="Mother warehouses" /><Legend c="bg-revenue" label="Distributors" round />
        </div>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Network inspector</p>
          {selected && active ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-bold">{selected.name}</p>
              <p className="text-xs capitalize text-muted-foreground">{selected.kind}</p>
              <Stat label="Dispatched units" v={fmtUnits(active.units)} />
              <Stat label="Gross revenue" v={inr(active.sales)} />
              <Stat label="Active routes" v={String(active.routes)} />
              <button onClick={() => setSelected(null)} className="mt-2 w-full rounded-md border py-1.5 text-xs font-semibold hover:bg-accent">Clear selection</button>
            </div>
          ) : <p className="mt-3 text-xs text-muted-foreground">Click any plant, warehouse or distributor to trace its supply routes.</p>}
        </div>
        <div className="max-h-[420px] overflow-y-auto rounded-xl border p-2">
          {[...master.plants.map((p) => ({ n: p.name, k: "plant" as const })), ...master.distributors.map((d) => ({ n: d.name, k: "distributor" as const }))].map((x) => (
            <button key={x.n} onClick={() => setSelected({ kind: x.k, name: x.n })} className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent", selected?.name === x.n && "bg-accent font-bold")}>
              <span className={cn("h-2 w-2 rounded-full", x.k === "plant" ? "bg-ops" : "bg-revenue")} />{x.n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function xy(lng: number, lat: number) { const [x, y] = proj(lng, lat); return { x, y }; }
function Legend({ c, label, round }: { c: string; label: string; round?: boolean }) {
  return <span className="flex items-center gap-1.5"><span className={cn("h-2.5 w-2.5", c, round ? "rounded-full" : "rounded-sm")} />{label}</span>;
}
function Stat({ label, v }: { label: string; v: string }) {
  return <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="num font-bold">{v}</span></div>;
}

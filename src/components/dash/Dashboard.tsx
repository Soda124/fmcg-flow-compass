import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Bot, Database, Download, Filter, Moon, Send, Sun, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { chatAssistant, getAllRecords, getMaster, getStatus } from "@/lib/analytics.functions";
import {
  EMPTY_FILTERS,
  MONTHS,
  QUARTERS,
  applyFilters,
  comparison,
  inr,
  intIN,
  kpis,
  normaliseUpload,
  perUnit,
  units as fmtUnits,
  type Filters,
  type TxRecord,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { DeltaPill, MultiSelect, Panel, exportCsv, exportXlsx } from "./shared";
import { IndiaMap } from "./IndiaMap";
import { Overview } from "./tabs/Overview";
import { Brands } from "./tabs/Brands";
import { Plants } from "./tabs/Plants";
import { Distributors } from "./tabs/Distributors";
import { RawData } from "./tabs/RawData";

const TABS = [
  ["overview", "Executive Overview"],
  ["brands", "Brand & SKU"],
  ["plants", "Plant Operations"],
  ["logistics", "Logistics Network"],
  ["distributors", "Distributors"],
  ["raw", "Raw Data & Audit"],
] as const;

export function Dashboard() {
  const recordsQ = useQuery({
    queryKey: ["records"],
    queryFn: () => getAllRecords(),
    staleTime: 5 * 60_000,
  });
  const statusQ = useQuery({ queryKey: ["status"], queryFn: () => getStatus(), staleTime: 60_000 });
  const masterQ = useQuery({
    queryKey: ["master"],
    queryFn: () => getMaster(),
    staleTime: 5 * 60_000,
  });

  const [source, setSource] = useState<"db" | "upload">("db");
  const [uploaded, setUploaded] = useState<TxRecord[] | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [cmp, setCmp] = useState<"QoQ" | "MoM">("QoQ");
  const [dark, setDark] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setDark(localStorage.getItem("theme") === "dark");
    } catch {
      /* storage unavailable */
    }
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      /* storage unavailable */
    }
  }, [dark]);

  const all: TxRecord[] = useMemo(
    () => (source === "upload" && uploaded ? uploaded : (recordsQ.data ?? [])),
    [source, uploaded, recordsQ.data],
  );
  const rows = useMemo(() => applyFilters(all, filters), [all, filters]);
  const k = useMemo(() => kpis(rows), [rows]);
  const cmpData = useMemo(() => comparison(all, filters, cmp), [all, filters, cmp]);

  const options = useMemo(() => {
    const uniq = (f: (r: TxRecord) => string) => [...new Set(all.map(f))].filter(Boolean).sort();
    return {
      category: uniq((r) => r.category),
      brand: uniq((r) => r.brand),
      plant: uniq((r) => r.plant),
      distributor: uniq((r) => r.distributor),
      quarter: QUARTERS.filter((q) => all.some((r) => r.quarter === q)),
      month: MONTHS.filter((m) => all.some((r) => r.month === m)),
    };
  }, [all]);

  const activeFilters = Object.values(filters).reduce((n, v) => n + v.length, 0);

  async function onFile(file: File) {
    try {
      let raw: Record<string, unknown>[];
      if (file.name.toLowerCase().endsWith(".csv")) {
        raw = await new Promise((res, rej) =>
          Papa.parse<Record<string, unknown>>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (r) => res(r.data),
            error: rej,
          }),
        );
      } else {
        const wb = XLSX.read(await file.arrayBuffer());
        const sheet = wb.Sheets[wb.SheetNames[0] ?? ""];
        raw = sheet ? XLSX.utils.sheet_to_json(sheet) : [];
      }
      const { rows: parsed, errors } = normaliseUpload(raw);
      if (errors.length) {
        toast.error(errors.join(" · "));
        return;
      }
      setUploaded(parsed);
      setSource("upload");
      setFilters(EMPTY_FILTERS);
      toast.success(`Loaded ${intIN(parsed.length)} rows from ${file.name}`);
    } catch (e) {
      toast.error(`Could not read file: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const filterGrid = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <MultiSelect
        label="Category"
        options={options.category}
        value={filters.category}
        onChange={(v) => setFilters({ ...filters, category: v })}
      />
      <MultiSelect
        label="Brand"
        options={options.brand}
        value={filters.brand}
        onChange={(v) => setFilters({ ...filters, brand: v })}
      />
      <MultiSelect
        label="Plant"
        options={options.plant}
        value={filters.plant}
        onChange={(v) => setFilters({ ...filters, plant: v })}
      />
      <MultiSelect
        label="Distributor"
        options={options.distributor}
        value={filters.distributor}
        onChange={(v) => setFilters({ ...filters, distributor: v })}
      />
      <MultiSelect
        label="Quarter"
        options={options.quarter}
        value={filters.quarter}
        onChange={(v) => setFilters({ ...filters, quarter: v })}
      />
      <MultiSelect
        label="Month"
        options={options.month}
        value={filters.month}
        onChange={(v) => setFilters({ ...filters, month: v })}
      />
    </div>
  );

  const status = statusQ.data;
  const cards = [
    {
      label: "Gross revenue",
      value: inr(k.sales),
      accent: "text-revenue",
      curr: cmpData?.curr.sales ?? 0,
      prev: cmpData?.prev?.sales,
      fmt: (v: number) => inr(v),
    },
    {
      label: "Dispatched volume",
      value: `${fmtUnits(k.units)} units`,
      accent: "text-ops",
      curr: cmpData?.curr.units ?? 0,
      prev: cmpData?.prev?.units,
      fmt: (v: number) => fmtUnits(v),
    },
    {
      label: "Avg realisation",
      value: perUnit(k.realization),
      accent: "text-brand",
      curr: cmpData?.curr.realization ?? 0,
      prev: cmpData?.prev?.realization,
      fmt: (v: number) => perUnit(v),
    },
    {
      label: "Transactions",
      value: intIN(k.count),
      accent: "text-alert",
      curr: cmpData?.curr.count ?? 0,
      prev: cmpData?.prev?.count,
      fmt: (v: number) => intIN(v),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3">
          <div className="mr-auto">
            <h1 className="text-base font-extrabold tracking-tight">
              FMCG Supply Chain & Revenue Analytics
            </h1>
            <p className="text-[11px] text-muted-foreground">FY2023-24 · April–March</p>
          </div>

          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
              status?.connected ? "text-revenue" : "text-destructive",
            )}
          >
            <Database className="h-3 w-3" />
            {statusQ.isLoading
              ? "Connecting…"
              : status?.connected
                ? `Connected · ${intIN(status.tables["transactions"] ?? 0)} records`
                : "Database offline"}
          </span>

          <div className="inline-flex rounded-lg border p-0.5 text-xs font-semibold">
            <button
              onClick={() => setSource("db")}
              className={cn(
                "rounded-md px-3 py-1",
                source === "db" && "bg-primary text-primary-foreground",
              )}
            >
              Database ({intIN(recordsQ.data?.length ?? 0)})
            </button>
            <button
              onClick={() => (uploaded ? setSource("upload") : fileRef.current?.click())}
              className={cn(
                "rounded-md px-3 py-1",
                source === "upload" && "bg-primary text-primary-foreground",
              )}
            >
              Upload CSV/Excel
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = "";
            }}
          />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1 h-3.5 w-3.5" />
            Import
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportCsv(rows)}
            disabled={!rows.length}
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportXlsx(rows)}
            disabled={!rows.length}
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            Excel
          </Button>
          <Assistant />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setDark(!dark)}
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        <div className="mx-auto max-w-[1500px] px-4 pb-3">
          <div className="hidden items-center gap-2 lg:flex">
            <div className="flex-1">{filterGrid}</div>
            <Button
              size="sm"
              variant="ghost"
              disabled={!activeFilters}
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Clear all
            </Button>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline">
                  <Filter className="mr-1 h-3.5 w-3.5" />
                  Filters{activeFilters ? ` · ${activeFilters}` : ""}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-4 grid gap-2 [&>div]:grid-cols-1">{filterGrid}</div>
                <Button
                  className="mt-4 w-full"
                  variant="outline"
                  disabled={!activeFilters}
                  onClick={() => setFilters(EMPTY_FILTERS)}
                >
                  Clear all
                </Button>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-4 px-4 py-5">
        {recordsQ.isError && (
          <Panel>
            <p className="text-sm text-destructive">
              Could not load records: {(recordsQ.error as Error).message}. Check the Supabase env
              vars and that the migration has been run.
            </p>
          </Panel>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {recordsQ.isLoading
              ? "Loading records…"
              : `${intIN(rows.length)} of ${intIN(all.length)} records in view`}
          </p>
          <div className="inline-flex rounded-lg border p-0.5 text-xs font-semibold">
            {(["QoQ", "MoM"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setCmp(m)}
                className={cn(
                  "rounded-md px-3 py-1",
                  cmp === m && "bg-primary text-primary-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((c) => (
            <Panel key={c.label}>
              <p className="text-xs font-semibold text-muted-foreground">{c.label}</p>
              <p className={cn("num mt-1 text-2xl font-extrabold", c.accent)}>{c.value}</p>
              <div className="mt-2 min-h-5">
                {cmpData ? (
                  <>
                    <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {cmpData.label}
                      {cmpData.prevLabel ? ` vs ${cmpData.prevLabel}` : ""}
                    </p>
                    <DeltaPill curr={c.curr} prev={c.prev} fmt={c.fmt} />
                  </>
                ) : (
                  <span className="text-[11px] text-muted-foreground">No data</span>
                )}
              </div>
            </Panel>
          ))}
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="h-auto w-full flex-wrap justify-start">
            {TABS.map(([v, l]) => (
              <TabsTrigger key={v} value={v} className="text-xs">
                {l}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="overview">
            <Overview rows={rows} master={masterQ.data} filters={filters} setFilters={setFilters} />
          </TabsContent>
          <TabsContent value="brands">
            <Brands rows={rows} />
          </TabsContent>
          <TabsContent value="plants">
            <Plants rows={rows} master={masterQ.data} />
          </TabsContent>
          <TabsContent value="logistics">
            {masterQ.data ? (
              <IndiaMap rows={rows} master={masterQ.data} />
            ) : (
              <Panel>
                <p className="text-sm text-muted-foreground">Loading network…</p>
              </Panel>
            )}
          </TabsContent>
          <TabsContent value="distributors">
            <Distributors rows={rows} master={masterQ.data} />
          </TabsContent>
          <TabsContent value="raw">
            <RawData rows={rows} all={all} status={status} source={source} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

type Msg = { role: "user" | "assistant"; content: string };

function Assistant() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const content = text.trim();
    if (!content || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content }];
    setMsgs(next);
    setText("");
    setBusy(true);
    try {
      const res = await chatAssistant({ data: { messages: next } });
      setMsgs([...next, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setMsgs([
        ...next,
        {
          role: "assistant",
          content: `Request failed: ${e instanceof Error ? e.message : String(e)}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm">
          <Bot className="mr-1 h-3.5 w-3.5" />
          Ask AI
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Supply chain assistant</SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-3 overflow-y-auto py-3">
          {msgs.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Try: “Which plant has the lowest realisation?” or “Forecast Q4 revenue.”
            </p>
          )}
          {msgs.map((m, i) => (
            <div
              key={i}
              className={cn(
                "whitespace-pre-wrap rounded-xl px-3 py-2 text-sm",
                m.role === "user" ? "ml-8 bg-primary text-primary-foreground" : "mr-8 bg-muted",
              )}
            >
              {m.content}
            </div>
          ))}
          {busy && <p className="text-xs text-muted-foreground">Analysing…</p>}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex gap-2"
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask about revenue, plants, distributors…"
          />
          <Button type="submit" size="icon" disabled={busy}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

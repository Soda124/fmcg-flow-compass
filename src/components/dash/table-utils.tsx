import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function useSort<T>(
  rows: T[],
  initial: keyof T & string,
  initialDir: "asc" | "desc" = "desc",
) {
  const [key, setKey] = useState<keyof T & string>(initial);
  const [dir, setDir] = useState<"asc" | "desc">(initialDir);
  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const x = a[key],
          y = b[key];
        const c =
          typeof x === "number" && typeof y === "number"
            ? x - y
            : String(x).localeCompare(String(y));
        return dir === "asc" ? c : -c;
      }),
    [rows, key, dir],
  );
  const toggle = (k: keyof T & string) => {
    if (k === key) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setKey(k);
      setDir("desc");
    }
  };
  return { sorted, sortKey: key, dir, toggle };
}

export function SortHead<T>({
  label,
  k,
  sort,
  align = "left",
}: {
  label: string;
  k: keyof T & string;
  sort: { sortKey: string; dir: "asc" | "desc"; toggle: (k: keyof T & string) => void };
  align?: "left" | "right";
}) {
  const active = sort.sortKey === k;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={cn(align === "right" && "text-right")}>
      <button
        onClick={() => sort.toggle(k)}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-semibold hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </TableHead>
  );
}

export const toggleIn = (list: string[], v: string) =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ScrollText, Search, Download, RefreshCw, Filter,
  ChevronDown, Clock, User, Globe, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { Btn } from "@/components/shared/btn";
import { KpiCard } from "@/components/shared/kpi-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useSuperadminStore } from "./_store";
import type { AuditEntry } from "./_data";
import { formatDateTime, relativeTime } from "./_helpers";

/* ============================================================
   AuditView - immutable platform audit trail.
   KPI strip -> top bar -> filter bar -> DataTable.
   Read-only by nature. Row click opens a Sheet with the full
   entry detail. Bulk select + Export to CSV.
   Strict monochrome Swiss design (black / white / grey only,
   6px max radius, hairline borders, tabular-nums).
   ============================================================ */

const MODULE_OPTIONS = [
  "Organizations", "Users", "Billing", "Backups", "Offline Sync",
  "Settings", "Internal Team", "Tickets", "Broadcasts", "Automations",
];
const DATE_RANGES = ["All time", "Today", "Last 7 days", "Last 30 days"];

/* ── helpers ─────────────────────────────────────────────── */

function actorInitials(actor: string): string {
  if (!actor) return "?";
  if (actor.includes("@")) {
    const [name, domain] = actor.split("@");
    return ((name[0] ?? "") + (domain[0] ?? "")).toUpperCase();
  }
  return actor.slice(0, 2).toUpperCase();
}

function weekStartMs(): number {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun .. 6 = Sat
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - diff);
  return monday.getTime();
}

function exportAuditCsv(rows: AuditEntry[]): void {
  const header = ["id", "timestamp", "actor", "action", "target", "module", "ip"];
  const esc = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [esc(r.id), esc(r.timestamp), esc(r.actor), esc(r.action), esc(r.target), esc(r.module), esc(r.ip)].join(","),
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── main view ──────────────────────────────────────────── */

export function AuditView() {
  const auditLog = useSuperadminStore((s) => s.auditLog);

  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [actorFilter, setActorFilter] = useState("All");
  const [dateRange, setDateRange] = useState("All time");
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const actorOptions = useMemo(() => {
    const set = new Set<string>();
    auditLog.forEach((a) => set.add(a.actor));
    return Array.from(set).sort();
  }, [auditLog]);

  const kpis = useMemo(() => {
    const todayCutoff = new Date().setHours(0, 0, 0, 0);
    const weekCutoff = weekStartMs();
    return {
      total: auditLog.length,
      today: auditLog.filter((a) => new Date(a.timestamp).getTime() >= todayCutoff).length,
      thisWeek: auditLog.filter((a) => new Date(a.timestamp).getTime() >= weekCutoff).length,
      uniqueActors: new Set(auditLog.map((a) => a.actor)).size,
    };
  }, [auditLog]);

  const filtered = useMemo(() => {
    let result = auditLog;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.action.toLowerCase().includes(q) ||
          a.target.toLowerCase().includes(q) ||
          a.actor.toLowerCase().includes(q),
      );
    }
    if (moduleFilter !== "All") result = result.filter((a) => a.module === moduleFilter);
    if (actorFilter !== "All") result = result.filter((a) => a.actor === actorFilter);
    if (dateRange !== "All time") {
      let cutoff = 0;
      if (dateRange === "Today") cutoff = new Date().setHours(0, 0, 0, 0);
      else if (dateRange === "Last 7 days") cutoff = Date.now() - 7 * 86_400_000;
      else if (dateRange === "Last 30 days") cutoff = Date.now() - 30 * 86_400_000;
      result = result.filter((a) => new Date(a.timestamp).getTime() >= cutoff);
    }
    return result;
  }, [auditLog, search, moduleFilter, actorFilter, dateRange]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (moduleFilter !== "All" ? 1 : 0) +
    (actorFilter !== "All" ? 1 : 0) +
    (dateRange !== "All time" ? 1 : 0);

  function clearFilters() {
    setSearch("");
    setModuleFilter("All");
    setActorFilter("All");
    setDateRange("All time");
  }

  const columns: Column<AuditEntry>[] = [
    {
      key: "timestamp", header: "Timestamp", sortable: true, width: "190px",
      sortValue: (r) => r.timestamp,
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-[12px] font-medium tabular text-foreground">{formatDateTime(r.timestamp)}</span>
          <span className="text-[10px] text-muted-foreground tabular">{relativeTime(r.timestamp)}</span>
        </div>
      ),
    },
    {
      key: "actor", header: "Actor", sortable: true, width: "240px",
      sortValue: (r) => r.actor,
      render: (r) => (
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] border border-border bg-muted/30 text-[10px] font-semibold uppercase tabular text-foreground">
            {actorInitials(r.actor)}
          </span>
          <span className="truncate text-[12px] text-foreground">{r.actor}</span>
        </div>
      ),
    },
    {
      key: "action", header: "Action", sortable: true,
      sortValue: (r) => r.action,
      render: (r) => (
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[12px] text-foreground">{r.action}</span>
          <span className="shrink-0 rounded-[3px] border border-border bg-muted/30 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            {r.module}
          </span>
        </div>
      ),
    },
    {
      key: "target", header: "Target", sortable: true, width: "260px",
      hideOnMobile: true, hideable: true,
      sortValue: (r) => r.target,
      render: (r) => (
        <span className="block max-w-[260px] truncate font-mono text-[11px] text-foreground">{r.target}</span>
      ),
    },
    {
      key: "ip", header: "IP", sortable: true, width: "130px",
      hideOnMobile: true, hideable: true,
      sortValue: (r) => r.ip,
      render: (r) => <span className="font-mono text-[11px] tabular text-muted-foreground">{r.ip}</span>,
    },
  ];

  const bulkActions = [
    {
      label: "Export to CSV",
      onClick: (rows: AuditEntry[]) => {
        exportAuditCsv(rows);
        toast(`Exported ${rows.length} ${rows.length === 1 ? "entry" : "entries"}`);
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Total entries" value={kpis.total} icon={<ScrollText className="h-4 w-4" />} delta="all-time" trend="up" />
        <KpiCard label="Today" value={kpis.today} icon={<Clock className="h-4 w-4" />} delta="since 00:00" trend="up" />
        <KpiCard label="This week" value={kpis.thisWeek} icon={<Clock className="h-4 w-4" />} delta="since Mon" trend="up" />
        <KpiCard label="Unique actors" value={kpis.uniqueActors} icon={<User className="h-4 w-4" />} delta="staff + system" trend="up" />
      </div>

      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-border bg-card px-3 py-2.5">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-foreground" />
          <h3 className="text-[13px] font-medium text-foreground">Audit log</h3>
        </div>
        <span className="text-[11px] text-muted-foreground tabular">
          {filtered.length} of {auditLog.length} {auditLog.length === 1 ? "entry" : "entries"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Btn
            size="sm" variant="outline" icon={<Download className="h-3.5 w-3.5" />}
            onClick={() => {
              exportAuditCsv(filtered);
              toast(`Exported ${filtered.length} ${filtered.length === 1 ? "entry" : "entries"}`);
            }}
          >
            Export
          </Btn>
          <Btn
            size="sm" variant="outline" icon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={() => toast("Audit log refreshed", { description: `${auditLog.length} entries up to date` })}
          >
            Refresh
          </Btn>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-border bg-card px-3 py-2.5">
        <div className="relative flex h-8 w-full max-w-xs items-center">
          <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, target, actor..."
            aria-label="Search audit log"
            className="h-8 rounded-[5px] border-border bg-background pl-8 pr-7 text-[13px]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-1.5 flex h-5 w-5 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <FilterDropdown label="Module" icon={<Filter className="h-3 w-3" />} value={moduleFilter} options={["All", ...MODULE_OPTIONS]} onSelect={setModuleFilter} />
        <FilterDropdown label="Actor" icon={<User className="h-3 w-3" />} value={actorFilter} options={["All", ...actorOptions]} onSelect={setActorFilter} />
        <FilterDropdown label="Date" icon={<Clock className="h-3 w-3" />} value={dateRange} options={DATE_RANGES} onSelect={setDateRange} />

        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="text-[11px] text-muted-foreground hover:text-foreground tap">
            Clear {activeFilterCount}
          </button>
        )}
      </div>

      {/* Audit log table */}
      <div className="overflow-hidden rounded-[6px] border border-border bg-card">
        <DataTable
          data={filtered}
          columns={columns}
          onRowClick={(row) => setSelected(row)}
          bulkActions={bulkActions}
          initialSort={{ key: "timestamp", dir: "desc" }}
          emptyTitle="No audit entries"
          emptyDescription="Adjust your search or filters to see more entries."
          pageSize={25}
          zebra
        />
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md" showCloseButton={false}>
          {selected && <AuditDetailSheet entry={selected} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ── Filter dropdown ────────────────────────────────────── */

function FilterDropdown({
  label, icon, value, options, onSelect,
}: {
  label: string; icon: ReactNode; value: string;
  options: string[]; onSelect: (v: string) => void;
}) {
  const active = value !== "All";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Filter by ${label}`}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-[5px] border px-2.5 text-[12px] font-medium transition-colors tap",
            active ? "border-foreground text-foreground" : "border-border text-foreground hover:bg-accent",
          )}
        >
          {icon}
          <span className="text-muted-foreground">{label}:</span>
          <span className="max-w-[110px] truncate">{value}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt}
            onClick={() => onSelect(opt)}
            className={cn("text-[13px]", opt === value ? "font-semibold text-foreground" : "text-foreground")}
          >
            {opt}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Detail Sheet ───────────────────────────────────────── */

function AuditDetailSheet({ entry }: { entry: AuditEntry }) {
  return (
    <div className="flex h-full flex-col gap-4">
      <SheetHeader>
        <SheetTitle className="text-[15px]">Audit entry</SheetTitle>
        <SheetDescription className="text-[12px]">
          Immutable record of a single platform action.
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-2">
        {/* Action banner */}
        <div className="flex items-start gap-3 rounded-[5px] border border-border bg-muted/30 p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-border bg-background">
            <ScrollText className="h-4 w-4 text-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium leading-tight text-foreground">{entry.action}</div>
            <span className="mt-1.5 inline-flex items-center rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              {entry.module}
            </span>
          </div>
        </div>

        <SheetRow label="Timestamp" value={
          <div className="flex flex-col items-end">
            <span className="tabular text-foreground">{formatDateTime(entry.timestamp)}</span>
            <span className="text-[10px] text-muted-foreground">{relativeTime(entry.timestamp)}</span>
          </div>
        } />
        <SheetRow label="Actor" value={
          <div className="flex items-center gap-2">
            <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-[2px] border border-border bg-background text-[9px] font-semibold uppercase tabular text-foreground">
              {actorInitials(entry.actor)}
            </span>
            <span className="text-foreground">{entry.actor}</span>
          </div>
        } />
        <SheetRow label="Action" value={<span className="text-foreground">{entry.action}</span>} />
        <SheetRow label="Target" value={<span className="break-all text-right font-mono text-foreground">{entry.target}</span>} />
        <SheetRow label="Module" value={<span className="text-foreground">{entry.module}</span>} />
        <SheetRow label="IP address" value={
          <span className="inline-flex items-center gap-1.5 font-mono tabular text-foreground">
            <Globe className="h-3 w-3 text-muted-foreground" />
            {entry.ip}
          </span>
        } />
        <SheetRow label="Entry ID" value={<span className="font-mono text-muted-foreground">{entry.id}</span>} />
      </div>

      <SheetFooter>
        <Btn
          variant="outline" size="sm" block
          icon={<Download className="h-3.5 w-3.5" />}
          onClick={() => {
            exportAuditCsv([entry]);
            toast("Exported 1 entry");
          }}
        >
          Export this entry
        </Btn>
      </SheetFooter>
    </div>
  );
}

/* ── Sheet presentational row ───────────────────────────── */

function SheetRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-[5px] border border-border bg-card px-3 py-2">
      <span className="shrink-0 pt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-[12px] text-foreground">{value}</span>
    </div>
  );
}

export default AuditView;

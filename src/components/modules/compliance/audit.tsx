"use client";

import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import {
  Download,
  ChevronDown,
  History,
  ShieldCheck,
  User,
  Server,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AUDIT_LOG,
  AUDIT_TYPES,
  type AuditLogEntry,
  type AuditType,
  formatDateTime,
  relativeTime,
} from "./_helpers";

export function AuditLogTab() {
  const [rows] = useState<AuditLogEntry[]>(AUDIT_LOG);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [view, setView] = useState<AuditLogEntry | null>(null);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.actor.toLowerCase().includes(q) ||
          s.action.toLowerCase().includes(q) ||
          s.resource.toLowerCase().includes(q) ||
          s.type.toLowerCase().includes(q) ||
          s.ip.toLowerCase().includes(q),
      );
    }
    if (typeFilter.size > 0) r = r.filter((s) => typeFilter.has(s.type));
    return r;
  }, [rows, search, typeFilter]);

  const toggle = (set: Set<string>, fn: (s: Set<string>) => void, v: string) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    fn(n);
  };

  const uniqueActors = useMemo(() => Array.from(new Set(rows.map((r) => r.actor))).sort(), [rows]);
  const criticalCount = rows.filter((r) => r.type === "Permission Change" || r.type === "Deletion" || r.type === "Config Change").length;

  const columns: Column<AuditLogEntry>[] = [
    { key: "ts", header: "Timestamp", sortable: true, width: "180px", sortValue: (r) => r.ts, render: (r) => (
      <div className="flex flex-col">
        <span className="tabular text-[12px] font-medium text-foreground">{formatDateTime(r.ts)}</span>
        <span className="text-[11px] text-muted-foreground">{relativeTime(r.ts)}</span>
      </div>
    ) },
    { key: "type", header: "Type", sortable: true, width: "150px", sortValue: (r) => r.type, render: (r) => <StatusBadge variant="outline">{r.type}</StatusBadge> },
    {
      key: "actor",
      header: "Actor",
      sortable: true,
      width: "180px",
      sortValue: (r) => r.actor,
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] bg-foreground text-[10px] font-medium text-background">
            {r.actor.split(" ").map((p) => p[0]).join("").slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[12px] font-medium text-foreground">{r.actor}</div>
            <div className="truncate text-[11px] text-muted-foreground">{r.actorRole}</div>
          </div>
        </div>
      ),
    },
    { key: "action", header: "Action", sortable: true, sortValue: (r) => r.action, render: (r) => (
      <div className="flex flex-col">
        <span className="text-[12.5px] font-medium text-foreground">{r.action}</span>
        <span className="text-[11px] text-muted-foreground truncate max-w-[260px]">{r.resource}</span>
      </div>
    ) },
    { key: "ip", header: "IP", sortable: true, width: "130px", hideOnMobile: true, sortValue: (r) => r.ip, render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.ip}</span> },
  ];

  const rowActions = [
    { label: "View", onClick: (s: AuditLogEntry) => setView(s) },
    { label: "Copy Entry", onClick: (s: AuditLogEntry) => {
      navigator.clipboard?.writeText(`${s.ts} | ${s.actor} (${s.actorRole}) | ${s.type} | ${s.action} | ${s.resource} | ${s.ip}`).catch(() => {});
      toast("Audit entry copied", { description: s.id });
    } },
  ];

  const bulkActions = [
    { label: "Export", onClick: (sel: AuditLogEntry[]) => toast(`${sel.length} entr${sel.length === 1 ? "y" : "ies"} exported`, { description: "CSV file generated" }) },
  ];

  const typeLabel = typeFilter.size === 0 ? "All" : typeFilter.size === 1 ? Array.from(typeFilter)[0] : `${typeFilter.size} selected`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Audit Log</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} entries · {uniqueActors.length} actors · {criticalCount} critical events
          </p>
        </div>
        <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting", { description: "CSV file generated" })}>Export</Btn>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Entries</span><History className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{rows.length}</span>
          <span className="text-[11px] text-muted-foreground tabular">last 7 days</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Unique Actors</span><User className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{uniqueActors.length}</span>
          <span className="text-[11px] text-muted-foreground tabular">users logged</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Critical Events</span><ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{criticalCount}</span>
          <span className="text-[11px] text-muted-foreground tabular">permission / config / deletion</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Event Types</span><Server className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{AUDIT_TYPES.length}</span>
          <span className="text-[11px] text-muted-foreground tabular">distinct categories</span>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search actor, action, resource, type, IP…" className="max-w-[260px]" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Type:</span>
                <span className="max-w-[120px] truncate">{typeLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {AUDIT_TYPES.map((t) => (
                <DropdownMenuCheckboxItem key={t} checked={typeFilter.has(t)} onCheckedChange={() => toggle(typeFilter, setTypeFilter, t)} className="text-[13px]">{t}</DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">{filtered.length} {filtered.length === 1 ? "record" : "records"}</div>
        </div>
        <DataTable
          data={filtered}
          columns={columns}
          onRowClick={(s) => setView(s)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle="No audit entries"
          emptyDescription="Audit log entries auto-capture as users interact with the system."
          initialSort={{ key: "ts", dir: "desc" }}
        />
      </div>

      <AuditDetailDrawer open={!!view} record={view} onClose={() => setView(null)} />
    </div>
  );
}

function AuditDetailDrawer({ open, record, onClose }: { open: boolean; record: AuditLogEntry | null; onClose: () => void }) {
  if (!record) return null;
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record.id}</SheetTitle>
            <span className="text-[12px] text-muted-foreground">{formatDateTime(record.ts)} · {relativeTime(record.ts)}</span>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Close drawer"><Download className="h-4 w-4 rotate-45" /></button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Type" value={record.type} />
            <DetailField label="Timestamp" value={formatDateTime(record.ts)} mono />
            <DetailField label="Actor" value={record.actor} />
            <DetailField label="Role" value={record.actorRole} />
            <DetailField label="IP Address" value={record.ip} mono />
            <DetailField label="Resource" value={record.resource} />
          </div>
          <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Action</div>
            <p className="text-[12.5px] text-foreground">{record.action}</p>
          </div>
          {record.details && (
            <div className="mt-3 rounded-[6px] border border-border bg-card px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Details</div>
              <p className="text-[12.5px] text-foreground leading-relaxed">{record.details}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-[5px] border border-border bg-card px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={"text-[12.5px] text-foreground " + (mono ? "tabular" : "")}>{value}</div>
    </div>
  );
}

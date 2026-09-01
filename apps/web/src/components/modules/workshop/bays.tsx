"use client";

import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import {
  Download,
  ChevronDown,
  Gauge,
  CheckCircle2,
  Clock,
  Wrench,
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
  BAYS,
  BAY_STATUSES,
  BAY_TYPES,
  type Bay,
  type BayStatus,
  type BayType,
  formatDateTime,
  relativeTime,
  bayStatusBadge,
} from "./_helpers";

export function BaysTab() {
  const [rows, setRows] = useState<Bay[]>(BAYS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [view, setView] = useState<Bay | null>(null);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.code.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.workshop.toLowerCase().includes(q) ||
          (s.currentVehicle ?? "").toLowerCase().includes(q) ||
          (s.mechanic ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter.size > 0) r = r.filter((s) => statusFilter.has(s.status));
    if (typeFilter.size > 0) r = r.filter((s) => typeFilter.has(s.type));
    return r;
  }, [rows, search, statusFilter, typeFilter]);

  const toggle = (set: Set<string>, fn: (s: Set<string>) => void, v: string) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    fn(n);
  };

  const occupied = rows.filter((r) => r.status === "Occupied").length;
  const available = rows.filter((r) => r.status === "Available").length;
  const maintenance = rows.filter((r) => r.status === "Maintenance").length;
  const utilisation = rows.length === 0 ? 0 : Math.round((occupied / rows.length) * 100);

  const columns: Column<Bay>[] = [
    { key: "code", header: "Bay Code", sortable: true, width: "140px", sortValue: (r) => r.code, render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{r.code}</span> },
    {
      key: "name",
      header: "Bay",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-[12.5px] font-medium text-foreground">{r.name}</span>
          <span className="text-[11px] text-muted-foreground">{r.workshop}</span>
        </div>
      ),
    },
    { key: "type", header: "Type", sortable: true, width: "140px", sortValue: (r) => r.type, render: (r) => <StatusBadge variant="outline">{r.type}</StatusBadge> },
    {
      key: "currentVehicle",
      header: "Current Vehicle",
      sortable: true,
      width: "180px",
      sortValue: (r) => r.currentVehicle ?? "",
      render: (r) => r.currentVehicle ? (
        <div className="flex flex-col">
          <span className="tabular text-[12px] font-medium text-foreground">{r.currentVehicle}</span>
          <span className="tabular text-[11px] text-muted-foreground">{r.currentJobNo}</span>
        </div>
      ) : <span className="text-[12px] text-muted-foreground">-</span>,
    },
    { key: "mechanic", header: "Mechanic", sortable: true, width: "150px", hideOnMobile: true, sortValue: (r) => r.mechanic ?? "", render: (r) => <span className="text-[12px] text-muted-foreground">{r.mechanic ?? "-"}</span> },
    {
      key: "occupiedSince",
      header: "Occupied Since",
      sortable: true,
      width: "120px",
      hideOnMobile: true,
      sortValue: (r) => r.occupiedSince ?? "",
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.occupiedSince ? relativeTime(r.occupiedSince) : "-"}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.status,
      render: (r) => {
        const m = bayStatusBadge(r.status);
        return <StatusBadge variant={m.variant} pulse={m.pulse}>{r.status}</StatusBadge>;
      },
    },
  ];

  const rowActions = [
    { label: "View", onClick: (s: Bay) => setView(s) },
    {
      label: "Release Bay",
      onClick: (s: Bay) => {
        setRows((prev) => prev.map((r) => r.id === s.id ? { ...r, status: "Available" as BayStatus, currentJobNo: undefined, currentVehicle: undefined, mechanic: undefined, occupiedSince: undefined, estimatedRelease: undefined } : r));
        toast.success(`Bay released`, { description: s.code });
      },
    },
    {
      label: "Mark Cleaning",
      onClick: (s: Bay) => {
        setRows((prev) => prev.map((r) => r.id === s.id ? { ...r, status: "Cleaning" as BayStatus } : r));
        toast(`Bay sent for cleaning`, { description: s.code });
      },
    },
  ];

  const bulkActions = [
    { label: "Export", onClick: (sel: Bay[]) => toast(`${sel.length} bay${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }) },
  ];

  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;
  const typeLabel = typeFilter.size === 0 ? "All" : typeFilter.size === 1 ? Array.from(typeFilter)[0] : `${typeFilter.size} selected`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Bays</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} bays · {occupied} occupied · {available} available · {maintenance} in maintenance
          </p>
        </div>
        <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting", { description: "CSV file generated" })}>Export</Btn>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Bays</span><Wrench className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{rows.length}</span>
          <span className="text-[11px] text-muted-foreground tabular">{BAY_TYPES.length} types</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Occupied</span><Gauge className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{occupied}</span>
          <span className="text-[11px] text-muted-foreground tabular">{utilisation}% utilisation</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Available</span><CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{available}</span>
          <span className="text-[11px] text-muted-foreground tabular">ready for allocation</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Maintenance</span><Clock className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{maintenance}</span>
          <span className="text-[11px] text-muted-foreground tabular">under service</span>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search bay, vehicle, mechanic, workshop…" className="max-w-[260px]" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Status:</span>
                <span className="max-w-[100px] truncate">{statusLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {BAY_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggle(statusFilter, setStatusFilter, s)} className="text-[13px]">{s}</DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Type:</span>
                <span className="max-w-[100px] truncate">{typeLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {BAY_TYPES.map((t) => (
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
          emptyTitle="No bays"
          emptyDescription="Add a bay to the workshop floor."
          initialSort={{ key: "code", dir: "asc" }}
        />
      </div>

      <BayDetailDrawer open={!!view} record={view} onClose={() => setView(null)} />
    </div>
  );
}

function BayDetailDrawer({ open, record, onClose }: { open: boolean; record: Bay | null; onClose: () => void }) {
  if (!record) return null;
  const m = bayStatusBadge(record.status);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record.code}</SheetTitle>
            <span className="text-[12px] text-muted-foreground">{record.name} · {record.workshop}</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge variant={m.variant} pulse={m.pulse}>{record.status}</StatusBadge>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Close drawer"><Download className="h-4 w-4 rotate-45" /></button>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Bay Name" value={record.name} />
            <DetailField label="Type" value={record.type} />
            <DetailField label="Workshop" value={record.workshop} />
            <DetailField label="Status" value={record.status} />
            <DetailField label="Current Job" value={record.currentJobNo ?? "-"} mono />
            <DetailField label="Current Vehicle" value={record.currentVehicle ?? "-"} mono />
            <DetailField label="Mechanic" value={record.mechanic ?? "-"} />
            <DetailField label="Occupied Since" value={record.occupiedSince ? formatDateTime(record.occupiedSince) : "-"} mono />
            <DetailField label="Est. Release" value={record.estimatedRelease ? formatDateTime(record.estimatedRelease) : "-"} mono />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
          <Btn variant="primary" onClick={() => toast("Generating PDF", { description: record.code })}>Print Bay Card</Btn>
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

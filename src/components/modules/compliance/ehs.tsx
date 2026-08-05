"use client";

import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import {
  Plus,
  Download,
  ChevronDown,
  AlertTriangle,
  ClipboardCheck,
  CheckCircle2,
  Activity,
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
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EHS_INCIDENTS,
  EHS_SEVERITIES,
  EHS_STATUSES,
  type EhsIncident,
  type EhsSeverity,
  type EhsStatus,
  formatDate,
  ehsSeverityBadge,
  ehsStatusBadge,
  FieldLabel,
  toInputDate,
  daysAgo,
} from "./_helpers";

export function EhsIncidentsTab() {
  const [rows, setRows] = useState<EhsIncident[]>(EHS_INCIDENTS);
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<EhsIncident | null>(null);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.incidentNo.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.reporter.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      );
    }
    if (sevFilter.size > 0) r = r.filter((s) => sevFilter.has(s.severity));
    if (statusFilter.size > 0) r = r.filter((s) => statusFilter.has(s.status));
    return r;
  }, [rows, search, sevFilter, statusFilter]);

  const toggle = (set: Set<string>, fn: (s: Set<string>) => void, v: string) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    fn(n);
  };

  const open = rows.filter((r) => r.status === "Open").length;
  const investigating = rows.filter((r) => r.status === "Investigating").length;
  const closed = rows.filter((r) => r.status === "Closed" || r.status === "Mitigated").length;
  const totalInjured = rows.reduce((s, r) => s + r.injuredCount, 0);

  const columns: Column<EhsIncident>[] = [
    { key: "incidentNo", header: "Incident #", sortable: true, width: "130px", sortValue: (r) => r.incidentNo, render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{r.incidentNo}</span> },
    { key: "date", header: "Date", sortable: true, width: "120px", sortValue: (r) => r.date, render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.date)}</span> },
    { key: "category", header: "Category", sortable: true, width: "150px", sortValue: (r) => r.category, render: (r) => <span className="text-[12.5px] font-medium text-foreground">{r.category}</span> },
    { key: "location", header: "Location", sortable: true, width: "170px", hideOnMobile: true, sortValue: (r) => r.location, render: (r) => <span className="text-[12px] text-muted-foreground">{r.location}</span> },
    { key: "reporter", header: "Reporter", sortable: true, width: "150px", hideOnMobile: true, sortValue: (r) => r.reporter, render: (r) => <span className="text-[12px] text-muted-foreground">{r.reporter}</span> },
    {
      key: "severity",
      header: "Severity",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.severity,
      render: (r) => {
        const m = ehsSeverityBadge(r.severity);
        return <StatusBadge variant={m.variant} pulse={m.pulse}>{r.severity}</StatusBadge>;
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.status,
      render: (r) => {
        const m = ehsStatusBadge(r.status);
        return <StatusBadge variant={m.variant} pulse={m.pulse}>{r.status}</StatusBadge>;
      },
    },
  ];

  const rowActions = [
    { label: "View", onClick: (s: EhsIncident) => setView(s) },
    {
      label: "Investigate",
      onClick: (s: EhsIncident) => {
        setRows((prev) => prev.map((r) => (r.id === s.id ? { ...r, status: "Investigating" } : r)));
        toast.success(`Investigation started`, { description: s.incidentNo });
      },
    },
    {
      label: "Close",
      onClick: (s: EhsIncident) => {
        setRows((prev) => prev.map((r) => (r.id === s.id ? { ...r, status: "Closed", closedDate: new Date().toISOString() } : r)));
        toast.success(`Incident closed`, { description: s.incidentNo });
      },
    },
  ];

  const bulkActions = [
    { label: "Export", onClick: (sel: EhsIncident[]) => toast(`${sel.length} incident${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }) },
  ];

  const sevLabel = sevFilter.size === 0 ? "All" : sevFilter.size === 1 ? Array.from(sevFilter)[0] : `${sevFilter.size} selected`;
  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">EHS Incidents</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} incidents · {open + investigating} active · {closed} closed · {totalInjured} injuries
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting", { description: "CSV file generated" })}>Export</Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>Report Incident</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Incidents</span><AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{rows.length}</span>
          <span className="text-[11px] text-muted-foreground tabular">{closed} closed</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Open</span><Activity className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{open + investigating}</span>
          <span className="text-[11px] text-muted-foreground tabular">under investigation</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Closed</span><CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{closed}</span>
          <span className="text-[11px] text-muted-foreground tabular">{rows.length === 0 ? 0 : Math.round((closed / rows.length) * 100)}% close rate</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Injuries</span><ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{totalInjured}</span>
          <span className="text-[11px] text-muted-foreground tabular">across all incidents</span>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search incident, location, category, reporter…" className="max-w-[260px]" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Severity:</span>
                <span className="max-w-[100px] truncate">{sevLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by severity</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {EHS_SEVERITIES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={sevFilter.has(s)} onCheckedChange={() => toggle(sevFilter, setSevFilter, s)} className="text-[13px]">{s}</DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
              {EHS_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggle(statusFilter, setStatusFilter, s)} className="text-[13px]">{s}</DropdownMenuCheckboxItem>
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
          emptyTitle="No EHS incidents"
          emptyDescription="Report an incident to start the investigation workflow."
          initialSort={{ key: "date", dir: "desc" }}
        />
      </div>

      <EhsDrawer open={addOpen} onClose={() => setAddOpen(false)} onSave={(d) => {
        const newRec: EhsIncident = {
          id: `ehs-${String(rows.length + 1).padStart(3, "0")}`,
          incidentNo: `INC-${String(2400 + rows.length).padStart(4, "0")}`,
          date: d.date ?? daysAgo(0),
          location: d.location ?? "",
          category: d.category ?? "",
          severity: (d.severity ?? "Medium") as EhsSeverity,
          status: "Open",
          description: d.description ?? "",
          reporter: d.reporter ?? "",
          injuredCount: d.injuredCount ?? 0,
        };
        setRows((prev) => [newRec, ...prev]);
        toast.success(`Incident reported`, { description: newRec.incidentNo });
        setAddOpen(false);
      }} />

      <EhsDetailDrawer open={!!view} record={view} onClose={() => setView(null)} />
    </div>
  );
}

function EhsDrawer({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (d: Partial<EhsIncident>) => void }) {
  const [date, setDate] = useState(toInputDate(daysAgo(0)));
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState<EhsSeverity>("Medium");
  const [reporter, setReporter] = useState("");
  const [injuredCount, setInjuredCount] = useState("0");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!location.trim()) { toast("Location is required"); return; }
    if (!category.trim()) { toast("Category is required"); return; }
    if (!description.trim()) { toast("Description is required"); return; }
    onSave({
      date: new Date(date).toISOString(),
      location,
      category,
      severity,
      reporter: reporter || "Anonymous",
      injuredCount: Number(injuredCount) || 0,
      description,
    });
    setLocation(""); setCategory(""); setReporter(""); setInjuredCount("0"); setDescription("");
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">Report EHS Incident</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">Capture a safety, environmental or health incident</SheetDescription>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Close drawer"><Plus className="h-4 w-4 rotate-45" /></button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel required>Date</FieldLabel>
              <Input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div>
              <FieldLabel required>Severity</FieldLabel>
              <Select value={severity} onValueChange={(v) => setSeverity(v as EhsSeverity)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>{EHS_SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Location</FieldLabel>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bhiwandi Godown" className="h-8 rounded-[5px] text-[13px]" />
            </div>
            <div>
              <FieldLabel required>Category</FieldLabel>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Slip & Fall, Fire Hazard" className="h-8 rounded-[5px] text-[13px]" />
            </div>
            <div>
              <FieldLabel>Reporter</FieldLabel>
              <Input value={reporter} onChange={(e) => setReporter(e.target.value)} placeholder="e.g. Rohit Sharma" className="h-8 rounded-[5px] text-[13px]" />
            </div>
            <div>
              <FieldLabel>Injured Count</FieldLabel>
              <Input value={injuredCount} onChange={(e) => setInjuredCount(e.target.value)} type="number" min="0" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel required>Description</FieldLabel>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what happened, contributing factors, immediate actions taken…" className="min-h-[100px] rounded-[5px] text-[13px]" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSubmit}>Report Incident</Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EhsDetailDrawer({ open, record, onClose }: { open: boolean; record: EhsIncident | null; onClose: () => void }) {
  if (!record) return null;
  const sm = ehsSeverityBadge(record.severity);
  const stm = ehsStatusBadge(record.status);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record.incidentNo}</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">{record.category} · {record.location}</SheetDescription>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge variant={sm.variant} pulse={sm.pulse}>{record.severity}</StatusBadge>
            <StatusBadge variant={stm.variant} pulse={stm.pulse}>{record.status}</StatusBadge>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Close drawer"><Plus className="h-4 w-4 rotate-45" /></button>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Date" value={formatDate(record.date)} mono />
            <DetailField label="Reporter" value={record.reporter} />
            <DetailField label="Injured Count" value={String(record.injuredCount)} mono />
            <DetailField label="Closed Date" value={record.closedDate ? formatDate(record.closedDate) : "-"} mono />
          </div>
          <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Description</div>
            <p className="text-[12.5px] text-foreground leading-relaxed">{record.description}</p>
          </div>
          {record.rootCause && (
            <div className="mt-3 rounded-[6px] border border-border bg-card px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Root Cause</div>
              <p className="text-[12.5px] text-foreground leading-relaxed">{record.rootCause}</p>
            </div>
          )}
          {record.correctiveAction && (
            <div className="mt-3 rounded-[6px] border border-border bg-card px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Corrective Action</div>
              <p className="text-[12.5px] text-foreground leading-relaxed">{record.correctiveAction}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
          <Btn variant="primary" onClick={() => toast("Generating PDF", { description: record.incidentNo })}>Print Report</Btn>
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

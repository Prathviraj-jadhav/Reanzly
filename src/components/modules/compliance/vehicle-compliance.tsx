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
  FileText,
  CheckCircle2,
  AlertTriangle,
  CalendarClock,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  VEHICLE_COMPLIANCE_DOCS,
  VEHICLE_DOC_TYPES,
  DOC_STATUSES,
  type VehicleComplianceDoc,
  type VehicleDocType,
  type DocStatus,
  formatINR,
  formatDate,
  docStatusMeta,
  FieldLabel,
  toInputDate,
  daysAgo,
  daysAhead,
} from "./_helpers";

export function VehicleComplianceTab() {
  const [rows, setRows] = useState<VehicleComplianceDoc[]>(VEHICLE_COMPLIANCE_DOCS);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<VehicleComplianceDoc | null>(null);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.docNo.toLowerCase().includes(q) ||
          s.vehicle.toLowerCase().includes(q) ||
          s.docType.toLowerCase().includes(q) ||
          (s.refNo ?? "").toLowerCase().includes(q) ||
          (s.authority ?? "").toLowerCase().includes(q),
      );
    }
    if (typeFilter.size > 0) r = r.filter((s) => typeFilter.has(s.docType));
    if (statusFilter.size > 0) r = r.filter((s) => statusFilter.has(s.status));
    return r;
  }, [rows, search, typeFilter, statusFilter]);

  const toggle = (set: Set<string>, fn: (s: Set<string>) => void, v: string) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    fn(n);
  };

  const expired = rows.filter((r) => r.status === "Expired").length;
  const expiring = rows.filter((r) => r.status === "Expiring Soon").length;
  const valid = rows.filter((r) => r.status === "Valid").length;

  const columns: Column<VehicleComplianceDoc>[] = [
    {
      key: "docNo",
      header: "Doc #",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.docNo,
      render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{r.docNo}</span>,
    },
    {
      key: "vehicle",
      header: "Vehicle",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.vehicle,
      render: (r) => <span className="tabular text-[12px] text-foreground">{r.vehicle}</span>,
    },
    {
      key: "docType",
      header: "Document",
      sortable: true,
      sortValue: (r) => r.docType,
      render: (r) => <span className="text-[12.5px] font-medium text-foreground">{r.docType}</span>,
    },
    {
      key: "authority",
      header: "Authority",
      sortable: true,
      width: "160px",
      hideOnMobile: true,
      sortValue: (r) => r.authority ?? "",
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.authority ?? "-"}</span>,
    },
    {
      key: "issueDate",
      header: "Issued",
      sortable: true,
      width: "110px",
      hideOnMobile: true,
      sortValue: (r) => r.issueDate,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.issueDate)}</span>,
    },
    {
      key: "expiryDate",
      header: "Expiry",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.expiryDate,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.expiryDate)}</span>,
    },
    {
      key: "cost",
      header: "Cost",
      sortable: true,
      align: "right",
      width: "100px",
      hideOnMobile: true,
      sortValue: (r) => r.cost ?? 0,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.cost ? formatINR(r.cost) : "-"}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.status,
      render: (r) => {
        const m = docStatusMeta(r.status, r.expiryDate);
        return <StatusBadge variant={m.variant} pulse={m.pulse}>{m.label}</StatusBadge>;
      },
    },
  ];

  const rowActions = [
    { label: "View", onClick: (s: VehicleComplianceDoc) => setView(s) },
    {
      label: "Renew",
      onClick: (s: VehicleComplianceDoc) => {
        setRows((prev) =>
          prev.map((r) =>
            r.id === s.id
              ? { ...r, status: "Submitted", issueDate: new Date().toISOString(), expiryDate: daysAhead(365) }
              : r,
          ),
        );
        toast.success(`Renewal submitted`, { description: `${s.docType} · ${s.vehicle}` });
      },
    },
    { label: "Print", onClick: (s: VehicleComplianceDoc) => toast("Generating PDF", { description: s.docNo }) },
  ];

  const bulkActions = [
    { label: "Export", onClick: (sel: VehicleComplianceDoc[]) => toast(`${sel.length} doc${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }) },
  ];

  const typeLabel = typeFilter.size === 0 ? "All" : typeFilter.size === 1 ? Array.from(typeFilter)[0] : `${typeFilter.size} selected`;
  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Vehicle Compliance</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} docs · {valid} valid · {expiring} expiring · {expired} expired
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting", { description: "CSV file generated" })}>Export</Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>New Document</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Docs</span>
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{rows.length}</span>
          <span className="text-[11px] text-muted-foreground tabular">{VEHICLE_DOC_TYPES.length} doc types</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Valid</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{valid}</span>
          <span className="text-[11px] text-muted-foreground tabular">{rows.length === 0 ? 0 : Math.round((valid / rows.length) * 100)}% rate</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Expiring Soon</span>
            <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{expiring}</span>
          <span className="text-[11px] text-muted-foreground tabular">within 30 days</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Expired</span>
            <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{expired}</span>
          <span className="text-[11px] text-muted-foreground tabular">requires renewal</span>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search doc, vehicle, type, authority…" className="max-w-[260px]" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Type:</span>
                <span className="max-w-[100px] truncate">{typeLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {VEHICLE_DOC_TYPES.map((t) => (
                <DropdownMenuCheckboxItem key={t} checked={typeFilter.has(t)} onCheckedChange={() => toggle(typeFilter, setTypeFilter, t)} className="text-[13px]">{t}</DropdownMenuCheckboxItem>
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
              {DOC_STATUSES.map((s) => (
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
          emptyTitle="No vehicle documents"
          emptyDescription="Add an RC, fitness, PUC, permit or insurance doc to track."
          initialSort={{ key: "expiryDate", dir: "asc" }}
        />
      </div>

      <DocDrawer open={addOpen} onClose={() => setAddOpen(false)} onSave={(d) => {
        const newRec: VehicleComplianceDoc = {
          id: `vdoc-${String(rows.length + 1).padStart(3, "0")}`,
          docNo: `RZ-VC-${String(1100 + rows.length).padStart(4, "0")}`,
          vehicle: d.vehicle ?? "",
          docType: (d.docType ?? "Fitness Certificate") as VehicleDocType,
          issueDate: d.issueDate ?? daysAgo(0),
          expiryDate: d.expiryDate ?? daysAhead(365),
          status: "Submitted",
          authority: d.authority,
          refNo: d.refNo,
          cost: d.cost,
        };
        setRows((prev) => [newRec, ...prev]);
        toast.success(`Vehicle document added`, { description: newRec.docNo });
        setAddOpen(false);
      }} />

      <DocDetailDrawer open={!!view} record={view} onClose={() => setView(null)} />
    </div>
  );
}

function DocDrawer({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (d: Partial<VehicleComplianceDoc>) => void }) {
  const [vehicle, setVehicle] = useState("");
  const [docType, setDocType] = useState<VehicleDocType>("Fitness Certificate");
  const [issueDate, setIssueDate] = useState(toInputDate(daysAgo(0)));
  const [expiryDate, setExpiryDate] = useState(toInputDate(daysAhead(365)));
  const [authority, setAuthority] = useState("");
  const [refNo, setRefNo] = useState("");
  const [cost, setCost] = useState("");

  const handleSubmit = () => {
    if (!vehicle.trim()) { toast("Vehicle is required"); return; }
    onSave({
      vehicle,
      docType,
      issueDate: new Date(issueDate).toISOString(),
      expiryDate: new Date(expiryDate).toISOString(),
      authority: authority || undefined,
      refNo: refNo || undefined,
      cost: cost ? Number(cost) : undefined,
    });
    setVehicle(""); setAuthority(""); setRefNo(""); setCost("");
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">New Vehicle Document</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">Register an RC, fitness, PUC, permit or insurance</SheetDescription>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Close drawer"><Plus className="h-4 w-4 rotate-45" /></button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel required>Vehicle</FieldLabel>
              <Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="MH 14 AB 1234" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div>
              <FieldLabel required>Document Type</FieldLabel>
              <Select value={docType} onValueChange={(v) => setDocType(v as VehicleDocType)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>{VEHICLE_DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Issue Date</FieldLabel>
              <Input value={issueDate} onChange={(e) => setIssueDate(e.target.value)} type="date" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div>
              <FieldLabel required>Expiry Date</FieldLabel>
              <Input value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} type="date" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div>
              <FieldLabel>Authority</FieldLabel>
              <Input value={authority} onChange={(e) => setAuthority(e.target.value)} placeholder="e.g. RTO Thane" className="h-8 rounded-[5px] text-[13px]" />
            </div>
            <div>
              <FieldLabel>Reference #</FieldLabel>
              <Input value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="REF-00000000" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel hint="optional">Cost (₹)</FieldLabel>
              <Input value={cost} onChange={(e) => setCost(e.target.value)} type="number" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSubmit}>Add Document</Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DocDetailDrawer({ open, record, onClose }: { open: boolean; record: VehicleComplianceDoc | null; onClose: () => void }) {
  if (!record) return null;
  const m = docStatusMeta(record.status, record.expiryDate);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record.docNo}</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">{record.docType} · {record.vehicle}</SheetDescription>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge variant={m.variant} pulse={m.pulse}>{m.label}</StatusBadge>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Close drawer"><Plus className="h-4 w-4 rotate-45" /></button>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Vehicle" value={record.vehicle} mono />
            <DetailField label="Document Type" value={record.docType} />
            <DetailField label="Authority" value={record.authority ?? "-"} />
            <DetailField label="Reference #" value={record.refNo ?? "-"} mono />
            <DetailField label="Issue Date" value={formatDate(record.issueDate)} mono />
            <DetailField label="Expiry Date" value={formatDate(record.expiryDate)} mono />
            <DetailField label="Cost" value={record.cost ? formatINR(record.cost) : "-"} mono />
            <DetailField label="Status" value={record.status} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
          <Btn variant="primary" onClick={() => toast("Generating PDF", { description: record.docNo })}>Print Doc</Btn>
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

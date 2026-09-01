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
  STATUTORY_FILINGS,
  FILING_TYPES,
  FILING_STATUSES,
  type StatutoryFiling,
  type FilingType,
  type FilingStatus,
  formatINR,
  formatINRCompact,
  formatDate,
  filingStatusBadge,
  FieldLabel,
  toInputDate,
  daysAhead,
} from "./_helpers";

export function StatutoryFilingsTab() {
  const [rows, setRows] = useState<StatutoryFiling[]>(STATUTORY_FILINGS);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<StatutoryFiling | null>(null);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.filingNo.toLowerCase().includes(q) ||
          s.type.toLowerCase().includes(q) ||
          s.period.toLowerCase().includes(q) ||
          (s.arn ?? "").toLowerCase().includes(q) ||
          (s.filedBy ?? "").toLowerCase().includes(q),
      );
    }
    if (typeFilter.size > 0) r = r.filter((s) => typeFilter.has(s.type));
    if (statusFilter.size > 0) r = r.filter((s) => statusFilter.has(s.status));
    return r;
  }, [rows, search, typeFilter, statusFilter]);

  const toggle = (set: Set<string>, fn: (s: Set<string>) => void, v: string) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    fn(n);
  };

  const filed = rows.filter((r) => r.status === "Filed").length;
  const pending = rows.filter((r) => r.status === "Pending").length;
  const overdue = rows.filter((r) => r.status === "Overdue").length;
  const totalLiability = rows.reduce((s, r) => s + r.liability, 0);

  const columns: Column<StatutoryFiling>[] = [
    {
      key: "filingNo",
      header: "Filing #",
      sortable: true,
      width: "140px",
      sortValue: (r) => r.filingNo,
      render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{r.filingNo}</span>,
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.type,
      render: (r) => <span className="text-[12.5px] font-medium text-foreground">{r.type}</span>,
    },
    {
      key: "period",
      header: "Period",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.period,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.period}</span>,
    },
    {
      key: "dueDate",
      header: "Due Date",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.dueDate,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.dueDate)}</span>,
    },
    {
      key: "filedDate",
      header: "Filed",
      sortable: true,
      width: "120px",
      hideOnMobile: true,
      sortValue: (r) => r.filedDate ?? "",
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {r.filedDate ? formatDate(r.filedDate) : "-"}
        </span>
      ),
    },
    {
      key: "liability",
      header: "Liability",
      sortable: true,
      align: "right",
      width: "120px",
      sortValue: (r) => r.liability,
      render: (r) => <span className="tabular text-[12px] text-foreground">{formatINRCompact(r.liability)}</span>,
    },
    {
      key: "paid",
      header: "Paid",
      sortable: true,
      align: "right",
      width: "120px",
      hideOnMobile: true,
      sortValue: (r) => r.paid,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatINRCompact(r.paid)}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.status,
      render: (r) => {
        const m = filingStatusBadge(r.status);
        return <StatusBadge variant={m.variant} pulse={m.pulse}>{r.status}</StatusBadge>;
      },
    },
  ];

  const rowActions = [
    { label: "View", onClick: (s: StatutoryFiling) => setView(s) },
    {
      label: "Mark Filed",
      onClick: (s: StatutoryFiling) => {
        setRows((prev) =>
          prev.map((r) =>
            r.id === s.id
              ? {
                  ...r,
                  status: "Filed" as FilingStatus,
                  filedDate: new Date().toISOString(),
                  filedBy: "Reena Mehta",
                  arn: `ARN-${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
                  paid: r.liability,
                }
              : r,
          ),
        );
        toast.success(`Filing submitted`, { description: `${s.type} - ${s.period}` });
      },
    },
    { label: "Print", onClick: (s: StatutoryFiling) => toast("Generating PDF", { description: s.filingNo }) },
  ];

  const bulkActions = [
    { label: "Export", onClick: (sel: StatutoryFiling[]) => toast(`${sel.length} filing${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }) },
  ];

  const typeLabel = typeFilter.size === 0 ? "All" : typeFilter.size === 1 ? Array.from(typeFilter)[0] : `${typeFilter.size} selected`;
  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Statutory Filings</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} filings · {filed} filed · {pending} pending · {overdue} overdue
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting", { description: "CSV file generated" })}>Export</Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>New Filing</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Filings</span>
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{rows.length}</span>
          <span className="text-[11px] text-muted-foreground tabular">{filed} filed</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Filed On Time</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{filed}</span>
          <span className="text-[11px] text-muted-foreground tabular">{rows.length === 0 ? 0 : Math.round((filed / rows.length) * 100)}% rate</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Overdue</span>
            <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{overdue}</span>
          <span className="text-[11px] text-muted-foreground tabular">penalty accruing</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Liability</span>
            <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{formatINRCompact(totalLiability)}</span>
          <span className="text-[11px] text-muted-foreground tabular">across all filings</span>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search filing, type, period, ARN…" className="max-w-[260px]" />
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
              {FILING_TYPES.map((t) => (
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
              {FILING_STATUSES.map((s) => (
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
          emptyTitle="No filings"
          emptyDescription="Create a statutory filing to track GST, TDS, PT, ESI, PF returns."
          initialSort={{ key: "dueDate", dir: "asc" }}
        />
      </div>

      <FilingDrawer open={addOpen} onClose={() => setAddOpen(false)} onSave={(d) => {
        const newRec: StatutoryFiling = {
          id: `fil-${String(rows.length + 1).padStart(3, "0")}`,
          filingNo: `RZ-FIL-${String(2400 + rows.length).padStart(4, "0")}`,
          type: (d.type ?? "GSTR-3B") as FilingType,
          period: d.period ?? "",
          dueDate: d.dueDate ?? daysAhead(7),
          status: "Draft",
          liability: d.liability ?? 0,
          paid: 0,
        };
        setRows((prev) => [newRec, ...prev]);
        toast.success(`Filing created`, { description: newRec.filingNo });
        setAddOpen(false);
      }} />

      <FilingDetailDrawer open={!!view} record={view} onClose={() => setView(null)} />
    </div>
  );
}

function FilingDrawer({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (d: Partial<StatutoryFiling>) => void }) {
  const [type, setType] = useState<FilingType>("GSTR-3B");
  const [period, setPeriod] = useState("");
  const [dueDate, setDueDate] = useState(toInputDate(daysAhead(7)));
  const [liability, setLiability] = useState("");

  const handleSubmit = () => {
    if (!period.trim()) { toast("Period is required"); return; }
    onSave({ type, period, dueDate: new Date(dueDate).toISOString(), liability: Number(liability) || 0 });
    setPeriod(""); setLiability(""); setDueDate(toInputDate(daysAhead(7)));
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">New Statutory Filing</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">Track a GST, TDS, PT, ESI or PF return</SheetDescription>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Close drawer"><Plus className="h-4 w-4 rotate-45" /></button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel required>Filing Type</FieldLabel>
              <Select value={type} onValueChange={(v) => setType(v as FilingType)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>{FILING_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Period</FieldLabel>
              <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="e.g. Aug 2025 / Q2 FY25-26" className="h-8 rounded-[5px] text-[13px]" />
            </div>
            <div>
              <FieldLabel required>Due Date</FieldLabel>
              <Input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div>
              <FieldLabel>Estimated Liability (₹)</FieldLabel>
              <Input value={liability} onChange={(e) => setLiability(e.target.value)} type="number" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSubmit}>Create Filing</Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FilingDetailDrawer({ open, record, onClose }: { open: boolean; record: StatutoryFiling | null; onClose: () => void }) {
  if (!record) return null;
  const m = filingStatusBadge(record.status);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record.filingNo}</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">{record.type} · {record.period}</SheetDescription>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge variant={m.variant} pulse={m.pulse}>{record.status}</StatusBadge>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Close drawer"><Plus className="h-4 w-4 rotate-45" /></button>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Due Date" value={formatDate(record.dueDate)} mono />
            <DetailField label="Filed Date" value={record.filedDate ? formatDate(record.filedDate) : "-"} mono />
            <DetailField label="ARN" value={record.arn ?? "-"} mono />
            <DetailField label="Filed By" value={record.filedBy ?? "-"} />
            <DetailField label="Liability" value={formatINR(record.liability)} mono />
            <DetailField label="Paid" value={formatINR(record.paid)} mono />
            <DetailField label="Balance" value={formatINR(record.liability - record.paid)} mono />
            <DetailField label="Status" value={record.status} />
          </div>
          {record.remarks && (
            <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Remarks</div>
              <p className="text-[12.5px] text-foreground">{record.remarks}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
          <Btn variant="primary" onClick={() => toast("Generating PDF", { description: record.filingNo })}>Print Receipt</Btn>
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import { SectionCard } from "@/components/shared/section-card";
import {
  Download,
  ChevronDown,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  CalendarClock,
  FilePlus,
  Printer,
  Landmark,
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
import {
  STATUTORY_TYPES,
  type StatutoryReturn,
  type StatutoryType,
  formatINR,
  formatINRCompact,
  formatDate,
  daysUntil,
  dueTone,
  statutoryReturnStatusBadge,
  SheetCloseBtn,
  SectionTitle,
  DetailField,
  BreakdownRow,
} from "./_helpers";

const TYPE_LABELS: Record<StatutoryType, { due: string; portal: string; note: string }> = {
  PF: { due: "15th of following month", portal: "EPFO Unified Portal", note: "EPFO return - employer + employee PF contributions deposited monthly via challan. Due by 15th of following month." },
  ESI: { due: "15th of following month", portal: "ESIC Employer Portal", note: "ESIC return - 4.75% employer + 1.75% employee. Applicable if any employee earns at most INR 21,000/month. Due by 15th." },
  TDS: { due: "31st of quarter-end + 1 month", portal: "TRACES / NSDL", note: "TDS Quarterly - Form 24Q. Salary TDS deducted as per Income Tax slabs. Due 31st of quarter-end month + 1." },
  "Professional Tax": { due: "30th of following month", portal: "Maharashtra GST PT Portal", note: "State-specific PT slab. Maharashtra: INR 200/month. Due by 30th of following month." },
};

export function StatutoryTab() {
  const [rows, setRows] = useState<StatutoryReturn[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [view, setView] = useState<StatutoryReturn | null>(null);
  const [genOpen, setGenOpen] = useState<StatutoryType | null>(null);

  const load = () => {
    fetch("/api/payroll/statutory")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(({ returns }) => setRows(returns))
      .catch(() => toast.error("Couldn't load statutory returns", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.type.toLowerCase().includes(q) ||
          s.period.toLowerCase().includes(q) ||
          (s.challanNo ?? "").toLowerCase().includes(q) ||
          (s.filedBy ?? "").toLowerCase().includes(q) ||
          (s.acknowledgementNo ?? "").toLowerCase().includes(q),
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
  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);

  const generateChallan = async (type: StatutoryType) => {
    const period = type === "TDS" ? "Q2 FY25-26" : new Date().toISOString().slice(0, 7);
    try {
      const res = await fetch("/api/payroll/statutory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, period }),
      });
      if (!res.ok) throw new Error();
      const { return: created } = await res.json();
      setRows((prev) => [created, ...prev]);
      setGenOpen(null);
      toast.success(`Challan generated`, { description: `${type} - ${period}` });
    } catch {
      toast.error("Couldn't generate challan", { description: "Try again." });
    }
  };

  const markFiled = async (s: StatutoryReturn) => {
    try {
      const res = await fetch(`/api/payroll/statutory/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-filed" }),
      });
      if (!res.ok) throw new Error();
      const { return: updated } = await res.json();
      setRows((prev) => prev.map((r) => (r.id === s.id ? updated : r)));
      toast.success(`Return filed`, { description: `${s.type} - ${s.period}` });
    } catch {
      toast.error("Couldn't file return", { description: "Try again." });
    }
  };

  const columns: Column<StatutoryReturn>[] = [
    {
      key: "type",
      header: "Type",
      sortable: true,
      width: "160px",
      sortValue: (r) => r.type,
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-border bg-card">
            <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[12.5px] font-medium text-foreground">{r.type}</span>
        </div>
      ),
    },
    { key: "period", header: "Period", sortable: true, width: "140px", sortValue: (r) => r.period, render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.period}</span> },
    {
      key: "dueDate",
      header: "Due Date",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.dueDate,
      render: (r) => {
        const tone = dueTone(r.dueDate);
        const days = daysUntil(r.dueDate);
        return (
          <div className="flex flex-col gap-0.5">
            <span className="tabular text-[12px] text-foreground">{formatDate(r.dueDate)}</span>
            {r.status !== "Filed" && (
              <span className={"text-[10px] tabular " + (tone === "overdue" ? "font-medium text-foreground" : "text-muted-foreground")}>
                {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "due today" : `in ${days}d`}
              </span>
            )}
          </div>
        );
      },
    },
    { key: "filedDate", header: "Filed Date", sortable: true, width: "120px", hideOnMobile: true, sortValue: (r) => r.filedDate ?? "", render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.filedDate ? formatDate(r.filedDate) : "-"}</span> },
    { key: "challanNo", header: "Challan #", sortable: true, width: "150px", hideOnMobile: true, sortValue: (r) => r.challanNo ?? "", render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.challanNo ?? "-"}</span> },
    { key: "amount", header: "Amount", sortable: true, align: "right", width: "120px", sortValue: (r) => r.amount, render: (r) => <span className="tabular text-[12.5px] font-medium text-foreground">{formatINRCompact(r.amount)}</span> },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.status,
      render: (r) => {
        const m = statutoryReturnStatusBadge(r.status);
        return <StatusBadge variant={m.variant} pulse={m.pulse}>{r.status}</StatusBadge>;
      },
    },
  ];

  const rowActions: { label: string; onClick: (s: StatutoryReturn) => void }[] = [
    { label: "View Details", onClick: (s) => setView(s) },
    {
      label: "Mark as Filed",
      onClick: (s) => {
        if (s.status === "Filed") { toast("Return already filed", { description: `${s.type} - ${s.period}` }); return; }
        markFiled(s);
      },
    },
    { label: "Print Challan", onClick: (s) => toast("Generating PDF", { description: s.challanNo ?? `${s.type} challan` }) },
    { label: "Download Acknowledgement", onClick: (s) => toast("Downloading acknowledgement", { description: s.acknowledgementNo ?? "Not yet available" }) },
  ];

  const bulkActions = [
    { label: "Export", onClick: (sel: StatutoryReturn[]) => toast(`${sel.length} return${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }) },
    {
      label: "Mark Selected as Filed",
      onClick: (sel: StatutoryReturn[]) => {
        sel.forEach((s) => s.status !== "Filed" && markFiled(s));
      },
    },
  ];

  const typeLabel = typeFilter.size === 0 ? "All" : typeFilter.size === 1 ? Array.from(typeFilter)[0] : `${typeFilter.size} selected`;
  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;

  // Group by type for the side summary
  const byType = useMemo(() => {
    return STATUTORY_TYPES.map((t) => {
      const matching = rows.filter((r) => r.type === t);
      const pending = matching.filter((r) => r.status !== "Filed").length;
      const total = matching.reduce((s, r) => s + r.amount, 0);
      return { type: t, count: matching.length, pending, total };
    });
  }, [rows]);

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading statutory returns…</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Statutory Returns</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} returns · {filed} filed · {pending} pending · {overdue} overdue · total {formatINRCompact(totalAmount)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Btn variant="primary" icon={<FilePlus className="h-3.5 w-3.5" />} iconRight={<ChevronDown className="h-3 w-3" />}>Generate Challan</Btn>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Select statutory type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {STATUTORY_TYPES.map((t) => (
                <DropdownMenuItem key={t} onClick={() => setGenOpen(t)} className="text-[13px]">{t}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting", { description: "CSV file generated" })}>Export</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Returns</span><ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{rows.length}</span>
          <span className="text-[11px] text-muted-foreground tabular">{STATUTORY_TYPES.length} types tracked</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Filed</span><CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{filed}</span>
          <span className="text-[11px] text-muted-foreground tabular">{rows.length === 0 ? 0 : Math.round((filed / rows.length) * 100)}% rate</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Overdue</span><AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{overdue}</span>
          <span className="text-[11px] text-muted-foreground tabular">penalty accruing</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Liability</span><CalendarClock className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{formatINRCompact(totalAmount)}</span>
          <span className="text-[11px] text-muted-foreground tabular">across all returns</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3 rounded-[6px] border border-border bg-card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
            <SearchInput value={search} onChange={setSearch} placeholder="Search type, period, challan..." className="max-w-[260px]" />
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
                {STATUTORY_TYPES.map((t) => (
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
                {(["Filed", "Pending", "Overdue"] as const).map((s) => (
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
            emptyTitle="No statutory returns"
            emptyDescription="Generate a challan to start tracking a return."
            initialSort={{ key: "dueDate", dir: "asc" }}
          />
        </div>

        {/* Type-wise summary */}
        <SectionCard title="By Type" description="Pending vs filed" icon={<ShieldCheck className="h-4 w-4" />} flush>
          <div className="divide-y divide-border">
            {byType.map((t) => (
              <div key={t.type} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-medium text-foreground">{t.type}</span>
                  {t.pending > 0 ? (
                    <StatusBadge variant="outline" pulse>{t.pending} pending</StatusBadge>
                  ) : (
                    <StatusBadge variant="solid">All filed</StatusBadge>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground tabular">
                  {t.count} returns · {formatINRCompact(t.total)}
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground"
                    style={{ width: `${(t.count - t.pending) / t.count * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <StatutoryDetailDrawer open={!!view} record={view} onClose={() => setView(null)} onMarkFiled={(s) => { markFiled(s); setView(null); }} />

      {/* Generate challan confirmation */}
      <GenerateChallanDialog open={genOpen !== null} type={genOpen} onClose={() => setGenOpen(null)} onConfirm={(t) => generateChallan(t)} />
    </div>
  );
}

function GenerateChallanDialog({ open, type, onClose, onConfirm }: { open: boolean; type: StatutoryType | null; onClose: () => void; onConfirm: (t: StatutoryType) => void }) {
  if (!type) return null;
  const meta = TYPE_LABELS[type];
  const sampleAmount = type === "PF" ? 43200 : type === "ESI" ? 18600 : type === "TDS" ? 98400 : 2800;
  const period = type === "TDS" ? "Q2 FY25-26" : new Date().toISOString().slice(0, 7);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">Generate {type} Challan</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">Pre-fill return details from current payroll</SheetDescription>
          </div>
          <SheetCloseBtn onClose={onClose} />
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Type" value={type} />
            <DetailField label="Period" value={period} mono />
            <DetailField label="Portal" value={meta.portal} />
            <DetailField label="Due Date Rule" value={meta.due} />
            <DetailField label="Sample Amount" value={formatINR(sampleAmount)} mono />
            <DetailField label="Filing Mode" value="Online challan" />
          </div>
          <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Statutory Note</div>
            <p className="text-[12.5px] text-foreground leading-relaxed">{meta.note}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" icon={<FilePlus className="h-3.5 w-3.5" />} onClick={() => onConfirm(type)}>Generate</Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatutoryDetailDrawer({ open, record, onClose, onMarkFiled }: { open: boolean; record: StatutoryReturn | null; onClose: () => void; onMarkFiled: (s: StatutoryReturn) => void }) {
  if (!record) return null;
  const m = statutoryReturnStatusBadge(record.status);
  const meta = TYPE_LABELS[record.type];
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record.type} Return</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">Period: {record.period}</SheetDescription>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge variant={m.variant} pulse={m.pulse}>{record.status}</StatusBadge>
            <SheetCloseBtn onClose={onClose} />
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {/* Amount hero */}
          <div className="rounded-[6px] border border-foreground bg-foreground text-background px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-background/70">Amount Payable</div>
                <div className="text-[22px] font-medium leading-none tracking-tight tabular">{formatINR(record.amount)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-background/70">Status</div>
                <div className="text-[13px] font-medium">{record.status}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <DetailField label="Type" value={record.type} />
            <DetailField label="Period" value={record.period} mono />
            <DetailField label="Due Date" value={formatDate(record.dueDate)} mono />
            <DetailField label="Filed Date" value={record.filedDate ? formatDate(record.filedDate) : "-"} mono />
            <DetailField label="Challan #" value={record.challanNo ?? "-"} mono />
            <DetailField label="Acknowledgement #" value={record.acknowledgementNo ?? "-"} mono />
            <DetailField label="Filing Portal" value={record.filingPortal ?? meta.portal} />
            <DetailField label="Filed By" value={record.filedBy ?? "-"} />
          </div>

          {/* Filing timeline */}
          <div className="mt-4">
            <SectionTitle>Filing Timeline</SectionTitle>
            <div className="rounded-[6px] border border-border overflow-hidden">
              <BreakdownRow label="Due Date" value={formatDate(record.dueDate)} />
              <BreakdownRow label="Generated On" value={record.filedDate ? formatDate(record.filedDate) : "Pending generation"} muted={!record.filedDate} />
              <BreakdownRow label="Challan Created" value={record.challanNo ?? "Pending"} muted={!record.challanNo} />
              <BreakdownRow label="Payment Confirmed" value={record.acknowledgementNo ? "Yes" : "Pending"} muted={!record.acknowledgementNo} strong />
            </div>
          </div>

          {record.remarks && (
            <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Remarks</div>
              <p className="text-[12.5px] text-foreground">{record.remarks}</p>
            </div>
          )}

          <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Statutory Note</div>
            <p className="text-[12.5px] text-foreground leading-relaxed">{meta.note}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" icon={<Printer className="h-3.5 w-3.5" />} onClick={() => toast("Generating PDF", { description: record.challanNo ?? record.type })}>Print Challan</Btn>
          {record.status !== "Filed" && (
            <Btn variant="primary" icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => onMarkFiled(record)}>Mark as Filed</Btn>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

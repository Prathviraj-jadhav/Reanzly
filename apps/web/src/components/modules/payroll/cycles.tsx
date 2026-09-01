"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Plus,
  Download,
  ChevronDown,
  CalendarClock,
  CheckCircle2,
  Banknote,
  Users,
  Lock,
  Unlock,
  Play,
  Printer,
  Clock,
  ArrowRight,
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
  CYCLE_STATUSES,
  type PayCycle,
  type CycleStatus,
  type AuditEntry,
  formatINR,
  formatINRCompact,
  formatDate,
  formatMonthYear,
  formatMonthShort,
  formatDateTime,
  relativeTime,
  cycleStatusBadge,
  FieldLabel,
  SheetCloseBtn,
  SectionTitle,
  DetailField,
  BreakdownRow,
  daysAhead,
  toInputDate,
} from "./_helpers";

export function PayCyclesTab() {
  const [rows, setRows] = useState<PayCycle[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<PayCycle | null>(null);
  const [viewMode, setViewMode] = useState<"timeline" | "table">("timeline");

  useEffect(() => {
    fetch("/api/payroll/cycles")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(({ cycles }) => setRows(cycles))
      .catch(() => toast.error("Couldn't load pay cycles", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.cycleNo.toLowerCase().includes(q) ||
          s.month.toLowerCase().includes(q) ||
          (s.approvedBy ?? "").toLowerCase().includes(q) ||
          (s.runBy ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter.size > 0) r = r.filter((s) => statusFilter.has(s.status));
    return r;
  }, [rows, search, statusFilter]);

  const toggle = (set: Set<string>, fn: (s: Set<string>) => void, v: string) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    fn(n);
  };

  const disbursed = rows.filter((r) => r.status === "Disbursed").length;
  const processing = rows.filter((r) => r.status === "Processing").length;
  const approved = rows.filter((r) => r.status === "Approved").length;
  const totalNet = rows.reduce((s, r) => s + r.netTotal, 0);

  const patchCycle = async (id: string, body: unknown) => {
    const res = await fetch(`/api/payroll/cycles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false as const, error: data.error || "Try again." };
    setRows((prev) => prev.map((r) => (r.id === id ? data.cycle : r)));
    if (view?.id === id) setView(data.cycle);
    return { ok: true as const, cycle: data.cycle as PayCycle };
  };

  const advanceStatus = async (cycle: PayCycle, target?: CycleStatus) => {
    const result = await patchCycle(cycle.id, { action: "advance", status: target });
    if (result.ok) toast.success(`Cycle advanced to ${result.cycle.status}`, { description: cycle.cycleNo });
    else toast.error("Couldn't advance cycle", { description: result.error });
  };

  const runPayroll = async (cycle: PayCycle) => {
    if (cycle.locked) {
      toast("Cycle is locked", { description: "Unlock the cycle before re-running payroll." });
      return;
    }
    const result = await patchCycle(cycle.id, { action: "run" });
    if (result.ok) {
      toast.success("Payroll run completed", {
        description: `${result.cycle.headcount} payslips generated for ${formatMonthYear(cycle.month)}`,
      });
    } else {
      toast.error("Couldn't run payroll", { description: result.error });
    }
  };

  const toggleLock = async (cycle: PayCycle) => {
    const result = await patchCycle(cycle.id, { action: "toggle-lock" });
    if (result.ok) toast(result.cycle.locked ? "Cycle locked" : "Cycle unlocked", { description: cycle.cycleNo });
    else toast.error("Couldn't update lock state", { description: result.error });
  };

  const columns: Column<PayCycle>[] = [
    { key: "cycleNo", header: "Cycle #", sortable: true, width: "170px", sortValue: (r) => r.cycleNo, render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{r.cycleNo}</span> },
    {
      key: "month",
      header: "Month",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.month,
      render: (r) => <span className="text-[12.5px] font-medium text-foreground">{formatMonthYear(r.month)}</span>,
    },
    {
      key: "headcount",
      header: "Headcount",
      sortable: true,
      align: "right",
      width: "110px",
      sortValue: (r) => r.headcount,
      render: (r) => <span className="tabular text-[12px] text-foreground">{r.headcount}</span>,
    },
    {
      key: "grossTotal",
      header: "Gross",
      sortable: true,
      align: "right",
      width: "130px",
      sortValue: (r) => r.grossTotal,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatINRCompact(r.grossTotal)}</span>,
    },
    {
      key: "deductionsTotal",
      header: "Deductions",
      sortable: true,
      align: "right",
      width: "130px",
      hideOnMobile: true,
      sortValue: (r) => r.deductionsTotal,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatINRCompact(r.deductionsTotal)}</span>,
    },
    {
      key: "employerContribTotal",
      header: "Employer",
      sortable: true,
      align: "right",
      width: "130px",
      hideOnMobile: true,
      sortValue: (r) => r.employerContribTotal,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatINRCompact(r.employerContribTotal)}</span>,
    },
    {
      key: "netTotal",
      header: "Net Payable",
      sortable: true,
      align: "right",
      width: "140px",
      sortValue: (r) => r.netTotal,
      render: (r) => <span className="tabular text-[13px] font-medium text-foreground">{formatINRCompact(r.netTotal)}</span>,
    },
    {
      key: "payDate",
      header: "Pay Date",
      sortable: true,
      width: "120px",
      hideOnMobile: true,
      sortValue: (r) => r.payDate ?? "",
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.payDate ? formatDate(r.payDate) : "-"}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.status,
      render: (r) => {
        const m = cycleStatusBadge(r.status);
        return (
          <div className="flex items-center gap-1.5">
            <StatusBadge variant={m.variant} pulse={m.pulse}>{r.status}</StatusBadge>
            {r.locked ? <Lock className="h-3 w-3 text-muted-foreground" /> : <Unlock className="h-3 w-3 text-muted-foreground/50" />}
          </div>
        );
      },
    },
  ];

  const rowActions: { label: string; onClick: (s: PayCycle) => void; destructive?: boolean }[] = [
    { label: "View Details", onClick: (s) => setView(s) },
    {
      label: "Run Payroll",
      onClick: (s) => {
        if (s.locked) { toast("Cycle is locked", { description: "Unlock the cycle before re-running payroll." }); return; }
        if (s.status !== "Draft" && s.status !== "Processing") { toast("Cycle already past draft stage", { description: s.cycleNo }); return; }
        runPayroll(s);
      },
    },
    {
      label: "Approve Cycle",
      onClick: (s) => {
        if (s.status !== "Processing") { toast("Cycle must be in Processing to approve", { description: s.cycleNo }); return; }
        advanceStatus(s, "Approved");
      },
    },
    {
      label: "Disburse",
      onClick: (s) => {
        if (s.status !== "Approved") { toast("Cycle must be Approved before disbursement", { description: s.cycleNo }); return; }
        advanceStatus(s, "Disbursed");
      },
    },
    { label: "Lock/Unlock", onClick: (s) => toggleLock(s) },
    { label: "Print Summary", onClick: (s) => toast("Generating PDF", { description: s.cycleNo }) },
  ];

  const bulkActions = [
    { label: "Export", onClick: (sel: PayCycle[]) => toast(`${sel.length} cycle${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }) },
  ];

  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading pay cycles…</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Pay Cycles</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} cycles · {disbursed} disbursed · {approved} approved · {processing} processing
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-0.5 rounded-[6px] border border-border bg-muted/30 p-0.5">
            <button
              onClick={() => setViewMode("timeline")}
              className={"flex h-7 items-center gap-1.5 rounded-[4px] px-2.5 text-[12px] font-medium transition-colors tap " + (viewMode === "timeline" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            >
              <CalendarClock className="h-3.5 w-3.5" /> Timeline
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={"flex h-7 items-center gap-1.5 rounded-[4px] px-2.5 text-[12px] font-medium transition-colors tap " + (viewMode === "table" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            >
              Table
            </button>
          </div>
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting", { description: "CSV file generated" })}>Export</Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>New Cycle</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Cycles</span><CalendarClock className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{rows.length}</span>
          <span className="text-[11px] text-muted-foreground tabular">{disbursed} disbursed</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Net Disbursed</span><Banknote className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{formatINRCompact(totalNet)}</span>
          <span className="text-[11px] text-muted-foreground tabular">across all cycles</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Approved</span><CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{approved + disbursed}</span>
          <span className="text-[11px] text-muted-foreground tabular">awaiting disbursement</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Avg Headcount</span><Users className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{Math.round(rows.reduce((s, r) => s + r.headcount, 0) / rows.length)}</span>
          <span className="text-[11px] text-muted-foreground tabular">per cycle</span>
        </div>
      </div>

      {viewMode === "timeline" ? (
        <CycleTimeline cycles={filtered} onSelect={(c) => setView(c)} onRun={runPayroll} onAdvance={advanceStatus} onToggleLock={toggleLock} />
      ) : (
        <div className="rounded-[6px] border border-border bg-card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
            <SearchInput value={search} onChange={setSearch} placeholder="Search cycle, month, approver..." className="max-w-[260px]" />
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
                {CYCLE_STATUSES.map((s) => (
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
            emptyTitle="No pay cycles"
            emptyDescription="Create a new cycle for the upcoming month."
            initialSort={{ key: "month", dir: "desc" }}
          />
        </div>
      )}

      <CycleDrawer open={addOpen} onClose={() => setAddOpen(false)} onSave={async (d) => {
        const res = await fetch("/api/payroll/cycles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ month: d.month }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error("Couldn't create cycle", { description: data.error || "Try again." });
          return;
        }
        setRows((prev) => [data.cycle, ...prev]);
        toast.success("Cycle created", { description: data.cycle.cycleNo });
        setAddOpen(false);
      }} />

      <CycleDetailDrawer
        open={!!view}
        record={view}
        onClose={() => setView(null)}
        onAdvance={(c, t) => advanceStatus(c, t)}
        onToggleLock={(c) => toggleLock(c)}
        onRun={(c) => runPayroll(c)}
      />
    </div>
  );
}

// ===== Timeline view =====
function CycleTimeline({
  cycles,
  onSelect,
  onRun,
  onAdvance,
  onToggleLock,
}: {
  cycles: PayCycle[];
  onSelect: (c: PayCycle) => void;
  onRun: (c: PayCycle) => void;
  onAdvance: (c: PayCycle, t?: CycleStatus) => void;
  onToggleLock: (c: PayCycle) => void;
}) {
  const sorted = useMemo(() => [...cycles].sort((a, b) => a.month.localeCompare(b.month)), [cycles]);
  if (sorted.length === 0) {
    return (
      <div className="rounded-[6px] border border-border bg-card">
        <EmptyState icon={<CalendarClock className="h-5 w-5" />} title="No cycles found" description="Adjust filters or create a new pay cycle." />
      </div>
    );
  }
  return (
    <SectionCard title="Pay Cycle Timeline" description="Monthly cycles in chronological order with workflow status" icon={<CalendarClock className="h-4 w-4" />} flush>
      <div className="relative px-4 py-4">
        {/* Vertical line */}
        <div className="absolute left-[34px] top-4 bottom-4 w-px bg-border" />
        <div className="flex flex-col gap-3">
          {sorted.map((c) => {
            const m = cycleStatusBadge(c.status);
            const nextAction: { label: string; target?: CycleStatus } | null =
              c.status === "Draft" ? { label: "Run Payroll" } :
              c.status === "Processing" ? { label: "Approve", target: "Approved" } :
              c.status === "Approved" ? { label: "Disburse", target: "Disbursed" } :
              null;
            return (
              <div key={c.id} className="relative pl-12">
                {/* Dot */}
                <div className="absolute left-[26px] top-3 flex h-3 w-3 items-center justify-center rounded-full border-2 border-background bg-foreground" />
                <div className="rounded-[6px] border border-border bg-card px-4 py-3 hover:border-foreground/30 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="tabular text-[12px] font-medium text-foreground">{c.cycleNo}</span>
                        <StatusBadge variant={m.variant} pulse={m.pulse}>{c.status}</StatusBadge>
                        {c.locked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground"><Lock className="h-3 w-3" /> Locked</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground"><Unlock className="h-3 w-3" /> Open</span>
                        )}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground tabular">
                        {formatMonthYear(c.month)} · {c.headcount} employees · pay date {c.payDate ? formatDate(c.payDate) : "pending"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="tabular text-[14px] font-medium text-foreground">{formatINRCompact(c.netTotal)}</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">net payable</span>
                    </div>
                  </div>
                  {/* Workflow bar */}
                  <div className="mt-3 flex items-center gap-1.5">
                    {(["Draft", "Processing", "Approved", "Disbursed"] as CycleStatus[]).map((step, idx) => {
                      const order = ["Draft", "Processing", "Approved", "Disbursed"];
                      const currIdx = order.indexOf(c.status);
                      const isActive = idx <= currIdx && c.status !== "Cancelled";
                      return (
                        <div key={step} className="flex flex-1 items-center gap-1.5">
                          <div className={"h-1.5 flex-1 rounded-full " + (isActive ? "bg-foreground" : "bg-muted")} />
                          <span className={"text-[10px] tabular " + (isActive ? "font-medium text-foreground" : "text-muted-foreground")}>{step}</span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Actions */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Btn size="sm" variant="ghost" icon={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => onSelect(c)}>Open</Btn>
                    {nextAction && (
                      <Btn
                        size="sm"
                        variant={c.status === "Approved" ? "primary" : "outline"}
                        icon={c.status === "Draft" ? <Play className="h-3.5 w-3.5" /> : undefined}
                        onClick={() => (c.status === "Draft" ? onRun(c) : onAdvance(c, nextAction.target))}
                      >
                        {nextAction.label}
                      </Btn>
                    )}
                    <Btn size="sm" variant="ghost" icon={c.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />} onClick={() => onToggleLock(c)}>
                      {c.locked ? "Unlock" : "Lock"}
                    </Btn>
                    <Btn size="sm" variant="ghost" icon={<Printer className="h-3.5 w-3.5" />} onClick={() => toast("Generating PDF", { description: c.cycleNo })}>Summary</Btn>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}

function CycleDrawer({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (d: Partial<PayCycle>) => void }) {
  const [month, setMonth] = useState(toInputDate(daysAhead(30)).slice(0, 7));

  const handleSubmit = () => {
    if (!month) { toast("Month is required"); return; }
    onSave({ month });
    setMonth(toInputDate(daysAhead(30)).slice(0, 7));
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">New Pay Cycle</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">Open a cycle for the upcoming month</SheetDescription>
          </div>
          <SheetCloseBtn onClose={onClose} />
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <FieldLabel required>Pay Month</FieldLabel>
          <Input value={month} onChange={(e) => setMonth(e.target.value)} type="month" className="h-8 rounded-[5px] text-[13px] tabular" />
          <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3 text-[12px] text-muted-foreground">
            The cycle starts in <span className="font-medium text-foreground">Draft</span>. Run attendance + incentives, then approve, then disburse. Approval locks the cycle from edits.
          </div>
          <div className="mt-3">
            <SectionTitle>Approval Workflow</SectionTitle>
            <div className="rounded-[6px] border border-border bg-card overflow-hidden">
              {[
                { step: "Draft", note: "Open cycle, import attendance, compute incentives" },
                { step: "Processing", note: "Run payroll to generate payslips for all active employees" },
                { step: "Approved", note: "Cycle locked, awaiting bank advice generation" },
                { step: "Disbursed", note: "Bank advice processed, salary credited to employees" },
              ].map((s, i) => (
                <div key={s.step} className={"flex items-start gap-3 px-4 py-3 " + (i < 3 ? "border-b border-border" : "")}>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border tabular text-[11px] font-medium text-foreground">{i + 1}</div>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-medium text-foreground">{s.step}</div>
                    <div className="text-[11px] text-muted-foreground">{s.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSubmit}>Create Cycle</Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CycleDetailDrawer({
  open,
  record,
  onClose,
  onAdvance,
  onToggleLock,
  onRun,
}: {
  open: boolean;
  record: PayCycle | null;
  onClose: () => void;
  onAdvance: (c: PayCycle, t?: CycleStatus) => void;
  onToggleLock: (c: PayCycle) => void;
  onRun: (c: PayCycle) => void;
}) {
  if (!record) return null;
  const m = cycleStatusBadge(record.status);
  const nextAction: { label: string; target?: CycleStatus; isRun?: boolean } | null =
    record.status === "Draft" ? { label: "Run Payroll", isRun: true } :
    record.status === "Processing" ? { label: "Approve Cycle", target: "Approved" } :
    record.status === "Approved" ? { label: "Disburse", target: "Disbursed" } :
    null;
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record.cycleNo}</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">{formatMonthYear(record.month)}</SheetDescription>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge variant={m.variant} pulse={m.pulse}>{record.status}</StatusBadge>
            {record.locked ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : <Unlock className="h-3.5 w-3.5 text-muted-foreground/50" />}
            <SheetCloseBtn onClose={onClose} />
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {/* Workflow status bar */}
          <div className="rounded-[6px] border border-border bg-card px-4 py-3">
            <SectionTitle className="mb-2">Workflow</SectionTitle>
            <div className="flex items-center gap-1.5">
              {(["Draft", "Processing", "Approved", "Disbursed"] as CycleStatus[]).map((step, idx) => {
                const order = ["Draft", "Processing", "Approved", "Disbursed"];
                const currIdx = order.indexOf(record.status);
                const isActive = idx <= currIdx && record.status !== "Cancelled";
                return (
                  <div key={step} className="flex flex-1 items-center gap-1.5">
                    <div className={"h-2 w-2 rounded-full " + (isActive ? "bg-foreground" : "bg-muted")} />
                    <span className={"text-[11px] tabular " + (isActive ? "font-medium text-foreground" : "text-muted-foreground")}>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <DetailField label="Month" value={formatMonthYear(record.month)} mono />
            <DetailField label="Headcount" value={String(record.headcount)} mono />
            <DetailField label="Pay Date" value={record.payDate ? formatDate(record.payDate) : "-"} mono />
            <DetailField label="Approved Date" value={record.approvedDate ? formatDate(record.approvedDate) : "-"} mono />
            <DetailField label="Approved By" value={record.approvedBy ?? "-"} />
            <DetailField label="Run By" value={record.runBy ?? "-"} />
            <DetailField label="Locked" value={record.locked ? "Yes" : "No"} />
            <DetailField label="Status" value={record.status} />
          </div>

          <div className="mt-4">
            <SectionTitle>Cost Breakdown</SectionTitle>
            <div className="rounded-[6px] border border-border overflow-hidden">
              <BreakdownRow label="Gross Total" value={formatINR(record.grossTotal)} />
              <BreakdownRow label="Employee Deductions" value={`- ${formatINR(record.deductionsTotal)}`} muted />
              <BreakdownRow label="Employer Contribution" value={formatINR(record.employerContribTotal)} muted />
              <BreakdownRow label="Net Payable" value={formatINR(record.netTotal)} strong />
            </div>
          </div>

          {record.remarks && (
            <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Remarks</div>
              <p className="text-[12.5px] text-foreground">{record.remarks}</p>
            </div>
          )}

          {/* Audit trail */}
          <div className="mt-4">
            <SectionTitle>Audit Trail</SectionTitle>
            <div className="rounded-[6px] border border-border bg-card overflow-hidden">
              {record.audit.slice().reverse().map((a, i) => (
                <AuditRow key={a.id} entry={a} last={i === record.audit.length - 1} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" icon={record.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />} onClick={() => onToggleLock(record)}>
            {record.locked ? "Unlock" : "Lock"}
          </Btn>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" onClick={onClose}>Close</Btn>
            {nextAction && (
              <Btn variant="primary" onClick={() => nextAction.isRun ? onRun(record) : onAdvance(record, nextAction.target)}>
                {nextAction.label}
              </Btn>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AuditRow({ entry, last }: { entry: AuditEntry; last?: boolean }) {
  return (
    <div className={"flex items-start gap-3 px-4 py-3 " + (last ? "" : "border-b border-border")}>
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background">
        <Clock className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12.5px] font-medium text-foreground">{entry.action}</span>
          <span className="text-[11px] tabular text-muted-foreground shrink-0">{relativeTime(entry.at)}</span>
        </div>
        <div className="text-[11px] text-muted-foreground tabular">
          {formatDateTime(entry.at)} · by {entry.by}
        </div>
        {entry.note && <div className="mt-0.5 text-[12px] text-muted-foreground">{entry.note}</div>}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import { SectionCard } from "@/components/shared/section-card";
import {
  Download,
  ChevronDown,
  Landmark,
  Wallet,
  CheckCircle2,
  Clock,
  Plus,
  Banknote,
  Printer,
  AlertCircle,
  TrendingDown,
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
  LOANS,
  LOAN_TYPES,
  LOAN_STATUSES,
  EMPLOYEES,
  type Loan,
  type LoanStatus,
  type LoanType,
  formatINR,
  formatINRCompact,
  formatDate,
  loanStatusBadge,
  SheetCloseBtn,
  SectionTitle,
  DetailField,
  BreakdownRow,
  FieldLabel,
} from "./_helpers";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function LoansTab() {
  const [rows, setRows] = useState<Loan[]>(LOANS);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [view, setView] = useState<Loan | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.code.toLowerCase().includes(q) ||
          s.empName.toLowerCase().includes(q) ||
          s.empCode.toLowerCase().includes(q) ||
          s.type.toLowerCase().includes(q),
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

  const active = rows.filter((r) => r.status === "Active").length;
  const closed = rows.filter((r) => r.status === "Closed").length;
  const foreclosed = rows.filter((r) => r.status === "Foreclosed").length;
  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0);
  const totalDisbursed = rows.reduce((s, r) => s + r.principal, 0);
  const totalEMI = rows.filter((r) => r.status === "Active").reduce((s, r) => s + r.emi, 0);

  const updateStatus = (id: string, status: LoanStatus) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              outstanding: status === "Closed" || status === "Foreclosed" ? 0 : r.outstanding,
            }
          : r,
      ),
    );
  };

  const columns: Column<Loan>[] = [
    { key: "code", header: "Loan #", sortable: true, width: "150px", sortValue: (r) => r.code, render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{r.code}</span> },
    {
      key: "empName",
      header: "Employee",
      sortable: true,
      sortValue: (r) => r.empName,
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-foreground text-[10px] font-medium text-background">
            {r.empName.split(" ").map((p) => p[0]).join("").slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-medium text-foreground">{r.empName}</div>
            <div className="tabular text-[11px] text-muted-foreground">{r.empCode} · {r.department}</div>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.type,
      render: (r) => <span className="text-[12px] text-foreground">{r.type}</span>,
    },
    {
      key: "principal",
      header: "Principal",
      sortable: true,
      align: "right",
      width: "120px",
      sortValue: (r) => r.principal,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatINRCompact(r.principal)}</span>,
    },
    {
      key: "emi",
      header: "EMI",
      sortable: true,
      align: "right",
      width: "110px",
      hideOnMobile: true,
      sortValue: (r) => r.emi,
      render: (r) => <span className="tabular text-[12px] text-foreground">{formatINR(r.emi)}</span>,
    },
    {
      key: "outstanding",
      header: "Outstanding",
      sortable: true,
      align: "right",
      width: "130px",
      sortValue: (r) => r.outstanding,
      render: (r) => <span className={"tabular text-[13px] font-medium " + (r.outstanding === 0 ? "text-muted-foreground" : "text-foreground")}>{formatINRCompact(r.outstanding)}</span>,
    },
    {
      key: "progress",
      header: "Progress",
      sortable: false,
      width: "120px",
      hideOnMobile: true,
      render: (r) => {
        const pct = Math.round((r.paidInstallments / r.totalInstallments) * 100);
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-foreground" style={{ width: `${pct}%` }} />
            </div>
            <span className="tabular text-[11px] text-muted-foreground">{pct}%</span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.status,
      render: (r) => {
        const m = loanStatusBadge(r.status);
        return <StatusBadge variant={m.variant} pulse={m.pulse}>{r.status}</StatusBadge>;
      },
    },
  ];

  const rowActions: { label: string; onClick: (s: Loan) => void }[] = [
    { label: "View Details", onClick: (s) => setView(s) },
    {
      label: "Mark Closed",
      onClick: (s) => {
        if (s.status !== "Active") { toast("Loan already closed/foreclosed", { description: s.code }); return; }
        updateStatus(s.id, "Closed");
        toast.success(`Loan closed`, { description: s.code });
      },
    },
    {
      label: "Foreclose",
      onClick: (s) => {
        if (s.status !== "Active") { toast("Loan already closed/foreclosed", { description: s.code }); return; }
        updateStatus(s.id, "Foreclosed");
        toast(`Loan foreclosed`, { description: s.code });
      },
    },
    { label: "Print Schedule", onClick: (s) => toast("Generating PDF", { description: s.code }) },
  ];

  const bulkActions = [
    { label: "Export", onClick: (sel: Loan[]) => toast(`${sel.length} loan${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }) },
  ];

  const typeLabel = typeFilter.size === 0 ? "All" : typeFilter.size === 1 ? Array.from(typeFilter)[0] : `${typeFilter.size} selected`;
  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;

  // Aggregate by type
  const byType = useMemo(() => {
    return LOAN_TYPES.map((t) => {
      const matching = rows.filter((r) => r.type === t);
      const outstanding = matching.reduce((s, r) => s + r.outstanding, 0);
      const disbursed = matching.reduce((s, r) => s + r.principal, 0);
      return { type: t, count: matching.length, outstanding, disbursed };
    }).filter((x) => x.count > 0);
  }, [rows]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Loans & Advances</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} loans · {active} active · {closed} closed · {foreclosed} foreclosed · outstanding {formatINRCompact(totalOutstanding)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting", { description: "CSV file generated" })}>Export</Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>New Loan</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Loans</span><Landmark className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{rows.length}</span>
          <span className="text-[11px] text-muted-foreground tabular">{LOAN_TYPES.length} types</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Disbursed</span><Wallet className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{formatINRCompact(totalDisbursed)}</span>
          <span className="text-[11px] text-muted-foreground tabular">principal sum</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Outstanding</span><TrendingDown className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{formatINRCompact(totalOutstanding)}</span>
          <span className="text-[11px] text-muted-foreground tabular">{active} active loans</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Monthly EMI</span><Clock className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{formatINRCompact(totalEMI)}</span>
          <span className="text-[11px] text-muted-foreground tabular">deducted from payroll</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3 rounded-[6px] border border-border bg-card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
            <SearchInput value={search} onChange={setSearch} placeholder="Search loan, employee, code..." className="max-w-[260px]" />
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
                {LOAN_TYPES.map((t) => (
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
                {LOAN_STATUSES.map((s) => (
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
            emptyTitle="No loans"
            emptyDescription="Issue a loan or salary advance to an employee."
            initialSort={{ key: "outstanding", dir: "desc" }}
          />
        </div>

        <SectionCard title="By Type" description="Outstanding per category" icon={<Landmark className="h-4 w-4" />} flush>
          <div className="divide-y divide-border">
            {byType.map((t) => (
              <div key={t.type} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-medium text-foreground">{t.type}</span>
                  <span className="text-[11px] tabular text-muted-foreground">{t.count} loans</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground tabular">Outstanding</span>
                  <span className="tabular text-[12px] font-medium text-foreground">{formatINRCompact(t.outstanding)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground tabular">Disbursed</span>
                  <span className="tabular text-[12px] text-muted-foreground">{formatINRCompact(t.disbursed)}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <LoanDetailDrawer open={!!view} record={view} onClose={() => setView(null)} onUpdate={(status) => { if (view) { updateStatus(view.id, status); setView(null); } }} />
      <LoanDrawer open={addOpen} onClose={() => setAddOpen(false)} onSave={(payload) => {
        const emp = EMPLOYEES.find((e) => e.code === payload.empCode);
        if (!emp) { toast("Select an employee"); return; }
        const principal = Number(payload.principal) || 0;
        const interestRate = Number(payload.interestRate) || 0;
        const tenureMonths = Number(payload.tenureMonths) || 6;
        const emi = Math.round((principal * (1 + (interestRate / 100) * (tenureMonths / 12))) / tenureMonths);
        const startDate = new Date().toISOString();
        const endDate = new Date(new Date().getFullYear(), new Date().getMonth() + tenureMonths, 5).toISOString();
        const installments = Array.from({ length: tenureMonths }).map((_, i) => {
          const d = new Date(new Date().getFullYear(), new Date().getMonth() + i, 5);
          return { no: i + 1, date: d.toISOString(), amount: emi, status: (i === 0 ? "Paid" : "Upcoming") as "Paid" | "Pending" | "Upcoming" };
        });
        const newRec: Loan = {
          id: `lan-${String(rows.length + 1).padStart(3, "0")}`,
          code: `RZ-LON-${String(rows.length + 1).padStart(3, "0")}`,
          empCode: emp.code,
          empName: emp.name,
          designation: emp.desig,
          department: emp.dept,
          type: payload.type as LoanType,
          principal,
          interestRate,
          tenureMonths,
          emi,
          disbursedDate: new Date().toISOString(),
          startDate,
          endDate,
          status: "Active",
          outstanding: principal - emi,
          paidInstallments: 1,
          totalInstallments: tenureMonths,
          installments,
          remarks: payload.remarks,
        };
        setRows((prev) => [newRec, ...prev]);
        toast.success(`Loan disbursed`, { description: newRec.code });
        setAddOpen(false);
      }} />
    </div>
  );
}

function LoanDetailDrawer({ open, record, onClose, onUpdate }: { open: boolean; record: Loan | null; onClose: () => void; onUpdate: (s: LoanStatus) => void }) {
  if (!record) return null;
  const m = loanStatusBadge(record.status);
  const pct = Math.round((record.paidInstallments / record.totalInstallments) * 100);
  const nextInstallment = record.installments.find((i) => i.status === "Pending" || i.status === "Upcoming");
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record.code}</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              <span className="font-medium text-foreground">{record.empName}</span> · {record.type} · {record.tenureMonths} months
            </SheetDescription>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge variant={m.variant} pulse={m.pulse}>{record.status}</StatusBadge>
            <SheetCloseBtn onClose={onClose} />
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {/* Outstanding hero */}
          <div className="rounded-[6px] border border-foreground bg-foreground text-background px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-background/70">Outstanding Principal</div>
                <div className="text-[24px] font-medium leading-none tracking-tight tabular">{formatINR(record.outstanding)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-background/70">EMI</div>
                <div className="tabular text-[16px] font-medium">{formatINR(record.emi)}</div>
                <div className="text-[10px] uppercase tracking-wider text-background/70 mt-1">Interest</div>
                <div className="tabular text-[12px]">{record.interestRate}% p.a.</div>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] text-background/70 mb-1">
                <span>Repayment progress</span>
                <span className="tabular">{record.paidInstallments}/{record.totalInstallments} paid · {pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-background/30">
                <div className="h-full rounded-full bg-background" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <DetailField label="Employee" value={record.empName} />
            <DetailField label="Emp Code" value={record.empCode} mono />
            <DetailField label="Designation" value={record.designation} />
            <DetailField label="Department" value={record.department} />
            <DetailField label="Loan Type" value={record.type} />
            <DetailField label="Status" value={record.status} />
            <DetailField label="Principal" value={formatINR(record.principal)} mono />
            <DetailField label="Interest Rate" value={`${record.interestRate}% p.a.`} mono />
            <DetailField label="Tenure" value={`${record.tenureMonths} months`} mono />
            <DetailField label="EMI" value={formatINR(record.emi)} mono />
            <DetailField label="Disbursed" value={formatDate(record.disbursedDate)} mono />
            <DetailField label="Start Date" value={formatDate(record.startDate)} mono />
            <DetailField label="End Date" value={formatDate(record.endDate)} mono />
            <DetailField label="Installments Paid" value={`${record.paidInstallments} / ${record.totalInstallments}`} mono />
          </div>

          {/* Next installment */}
          {nextInstallment && record.status === "Active" && (
            <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-[12.5px] font-medium text-foreground">Next Installment · #{nextInstallment.no}</div>
                    <div className="text-[11px] tabular text-muted-foreground">Due {formatDate(nextInstallment.date)}</div>
                  </div>
                </div>
                <div className="tabular text-[14px] font-medium text-foreground">{formatINR(nextInstallment.amount)}</div>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">Auto-deducted from next payslip</div>
            </div>
          )}

          {/* Installment schedule */}
          <div className="mt-4">
            <SectionTitle>Installment Schedule</SectionTitle>
            <div className="rounded-[6px] border border-border overflow-hidden">
              <div className="grid grid-cols-12 border-b border-border bg-muted/30 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <div className="col-span-2">#</div>
                <div className="col-span-5">Due Date</div>
                <div className="col-span-3 text-right">Amount</div>
                <div className="col-span-2 text-right">Status</div>
              </div>
              <div className="max-h-72 overflow-y-auto scrollbar-thin">
                {record.installments.map((i) => (
                  <div key={i.no} className="grid grid-cols-12 border-b border-border last:border-b-0 px-3 py-2 text-[12px]">
                    <div className="col-span-2 tabular text-muted-foreground">{i.no}</div>
                    <div className="col-span-5 tabular text-muted-foreground">{formatDate(i.date)}</div>
                    <div className="col-span-3 text-right tabular text-foreground">{formatINR(i.amount)}</div>
                    <div className="col-span-2 text-right">
                      <StatusBadge variant={i.status === "Paid" ? "solid" : i.status === "Pending" ? "outline" : "muted"}>{i.status}</StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {record.remarks && (
            <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Remarks</div>
              <p className="text-[12.5px] text-foreground">{record.remarks}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" icon={<Printer className="h-3.5 w-3.5" />} onClick={() => toast("Generating PDF", { description: record.code })}>Print Schedule</Btn>
          {record.status === "Active" && (
            <>
              <Btn variant="ghost" onClick={() => onUpdate("Foreclosed")}>Foreclose</Btn>
              <Btn variant="primary" icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => onUpdate("Closed")}>Mark Closed</Btn>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LoanDrawer({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (payload: { empCode: string; type: string; principal: string; interestRate: string; tenureMonths: string; remarks?: string }) => void }) {
  const [empCode, setEmpCode] = useState("");
  const [type, setType] = useState<LoanType>("Salary Advance");
  const [principal, setPrincipal] = useState("25000");
  const [interestRate, setInterestRate] = useState("0");
  const [tenureMonths, setTenureMonths] = useState("6");
  const [remarks, setRemarks] = useState("");

  const handleSubmit = () => {
    onSave({ empCode, type, principal, interestRate, tenureMonths, remarks });
    setEmpCode(""); setType("Salary Advance"); setPrincipal("25000"); setInterestRate("0"); setTenureMonths("6"); setRemarks("");
  };

  // Live preview
  const p = Number(principal) || 0;
  const r = Number(interestRate) || 0;
  const t = Number(tenureMonths) || 1;
  const emi = Math.round((p * (1 + (r / 100) * (t / 12))) / t);
  const totalRepay = emi * t;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">New Loan / Advance</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">Disburse a loan or salary advance with EMI recovery</SheetDescription>
          </div>
          <SheetCloseBtn onClose={onClose} />
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="flex flex-col gap-3">
            <div>
              <FieldLabel required>Employee</FieldLabel>
              <Select value={empCode} onValueChange={setEmpCode}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {EMPLOYEES.map((e) => (
                    <SelectItem key={e.code} value={e.code}>
                      <span className="tabular text-[11px] text-muted-foreground mr-2">{e.code}</span>
                      {e.name} · {e.desig}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Loan Type</FieldLabel>
              <Select value={type} onValueChange={(v) => setType(v as LoanType)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOAN_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Principal (INR)</FieldLabel>
              <Input value={principal} onChange={(e) => setPrincipal(e.target.value)} type="number" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel required>Interest (% p.a.)</FieldLabel>
                <Input value={interestRate} onChange={(e) => setInterestRate(e.target.value)} type="number" className="h-8 rounded-[5px] text-[13px] tabular" />
              </div>
              <div>
                <FieldLabel required>Tenure (months)</FieldLabel>
                <Input value={tenureMonths} onChange={(e) => setTenureMonths(e.target.value)} type="number" className="h-8 rounded-[5px] text-[13px] tabular" />
              </div>
            </div>
            <div>
              <FieldLabel>Remarks</FieldLabel>
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional notes for HR / Finance..." className="min-h-[60px] rounded-[5px] text-[13px]" />
            </div>
            <div className="rounded-[6px] border border-border bg-muted/30 px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Repayment Preview</div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-muted-foreground">Principal</span>
                  <span className="tabular text-foreground">{formatINR(p)}</span>
                </div>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-muted-foreground">Interest ({r}% × {t / 12} yr)</span>
                  <span className="tabular text-foreground">{formatINR(Math.max(0, totalRepay - p))}</span>
                </div>
                <div className="flex items-center justify-between text-[12.5px] border-t border-border pt-1.5">
                  <span className="font-medium text-foreground">Total Repayment</span>
                  <span className="tabular font-medium text-foreground">{formatINR(totalRepay)}</span>
                </div>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="font-medium text-foreground">Monthly EMI</span>
                  <span className="tabular font-medium text-foreground">{formatINR(emi)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" icon={<Banknote className="h-3.5 w-3.5" />} onClick={handleSubmit}>Disburse Loan</Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import {
  Download,
  ChevronDown,
  FileText,
  CheckCircle2,
  Clock,
  Ban,
  Mail,
  Printer,
  Building2,
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
  PAYSLIPS,
  DEPARTMENTS,
  PAYSLIP_STATUSES,
  type Payslip,
  type PayslipStatus,
  type AuditEntry,
  formatINR,
  formatINRCompact,
  formatMonthYear,
  formatDateTime,
  relativeTime,
  payslipStatusBadge,
  SheetCloseBtn,
  SectionTitle,
  DetailField,
  BreakdownRow,
  StatTile,
} from "./_helpers";

export function PayslipsTab() {
  const [rows, setRows] = useState<Payslip[]>(PAYSLIPS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [cycleFilter, setCycleFilter] = useState<string>("");
  const [deptFilter, setDeptFilter] = useState<string>("");
  const [empFilter, setEmpFilter] = useState<string>("");
  const [view, setView] = useState<Payslip | null>(null);

  const uniqueMonths = useMemo(
    () => Array.from(new Set(rows.map((r) => r.month))).sort().reverse(),
    [rows],
  );
  const uniqueEmployees = useMemo(
    () => Array.from(new Set(rows.map((r) => `${r.empCode}|${r.empName}`))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.payslipNo.toLowerCase().includes(q) ||
          s.empName.toLowerCase().includes(q) ||
          s.empCode.toLowerCase().includes(q) ||
          s.designation.toLowerCase().includes(q) ||
          s.bankAccount.toLowerCase().includes(q),
      );
    }
    if (statusFilter.size > 0) r = r.filter((s) => statusFilter.has(s.status));
    if (cycleFilter) r = r.filter((s) => s.month === cycleFilter);
    if (deptFilter) r = r.filter((s) => s.department === deptFilter);
    if (empFilter) r = r.filter((s) => s.empCode === empFilter.split("|")[0]);
    return r;
  }, [rows, search, statusFilter, cycleFilter, deptFilter, empFilter]);

  const toggle = (set: Set<string>, fn: (s: Set<string>) => void, v: string) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    fn(n);
  };

  const paid = rows.filter((r) => r.status === "Paid").length;
  const draft = rows.filter((r) => r.status === "Draft").length;
  const hold = rows.filter((r) => r.status === "Hold").length;
  const approved = rows.filter((r) => r.status === "Approved").length;
  const totalNet = rows.reduce((s, r) => s + r.netPay, 0);

  const updateStatus = (id: string, status: PayslipStatus) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              audit: [
                ...r.audit,
                {
                  id: `${r.id}-${r.audit.length + 1}`,
                  at: new Date().toISOString(),
                  by: "Reena Mehta",
                  action: status === "Approved" ? "Payslip approved" : status === "Paid" ? "Payment disbursed" : status === "Hold" ? "Payslip held" : "Marked as draft",
                },
              ],
            }
          : r,
      ),
    );
  };

  const columns: Column<Payslip>[] = [
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
            <div className="tabular text-[11px] text-muted-foreground">{r.empCode} · {r.designation}</div>
          </div>
        </div>
      ),
    },
    {
      key: "department",
      header: "Dept",
      sortable: true,
      width: "120px",
      hideOnMobile: true,
      sortValue: (r) => r.department,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.department}</span>,
    },
    {
      key: "month",
      header: "Month",
      sortable: true,
      width: "100px",
      sortValue: (r) => r.month,
      render: (r) => <span className="text-[12px] text-muted-foreground">{formatMonthYear(r.month)}</span>,
    },
    {
      key: "gross",
      header: "Gross",
      sortable: true,
      align: "right",
      width: "110px",
      hideOnMobile: true,
      sortValue: (r) => r.gross,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatINRCompact(r.gross)}</span>,
    },
    {
      key: "totalDeductions",
      header: "Deductions",
      sortable: true,
      align: "right",
      width: "120px",
      hideOnMobile: true,
      sortValue: (r) => r.totalDeductions,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatINRCompact(r.totalDeductions)}</span>,
    },
    {
      key: "netPay",
      header: "Net Pay",
      sortable: true,
      align: "right",
      width: "130px",
      sortValue: (r) => r.netPay,
      render: (r) => <span className="tabular text-[13px] font-medium text-foreground">{formatINRCompact(r.netPay)}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.status,
      render: (r) => {
        const m = payslipStatusBadge(r.status);
        return <StatusBadge variant={m.variant} pulse={m.pulse}>{r.status}</StatusBadge>;
      },
    },
  ];

  const rowActions: { label: string; onClick: (s: Payslip) => void }[] = [
    { label: "View Detail", onClick: (s) => setView(s) },
    {
      label: "Approve",
      onClick: (s) => {
        if (s.status !== "Draft" && s.status !== "Hold") { toast("Payslip already approved/paid", { description: s.payslipNo }); return; }
        updateStatus(s.id, "Approved");
        toast.success(`Payslip approved`, { description: s.payslipNo });
      },
    },
    {
      label: "Mark Paid",
      onClick: (s) => {
        if (s.status === "Paid") { toast("Payslip already paid", { description: s.payslipNo }); return; }
        updateStatus(s.id, "Paid");
        toast.success(`Payslip marked paid`, { description: s.payslipNo });
      },
    },
    {
      label: "Put on Hold",
      onClick: (s) => {
        if (s.status === "Hold" || s.status === "Paid") { toast("Cannot hold this payslip", { description: s.payslipNo }); return; }
        updateStatus(s.id, "Hold");
        toast(`Payslip on hold`, { description: s.payslipNo });
      },
    },
    { label: "Download PDF (stub)", onClick: (s) => toast("Generating PDF", { description: s.payslipNo }) },
    { label: "Email Payslip (stub)", onClick: (s) => toast("Email dispatched", { description: `To ${s.empName}` }) },
  ];

  const bulkActions = [
    {
      label: "Approve Selected",
      onClick: (sel: Payslip[]) => {
        sel.forEach((s) => updateStatus(s.id, "Approved"));
        toast.success(`${sel.length} payslip${sel.length === 1 ? "" : "s"} approved`);
      },
    },
    {
      label: "Download PDFs (stub)",
      onClick: (sel: Payslip[]) => toast(`${sel.length} PDF${sel.length === 1 ? "" : "s"} generated`, { description: "Zip download prepared" }),
    },
    {
      label: "Email Payslips (stub)",
      onClick: (sel: Payslip[]) => toast.success(`${sel.length} email${sel.length === 1 ? "" : "s"} dispatched`, { description: "BCC recipient list prepared" }),
    },
    { label: "Export", onClick: (sel: Payslip[]) => toast(`${sel.length} payslip${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }) },
  ];

  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;
  const cycleLabel = cycleFilter ? formatMonthYear(cycleFilter) : "All";
  const deptLabel = deptFilter || "All";
  const empLabel = empFilter ? empFilter.split("|")[1] : "All";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Payslips</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} payslips · {paid} paid · {approved} approved · {draft} draft · {hold} hold
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn icon={<Mail className="h-3.5 w-3.5" />} onClick={() => toast("Bulk email dispatched", { description: "All visible payslips queued" })}>Email All</Btn>
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting", { description: "CSV file generated" })}>Export</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Payslips</span><FileText className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{rows.length}</span>
          <span className="text-[11px] text-muted-foreground tabular">{paid} paid</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Net Payable</span><CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{formatINRCompact(totalNet)}</span>
          <span className="text-[11px] text-muted-foreground tabular">all payslips</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Draft</span><Clock className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{draft + hold}</span>
          <span className="text-[11px] text-muted-foreground tabular">awaiting approval</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">On Hold</span><Ban className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{hold}</span>
          <span className="text-[11px] text-muted-foreground tabular">requires review</span>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search payslip, employee, code..." className="max-w-[240px]" />
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
              {PAYSLIP_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggle(statusFilter, setStatusFilter, s)} className="text-[13px]">{s}</DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Cycle:</span>
                <span className="max-w-[100px] truncate">{cycleLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by cycle</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCycleFilter("")} className="text-[13px]">All cycles</DropdownMenuItem>
              {uniqueMonths.map((m) => (
                <DropdownMenuItem key={m} onClick={() => setCycleFilter(m)} className="text-[13px]">{formatMonthYear(m)}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Dept:</span>
                <span className="max-w-[100px] truncate">{deptLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by department</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDeptFilter("")} className="text-[13px]">All departments</DropdownMenuItem>
              {DEPARTMENTS.map((d) => (
                <DropdownMenuItem key={d} onClick={() => setDeptFilter(d)} className="text-[13px]">{d}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Employee:</span>
                <span className="max-w-[120px] truncate">{empLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-72 overflow-y-auto scrollbar-thin">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by employee</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setEmpFilter("")} className="text-[13px]">All employees</DropdownMenuItem>
              {uniqueEmployees.map((e) => (
                <DropdownMenuItem key={e} onClick={() => setEmpFilter(e)} className="text-[13px]">
                  <span className="tabular text-[11px] text-muted-foreground mr-2">{e.split("|")[0]}</span>
                  {e.split("|")[1]}
                </DropdownMenuItem>
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
          emptyTitle="No payslips"
          emptyDescription="Run a pay cycle to generate payslips."
          initialSort={{ key: "empName", dir: "asc" }}
        />
      </div>

      <PayslipDetailDrawer
        open={!!view}
        record={view}
        onClose={() => setView(null)}
        onUpdateStatus={(status) => {
          if (view) {
            updateStatus(view.id, status);
            setView({ ...view, status });
          }
        }}
      />
    </div>
  );
}

function PayslipDetailDrawer({
  open,
  record,
  onClose,
  onUpdateStatus,
}: {
  open: boolean;
  record: Payslip | null;
  onClose: () => void;
  onUpdateStatus: (s: PayslipStatus) => void;
}) {
  if (!record) return null;
  const m = payslipStatusBadge(record.status);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record.payslipNo}</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              <span className="font-medium text-foreground">{record.empName}</span> · {record.designation} · {formatMonthYear(record.month)}
            </SheetDescription>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge variant={m.variant} pulse={m.pulse}>{record.status}</StatusBadge>
            <SheetCloseBtn onClose={onClose} />
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {/* Employee + Bank details */}
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Employee" value={record.empName} />
            <DetailField label="Emp Code" value={record.empCode} mono />
            <DetailField label="Designation" value={record.designation} />
            <DetailField label="Department" value={record.department} />
            <DetailField label="Pay Month" value={formatMonthYear(record.month)} mono />
            <DetailField label="Present / LOP" value={`${record.presentDays} / ${record.lopDays} days`} mono />
          </div>

          {/* Bank details */}
          <div className="mt-4 rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Bank Details for Credit</span>
            </div>
            <div className="grid grid-cols-3">
              <div className="border-r border-border px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Bank</div>
                <div className="text-[12.5px] text-foreground">{record.bankName}</div>
              </div>
              <div className="border-r border-border px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Account No</div>
                <div className="tabular text-[12.5px] text-foreground">{record.bankAccount}</div>
              </div>
              <div className="px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">IFSC</div>
                <div className="tabular text-[12.5px] text-foreground">{record.bankIfsc}</div>
              </div>
            </div>
          </div>

          {/* Net pay hero */}
          <div className="mt-4 rounded-[6px] border border-foreground bg-foreground text-background px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-background/70">Net Pay</div>
                <div className="text-[24px] font-medium leading-none tracking-tight tabular">{formatINR(record.netPay)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-background/70">Gross</div>
                <div className="tabular text-[14px] font-medium">{formatINR(record.gross)}</div>
                <div className="text-[10px] uppercase tracking-wider text-background/70 mt-1">Deductions</div>
                <div className="tabular text-[12px]">- {formatINR(record.totalDeductions)}</div>
              </div>
            </div>
          </div>

          {/* YTD totals */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <StatTile label="YTD Gross" value={formatINRCompact(record.ytdGross)} />
            <StatTile label="YTD Deductions" value={formatINRCompact(record.ytdDeductions)} />
            <StatTile label="YTD Net" value={formatINRCompact(record.ytdNet)} />
          </div>

          {/* Earnings + Deductions */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Earnings */}
            <div className="rounded-[6px] border border-border overflow-hidden">
              <div className="border-b border-border bg-muted/30 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Earnings</div>
              <BreakdownRow label="Basic" value={formatINR(record.basic)} />
              <BreakdownRow label="Dearness Allowance" value={formatINR(record.da)} />
              <BreakdownRow label="HRA" value={formatINR(record.hra)} />
              <BreakdownRow label="Conveyance" value={formatINR(record.conveyance)} />
              <BreakdownRow label="Medical Allowance" value={formatINR(record.medicalAllowance)} />
              <BreakdownRow label="Special Allowance" value={formatINR(record.specialAllowance)} />
              <BreakdownRow label="Statutory Bonus" value={formatINR(record.statutoryBonus)} />
              <BreakdownRow label="Incentive" value={formatINR(record.incentive)} muted={record.incentive === 0} />
              <BreakdownRow label="Gross Earnings" value={formatINR(record.gross)} strong />
            </div>

            {/* Deductions */}
            <div className="rounded-[6px] border border-border overflow-hidden">
              <div className="border-b border-border bg-muted/30 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Deductions</div>
              <BreakdownRow label="PF (12% of Basic)" value={`- ${formatINR(record.pf)}`} muted={record.pf === 0} />
              <BreakdownRow label="ESI (1.75%)" value={`- ${formatINR(record.esi)}`} muted={record.esi === 0} />
              <BreakdownRow label="TDS" value={`- ${formatINR(record.tds)}`} muted={record.tds === 0} />
              <BreakdownRow label="Professional Tax" value={`- ${formatINR(record.pt)}`} muted={record.pt === 0} />
              <BreakdownRow label="Other Deductions" value={`- ${formatINR(record.otherDeductions)}`} muted={record.otherDeductions === 0} />
              <BreakdownRow label="Total Deductions" value={formatINR(record.totalDeductions)} strong />
            </div>
          </div>

          {/* Employer Contribution */}
          <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Employer Contribution (CTC cost)</div>
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="text-muted-foreground">PF (Employer 12% + EPS 8.33%)</span>
              <span className="tabular text-foreground font-medium">{formatINR(record.employerPF)}</span>
            </div>
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="text-muted-foreground">ESI (Employer 4.75%)</span>
              <span className="tabular text-foreground font-medium">{formatINR(record.employerESI)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[12.5px]">
              <span className="text-muted-foreground">Total Employer Cost</span>
              <span className="tabular text-foreground font-medium">{formatINR(record.employerPF + record.employerESI)}</span>
            </div>
          </div>

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
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Btn size="sm" variant="ghost" icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Generating PDF", { description: record.payslipNo })}>PDF</Btn>
            <Btn size="sm" variant="ghost" icon={<Mail className="h-3.5 w-3.5" />} onClick={() => toast("Email dispatched", { description: `To ${record.empName}` })}>Email</Btn>
            <Btn size="sm" variant="ghost" icon={<Printer className="h-3.5 w-3.5" />} onClick={() => toast("Sending to printer", { description: record.payslipNo })}>Print</Btn>
          </div>
          <div className="flex items-center gap-2">
            {record.status === "Draft" || record.status === "Hold" ? (
              <Btn variant="primary" icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => { onUpdateStatus("Approved"); toast.success(`Payslip approved`, { description: record.payslipNo }); }}>Approve</Btn>
            ) : record.status === "Approved" ? (
              <Btn variant="primary" onClick={() => { onUpdateStatus("Paid"); toast.success(`Payslip marked paid`, { description: record.payslipNo }); }}>Mark Paid</Btn>
            ) : record.status === "Paid" ? (
              <Btn variant="ghost" onClick={onClose}>Close</Btn>
            ) : (
              <Btn variant="ghost" onClick={onClose}>Close</Btn>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AuditRow({ entry, last }: { entry: AuditEntry; last?: boolean }) {
  return (
    <div className={"flex items-start gap-3 px-3 py-2.5 " + (last ? "" : "border-b border-border")}>
      <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
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

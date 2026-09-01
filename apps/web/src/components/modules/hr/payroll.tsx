"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Banknote,
  Check,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
  Download,
  Eye,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHrStore } from "./_store";
import {
  type Payslip,
  type PayrollRun,
  type PayrollStatus,
} from "./_data";
import {
  formatINR,
  formatINRCompact,
  formatMonthYear,
  formatDate,
  relativeTime,
  payrollStatusBadge,
  initials,
} from "./_helpers";

export function Payroll() {
  const payslips = useHrStore((s) => s.payslips);
  const runs = useHrStore((s) => s.payrollRuns);
  const compliance = useHrStore((s) => s.compliance);
  const setPayslipStatus = useHrStore((s) => s.setPayslipStatus);
  const approvePayrollRun = useHrStore((s) => s.approvePayrollRun);
  const disbursePayrollRun = useHrStore((s) => s.disbursePayrollRun);

  const [selectedMonth, setSelectedMonth] = useState<string>(runs[0]?.month || "");
  const [viewSlip, setViewSlip] = useState<Payslip | null>(null);

  // Months available
  const availableMonths = useMemo(
    () => Array.from(new Set(payslips.map((p) => p.month))).sort().reverse(),
    [payslips],
  );

  const currentRun = runs.find((r) => r.month === selectedMonth);
  const monthSlips = useMemo(
    () => payslips.filter((p) => p.month === selectedMonth),
    [payslips, selectedMonth],
  );

  // KPIs for selected month
  const totalGross = monthSlips.reduce((s, p) => s + p.gross, 0);
  const totalDeductions = monthSlips.reduce((s, p) => s + p.totalDeductions, 0);
  const totalNet = monthSlips.reduce((s, p) => s + p.netPay, 0);
  const totalIncentive = monthSlips.reduce((s, p) => s + (p.incentive || 0), 0);

  // Compliance pending
  const pendingCompliance = compliance.filter((c) => c.status === "Pending" || c.status === "Overdue");
  const filedCompliance = compliance.filter((c) => c.status === "Filed");

  const columns: Column<Payslip>[] = [
    {
      key: "empCode",
      header: "Employee",
      sortable: true,
      sortValue: (p) => p.empCode,
      render: (p) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[9px] font-medium text-foreground">
            {initials(p.empName)}
          </div>
          <div className="flex flex-col">
            <span className="text-[12.5px] font-medium text-foreground">{p.empName}</span>
            <span className="font-mono text-[10px] tabular text-muted-foreground">{p.empCode} · {p.designation}</span>
          </div>
        </div>
      ),
    },
    {
      key: "gross",
      header: "Gross",
      sortable: true,
      sortValue: (p) => p.gross,
      align: "right",
      hideOnMobile: true,
      render: (p) => <span className="text-[12px] tabular text-foreground">{formatINRCompact(p.gross)}</span>,
    },
    {
      key: "totalDeductions",
      header: "Deductions",
      sortable: true,
      sortValue: (p) => p.totalDeductions,
      align: "right",
      hideOnMobile: true,
      render: (p) => <span className="text-[12px] tabular text-muted-foreground">{formatINRCompact(p.totalDeductions)}</span>,
    },
    {
      key: "netPay",
      header: "Net Pay",
      sortable: true,
      sortValue: (p) => p.netPay,
      align: "right",
      render: (p) => (
        <span className="text-[12.5px] tabular font-medium text-foreground">
          {formatINRCompact(p.netPay)}
        </span>
      ),
    },
    {
      key: "incentive",
      header: "Incentive",
      sortable: true,
      sortValue: (p) => p.incentive || 0,
      align: "right",
      hideOnMobile: true,
      render: (p) =>
        p.incentive ? (
          <div className="flex flex-col items-end">
            <span className="text-[11.5px] tabular text-foreground">{formatINRCompact(p.incentive)}</span>
            <span className="text-[10px] tabular text-muted-foreground">{p.tripsCount} trips</span>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">-</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (p) => p.status,
      render: (p) => {
        const { variant, pulse } = payrollStatusBadge(p.status);
        return (
          <StatusBadge variant={variant} pulse={pulse}>
            {p.status}
          </StatusBadge>
        );
      },
    },
  ];

  const handleRunAction = (action: "approve" | "disburse") => {
    if (!currentRun) return;
    if (action === "approve") {
      approvePayrollRun(currentRun.id);
      toast.success("Payroll approved", { description: `${formatMonthYear(currentRun.month)} · ${currentRun.employeeCount} employees` });
    } else {
      disbursePayrollRun(currentRun.id);
      toast.success("Payroll disbursed", { description: `Bank file generated · ${currentRun.employeeCount} NEFT transfers initiated` });
    }
  };

  const markPaid = (slip: Payslip) => {
    setPayslipStatus(slip.id, "Paid");
    toast.success("Marked as paid", { description: `${slip.empName} · ${formatINR(slip.netPay)}` });
    setViewSlip(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar - month selector + run actions */}
      <SectionCard
        title="Payroll Run"
        description={currentRun ? `${formatMonthYear(currentRun.month)} · ${currentRun.employeeCount} employees` : "No run selected"}
        icon={<Banknote className="h-4 w-4" />}
        flush
        bodyClassName="px-4 py-3"
        action={
          currentRun && currentRun.status === "Draft" ? (
            <Btn variant="primary" size="sm" icon={<Check className="h-3.5 w-3.5" />} onClick={() => handleRunAction("approve")}>
              Approve Run
            </Btn>
          ) : currentRun && currentRun.status === "Approved" ? (
            <Btn variant="primary" size="sm" icon={<Banknote className="h-3.5 w-3.5" />} onClick={() => handleRunAction("disburse")}>
              Disburse
            </Btn>
          ) : currentRun && currentRun.status === "Paid" ? (
            <Btn variant="outline" size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast.success("Bank file downloaded", { description: "NEFT batch file ready" })}>
              Bank File
            </Btn>
          ) : null
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="h-8 w-[180px] text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((m) => (
                <SelectItem key={m} value={m}>
                  {formatMonthYear(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentRun && (
            <div className="flex items-center gap-2">
              <StatusBadge {...payrollStatusBadge(currentRun.status)}>
                {currentRun.status}
              </StatusBadge>
              {currentRun.approvedOn && (
                <span className="text-[11px] text-muted-foreground">
                  Approved {relativeTime(currentRun.approvedOn)}
                </span>
              )}
              {currentRun.disbursedOn && (
                <span className="text-[11px] text-muted-foreground">
                  · Paid {relativeTime(currentRun.disbursedOn)}
                </span>
              )}
            </div>
          )}
        </div>
      </SectionCard>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiMini label="Total Gross" value={formatINRCompact(totalGross)} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <KpiMini label="Total Deductions" value={formatINRCompact(totalDeductions)} icon={<AlertCircle className="h-3.5 w-3.5" />} />
        <KpiMini label="Net Payable" value={formatINRCompact(totalNet)} icon={<Banknote className="h-3.5 w-3.5" />} />
        <KpiMini label="Driver Incentives" value={formatINRCompact(totalIncentive)} icon={<TrendingUp className="h-3.5 w-3.5" />} />
      </div>

      {/* Payslips table */}
      <DataTable
        data={monthSlips}
        columns={columns}
        searchKeys={["empCode", "empName", "designation"]}
        searchPlaceholder="Search payslip by code, name…"
        onRowClick={(p) => setViewSlip(p)}
        rowActions={[
          { label: "View Payslip", onClick: (p) => setViewSlip(p) },
          {
            label: "Mark Paid",
            onClick: (p) => markPaid(p),
          },
          {
            label: "Download PDF",
            onClick: (p) => toast.success("Payslip PDF generated", { description: `${p.empName} · ${formatMonthYear(p.month)}` }),
          },
          {
            label: "Email Payslip",
            onClick: (p) => toast.success("Payslip emailed", { description: `To ${p.empName.toLowerCase().replace(/\s+/g, ".")}@reanzly.in` }),
          },
        ]}
        pageSize={20}
        initialSort={{ key: "netPay", dir: "desc" }}
      />

      {/* Statutory Compliance Dashboard */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Pending Compliance"
          description="Statutory filings due"
          icon={<ShieldCheck className="h-4 w-4" />}
          flush
          bodyClassName="p-0"
        >
          <div className="divide-y divide-border">
            {pendingCompliance.length === 0 ? (
              <div className="px-3 py-8 text-center text-[12px] text-muted-foreground">
                All compliance up to date.
              </div>
            ) : (
              pendingCompliance.map((c) => {
                const overdue = new Date(c.dueDate).getTime() < Date.now();
                return (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2.5">
                    <div>
                      <div className="text-[12.5px] font-medium text-foreground">{c.type}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {c.month} · Due {formatDate(c.dueDate)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={overdue ? "solid" : "outline"} pulse={overdue}>
                        {overdue ? "Overdue" : c.status}
                      </StatusBadge>
                      <Btn variant="ghost" size="sm" onClick={() => toast.success(`${c.type} filing started`, { description: c.month })}>
                        File
                      </Btn>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Filed Returns"
          description={`${filedCompliance.length} completed filings`}
          icon={<Check className="h-4 w-4" />}
          flush
          bodyClassName="p-0"
        >
          <div className="divide-y divide-border">
            {filedCompliance.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-3 py-2.5">
                <div>
                  <div className="text-[12.5px] font-medium text-foreground">{c.type}</div>
                  <div className="text-[11px] text-muted-foreground">{c.month}</div>
                </div>
                <div className="flex items-center gap-2">
                  {c.filedOn && (
                    <span className="text-[10.5px] tabular text-muted-foreground">
                      {relativeTime(c.filedOn)}
                    </span>
                  )}
                  <StatusBadge variant="solid">{c.status}</StatusBadge>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <PayslipDrawer
        slip={viewSlip}
        onClose={() => setViewSlip(null)}
        onMarkPaid={(s) => markPaid(s)}
      />
    </div>
  );
}

function KpiMini({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[6px] border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tabular text-foreground">{value}</span>
    </div>
  );
}

// ============================================================
// Payslip detail drawer
// ============================================================
function PayslipDrawer({
  slip,
  onClose,
  onMarkPaid,
}: {
  slip: Payslip | null;
  onClose: () => void;
  onMarkPaid: (s: Payslip) => void;
}) {
  return (
    <Sheet open={!!slip} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        {slip && (
          <>
            <SheetHeader className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <StatusBadge variant="outline" className="font-mono">
                  {slip.empCode}
                </StatusBadge>
                <StatusBadge {...payrollStatusBadge(slip.status)}>{slip.status}</StatusBadge>
              </div>
              <SheetTitle className="text-[16px] font-medium tracking-tight">
                {slip.empName}
              </SheetTitle>
              <SheetDescription className="text-[12px]">
                {slip.designation} · {formatMonthYear(slip.month)}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
              {/* Net pay highlight */}
              <div className="rounded-[6px] border border-border bg-muted/30 p-4 text-center">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Net Pay
                </div>
                <div className="mt-1 text-[28px] font-medium leading-none tabular text-foreground">
                  {formatINR(slip.netPay)}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Gross {formatINR(slip.gross)} · Deductions {formatINR(slip.totalDeductions)}
                </div>
              </div>

              {/* Earnings */}
              <div className="mt-4">
                <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Earnings
                </h4>
                <div className="divide-y divide-border rounded-[5px] border border-border">
                  <SlipRow label="Basic" value={slip.basic} />
                  <SlipRow label="HRA" value={slip.hra} />
                  <SlipRow label="Conveyance" value={slip.conveyance} />
                  <SlipRow label="Allowances" value={slip.allowances} />
                  {slip.ot > 0 && <SlipRow label="Overtime" value={slip.ot} />}
                  {slip.incentive !== undefined && slip.incentive > 0 && (
                    <SlipRow
                      label={`Trip Incentive${slip.tripsCount ? ` (${slip.tripsCount} × ₹${slip.incentiveRate})` : ""}`}
                      value={slip.incentive}
                    />
                  )}
                  {slip.performanceBonus !== undefined && slip.performanceBonus > 0 && (
                    <SlipRow label="Performance Bonus" value={slip.performanceBonus} />
                  )}
                  <SlipRow label="Gross Total" value={slip.gross} bold />
                </div>
              </div>

              {/* Deductions */}
              <div className="mt-4">
                <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Deductions
                </h4>
                <div className="divide-y divide-border rounded-[5px] border border-border">
                  {slip.pf > 0 && <SlipRow label="Provident Fund (PF)" value={-slip.pf} />}
                  {slip.esi > 0 && <SlipRow label="ESI Contribution" value={-slip.esi} />}
                  <SlipRow label="Professional Tax (PT)" value={-slip.pt} />
                  {slip.tds > 0 && <SlipRow label="TDS" value={-slip.tds} />}
                  {slip.advance > 0 && <SlipRow label="Advance Recovery" value={-slip.advance} />}
                  {slip.otherDeductions > 0 && <SlipRow label="Other Deductions" value={-slip.otherDeductions} />}
                  <SlipRow label="Total Deductions" value={-slip.totalDeductions} bold />
                </div>
              </div>

              {/* Driver-specific calc */}
              {slip.designation === "Driver" && slip.tripsCount !== undefined && (
                <div className="mt-4 rounded-[5px] border border-border bg-muted/30 p-3">
                  <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Driver Incentive Calculation
                  </div>
                  <div className="text-[12px] text-foreground">
                    {slip.tripsCount} completed trips × ₹{slip.incentiveRate}/trip
                    {slip.performanceBonus ? ` + ₹${slip.performanceBonus} performance bonus` : ""}
                  </div>
                </div>
              )}

              {/* Footer actions */}
              <div className="mt-4 flex gap-2">
                <Btn variant="outline" size="sm" icon={<Eye className="h-3.5 w-3.5" />} block>
                  View PDF
                </Btn>
                {slip.status !== "Paid" && (
                  <Btn variant="primary" size="sm" icon={<Check className="h-3.5 w-3.5" />} block onClick={() => onMarkPaid(slip)}>
                    Mark Paid
                  </Btn>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SlipRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  const isNeg = value < 0;
  return (
    <div className={cn("flex items-center justify-between px-3 py-2", bold && "bg-muted/30")}>
      <span className={cn("text-[12px]", bold ? "font-medium text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
      <span className={cn("text-[12.5px] tabular", bold ? "font-medium text-foreground" : isNeg ? "text-foreground" : "text-foreground")}>
        {formatINR(Math.abs(value))}
      </span>
    </div>
  );
}

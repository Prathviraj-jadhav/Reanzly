"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import {
  Banknote,
  CalendarClock,
  FileText,
  CheckCircle2,
  Clock,
  Users,
  Coins,
  AlertTriangle,
} from "lucide-react";
import {
  PAYROLL_TABS,
  type PayrollTab,
  PAY_CYCLES,
  PAYSLIPS,
  STATUTORY_RETURNS,
  SALARY_STRUCTURES,
  BANK_ADVICES,
  REIMBURSEMENTS,
  BONUSES,
  LOANS,
  formatINRCompact,
  formatMonthYear,
  KpiTile,
} from "./_helpers";
import { PayCyclesTab } from "./cycles";
import { SalaryStructuresTab } from "./structures";
import { PayslipsTab } from "./payslips";
import { StatutoryTab } from "./statutory";
import { BankAdviceTab } from "./bank-advice";
import { OverviewTab } from "./overview";
import { ReimbursementsTab } from "./reimbursements";
import { LoansTab } from "./loans-advances";

export function PayrollModule() {
  const [tab, setTab] = useState<PayrollTab>("overview");

  const kpis = useMemo(() => {
    const currentCycle = PAY_CYCLES[PAY_CYCLES.length - 1];
    const totalPayrollCost = PAYSLIPS.reduce((s, p) => s + p.gross + (p.employerPF + p.employerESI), 0);
    const netPayable = currentCycle.netTotal;
    const pendingApprovals = PAYSLIPS.filter((p) => p.status === "Draft" || p.status === "Hold").length;
    const pfTotal = PAYSLIPS.reduce((s, p) => s + p.pf, 0);
    const esiTotal = PAYSLIPS.reduce((s, p) => s + p.esi, 0);
    const tdsTotal = PAYSLIPS.reduce((s, p) => s + p.tds, 0);
    const headcount = new Set(PAYSLIPS.map((p) => p.empCode)).size;
    const upcomingDue = STATUTORY_RETURNS.filter((r) => r.status !== "Filed").length;
    return {
      totalPayrollCost,
      netPayable,
      currentCycleMonth: currentCycle.month,
      pendingApprovals,
      pfTotal,
      esiTotal,
      tdsTotal,
      headcount,
      upcomingDue,
    };
  }, []);

  return (
    <div className="flex min-h-full flex-col gap-4">
      <PageHeader
        title="Payroll"
        description="Standalone payroll processing — cycles, salary structures, payslips, statutory deductions (PF / ESI / TDS / PT), bank advice, reimbursements, bonuses and loans."
        meta={[
          { label: "Owner", value: "Reena Mehta · HR Manager" },
          { label: "Approver", value: "Vikram Kapoor · Owner" },
          { label: "Cycle", value: formatMonthYear(kpis.currentCycleMonth) },
        ]}
        actions={
          <span className="hidden text-[11px] text-muted-foreground tabular sm:inline">
            {PAY_CYCLES.length} cycles · {PAYSLIPS.length} payslips · {SALARY_STRUCTURES.length} structures
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile icon={<Coins className="h-3.5 w-3.5" />} label="Payroll Cost" value={formatINRCompact(kpis.totalPayrollCost)} hint="gross + employer contrib" />
        <KpiTile icon={<Banknote className="h-3.5 w-3.5" />} label="Net Payable" value={formatINRCompact(kpis.netPayable)} hint={`for ${formatMonthYear(kpis.currentCycleMonth)}`} />
        <KpiTile icon={<CalendarClock className="h-3.5 w-3.5" />} label="Current Cycle" value={formatMonthYear(kpis.currentCycleMonth)} hint="processing" />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Pending Approvals" value={String(kpis.pendingApprovals)} hint="draft + hold payslips" />
        <KpiTile icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Statutory Due" value={String(kpis.upcomingDue)} hint="pending + overdue returns" />
        <KpiTile icon={<Users className="h-3.5 w-3.5" />} label="Headcount" value={String(kpis.headcount)} hint="on payroll" />
      </div>

      <div className="sticky top-0 z-10 -mx-1 flex items-center gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {PAYROLL_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "relative shrink-0 px-3 py-2.5 text-[13px] transition-colors tap",
              tab === t.id ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
          </button>
        ))}
      </div>

      <div className="flex-1 pb-8">
        {tab === "overview" && <OverviewTab onNavigate={(t) => setTab(t)} />}
        {tab === "cycles" && <PayCyclesTab />}
        {tab === "structures" && <SalaryStructuresTab />}
        {tab === "payslips" && <PayslipsTab />}
        {tab === "statutory" && <StatutoryTab />}
        {tab === "bank-advice" && <BankAdviceTab />}
        {tab === "reimbursements" && <ReimbursementsTab />}
        {tab === "loans" && <LoansTab />}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {PAY_CYCLES.length} cycles · {PAYSLIPS.length} payslips · {SALARY_STRUCTURES.length} salary structures ·{" "}
        {STATUTORY_RETURNS.length} statutory returns · {BANK_ADVICES.length} bank advices · {REIMBURSEMENTS.length} reimbursements · {BONUSES.length} bonuses · {LOANS.length} loans · PF 12% / ESI 4.75%+1.75% / PT INR 200 / TDS slabs
      </p>
    </div>
  );
}

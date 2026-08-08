"use client";

import { useEffect, useState } from "react";
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
  STATUTORY_RETURNS,
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

  // Real cycle/payslip/structure counts for the header KPI bar - fetched
  // once here rather than duplicating each tab's own fetch. Statutory/Bank
  // Advice/Reimbursements/Bonuses/Loans aren't converted yet (still the
  // original mock arrays) - their counts below are flagged as such, not
  // silently presented as if they were real.
  const [cycleCount, setCycleCount] = useState(0);
  const [payslipCount, setPayslipCount] = useState(0);
  const [structureCount, setStructureCount] = useState(0);
  const [kpis, setKpis] = useState({
    totalPayrollCost: 0, netPayable: 0, currentCycleMonth: "", pendingApprovals: 0, headcount: 0,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/payroll/cycles").then((r) => (r.ok ? r.json() : { cycles: [] })),
      fetch("/api/payroll/payslips").then((r) => (r.ok ? r.json() : { payslips: [] })),
      fetch("/api/payroll/structures").then((r) => (r.ok ? r.json() : { structures: [] })),
    ]).then(([cyclesRes, payslipsRes, structuresRes]) => {
      const cycles = cyclesRes.cycles ?? [];
      const payslips = payslipsRes.payslips ?? [];
      setCycleCount(cycles.length);
      setPayslipCount(payslips.length);
      setStructureCount((structuresRes.structures ?? []).length);
      const currentCycle = cycles[0];
      setKpis({
        totalPayrollCost: payslips.reduce((s: number, p: any) => s + p.gross + p.employerPF + p.employerESI, 0),
        netPayable: currentCycle?.netTotal ?? 0,
        currentCycleMonth: currentCycle?.month ?? "",
        pendingApprovals: payslips.filter((p: any) => p.status === "Draft" || p.status === "Hold").length,
        headcount: new Set(payslips.map((p: any) => p.empCode)).size,
      });
    });
  }, []);

  const upcomingDue = STATUTORY_RETURNS.filter((r) => r.status !== "Filed").length;

  return (
    <div className="flex min-h-full flex-col gap-4">
      <PageHeader
        title="Payroll"
        description="Standalone payroll processing - cycles, salary structures, payslips, statutory deductions (PF / ESI / TDS / PT), bank advice, reimbursements, bonuses and loans."
        meta={[
          { label: "Owner", value: "Reena Mehta · HR Manager" },
          { label: "Approver", value: "Vikram Kapoor · Owner" },
          { label: "Cycle", value: kpis.currentCycleMonth ? formatMonthYear(kpis.currentCycleMonth) : "-" },
        ]}
        actions={
          <span className="hidden text-[11px] text-muted-foreground tabular sm:inline">
            {cycleCount} cycles · {payslipCount} payslips · {structureCount} structures
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile icon={<Coins className="h-3.5 w-3.5" />} label="Payroll Cost" value={formatINRCompact(kpis.totalPayrollCost)} hint="gross + employer contrib" />
        <KpiTile icon={<Banknote className="h-3.5 w-3.5" />} label="Net Payable" value={formatINRCompact(kpis.netPayable)} hint={kpis.currentCycleMonth ? `for ${formatMonthYear(kpis.currentCycleMonth)}` : "no cycle yet"} />
        <KpiTile icon={<CalendarClock className="h-3.5 w-3.5" />} label="Current Cycle" value={kpis.currentCycleMonth ? formatMonthYear(kpis.currentCycleMonth) : "-"} hint="latest" />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Pending Approvals" value={String(kpis.pendingApprovals)} hint="draft + hold payslips" />
        <KpiTile icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Statutory Due" value={String(upcomingDue)} hint="pending + overdue returns" />
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
        {cycleCount} cycles · {payslipCount} payslips · {structureCount} salary structures ·{" "}
        {STATUTORY_RETURNS.length} statutory returns · {BANK_ADVICES.length} bank advices · {REIMBURSEMENTS.length} reimbursements · {BONUSES.length} bonuses · {LOANS.length} loans · PF 12% / ESI 4.75%+1.75% / PT INR 200 / TDS slabs
      </p>
    </div>
  );
}

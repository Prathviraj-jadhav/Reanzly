"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Btn } from "@/components/shared/btn";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Banknote,
  CalendarClock,
  Users,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Coins,
  FileText,
  ShieldCheck,
  Receipt,
  Gift,
  Landmark,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  STATUTORY_RETURNS,
  BANK_ADVICES,
  REIMBURSEMENTS,
  BONUSES,
  LOANS,
  formatINR,
  formatINRCompact,
  formatMonthYear,
  formatMonthShort,
  formatDate,
  formatNumber,
  cycleStatusBadge,
  statutoryReturnStatusBadge,
  daysUntil,
  dueTone,
  type PayrollTab,
  type PayCycle,
} from "./_helpers";

const EMPTY_CYCLE: PayCycle = {
  id: "", cycleNo: "—", month: "", status: "Draft", locked: false,
  headcount: 0, grossTotal: 0, deductionsTotal: 0, netTotal: 0, employerContribTotal: 0, audit: [],
};

export function OverviewTab({ onNavigate }: { onNavigate: (t: PayrollTab) => void }) {
  const [cycles, setCycles] = useState<PayCycle[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [monthlyCost, setMonthlyCost] = useState(0);
  const [payslipCount, setPayslipCount] = useState(0);
  const [headcount, setHeadcount] = useState(0);
  const [avgCtc, setAvgCtc] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/payroll/cycles").then((r) => (r.ok ? r.json() : { cycles: [] })),
      fetch("/api/payroll/payslips").then((r) => (r.ok ? r.json() : { payslips: [] })),
      fetch("/api/payroll/structures").then((r) => (r.ok ? r.json() : { structures: [] })),
    ]).then(([cyclesRes, payslipsRes, structuresRes]) => {
      const cyclesData: PayCycle[] = cyclesRes.cycles ?? [];
      const payslips = payslipsRes.payslips ?? [];
      const structures = structuresRes.structures ?? [];
      setCycles(cyclesData);
      setPayslipCount(payslips.length);
      const current = cyclesData[0];
      setMonthlyCost(current ? payslips.filter((p: any) => p.month === current.month).reduce((s: number, p: any) => s + p.gross + p.employerPF + p.employerESI, 0) : 0);
      setHeadcount(new Set(payslips.map((p: any) => p.empCode)).size);
      const totalHc = structures.reduce((s: number, r: any) => s + r.activeHeadcount, 0);
      setAvgCtc(totalHc > 0 ? structures.reduce((s: number, r: any) => s + r.ctcAnnual * r.activeHeadcount, 0) / totalHc : 0);
      setPendingApprovals(payslips.filter((p: any) => p.status === "Draft" || p.status === "Hold").length);
    }).finally(() => setLoaded(true));
  }, []);

  const stats = {
    currentCycle: cycles[0] ?? EMPTY_CYCLE,
    monthlyCost, headcount, avgCtc, pendingApprovals,
    // Reimbursements/Bonuses/Loans aren't converted yet - still the
    // original mock arrays (see task.md for the flagged Tier-2 gap).
    pendingReimb: REIMBURSEMENTS.filter((r) => r.status === "Pending").length,
    pendingBonus: BONUSES.filter((b) => b.status === "Pending").length,
    activeLoans: LOANS.filter((l) => l.status === "Active").length,
    totalLoanOutstanding: LOANS.reduce((s, l) => s + l.outstanding, 0),
    totalReimbAmount: REIMBURSEMENTS.filter((r) => r.status !== "Rejected").reduce((s, r) => s + r.amount, 0),
    totalBonusAmount: BONUSES.filter((b) => b.status !== "Cancelled").reduce((s, b) => s + b.amount, 0),
  };

  const upcomingDue = useMemo(
    () =>
      [...STATUTORY_RETURNS]
        .filter((r) => r.status !== "Filed")
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 5),
    [],
  );

  // Monthly cost trend (last 6 real cycles)
  const trend = cycles.slice(0, 6).reverse().map((c) => ({
    month: c.month,
    gross: c.grossTotal,
    net: c.netTotal,
    employer: c.employerContribTotal,
  }));
  const maxTrend = trend.length > 0 ? Math.max(...trend.map((t) => t.gross), 1) : 1;

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading payroll overview…</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Payroll Overview</h2>
          <p className="text-[12px] text-muted-foreground">
            Monthly payroll cost · {stats.headcount} employees on payroll · avg CTC {formatINRCompact(stats.avgCtc)}/yr · cycle {formatMonthYear(stats.currentCycle.month)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn icon={<Receipt className="h-3.5 w-3.5" />} onClick={() => onNavigate("reimbursements")}>Reimbursements</Btn>
          <Btn variant="primary" icon={<CalendarClock className="h-3.5 w-3.5" />} onClick={() => onNavigate("cycles")}>Open Cycles</Btn>
        </div>
      </div>

      {/* Quick KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MiniKpi icon={<Coins className="h-3.5 w-3.5" />} label="Monthly Cost" value={formatINRCompact(stats.monthlyCost)} hint="this cycle" />
        <MiniKpi icon={<Users className="h-3.5 w-3.5" />} label="Headcount" value={formatNumber(stats.headcount)} hint="on payroll" />
        <MiniKpi icon={<TrendingUp className="h-3.5 w-3.5" />} label="Avg CTC" value={formatINRCompact(stats.avgCtc)} hint="per year" />
        <MiniKpi icon={<Clock className="h-3.5 w-3.5" />} label="Pending Approvals" value={String(stats.pendingApprovals)} hint="draft + hold" />
        <MiniKpi icon={<Banknote className="h-3.5 w-3.5" />} label="Net Payable" value={formatINRCompact(stats.currentCycle.netTotal)} hint="current cycle" />
        <MiniKpi icon={<Landmark className="h-3.5 w-3.5" />} label="Loan Outstanding" value={formatINRCompact(stats.totalLoanOutstanding)} hint={`${stats.activeLoans} active`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent cycles */}
        <SectionCard
          title="Recent Pay Cycles"
          description="Last 6 monthly cycles"
          icon={<CalendarClock className="h-4 w-4" />}
          action={
            <Btn size="sm" variant="ghost" iconRight={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => onNavigate("cycles")}>
              View all
            </Btn>
          }
          className="lg:col-span-2"
          flush
        >
          <div className="divide-y divide-border">
            {cycles.slice(0, 6).map((c) => {
              const m = cycleStatusBadge(c.status);
              return (
                <button
                  key={c.id}
                  onClick={() => onNavigate("cycles")}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/40 transition-colors tap"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border border-border bg-card">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{formatMonthShort(c.month)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="tabular text-[12.5px] font-medium text-foreground">{c.cycleNo}</span>
                      {c.locked && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Locked</span>}
                    </div>
                    <div className="text-[11px] text-muted-foreground tabular">
                      {c.headcount} employees · gross {formatINRCompact(c.grossTotal)} · net {formatINRCompact(c.netTotal)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge variant={m.variant} pulse={m.pulse}>{c.status}</StatusBadge>
                    {c.payDate && <span className="text-[10px] tabular text-muted-foreground">paid {formatDate(c.payDate)}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* Upcoming statutory due dates */}
        <SectionCard
          title="Upcoming Statutory Due Dates"
          description="Returns pending or overdue"
          icon={<ShieldCheck className="h-4 w-4" />}
          action={
            <Btn size="sm" variant="ghost" iconRight={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => onNavigate("statutory")}>
              View all
            </Btn>
          }
          flush
        >
          {upcomingDue.length === 0 ? (
            <EmptyState compact icon={<CheckCircle2 className="h-4 w-4" />} title="All returns filed" description="No pending statutory dues." />
          ) : (
            <div className="divide-y divide-border">
              {upcomingDue.map((r) => {
                const m = statutoryReturnStatusBadge(r.status);
                const tone = dueTone(r.dueDate);
                const days = daysUntil(r.dueDate);
                return (
                  <button
                    key={r.id}
                    onClick={() => onNavigate("statutory")}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/40 transition-colors tap"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border border-border bg-card">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-medium text-foreground">{r.type}</div>
                      <div className="text-[11px] text-muted-foreground tabular">
                        {r.period} · {formatINRCompact(r.amount)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge variant={m.variant} pulse={m.pulse}>{r.status}</StatusBadge>
                      <span
                        className={
                          "text-[10px] tabular " +
                          (tone === "overdue" ? "text-foreground font-medium" : tone === "soon" ? "text-foreground" : "text-muted-foreground")
                        }
                      >
                        {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "due today" : `in ${days}d`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Monthly cost trend */}
      <SectionCard title="Monthly Payroll Cost Trend" description="Gross vs net payable across last 6 cycles" icon={<TrendingUp className="h-4 w-4" />}>
        <div className="flex flex-col gap-3">
          {trend.map((t) => (
            <div key={t.month} className="flex items-center gap-3">
              <span className="w-12 shrink-0 text-[11px] font-medium tabular text-muted-foreground">{formatMonthShort(t.month)}</span>
              <div className="relative h-6 flex-1 overflow-hidden rounded-[4px] bg-muted">
                <div
                  className="h-full rounded-[4px] bg-foreground/15"
                  style={{ width: `${(t.gross / maxTrend) * 100}%` }}
                />
                <div
                  className="absolute top-0 left-0 h-full rounded-[4px] bg-foreground"
                  style={{ width: `${(t.net / maxTrend) * 100}%` }}
                />
              </div>
              <div className="flex w-32 shrink-0 items-center justify-end gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Gross</span>
                  <span className="tabular text-[11px] font-medium text-foreground">{formatINRCompact(t.gross)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Net</span>
                  <span className="tabular text-[11px] font-medium text-foreground">{formatINRCompact(t.net)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-[2px] bg-foreground" />
            <span>Net payable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-[2px] bg-foreground/15" />
            <span>Gross (incl. employer contrib)</span>
          </div>
        </div>
      </SectionCard>

      {/* Quick actions grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction icon={<FileText className="h-4 w-4" />} title="Payslips" subtitle={`${payslipCount} records`} hint={`${stats.pendingApprovals} pending approval`} onClick={() => onNavigate("payslips")} />
        <QuickAction icon={<Receipt className="h-4 w-4" />} title="Reimbursements" subtitle={`${REIMBURSEMENTS.length} records`} hint={`${stats.pendingReimb} pending · ${formatINRCompact(stats.totalReimbAmount)}`} onClick={() => onNavigate("reimbursements")} />
        <QuickAction icon={<Gift className="h-4 w-4" />} title="Bonus & Incentives" subtitle={`${BONUSES.length} records`} hint={`${stats.pendingBonus} pending · ${formatINRCompact(stats.totalBonusAmount)}`} onClick={() => onNavigate("reimbursements")} />
        <QuickAction icon={<Landmark className="h-4 w-4" />} title="Loans & Advances" subtitle={`${LOANS.length} records`} hint={`${stats.activeLoans} active · ${formatINRCompact(stats.totalLoanOutstanding)}`} onClick={() => onNavigate("loans")} />
      </div>

      {/* Statutory + Bank Advice snapshot */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Statutory Compliance" description="PF, ESI, TDS, Professional Tax" icon={<ShieldCheck className="h-4 w-4" />} action={<Btn size="sm" variant="ghost" iconRight={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => onNavigate("statutory")}>Open</Btn>} flush>
          <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
            <div className="px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Filed</div>
              <div className="tabular text-[18px] font-medium text-foreground">{STATUTORY_RETURNS.filter((r) => r.status === "Filed").length}</div>
            </div>
            <div className="px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending + Overdue</div>
              <div className="tabular text-[18px] font-medium text-foreground">{STATUTORY_RETURNS.filter((r) => r.status !== "Filed").length}</div>
            </div>
          </div>
          <div className="px-4 py-3 text-[12px] text-muted-foreground">
            Total liability: <span className="tabular font-medium text-foreground">{formatINR(STATUTORY_RETURNS.reduce((s, r) => s + r.amount, 0))}</span>
          </div>
        </SectionCard>
        <SectionCard title="Bank Advice" description="Salary disbursement status" icon={<Banknote className="h-4 w-4" />} action={<Btn size="sm" variant="ghost" iconRight={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => onNavigate("bank-advice")}>Open</Btn>} flush>
          <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
            <div className="px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Processed</div>
              <div className="tabular text-[18px] font-medium text-foreground">{BANK_ADVICES.filter((b) => b.status === "Processed").length}</div>
            </div>
            <div className="px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">In Flight</div>
              <div className="tabular text-[18px] font-medium text-foreground">{BANK_ADVICES.filter((b) => b.status === "Generated" || b.status === "Submitted").length}</div>
            </div>
          </div>
          <div className="px-4 py-3 text-[12px] text-muted-foreground">
            Disbursed YTD: <span className="tabular font-medium text-foreground">{formatINRCompact(BANK_ADVICES.reduce((s, b) => s + (b.status === "Processed" ? b.totalAmount : 0), 0))}</span>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function MiniKpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

function QuickAction({ icon, title, subtitle, hint, onClick }: { icon: React.ReactNode; title: string; subtitle: string; hint: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col gap-2 rounded-[6px] border border-border bg-card p-4 text-left hover:bg-accent/40 transition-colors tap"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-[5px] border border-border bg-background text-muted-foreground">
          {icon}
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
      <div>
        <div className="text-[13px] font-medium text-foreground">{title}</div>
        <div className="text-[11px] text-muted-foreground tabular">{subtitle}</div>
      </div>
      <div className="text-[11px] text-muted-foreground tabular">{hint}</div>
    </button>
  );
}

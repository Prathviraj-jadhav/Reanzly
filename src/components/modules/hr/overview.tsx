"use client";

import { useMemo } from "react";
import {
  Users,
  UserPlus,
  UserMinus,
  Briefcase,
  CalendarClock,
  FileWarning,
  Banknote,
  Cake,
  Award,
  ChevronRight,
  Activity,
  Building2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Btn } from "@/components/shared/btn";
import { useHrStore } from "./_store";
import {
  HR_BRANCHES,
  DEPARTMENTS,
  BRANCH_HEADS,
  upcomingBirthdays,
  upcomingAnniversaries,
} from "./_data";
import {
  formatINRCompact,
  formatDateLong,
  formatDate,
  relativeTime,
  initials,
} from "./_helpers";

export function Overview() {
  const employees = useHrStore((s) => s.employees);
  const leaveRequests = useHrStore((s) => s.leaveRequests);
  const positions = useHrStore((s) => s.positions);
  const performanceReviews = useHrStore((s) => s.performanceReviews);
  const exitRequests = useHrStore((s) => s.exitRequests);
  const onboardingPlans = useHrStore((s) => s.onboardingPlans);
  const auditLog = useHrStore((s) => s.auditLog);
  const payrollRuns = useHrStore((s) => s.payrollRuns);

  // ----- KPIs -----
  const activeCount = employees.filter((e) => e.status === "Active").length;
  const onLeaveCount = employees.filter((e) => e.status === "On Leave").length;
  const noticeCount = employees.filter((e) => e.status === "Notice").length;
  const exitedCount = employees.filter((e) => e.status === "Exited").length;

  const now = new Date();
  const joinedThisMonth = employees.filter((e) => {
    const d = new Date(e.doj);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const joinedLast30 = employees.filter((e) => {
    const d = new Date(e.doj);
    return now.getTime() - d.getTime() < 30 * 86400000;
  });

  // Attrition (exited in last 90 days / active headcount)
  const attrition90d = Math.round((exitedCount / Math.max(1, activeCount)) * 100 * 10) / 10;

  const openPositions = positions.filter((p) => p.status === "Open").length;
  const totalOpenings = positions.reduce((s, p) => s + (p.status === "Open" ? p.openings : 0), 0);

  const pendingLeaves = leaveRequests.filter((r) => r.status === "Pending" || r.status === "Manager Approved").length;
  const pendingReviews = performanceReviews.filter((r) => r.status !== "Completed" && r.status !== "Draft").length;
  const activeExits = exitRequests.filter((e) => e.status !== "Exited" && e.status !== "F&F Settled").length;

  // Document expiry within 60 days
  const expiringDocs = employees.flatMap((e) =>
    e.documents
      .filter((d) => {
        if (!d.expiry) return false;
        const days = Math.ceil((new Date(d.expiry).getTime() - Date.now()) / 86400000);
        return days <= 60;
      })
      .map((d) => ({ emp: e, doc: d })),
  );

  const totalMonthlyPayroll = employees
    .filter((e) => e.status === "Active" || e.status === "On Leave")
    .reduce((s, e) => s + e.ctcAnnual / 12, 0);

  const lastRun = payrollRuns[0];

  const birthdays = useMemo(() => upcomingBirthdays(employees, 30), [employees]).slice(0, 6);
  const anniversaries = useMemo(() => upcomingAnniversaries(employees, 30), [employees]).slice(0, 6);

  // Recent joiners (last 90 days)
  const recentJoiners = [...joinedLast30]
    .sort((a, b) => new Date(b.doj).getTime() - new Date(a.doj).getTime())
    .slice(0, 5);

  // Department headcount
  const deptCounts = DEPARTMENTS.map((d) => ({
    dept: d,
    count: employees.filter((e) => e.department === d && e.status !== "Exited").length,
  }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);

  const maxDeptCount = Math.max(...deptCounts.map((d) => d.count), 1);

  // Branch headcount
  const branchCounts = HR_BRANCHES.map((b) => ({
    branch: b,
    count: employees.filter((e) => e.branch === b && e.status !== "Exited").length,
    head: BRANCH_HEADS[b] || "-",
  }));

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiMini label="Headcount" value={String(activeCount + onLeaveCount + noticeCount)} sub={`${activeCount} active`} icon={<Users className="h-3.5 w-3.5" />} />
        <KpiMini label="Joined This Month" value={String(joinedThisMonth)} sub="New hires" icon={<UserPlus className="h-3.5 w-3.5" />} />
        <KpiMini label="Attrition (90d)" value={`${attrition90d}%`} sub={`${exitedCount} exited`} icon={<UserMinus className="h-3.5 w-3.5" />} />
        <KpiMini label="Open Positions" value={String(openPositions)} sub={`${totalOpenings} openings`} icon={<Briefcase className="h-3.5 w-3.5" />} />
        <KpiMini label="Pending Leaves" value={String(pendingLeaves)} sub="Awaiting approval" icon={<CalendarClock className="h-3.5 w-3.5" />} />
        <KpiMini label="Doc Expiries (60d)" value={String(expiringDocs.length)} sub="Action needed" icon={<FileWarning className="h-3.5 w-3.5" />} />
      </div>

      {/* Approval queue + Payroll snapshot */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Pending Approvals"
          description="HR queue · items needing attention"
          icon={<Clock className="h-4 w-4" />}
          className="lg:col-span-2"
          flush
          bodyClassName="p-0"
        >
          <div className="divide-y divide-border">
            <ApprovalRow
              label="Leave Requests"
              count={pendingLeaves}
              hint="Apply → Manager → HR"
              icon={<CalendarClock className="h-3.5 w-3.5" />}
              tone="outline"
            />
            <ApprovalRow
              label="Performance Reviews"
              count={pendingReviews}
              hint="Self / Manager / HR review cycle"
              icon={<Activity className="h-3.5 w-3.5" />}
              tone="outline"
            />
            <ApprovalRow
              label="Exit Requests"
              count={activeExits}
              hint="Resignation → No-dues → F&F"
              icon={<UserMinus className="h-3.5 w-3.5" />}
              tone="outline"
            />
            <ApprovalRow
              label="Onboarding Plans"
              count={onboardingPlans.filter((p) => p.status !== "Completed").length}
              hint="Pre-boarding / In-progress"
              icon={<UserPlus className="h-3.5 w-3.5" />}
              tone="outline"
            />
            <ApprovalRow
              label="Document Expiries"
              count={expiringDocs.length}
              hint="DL/RC/Insurance/Medical"
              icon={<FileWarning className="h-3.5 w-3.5" />}
              tone="solid"
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Payroll Snapshot"
          description={lastRun ? `Last run · ${formatDate(lastRun.disbursedOn || lastRun.approvedOn || lastRun.generatedOn)}` : "No runs"}
          icon={<Banknote className="h-4 w-4" />}
          flush
          bodyClassName="p-4"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Monthly Outgo</span>
              <span className="text-[18px] font-medium tabular text-foreground">
                {formatINRCompact(totalMonthlyPayroll)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Avg CTC / Employee</span>
              <span className="text-[14px] font-medium tabular text-foreground">
                {formatINRCompact(totalMonthlyPayroll / Math.max(1, activeCount))}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Last Run</span>
              {lastRun && (
                <StatusBadge variant={lastRun.status === "Paid" ? "solid" : "outline"}>
                  {lastRun.status}
                </StatusBadge>
              )}
            </div>
            <Btn variant="outline" size="sm" icon={<Banknote className="h-3.5 w-3.5" />}>
              Open Payroll Module
            </Btn>
          </div>
        </SectionCard>
      </div>

      {/* Org structure - branch + department */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Branch Headcount"
          description="Distribution across locations"
          icon={<Building2 className="h-4 w-4" />}
          flush
          bodyClassName="p-0"
        >
          <div className="divide-y divide-border">
            {branchCounts.map((b) => (
              <div key={b.branch} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-border bg-muted text-[10px] font-medium">
                  {b.branch.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium text-foreground truncate">{b.branch}</div>
                  <div className="text-[10.5px] text-muted-foreground truncate">Head: {b.head}</div>
                </div>
                <div className="text-right">
                  <div className="text-[14px] tabular font-medium text-foreground">{b.count}</div>
                  <div className="text-[10px] text-muted-foreground tabular">staff</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Department Distribution"
          description="Headcount by department"
          icon={<Users className="h-4 w-4" />}
          flush
          bodyClassName="p-4"
        >
          <div className="flex flex-col gap-2.5">
            {deptCounts.map((d) => (
              <div key={d.dept} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-[12px] text-foreground truncate">{d.dept}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground transition-all"
                    style={{ width: `${(d.count / maxDeptCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-[12px] tabular text-muted-foreground">{d.count}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Recent joiners + Birthdays + Anniversaries */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Recent Joiners"
          description="Last 30 days"
          icon={<UserPlus className="h-4 w-4" />}
          flush
          bodyClassName="p-0"
        >
          <div className="divide-y divide-border">
            {recentJoiners.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                No new joiners in last 30 days.
              </div>
            ) : (
              recentJoiners.map((emp) => (
                <div key={emp.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-medium">
                    {initials(emp.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-[12.5px] font-medium text-foreground">{emp.name}</div>
                    <div className="text-[10.5px] text-muted-foreground truncate">
                      {emp.designation} · {emp.branch}
                    </div>
                  </div>
                  <div className="text-right text-[10.5px] tabular text-muted-foreground">
                    {formatDateLong(emp.doj)}
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Upcoming Birthdays"
          description="Next 30 days"
          icon={<Cake className="h-4 w-4" />}
          flush
          bodyClassName="p-0"
        >
          <div className="divide-y divide-border">
            {birthdays.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                No birthdays upcoming.
              </div>
            ) : (
              birthdays.map(({ emp, daysUntil }) => (
                <div key={emp.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-medium">
                    {initials(emp.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-[12.5px] font-medium text-foreground">{emp.name}</div>
                    <div className="text-[10.5px] text-muted-foreground truncate">
                      {emp.designation}
                    </div>
                  </div>
                  <div className="text-right text-[10.5px] tabular">
                    <div className="text-foreground">
                      {new Date(emp.dob).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </div>
                    <div className="text-muted-foreground">
                      {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `in ${daysUntil}d`}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Work Anniversaries"
          description="Next 30 days"
          icon={<Award className="h-4 w-4" />}
          flush
          bodyClassName="p-0"
        >
          <div className="divide-y divide-border">
            {anniversaries.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                No anniversaries upcoming.
              </div>
            ) : (
              anniversaries.map(({ emp, years, daysUntil }) => (
                <div key={emp.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-medium tabular">
                    {years}y
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-[12.5px] font-medium text-foreground">{emp.name}</div>
                    <div className="text-[10.5px] text-muted-foreground truncate">
                      Joined {formatDateLong(emp.doj)}
                    </div>
                  </div>
                  <div className="text-right text-[10.5px] tabular text-muted-foreground">
                    {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `in ${daysUntil}d`}
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      {/* Open positions + Document expiries + Audit log */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Open Positions"
          description="Active hiring pipeline"
          icon={<Briefcase className="h-4 w-4" />}
          flush
          bodyClassName="p-0"
        >
          <div className="divide-y divide-border">
            {positions.filter((p) => p.status === "Open").slice(0, 5).map((p) => {
              const interviewing = p.candidates.filter((c) => c.stage === "Interview").length;
              const offers = p.candidates.filter((c) => c.stage === "Offer").length;
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-border bg-muted text-[10px] font-medium">
                    {p.role.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium text-foreground truncate">
                      {p.role} · {p.branch}
                    </div>
                    <div className="text-[10.5px] tabular text-muted-foreground">
                      {p.openings} openings · {p.candidates.length} candidates · {interviewing} in interview{offers > 0 ? ` · ${offers} offer` : ""}
                    </div>
                  </div>
                  <div className="text-right text-[10.5px] tabular text-muted-foreground">
                    {relativeTime(p.postedOn)}
                  </div>
                </div>
              );
            })}
            {positions.filter((p) => p.status === "Open").length === 0 && (
              <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                No open positions.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Recent Activity"
          description="Audit trail"
          icon={<Activity className="h-4 w-4" />}
          className="lg:col-span-2"
          flush
          bodyClassName="p-0"
        >
          <div className="max-h-80 divide-y divide-border overflow-y-auto scrollbar-thin">
            {auditLog.slice(0, 12).map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 px-4 py-2.5">
                <div className="mt-0.5">
                  <AuditActionIcon action={entry.action} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-foreground">{entry.description}</div>
                  <div className="text-[10.5px] text-muted-foreground">
                    <span className="font-mono tabular">{entry.entityId}</span> · {entry.user}
                  </div>
                </div>
                <div className="text-right text-[10.5px] tabular text-muted-foreground">
                  {relativeTime(entry.timestamp)}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Compliance watch */}
      <SectionCard
        title="Compliance Watch"
        description="Document expiry · next 60 days"
        icon={<FileWarning className="h-4 w-4" />}
        flush
        bodyClassName="p-0"
      >
        <div className="max-h-80 divide-y divide-border overflow-y-auto scrollbar-thin">
          {expiringDocs.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
              All documents valid.
            </div>
          ) : (
            expiringDocs.slice(0, 8).map(({ emp, doc }, i) => {
              const days = Math.ceil((new Date(doc.expiry!).getTime() - Date.now()) / 86400000);
              return (
                <div key={`${emp.id}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
                  <FileWarning className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-[12px] font-medium text-foreground">
                      {doc.type}
                    </div>
                    <div className="truncate text-[10.5px] text-muted-foreground">
                      {emp.name} · {emp.empCode}
                    </div>
                  </div>
                  <StatusBadge variant={days < 0 ? "solid" : days <= 15 ? "solid" : "outline"} pulse={days <= 15}>
                    {days < 0 ? `Expired ${Math.abs(days)}d` : `${days}d`}
                  </StatusBadge>
                </div>
              );
            })
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function KpiMini({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[6px] border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[18px] font-medium leading-none tabular text-foreground">{value}</span>
      {sub && <span className="text-[10.5px] text-muted-foreground truncate">{sub}</span>}
    </div>
  );
}

function ApprovalRow({
  label,
  count,
  hint,
  icon,
  tone,
}: {
  label: string;
  count: number;
  hint: string;
  icon: React.ReactNode;
  tone: "outline" | "solid";
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-border bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-medium text-foreground">{label}</div>
        <div className="text-[10.5px] text-muted-foreground truncate">{hint}</div>
      </div>
      <StatusBadge variant={count > 0 ? tone : "muted"} pulse={count > 0 && tone === "solid"}>
        <span className="tabular">{count}</span>
      </StatusBadge>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
  );
}

function AuditActionIcon({ action }: { action: string }) {
  if (action === "create") return <UserPlus className="h-3.5 w-3.5 text-foreground" />;
  if (action === "approve") return <CheckCircle2 className="h-3.5 w-3.5 text-foreground" />;
  if (action === "reject") return <UserMinus className="h-3.5 w-3.5 text-foreground" />;
  if (action === "delete") return <UserMinus className="h-3.5 w-3.5 text-muted-foreground" />;
  return <Activity className="h-3.5 w-3.5 text-muted-foreground" />;
}

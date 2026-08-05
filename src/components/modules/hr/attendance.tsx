"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Fingerprint,
  Calendar,
  TrendingUp,
  AlertCircle,
  Clock,
  Check,
  X,
  CalendarDays,
  CalendarRange,
  Layers,
} from "lucide-react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHrStore } from "./_store";
import {
  HR_BRANCHES,
  SHIFTS,
  type AttendanceMark,
  type AttendanceReg,
} from "./_data";
import {
  formatDate,
  formatMonthYear,
  relativeTime,
  attendanceMarkMeta,
  employeeStatusBadge,
  regStatusBadge,
  initials,
} from "./_helpers";

export function Attendance() {
  const employees = useHrStore((s) => s.employees);
  const daily = useHrStore((s) => s.attendanceDaily);
  const summaries = useHrStore((s) => s.attendanceSummaries);
  const regs = useHrStore((s) => s.attendanceRegs);
  const setRegStatus = useHrStore((s) => s.setRegStatus);
  const [view, setView] = useState<"matrix" | "calendar" | "summary" | "regs" | "shifts">("matrix");

  const today = new Date();
  const [month, setMonth] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
  );
  const [branchFilter, setBranchFilter] = useState<string>("All");

  // Build available months (last 3)
  const availableMonths = useMemo(() => {
    const arr: { value: string; label: string }[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      arr.push({ value: v, label: formatMonthYear(v) });
    }
    return arr;
  }, []);

  // Filter employees (active only) by branch
  const filteredEmployees = useMemo(() => {
    return employees.filter(
      (e) => e.status === "Active" && (branchFilter === "All" || e.branch === branchFilter),
    );
  }, [employees, branchFilter]);

  // Days in selected month
  const daysInMonth = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return new Date(y, m, 0).getDate();
  }, [month]);

  // Today's date (cap to current month days)
  const isCurrentMonth = month === availableMonths[0].value;
  const maxDay = isCurrentMonth ? today.getDate() : daysInMonth;

  // Daily attendance lookup: empId + dateStr → record
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceMark>();
    for (const r of daily) {
      if (r.date.startsWith(month)) {
        map.set(`${r.empId}|${r.date.slice(8, 10)}`, r.mark);
      }
    }
    return map;
  }, [daily, month]);

  // Build per-employee summary from daily data for selected month
  const monthSummaries = useMemo(() => {
    return filteredEmployees.map((emp) => {
      let present = 0, absent = 0, halfDay = 0, leave = 0, weekoff = 0, trip = 0, otHours = 0, late = 0;
      for (let d = 1; d <= maxDay; d++) {
        const m = attendanceMap.get(`${emp.id}|${String(d).padStart(2, "0")}`);
        if (!m) continue;
        if (m === "P") present++;
        else if (m === "A") absent++;
        else if (m === "H") halfDay++;
        else if (m === "L") leave++;
        else if (m === "W") weekoff++;
        else if (m === "T") { trip++; present++; }
      }
      // Try persisted summary if exists
      const persisted = summaries.find((s) => s.empId === emp.id);
      if (persisted) {
        otHours = persisted.otHours;
        late = persisted.lateCount;
      }
      return { emp, present, absent, halfDay, leave, weekoff, trip, otHours, late };
    });
  }, [filteredEmployees, attendanceMap, maxDay, summaries]);

  // KPIs
  const totalPresent = monthSummaries.reduce((s, m) => s + m.present, 0);
  const totalAbsent = monthSummaries.reduce((s, m) => s + m.absent, 0);
  const totalOT = monthSummaries.reduce((s, m) => s + m.otHours, 0);
  const totalLate = monthSummaries.reduce((s, m) => s + m.late, 0);

  // Day-of-week for column headers
  const dayHeaders = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return Array.from({ length: maxDay }, (_, i) => {
      const d = new Date(y, m - 1, i + 1);
      return { day: i + 1, dow: d.getDay(), isWeekend: d.getDay() === 0 };
    });
  }, [month, maxDay]);

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiMini label="Total Present" value={String(totalPresent)} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <KpiMini label="Total Absent" value={String(totalAbsent)} icon={<AlertCircle className="h-3.5 w-3.5" />} />
        <KpiMini label="OT Hours" value={String(totalOT)} icon={<Calendar className="h-3.5 w-3.5" />} />
        <KpiMini label="Late Ins" value={String(totalLate)} icon={<AlertCircle className="h-3.5 w-3.5" />} />
      </div>

      {/* View toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-[5px] border border-border bg-background p-0.5">
          {[
            { id: "matrix", label: "Matrix", icon: <Layers className="h-3 w-3" /> },
            { id: "calendar", label: "Calendar", icon: <CalendarRange className="h-3 w-3" /> },
            { id: "summary", label: "Summary", icon: <CalendarDays className="h-3 w-3" /> },
            { id: "regs", label: "Regularization", icon: <Clock className="h-3 w-3" /> },
            { id: "shifts", label: "Shifts", icon: <Clock className="h-3 w-3" /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id as typeof view)}
              className={cn(
                "flex items-center gap-1.5 rounded-[3px] px-2.5 py-1.5 text-[12px] font-medium transition-colors tap",
                view === t.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.icon}
              {t.label}
              {t.id === "regs" && regs.filter((r) => r.status === "Pending").length > 0 && (
                <span className="ml-1 tabular">({regs.filter((r) => r.status === "Pending").length})</span>
              )}
            </button>
          ))}
        </div>
        <Btn
          variant="outline"
          size="sm"
          icon={<Fingerprint className="h-3.5 w-3.5" />}
          onClick={() => toast.success("Biometric sync started", { description: "Importing from device GP-BIO-001" })}
        >
          <span className="hidden sm:inline">Biometric Sync</span>
        </Btn>
      </div>

      {/* Toolbar (month/branch selectors) - only for matrix/calendar/summary */}
      {(view === "matrix" || view === "calendar" || view === "summary") && (
        <SectionCard
          title="Attendance"
          description={`${filteredEmployees.length} employees · ${formatMonthYear(month)}`}
          icon={<Fingerprint className="h-4 w-4" />}
          flush
          bodyClassName="px-4 py-3"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="h-8 w-[150px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="h-8 w-[150px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Branches</SelectItem>
                {HR_BRANCHES.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-3">
              <Legend />
            </div>
          </div>
        </SectionCard>
      )}

      {/* MATRIX VIEW */}
      {view === "matrix" && (
      <div className="overflow-x-auto rounded-[6px] border border-border bg-card scrollbar-thin">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-border">
              <th className="sticky left-0 z-10 min-w-[180px] bg-card px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Employee
              </th>
              {dayHeaders.map((h) => (
                <th
                  key={h.day}
                  className={cn(
                    "px-1.5 py-2 text-center text-[10px] font-medium tabular",
                    h.isWeekend ? "text-muted-foreground/50" : "text-muted-foreground",
                  )}
                >
                  {h.day}
                </th>
              ))}
              <th className="sticky right-0 z-10 bg-card px-2 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                P
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {monthSummaries.map(({ emp, present }) => (
              <tr key={emp.id} className="hover:bg-accent/30">
                <td className="sticky left-0 z-10 bg-card px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[9px] font-medium text-foreground">
                      {initials(emp.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-medium text-foreground">{emp.name}</div>
                      <div className="font-mono text-[10px] tabular text-muted-foreground">
                        {emp.empCode} · {emp.designation}
                      </div>
                    </div>
                  </div>
                </td>
                {dayHeaders.map((h) => {
                  const mark = attendanceMap.get(`${emp.id}|${String(h.day).padStart(2, "0")}`);
                  const meta = mark ? attendanceMarkMeta(mark) : null;
                  return (
                    <td key={h.day} className="px-1.5 py-1.5 text-center">
                      {meta ? (
                        <div
                          className={cn(
                            "mx-auto flex h-5 w-5 items-center justify-center rounded-[3px] text-[9px] font-medium tabular",
                            meta.cellClass,
                          )}
                          title={`${h.day} ${formatMonthYear(month)} · ${meta.title}`}
                        >
                          {meta.label}
                        </div>
                      ) : (
                        <div className="mx-auto h-5 w-5 rounded-[3px] border border-dashed border-border/60" />
                      )}
                    </td>
                  );
                })}
                <td className="sticky right-0 z-10 bg-card px-2 py-2 text-right">
                  <span className="text-[12px] tabular font-medium text-foreground">{present}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* CALENDAR VIEW - single employee selected */}
      {view === "calendar" && (
        <CalendarView
          employees={filteredEmployees}
          attendanceMap={attendanceMap}
          month={month}
          dayHeaders={dayHeaders}
        />
      )}

      {/* SUMMARY VIEW */}
      {view === "summary" && (
      <SectionCard
        title="Monthly Summary"
        description="Per-employee breakdown"
        icon={<Calendar className="h-4 w-4" />}
        flush
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-border">
                {["Employee", "Present", "Absent", "Half", "Leave", "WO", "Trip", "OT (h)", "Late", "Status"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {monthSummaries.map(({ emp, present, absent, halfDay, leave, weekoff, trip, otHours, late }) => {
                const { variant, pulse } = employeeStatusBadge(emp.status);
                return (
                  <tr key={emp.id} className="hover:bg-accent/30">
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-medium text-foreground">{emp.name}</span>
                        <span className="font-mono text-[10px] tabular text-muted-foreground">{emp.empCode}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[12px] tabular text-foreground">{present}</td>
                    <td className="px-3 py-2 text-[12px] tabular text-muted-foreground">{absent}</td>
                    <td className="px-3 py-2 text-[12px] tabular text-muted-foreground">{halfDay}</td>
                    <td className="px-3 py-2 text-[12px] tabular text-muted-foreground">{leave}</td>
                    <td className="px-3 py-2 text-[12px] tabular text-muted-foreground">{weekoff}</td>
                    <td className="px-3 py-2 text-[12px] tabular text-muted-foreground">{trip || "-"}</td>
                    <td className="px-3 py-2 text-[12px] tabular text-foreground">{otHours}</td>
                    <td className="px-3 py-2 text-[12px] tabular text-foreground">{late}</td>
                    <td className="px-3 py-2">
                      <StatusBadge variant={variant} pulse={pulse}>
                        {emp.status}
                      </StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
      )}

      {/* REGULARIZATION REQUESTS */}
      {view === "regs" && (
        <RegularizationView
          regs={regs}
          onApprove={(r) => {
            setRegStatus(r.id, "Approved", "Approved by HR");
            toast.success("Regularization approved", { description: `${r.empName} · ${r.type}` });
          }}
          onReject={(r) => {
            setRegStatus(r.id, "Rejected", "Insufficient justification");
            toast.success("Regularization rejected", { description: `${r.empName} · ${r.type}` });
          }}
        />
      )}

      {/* SHIFT MANAGEMENT */}
      {view === "shifts" && <ShiftsView />}

      <p className="text-[11px] text-muted-foreground">
        Driver duty-on time is recorded via the Driver Field App. Trip-linked attendance (T) auto-syncs from completed trips. Last synced {relativeTime(new Date().toISOString())}.
      </p>
    </div>
  );
}

// ============================================================
// Calendar View - one employee at a time, traditional calendar
// ============================================================
function CalendarView({
  employees,
  attendanceMap,
  month,
  dayHeaders,
}: {
  employees: ReturnType<typeof useHrStore.getState>["employees"];
  attendanceMap: Map<string, AttendanceMark>;
  month: string;
  dayHeaders: { day: number; dow: number; isWeekend: boolean }[];
}) {
  const [empId, setEmpId] = useState<string>(employees[0]?.id || "");
  const emp = employees.find((e) => e.id === empId) || employees[0];

  if (!emp) {
    return (
      <SectionCard title="Calendar" description="No active employees" icon={<CalendarRange className="h-4 w-4" />} flush bodyClassName="p-4">
        <div className="text-[12px] text-muted-foreground">No active employees in the selected branch.</div>
      </SectionCard>
    );
  }

  // Build a traditional calendar grid (weeks × 7 days)
  const [y, m] = month.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1).getDay(); // 0 = Sunday
  const daysInMonth = dayHeaders.length;
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weekDayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const presentCount = dayHeaders.filter((h) => attendanceMap.get(`${emp.id}|${String(h.day).padStart(2, "0")}`) === "P" || attendanceMap.get(`${emp.id}|${String(h.day).padStart(2, "0")}`) === "T").length;
  const absentCount = dayHeaders.filter((h) => attendanceMap.get(`${emp.id}|${String(h.day).padStart(2, "0")}`) === "A").length;
  const leaveCount = dayHeaders.filter((h) => attendanceMap.get(`${emp.id}|${String(h.day).padStart(2, "0")}`) === "L").length;

  return (
    <SectionCard
      title="Calendar View"
      description={`${emp.name} · ${formatMonthYear(month)}`}
      icon={<CalendarRange className="h-4 w-4" />}
      flush
      bodyClassName="p-4"
      action={
        <Select value={empId} onValueChange={setEmpId}>
          <SelectTrigger className="h-8 w-[220px] text-[13px]">
            <SelectValue placeholder="Select employee…" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name} · {e.empCode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <div className="grid grid-cols-3 gap-2 mb-4">
        <CalStat label="Present" value={presentCount} />
        <CalStat label="Absent" value={absentCount} />
        <CalStat label="Leave" value={leaveCount} />
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {weekDayLabels.map((w) => (
          <div key={w} className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground pb-1">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="aspect-square" />;
          const mark = attendanceMap.get(`${emp.id}|${String(day).padStart(2, "0")}`);
          const meta = mark ? attendanceMarkMeta(mark) : null;
          const dow = new Date(y, m - 1, day).getDay();
          const isWeekend = dow === 0;
          return (
            <div
              key={i}
              className={cn(
                "aspect-square flex flex-col items-center justify-center rounded-[5px] border text-[10px] tabular",
                isWeekend && !meta ? "border-dashed border-border/50 bg-muted/20" : "border-border bg-card",
              )}
            >
              <span className={cn("text-[10px] tabular", isWeekend ? "text-muted-foreground/50" : "text-muted-foreground")}>
                {day}
              </span>
              {meta && (
                <div className={cn("mt-0.5 flex h-4 w-4 items-center justify-center rounded-[3px] text-[8px] font-medium", meta.cellClass)}>
                  {meta.label}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function CalStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[5px] border border-border p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-[16px] font-medium tabular text-foreground">{value}</div>
    </div>
  );
}

// ============================================================
// Regularization Requests View
// ============================================================
function RegularizationView({
  regs,
  onApprove,
  onReject,
}: {
  regs: AttendanceReg[];
  onApprove: (r: AttendanceReg) => void;
  onReject: (r: AttendanceReg) => void;
}) {
  const pending = regs.filter((r) => r.status === "Pending");
  const reviewed = regs.filter((r) => r.status !== "Pending");
  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Pending Regularization"
        description={`${pending.length} awaiting review`}
        icon={<Clock className="h-4 w-4" />}
        flush
        bodyClassName="p-0"
      >
        <div className="divide-y divide-border">
          {pending.length === 0 ? (
            <div className="px-3 py-8 text-center text-[12px] text-muted-foreground">
              No pending regularization requests.
            </div>
          ) : (
            pending.map((r) => <RegRow key={r.id} r={r} onApprove={onApprove} onReject={onReject} />)
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Reviewed Requests"
        description={`${reviewed.length} reviewed`}
        icon={<Check className="h-4 w-4" />}
        flush
        bodyClassName="p-0"
      >
        <div className="divide-y divide-border">
          {reviewed.map((r) => <RegRow key={r.id} r={r} readOnly />)}
        </div>
      </SectionCard>
    </div>
  );
}

function RegRow({
  r,
  onApprove,
  onReject,
  readOnly,
}: {
  r: AttendanceReg;
  onApprove?: (r: AttendanceReg) => void;
  onReject?: (r: AttendanceReg) => void;
  readOnly?: boolean;
}) {
  const { variant, pulse } = regStatusBadge(r.status);
  return (
    <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-medium">
          {initials(r.empName)}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-medium text-foreground">{r.empName}</span>
            <StatusBadge variant="outline" className="font-mono">{r.empCode}</StatusBadge>
            <StatusBadge variant="muted">{r.type}</StatusBadge>
          </div>
          <div className="mt-0.5 text-[11.5px] text-muted-foreground">
            Date: <span className="tabular">{formatDate(r.date)}</span> · Applied {relativeTime(r.appliedOn)}
          </div>
          <div className="mt-1 max-w-md text-[11.5px] text-foreground">{r.reason}</div>
          {r.reviewerComments && (
            <div className="mt-1 text-[10.5px] text-muted-foreground italic">
              "{r.reviewerComments}" · {r.reviewedBy}
            </div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!readOnly && r.status === "Pending" ? (
          <>
            <Btn variant="primary" size="sm" icon={<Check className="h-3.5 w-3.5" />} onClick={() => onApprove?.(r)}>
              Approve
            </Btn>
            <Btn variant="outline" size="sm" icon={<X className="h-3.5 w-3.5" />} onClick={() => onReject?.(r)}>
              Reject
            </Btn>
          </>
        ) : (
          <StatusBadge variant={variant} pulse={pulse}>{r.status}</StatusBadge>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Shifts View
// ============================================================
function ShiftsView() {
  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Shift Management"
        description="Defined shifts across branches"
        icon={<Clock className="h-4 w-4" />}
        flush
        bodyClassName="p-0"
        action={
          <Btn variant="primary" size="sm" icon={<Calendar className="h-3.5 w-3.5" />} onClick={() => toast.info("New Shift", { description: "Open the shift definition form." })}>
            New Shift
          </Btn>
        }
      >
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-border">
                {["Shift", "Start", "End", "Grace (min)", "Week Off", "OT Eligible", "Assigned"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SHIFTS.map((s) => (
                <tr key={s.id} className="hover:bg-accent/30">
                  <td className="px-3 py-2.5">
                    <span className="text-[12.5px] font-medium text-foreground">{s.name}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] tabular text-foreground">{s.startTime}</td>
                  <td className="px-3 py-2.5 text-[12px] tabular text-foreground">{s.endTime}</td>
                  <td className="px-3 py-2.5 text-[12px] tabular text-foreground">{s.graceLateMin}</td>
                  <td className="px-3 py-2.5 text-[12px] text-muted-foreground">{s.weekOff}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge variant={s.otEligible ? "solid" : "muted"}>
                      {s.otEligible ? "Eligible" : "No"}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] tabular text-foreground">{s.assignedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard
        title="Biometric Devices"
        description="Device status across branches"
        icon={<Fingerprint className="h-4 w-4" />}
        flush
        bodyClassName="p-0"
      >
        <div className="divide-y divide-border">
          {[
            { id: "GP-BIO-001", branch: "Mumbai HQ", model: "eSSL K90 Pro", online: true, lastSync: "2m ago", punches: 184 },
            { id: "GP-BIO-002", branch: "Pune Branch", model: "eSSL K90 Pro", online: true, lastSync: "5m ago", punches: 76 },
            { id: "GP-BIO-003", branch: "Delhi Branch", model: "Realtime T5", online: false, lastSync: "1h ago", punches: 0 },
            { id: "GP-BIO-004", branch: "Bengaluru Branch", model: "eSSL Uface 402", online: true, lastSync: "1m ago", punches: 52 },
            { id: "GP-BIO-005", branch: "Chennai Branch", model: "Realtime T5", online: true, lastSync: "3m ago", punches: 41 },
          ].map((d) => (
            <div key={d.id} className="flex items-center gap-3 px-3 py-2.5">
              <Fingerprint className={cn("h-4 w-4 shrink-0", d.online ? "text-foreground" : "text-muted-foreground")} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] tabular text-foreground">{d.id}</span>
                  <span className="text-[12px] text-foreground">{d.branch}</span>
                </div>
                <div className="text-[10.5px] text-muted-foreground">
                  {d.model} · {d.punches} punches today · sync {d.lastSync}
                </div>
              </div>
              <StatusBadge variant={d.online ? "solid" : "muted"} pulse={d.online}>
                {d.online ? "Online" : "Offline"}
              </StatusBadge>
            </div>
          ))}
        </div>
      </SectionCard>
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

function Legend() {
  const items: { mark: AttendanceMark; label: string }[] = [
    { mark: "P", label: "Present" },
    { mark: "A", label: "Absent" },
    { mark: "H", label: "Half-day" },
    { mark: "L", label: "Leave" },
    { mark: "W", label: "Week Off" },
    { mark: "T", label: "Trip" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((it) => {
        const meta = attendanceMarkMeta(it.mark);
        return (
          <div key={it.mark} className="flex items-center gap-1.5">
            <div className={cn("flex h-4 w-4 items-center justify-center rounded-[3px] text-[9px] font-medium", meta.cellClass)}>
              {meta.label}
            </div>
            <span className="text-[10px] text-muted-foreground">{it.label}</span>
          </div>
        );
      })}
    </div>
  );
}

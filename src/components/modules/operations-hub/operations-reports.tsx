"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { TrendingUp, Clock, Layers, Trophy, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";
import {
  DEPARTMENTS,
  SPRINTS,
  formatDate,
  initials,
} from "./_helpers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportsProps {
  tasks: Task[];
  // Shared filters from parent
  sprintId: string;
  department: string;
  assignee: string;
  onSprintChange: (id: string) => void;
  onDepartmentChange: (d: string) => void;
  onAssigneeChange: (a: string) => void;
}

const GREY_RAMP = ["#171717", "#525252", "#737373", "#a3a3a3", "#c4c4c4", "#e5e5e5"];

type DateRangePreset = "7d" | "14d" | "30d" | "90d" | "all";

const DATE_PRESETS: { id: DateRangePreset; label: string; days: number }[] = [
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "14d", label: "Last 14 days", days: 14 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
  { id: "all", label: "All time", days: 0 },
];

export function OperationsReports({
  tasks,
  sprintId,
  department,
  assignee,
  onSprintChange,
  onDepartmentChange,
  onAssigneeChange,
}: ReportsProps) {
  const [datePreset, setDatePreset] = useState<DateRangePreset>("30d");

  // Apply filters
  const filtered = useMemo(() => {
    const preset = DATE_PRESETS.find((p) => p.id === datePreset)!;
    const cutoff = preset.days > 0 ? Date.now() - preset.days * 86400000 : 0;
    return tasks.filter((t) => {
      if (sprintId !== "all" && t.sprint !== sprintId) return false;
      if (department !== "all" && t.department !== department) return false;
      if (assignee !== "all" && t.assignee !== assignee) return false;
      if (cutoff > 0 && new Date(t.createdDate).getTime() < cutoff) return false;
      return true;
    });
  }, [tasks, sprintId, department, assignee, datePreset]);

  // Assignee options derived from filtered set
  const assigneeOptions = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => set.add(t.assignee));
    return Array.from(set).sort();
  }, [tasks]);

  // ===== Chart 1: Tasks completed vs planned (by department) =====
  const plannedVsCompleted = useMemo(() => {
    return DEPARTMENTS.map((d) => {
      const inDept = filtered.filter((t) => t.department === d);
      const planned = inDept.filter((t) => t.status !== "Backlog").length;
      const completed = inDept.filter((t) => t.status === "Completed").length;
      return { department: d.slice(0, 4), planned, completed };
    });
  }, [filtered]);

  // ===== Chart 2: Avg cycle time by department (days) =====
  const cycleTime = useMemo(() => {
    return DEPARTMENTS.map((d) => {
      const done = filtered.filter(
        (t) => t.department === d && t.status === "Completed" && t.completedDate,
      );
      const avg =
        done.length === 0
          ? 0
          : done.reduce((s, t) => {
              const cycle =
                (new Date(t.completedDate!).getTime() - new Date(t.createdDate).getTime()) /
                86400000;
              return s + Math.max(0, cycle);
            }, 0) / done.length;
      return { department: d.slice(0, 4), cycleDays: Number(avg.toFixed(1)), count: done.length };
    });
  }, [filtered]);

  // ===== Chart 3: Department throughput (total tasks) =====
  const throughput = useMemo(() => {
    return DEPARTMENTS.map((d) => {
      const inDept = filtered.filter((t) => t.department === d);
      return {
        department: d,
        total: inDept.length,
        open: inDept.filter((t) => t.status !== "Completed" && t.status !== "Backlog").length,
      };
    }).sort((a, b) => b.total - a.total);
  }, [filtered]);

  // ===== Chart 4: Completion rate by assignee (ranked) =====
  const assigneeRanking = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    filtered.forEach((t) => {
      const e = map.get(t.assignee) ?? { total: 0, done: 0 };
      e.total += 1;
      if (t.status === "Completed") e.done += 1;
      map.set(t.assignee, e);
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({
        name,
        total: v.total,
        done: v.done,
        rate: v.total === 0 ? 0 : Math.round((v.done / v.total) * 100),
      }))
      .sort((a, b) => b.done - a.done || b.rate - a.rate);
  }, [filtered]);

  // KPI summary tiles
  const totalPlanned = filtered.filter((t) => t.status !== "Backlog").length;
  const totalCompleted = filtered.filter((t) => t.status === "Completed").length;
  const completionRate = totalPlanned === 0 ? 0 : Math.round((totalCompleted / totalPlanned) * 100);
  const overallCycle =
    filtered.filter((t) => t.completedDate).reduce((s, t) => {
      const c = (new Date(t.completedDate!).getTime() - new Date(t.createdDate).getTime()) / 86400000;
      return s + Math.max(0, c);
    }, 0) / Math.max(1, filtered.filter((t) => t.completedDate).length);

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-border bg-card p-3">
        <FilterLabel icon={<Layers className="h-3.5 w-3.5" />} label="Sprint">
          <Select value={sprintId} onValueChange={onSprintChange}>
            <SelectTrigger className="h-8 w-[170px] rounded-[5px] border-border bg-background text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sprints</SelectItem>
              {SPRINTS.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} · {s.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterLabel>

        <FilterLabel icon={<Layers className="h-3.5 w-3.5" />} label="Department">
          <Select value={department} onValueChange={onDepartmentChange}>
            <SelectTrigger className="h-8 w-[150px] rounded-[5px] border-border bg-background text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterLabel>

        <FilterLabel icon={<Trophy className="h-3.5 w-3.5" />} label="Assignee">
          <Select value={assignee} onValueChange={onAssigneeChange}>
            <SelectTrigger className="h-8 w-[180px] rounded-[5px] border-border bg-background text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              {assigneeOptions.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterLabel>

        <FilterLabel icon={<Calendar className="h-3.5 w-3.5" />} label="Range">
          <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DateRangePreset)}>
            <SelectTrigger className="h-8 w-[140px] rounded-[5px] border-border bg-background text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterLabel>

        <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="tabular">{filtered.length} tasks in view</span>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Planned (sprint)" value={totalPlanned} icon={<Layers className="h-4 w-4" />} />
        <KpiTile label="Completed" value={totalCompleted} icon={<TrendingUp className="h-4 w-4" />} />
        <KpiTile label="Completion rate" value={`${completionRate}%`} icon={<TrendingUp className="h-4 w-4" />} />
        <KpiTile label="Avg cycle time" value={`${overallCycle.toFixed(1)}d`} icon={<Clock className="h-4 w-4" />} />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Chart 1 - planned vs completed */}
        <ChartCard title="Completed vs Planned" subtitle="By department for selected sprint" icon={<TrendingUp className="h-3.5 w-3.5" />}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={plannedVsCompleted} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={2} barCategoryGap="22%">
              <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="department" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 5, fontSize: 11 }}
                labelStyle={{ color: "var(--muted-foreground)" }}
                cursor={{ fill: "var(--accent)" }}
              />
              <Bar dataKey="planned" fill="#a3a3a3" name="Planned" radius={[2, 2, 0, 0]} />
              <Bar dataKey="completed" fill="#171717" name="Completed" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <Legend2 items={[{ label: "Planned", color: "#a3a3a3" }, { label: "Completed", color: "#171717" }]} />
        </ChartCard>

        {/* Chart 2 - cycle time by department */}
        <ChartCard title="Avg Cycle Time" subtitle="Days from create → complete" icon={<Clock className="h-3.5 w-3.5" />}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cycleTime} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} layout="vertical">
              <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} unit="d" />
              <YAxis dataKey="department" type="category" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={44} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 5, fontSize: 11 }}
                labelStyle={{ color: "var(--muted-foreground)" }}
                cursor={{ fill: "var(--accent)" }}
                formatter={(value: number, _name, props) => [`${value} d`, `Cycle (${(props.payload as { count: number }).count} tasks)`]}
              />
              <Bar dataKey="cycleDays" radius={[0, 2, 2, 0]}>
                {cycleTime.map((_, i) => (
                  <Cell key={i} fill={GREY_RAMP[i % GREY_RAMP.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 3 - department throughput */}
        <ChartCard title="Department Throughput" subtitle="Total tasks per department" icon={<Layers className="h-3.5 w-3.5" />}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={throughput} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={2} barCategoryGap="22%">
              <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="department" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 5, fontSize: 11 }}
                labelStyle={{ color: "var(--muted-foreground)" }}
                cursor={{ fill: "var(--accent)" }}
              />
              <Bar dataKey="total" fill="#171717" name="Total" radius={[2, 2, 0, 0]} />
              <Bar dataKey="open" fill="#a3a3a3" name="Open" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <Legend2 items={[{ label: "Total", color: "#171717" }, { label: "Open", color: "#a3a3a3" }]} />
        </ChartCard>

        {/* Chart 4 - completion rate by assignee (ranked list) */}
        <ChartCard
          title="Top Assignees"
          subtitle="Ranked by tasks completed"
          icon={<Trophy className="h-3.5 w-3.5" />}
          right={
            <span className="tabular text-[11px] text-muted-foreground">
              {assigneeRanking.length} people
            </span>
          }
        >
          <div className="max-h-[260px] space-y-2 overflow-y-auto scrollbar-thin pr-1">
            {assigneeRanking.length === 0 && (
              <div className="py-8 text-center text-[12px] text-muted-foreground/70">
                No data for current filters.
              </div>
            )}
            {assigneeRanking.map((a, i) => (
              <div key={a.name} className="flex items-center gap-2.5">
                <span className="tabular w-5 text-[11px] text-muted-foreground">{i + 1}</span>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[9px] font-medium">
                  {initials(a.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="truncate font-medium text-foreground">{a.name}</span>
                    <span className="tabular text-muted-foreground">
                      {a.done}/{a.total} · {a.rate}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        a.rate >= 75 ? "bg-foreground" : a.rate >= 40 ? "bg-foreground/60" : "bg-foreground/30",
                      )}
                      style={{ width: `${a.rate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Footer note */}
      <div className="rounded-[6px] border border-dashed border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        Reports reflect <span className="font-medium text-foreground">{filtered.length}</span> tasks across the selected
        sprint, department, assignee, and date range. Cycle time is computed only from completed tasks with a recorded
        completion date. Last updated {formatDate(new Date())}.
      </div>
    </div>
  );
}

// ===== Primitives =====
function FilterLabel({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </span>
      {children}
    </div>
  );
}

function KpiTile({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="rounded-[6px] border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="mt-1.5 tabular text-[22px] font-medium leading-none text-foreground">{value}</div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  icon,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[6px] border border-border bg-card p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-start gap-2">
          {icon && <span className="mt-0.5 text-muted-foreground">{icon}</span>}
          <div>
            <h3 className="text-[13px] font-medium tracking-tight text-foreground">{title}</h3>
            {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Legend2({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mt-2 flex items-center justify-center gap-4">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="h-2 w-2 rounded-sm" style={{ background: it.color }} />
          {it.label}
        </div>
      ))}
    </div>
  );
}

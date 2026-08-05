"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  UserPlus,
  ListChecks,
  CalendarDays,
  UserCheck,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronRight,
  FileText,
  Briefcase,
  ShieldCheck,
  Coffee,
  ClipboardList,
} from "lucide-react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { useHrStore } from "./_store";
import {
  type OnboardingPlan,
  type OnboardingStatus,
  type OnboardingTask,
  type Employee,
} from "./_data";
import {
  formatDate,
  formatDateLong,
  relativeTime,
  initials,
  onboardingStatusBadge,
} from "./_helpers";

const TASK_CATEGORY_ICON: Record<OnboardingTask["category"], React.ReactNode> = {
  Documentation: <FileText className="h-3.5 w-3.5" />,
  Orientation: <Briefcase className="h-3.5 w-3.5" />,
  Setup: <ShieldCheck className="h-3.5 w-3.5" />,
  Training: <ClipboardList className="h-3.5 w-3.5" />,
  Social: <Coffee className="h-3.5 w-3.5" />,
  Statutory: <ShieldCheck className="h-3.5 w-3.5" />,
};

export function Onboarding({
  onIssueAppointment,
}: {
  onIssueAppointment?: (employee: Employee) => void;
} = {}) {
  const plans = useHrStore((s) => s.onboardingPlans);
  const employees = useHrStore((s) => s.employees);
  const setOnboardingTaskStatus = useHrStore((s) => s.setOnboardingTaskStatus);
  const [selected, setSelected] = useState<OnboardingPlan | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const filtered = useMemo(
    () => plans.filter((p) => statusFilter === "All" || p.status === statusFilter),
    [plans, statusFilter],
  );

  const inProgress = plans.filter((p) => p.status === "In Progress").length;
  const delayed = plans.filter((p) => p.status === "Delayed").length;
  const totalTasks = plans.reduce((s, p) => s + p.tasks.length, 0);
  const doneTasks = plans.reduce((s, p) => s + p.tasks.filter((t) => t.status === "Completed").length, 0);
  const overdueTasks = plans.reduce((s, p) => s + p.tasks.filter((t) => t.status === "Overdue").length, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiMini label="Active Plans" value={String(plans.length)} icon={<UserPlus className="h-3.5 w-3.5" />} />
        <KpiMini label="In Progress" value={String(inProgress)} icon={<Clock className="h-3.5 w-3.5" />} />
        <KpiMini label="Delayed" value={String(delayed)} icon={<AlertCircle className="h-3.5 w-3.5" />} />
        <KpiMini label="Tasks Done" value={`${doneTasks}/${totalTasks}`} sub={`${overdueTasks} overdue`} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
      </div>

      {/* Probation tracker strip */}
      <SectionCard
        title="Probation Tracker"
        description="Employees in probation period (180 days from DOJ)"
        icon={<UserCheck className="h-4 w-4" />}
        flush
        bodyClassName="p-0"
      >
        <div className="divide-y divide-border">
          {plans
            .filter((p) => p.status !== "Completed")
            .slice(0, 4)
            .map((p) => {
              const dojDays = Math.floor((Date.now() - new Date(p.doj).getTime()) / 86400000);
              const pct = Math.min(100, Math.round((dojDays / 180) * 100));
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-medium">
                    {initials(p.empName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12.5px] font-medium text-foreground truncate">{p.empName}</span>
                      <StatusBadge variant="outline" className="font-mono">{p.empCode}</StatusBadge>
                    </div>
                    <div className="text-[10.5px] text-muted-foreground truncate">
                      {p.designation} · {p.branch} · DOJ {formatDateLong(p.doj)}
                    </div>
                  </div>
                  <div className="w-32 shrink-0">
                    <div className="mb-0.5 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground tabular">{dojDays}/180d</span>
                      <span className="text-[10px] tabular text-foreground">{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full", pct >= 100 ? "bg-foreground" : "bg-muted-foreground")} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <StatusBadge variant={p.status === "Delayed" ? "solid" : "outline"} pulse={p.status === "Delayed"}>
                    {p.status}
                  </StatusBadge>
                </div>
              );
            })}
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-medium tracking-tight text-foreground">
            Onboarding Plans · {filtered.length}
          </h2>
          <p className="text-[12px] text-muted-foreground">
            New joiner checklists, induction, and buddy assignments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusFilter value={statusFilter} onChange={setStatusFilter} />
          <Btn variant="primary" icon={<UserPlus className="h-3.5 w-3.5" />} onClick={() => toast.info("Create Plan", { description: "Open the new onboarding plan wizard." })}>
            New Plan
          </Btn>
        </div>
      </div>

      {/* Plans grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="h-5 w-5" />}
          title="No onboarding plans"
          description="Plans are auto-created when an employee joins. Create one manually for existing employees."
          compact
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const emp = employees.find((e) => e.id === p.empId);
            return (
              <OnboardingCard
                key={p.id}
                plan={p}
                onOpen={() => setSelected(p)}
                onIssueAppointment={
                  emp && onIssueAppointment
                    ? () => onIssueAppointment(emp)
                    : undefined
                }
              />
            );
          })}
        </div>
      )}

      <PlanDetailDrawer
        plan={selected}
        onClose={() => setSelected(null)}
        onTaskStatus={(taskId, status) => {
          if (!selected) return;
          setOnboardingTaskStatus(selected.id, taskId, status);
          const updatedTasks = selected.tasks.map((t) =>
            t.id === taskId ? { ...t, status, completedOn: status === "Completed" ? new Date().toISOString() : undefined } : t,
          );
          const done = updatedTasks.filter((t) => t.status === "Completed").length;
          const progress = Math.round((done / updatedTasks.length) * 100);
          setSelected({ ...selected, tasks: updatedTasks, progress });
          toast.success(`Task ${status.toLowerCase()}`, { description: taskId });
        }}
      />
    </div>
  );
}

function OnboardingCard({
  plan,
  onOpen,
  onIssueAppointment,
}: {
  plan: OnboardingPlan;
  onOpen: () => void;
  onIssueAppointment?: () => void;
}) {
  const done = plan.tasks.filter((t) => t.status === "Completed").length;
  const overdue = plan.tasks.filter((t) => t.status === "Overdue").length;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="flex cursor-pointer flex-col gap-3 rounded-[6px] border border-border bg-card p-4 text-left transition-colors hover:bg-accent/30 tap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-medium">
          {initials(plan.empName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-foreground truncate">{plan.empName}</span>
            <StatusBadge variant="outline" className="font-mono">{plan.empCode}</StatusBadge>
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {plan.designation} · {plan.branch}
          </div>
        </div>
        <StatusBadge {...onboardingStatusBadge(plan.status)}>{plan.status}</StatusBadge>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Progress</span>
          <span className="tabular font-medium text-foreground">{plan.progress}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${plan.progress}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">DOJ <span className="tabular text-foreground">{formatDateLong(plan.doj)}</span></span>
          <span className="text-muted-foreground">Buddy <span className="text-foreground">{plan.buddy}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="tabular text-muted-foreground">{done}/{plan.tasks.length} done</span>
          {overdue > 0 && (
            <StatusBadge variant="solid" pulse>
              <span className="tabular">{overdue} overdue</span>
            </StatusBadge>
          )}
        </div>
      </div>

      {onIssueAppointment && (
        <div className="flex items-center justify-end border-t border-border pt-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIssueAppointment();
            }}
            className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-border bg-background px-2.5 text-[11.5px] font-medium text-foreground transition-colors hover:bg-accent tap"
          >
            <FileText className="h-3.5 w-3.5" />
            Issue Appointment Letter
          </button>
        </div>
      )}
    </div>
  );
}

function PlanDetailDrawer({
  plan,
  onClose,
  onTaskStatus,
}: {
  plan: OnboardingPlan | null;
  onClose: () => void;
  onTaskStatus: (taskId: string, status: OnboardingStatus) => void;
}) {
  return (
    <Sheet open={!!plan} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        {plan && (
          <>
            <SheetHeader className="border-b border-border px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusBadge variant="outline" className="font-mono">{plan.empCode}</StatusBadge>
                  <StatusBadge {...onboardingStatusBadge(plan.status)}>{plan.status}</StatusBadge>
                </div>
                <SheetClose asChild>
                  <button className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground tap" aria-label="Close">
                    <ChevronRight className="h-4 w-4 rotate-180" />
                  </button>
                </SheetClose>
              </div>
              <SheetTitle className="text-[18px] font-medium tracking-tight">{plan.empName}</SheetTitle>
              <SheetDescription className="text-[12.5px]">
                {plan.designation} · {plan.branch} · DOJ {formatDateLong(plan.doj)}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
              {/* Buddy + progress */}
              <div className="grid grid-cols-3 gap-2">
                <Tile icon={<UserCheck className="h-3.5 w-3.5" />} label="Buddy" value={plan.buddy} />
                <Tile icon={<CalendarDays className="h-3.5 w-3.5" />} label="DOJ" value={formatDate(plan.doj)} mono />
                <Tile icon={<ListChecks className="h-3.5 w-3.5" />} label="Progress" value={`${plan.progress}%`} mono />
              </div>

              {/* Induction schedule */}
              <SectionCard
                title="Induction Schedule"
                description="First 3 days"
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                className="mt-4"
                bodyClassName="p-3"
              >
                <div className="flex flex-col gap-1.5">
                  {plan.inductionSchedule.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-[5px] border border-border p-2.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] tabular font-medium">
                        D{s.day}
                      </div>
                      <span className="flex-1 text-[12px] text-foreground">{s.title}</span>
                      <span className="text-[11px] tabular text-muted-foreground">{s.time}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Task list */}
              <div className="mt-4">
                <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Tasks · {plan.tasks.length}
                </h4>
                <div className="flex flex-col gap-1.5">
                  {plan.tasks.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      onStatus={(status) => onTaskStatus(t.id, status)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function TaskRow({
  task,
  onStatus,
}: {
  task: OnboardingTask;
  onStatus: (status: OnboardingStatus) => void;
}) {
  const { variant, pulse } = onboardingStatusBadge(task.status);
  return (
    <div className={cn("flex items-start gap-2.5 rounded-[5px] border border-border p-2.5", task.status === "Overdue" && "border-foreground/50 bg-muted/30")}>
      <button
        onClick={() => onStatus(task.status === "Completed" ? "Pending" : "Completed")}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground tap"
        aria-label="Toggle complete"
      >
        {task.status === "Completed" ? <CheckCircle2 className="h-4 w-4 text-foreground" /> : <Circle className="h-4 w-4" />}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{TASK_CATEGORY_ICON[task.category]}</span>
          <span className={cn("text-[12.5px] font-medium", task.status === "Completed" ? "text-muted-foreground line-through" : "text-foreground")}>
            {task.name}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10.5px] text-muted-foreground">
          <span>Owner: <span className="text-foreground">{task.owner}</span></span>
          <span>Due: <span className="tabular text-foreground">Day {task.dueOffsetDays}</span></span>
          {task.completedOn && <span>· <span className="tabular">{relativeTime(task.completedOn)}</span></span>}
        </div>
      </div>
      <StatusBadge variant={variant} pulse={pulse}>{task.status}</StatusBadge>
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[5px] border border-border p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <span className={cn("text-[12px] text-foreground", mono && "tabular")}>{value}</span>
    </div>
  );
}

function StatusFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = ["All", "Pre-boarding", "In Progress", "Delayed", "Completed"];
  return (
    <div className="flex items-center gap-1 rounded-[5px] border border-border bg-background p-0.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "rounded-[3px] px-2.5 py-1.5 text-[12px] font-medium transition-colors tap",
            value === o ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o}
        </button>
      ))}
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
    <div className="flex flex-col gap-1.5 rounded-[6px] border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[18px] font-medium leading-none tabular text-foreground">{value}</span>
      {sub && <span className="text-[10.5px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

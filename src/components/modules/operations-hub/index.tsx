"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Btn } from "@/components/shared/btn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  GitBranch,
  Layers,
  Flag,
  Trophy,
  ChevronDown,
  LayoutGrid,
  BarChart3,
  Filter,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TASKS } from "@/lib/mock-data";
import type { Task } from "@/lib/types";
import { useAppStore } from "@/lib/store/app-store";
import { OperationsBoard } from "./operations-board";
import { OperationsReports } from "./operations-reports";
import { TaskDetailDrawer } from "./task-detail-drawer";
import { TaskCreateDrawer } from "./task-create-drawer";
import {
  ACTIVE_SPRINT_ID,
  ASSIGNEES,
  DEPARTMENTS,
  PRIORITIES,
  SPRINTS,
  deptForRole,
  deriveTaskExtras,
  formatDate,
  type TaskCreateForm,
} from "./_helpers";

type Tab = "board" | "reports";

export function OperationsHubModule() {
  const { currentRole, authUser } = useAppStore();
  // Real signup name when available, falling back to the role archetype's
  // demo persona name for quick-login / live-demo sessions.
  const firstName = (authUser?.name?.trim() || currentRole.name).split(" ")[0];

  // ===== Local task state (initialized from enriched mock data) =====
  const [tasks, setTasks] = useState<Task[]>(() =>
    TASKS.map((t) => deriveTaskExtras(t)),
  );

  // ===== View state =====
  const [tab, setTab] = useState<Tab>("board");
  const [sprintId, setSprintId] = useState<string>(ACTIVE_SPRINT_ID);
  const [department, setDepartment] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [assignee, setAssignee] = useState<string>("all");

  // ===== Drawer state =====
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createInitialStatus, setCreateInitialStatus] = useState<Task["status"]>("Backlog");

  // ===== Role-based department scoping =====
  const roleDept = deptForRole(currentRole.id);
  const isScoped = roleDept !== "*";

  // ===== Filter pipeline =====
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Role scoping (owner/analyst see all)
      if (isScoped && t.department !== roleDept) return false;
      // Sprint
      if (sprintId !== "all" && t.sprint !== sprintId) return false;
      // Department filter (only applies if role isn't scoped - otherwise redundant)
      if (!isScoped && department !== "all" && t.department !== department) return false;
      // Priority
      if (priority !== "all" && t.priority !== priority) return false;
      // Assignee
      if (assignee !== "all" && t.assignee !== assignee) return false;
      return true;
    });
  }, [tasks, isScoped, roleDept, sprintId, department, priority, assignee]);

  // ===== Active sprint info =====
  const activeSprint = SPRINTS.find((s) => s.id === sprintId);

  // ===== Handlers =====
  const openTaskDetail = (task: Task) => {
    setDetailTask(task);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    // Clear after the close animation
    setTimeout(() => setDetailTask(null), 300);
  };

  const updateTask = (updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setDetailTask(updated);
  };

  const moveTask = (taskId: string, status: Task["status"]) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status,
              completedDate: status === "Completed" ? t.completedDate ?? new Date().toISOString() : undefined,
            }
          : t,
      ),
    );
    const movedTask = tasks.find((t) => t.id === taskId);
    if (movedTask) {
      toast.success(`Moved "${movedTask.title.slice(0, 32)}${movedTask.title.length > 32 ? "…" : ""}" to ${status}`);
    }
  };

  const acceptRean = (task: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, isRean: false } : t)));
    if (detailTask?.id === task.id) setDetailTask({ ...task, isRean: false });
    toast.success("Rean task accepted - badge removed");
  };

  const dismissRean = (task: Task) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    if (detailTask?.id === task.id) closeDetail();
    toast.success("Rean task dismissed");
  };

  const openCreateInColumn = (status: Task["status"]) => {
    setCreateInitialStatus(status);
    setCreateOpen(true);
  };

  const handleCreateSave = (form: TaskCreateForm) => {
    const id = `task-${Date.now()}`;
    const newTask: Task = {
      id,
      title: form.title,
      description: form.description || "No description provided.",
      assignee: form.assignee,
      dueDate: form.dueDate || undefined,
      priority: form.priority,
      department: form.department,
      status: form.status,
      isRean: false,
      linkedEntity:
        form.linkedEntityType === "None" || !form.linkedEntityName
          ? undefined
          : { type: form.linkedEntityType, name: form.linkedEntityName },
      checklist: form.checklist.length > 0 ? form.checklist : undefined,
      subtasks: [],
      comments: [],
      attachments: [],
      sprint: form.sprint,
      createdDate: new Date().toISOString(),
      completedDate: form.status === "Completed" ? new Date().toISOString() : undefined,
    };
    setTasks((prev) => [newTask, ...prev]);
    toast.success(`Task created in ${form.status}`);
  };

  const handleCreateSprint = () => {
    toast.success("Sprint draft created", {
      description: "Sprint 27 added to backlog - configure dates in Sprint Settings.",
    });
  };

  // Assignees derived from current visible set + global list
  const assigneeFilterOptions = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => set.add(t.assignee));
    ASSIGNEES.forEach((a) => set.add(a));
    return Array.from(set).sort();
  }, [tasks]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Operations Hub"
        description={`${firstName}, here's the work across ${activeSprint?.name ?? "this sprint"}.`}
        actions={
          <>
            {/* Sprint selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-8 items-center gap-2 rounded-[5px] border border-border bg-card px-3 text-[13px] font-medium text-foreground hover:bg-accent transition-colors" aria-label="Switch sprint">
                  <GitBranch className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="max-w-[100px] truncate sm:max-w-[180px]">{activeSprint?.name ?? "All sprints"}</span>
                  <span className="hidden sm:inline rounded-[3px] border border-border px-1 text-[10px] font-medium text-muted-foreground">
                    {activeSprint?.status ?? "-"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Switch sprint
                </DropdownMenuLabel>
                {SPRINTS.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onClick={() => {
                      setSprintId(s.id);
                      toast.message(`Switched to ${s.name}`);
                    }}
                    className="flex flex-col items-start gap-0.5 py-2"
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-[13px] font-medium">{s.name}</span>
                      <span className="rounded-[3px] border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {s.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDate(s.startDate)} → {formatDate(s.endDate)}
                    </span>
                    <span className="line-clamp-1 text-[11px] text-muted-foreground/80">{s.goal}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleCreateSprint}
                  className="flex items-center gap-2 text-[13px] font-medium text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Sprint
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => openCreateInColumn("Backlog")}>
              New Task
            </Btn>
          </>
        }
      />

      {/* Sprint goal banner */}
      {activeSprint && (
        <div className="flex items-center gap-2 rounded-[6px] border border-border bg-muted/30 px-3 py-2">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-[12px] text-muted-foreground">
            <span className="font-medium text-foreground">Sprint goal · </span>
            {activeSprint.goal}
          </span>
          <span className="ml-auto hidden items-center gap-2 text-[11px] text-muted-foreground sm:flex">
            <span className="tabular">{formatDate(activeSprint.startDate)}</span>
            <span className="text-muted-foreground/40">→</span>
            <span className="tabular">{formatDate(activeSprint.endDate)}</span>
          </span>
        </div>
      )}

      {/* Tabs + filters row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1">
          <TabButton active={tab === "board"} onClick={() => setTab("board")} icon={<LayoutGrid className="h-3.5 w-3.5" />}>
            Board
          </TabButton>
          <TabButton active={tab === "reports"} onClick={() => setTab("reports")} icon={<BarChart3 className="h-3.5 w-3.5" />}>
            Reports
          </TabButton>
        </div>

        {/* Filters - shared across tabs (priority only shown on board) */}
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill icon={<Layers className="h-3 w-3" />} label="Department">
            <Select
              value={department}
              onValueChange={setDepartment}
              disabled={isScoped}
            >
              <SelectTrigger className="h-7 w-[140px] rounded-[5px] border-border bg-card text-[12px]">
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
            {isScoped && (
              <span className="absolute -top-1.5 -right-1.5 rounded-full border border-border bg-background px-1 text-[8px] uppercase tracking-wider text-muted-foreground">
                role
              </span>
            )}
          </FilterPill>

          {tab === "board" && (
            <FilterPill icon={<Flag className="h-3 w-3" />} label="Priority">
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-7 w-[110px] rounded-[5px] border-border bg-card text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterPill>
          )}

          <FilterPill icon={<Trophy className="h-3 w-3" />} label="Assignee">
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="h-7 w-[170px] rounded-[5px] border-border bg-card text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assignees</SelectItem>
                {assigneeFilterOptions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterPill>

          {(department !== "all" || priority !== "all" || assignee !== "all") && (
            <button
              onClick={() => {
                setDepartment("all");
                setPriority("all");
                setAssignee("all");
              }}
              className="flex h-7 items-center gap-1 rounded-[5px] border border-border px-2 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Filter className="h-3 w-3" />
              Clear
            </button>
          )}

          <span className="tabular text-[11px] text-muted-foreground">
            {filteredTasks.length} tasks
          </span>
        </div>
      </div>

      {/* Active view */}
      {tab === "board" ? (
        <OperationsBoard
          tasks={filteredTasks}
          onTaskOpen={openTaskDetail}
          onTaskMove={moveTask}
          onCreateInColumn={openCreateInColumn}
          onAcceptRean={acceptRean}
          onDismissRean={dismissRean}
        />
      ) : (
        <OperationsReports
          tasks={tasks}
          sprintId={sprintId}
          department={department}
          assignee={assignee}
          onSprintChange={setSprintId}
          onDepartmentChange={setDepartment}
          onAssigneeChange={setAssignee}
        />
      )}

      {/* Drawers */}
      <TaskDetailDrawer
        key={detailTask?.id ?? "none"}
        task={detailTask}
        open={detailOpen}
        onClose={closeDetail}
        onUpdate={updateTask}
      />
      <TaskCreateDrawer
        key={`create-${createOpen}-${createInitialStatus}`}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        initialStatus={createInitialStatus}
        onSave={handleCreateSave}
      />
    </div>
  );
}

// ===== Small primitives =====
function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-1.5 rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition-colors",
        active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function FilterPill({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex items-center gap-1.5 rounded-[5px] border border-border bg-card pl-2 pr-1">
      <span className="text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

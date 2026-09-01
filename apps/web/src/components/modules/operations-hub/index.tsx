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
import type { Task } from "@/lib/types";
import { useAppStore } from "@/lib/store/app-store";
import { OperationsBoard } from "./operations-board";
import { OperationsReports } from "./operations-reports";
import { TaskDetailDrawer } from "./task-detail-drawer";
import { TaskCreateDrawer } from "./task-create-drawer";
import { useOperationsData } from "./use-operations-data";
import {
  DEPARTMENTS,
  PRIORITIES,
  deptForRole,
  formatDate,
  type TaskCreateForm,
} from "./_helpers";

type Tab = "board" | "reports";

export function OperationsHubModule() {
  const { currentRole, authUser } = useAppStore();
  // Real signup name when available, falling back to the role archetype's
  // demo persona name for quick-login / live-demo sessions.
  const firstName = (authUser?.name?.trim() || currentRole.name).split(" ")[0];

  const {
    tasks,
    sprints,
    meta,
    loaded,
    createTask,
    patchTask,
    deleteTask,
    postComment,
    uploadAttachment,
    createSprint,
  } = useOperationsData();

  // ===== View state =====
  const [tab, setTab] = useState<Tab>("board");
  // "" means "not yet chosen" - falls back to the real active sprint once
  // sprints load (mirrors the old hardcoded ACTIVE_SPRINT_ID default)
  // without needing a setState-in-effect to seed it. Any explicit user pick,
  // including "all", is a non-empty string and overrides the fallback.
  const [sprintChoice, setSprintChoice] = useState<string>("");
  const [department, setDepartment] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [assignee, setAssignee] = useState<string>("all");

  const sprintId = sprintChoice || sprints.find((s) => s.status === "Active")?.id || "all";
  const setSprintId = setSprintChoice;

  // ===== Drawer state =====
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createInitialStatus, setCreateInitialStatus] = useState<Task["status"]>("Backlog");

  // Single source of truth: look the detail task up from the live `tasks`
  // list by id, instead of holding a second copy that can drift out of sync
  // with server responses.
  const detailTask = tasks.find((t) => t.id === detailTaskId) ?? null;

  // ===== Role-based department scoping =====
  const roleDept = deptForRole(currentRole.id);
  const isScoped = roleDept !== "*";

  // ===== Filter pipeline =====
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (isScoped && t.department !== roleDept) return false;
      if (sprintId !== "all" && t.sprint !== sprintId) return false;
      if (!isScoped && department !== "all" && t.department !== department) return false;
      if (priority !== "all" && t.priority !== priority) return false;
      if (assignee !== "all" && t.assignee !== assignee) return false;
      return true;
    });
  }, [tasks, isScoped, roleDept, sprintId, department, priority, assignee]);

  // ===== Active sprint info =====
  const activeSprint = sprints.find((s) => s.id === sprintId);

  // ===== Handlers =====
  const openTaskDetail = (task: Task) => {
    setDetailTaskId(task.id);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setTimeout(() => setDetailTaskId(null), 300);
  };

  const moveTask = async (taskId: string, status: Task["status"]) => {
    const task = tasks.find((t) => t.id === taskId);
    const updated = await patchTask(taskId, { status });
    if (updated && task) {
      toast.success(`Moved "${task.title.slice(0, 32)}${task.title.length > 32 ? "…" : ""}" to ${status}`);
    }
  };

  const acceptRean = async (task: Task) => {
    const updated = await patchTask(task.id, { isRean: false });
    if (updated) toast.success("Rean task accepted - badge removed");
  };

  const dismissRean = async (task: Task) => {
    const ok = await deleteTask(task.id);
    if (ok) {
      if (detailTaskId === task.id) closeDetail();
      toast.success("Rean task dismissed");
    }
  };

  const openCreateInColumn = (status: Task["status"]) => {
    setCreateInitialStatus(status);
    setCreateOpen(true);
  };

  const handleCreateSave = async (form: TaskCreateForm) => {
    const created = await createTask({
      title: form.title,
      description: form.description || undefined,
      assignee: form.assignee,
      dueDate: form.dueDate || undefined,
      priority: form.priority,
      department: form.department,
      status: form.status,
      linkedEntityType: form.linkedEntityType,
      linkedEntityId: form.linkedEntityId || undefined,
      linkedEntityName: form.linkedEntityName || undefined,
      checklist: form.checklist,
      sprintId: form.sprint || undefined,
    });
    if (created) toast.success(`Task created in ${form.status}`);
  };

  const handleCreateSprint = async () => {
    const latestEnd = sprints.reduce(
      (max, s) => Math.max(max, new Date(s.endDate).getTime()),
      Date.now(),
    );
    const startDate = new Date(latestEnd);
    const endDate = new Date(latestEnd + 14 * 86_400_000);
    const created = await createSprint({
      name: `Sprint ${sprints.length + 1}`,
      goal: "New sprint - update the goal from Sprint Settings.",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      status: "Planned",
    });
    if (created) {
      toast.success(`${created.name} created`, {
        description: `${formatDate(created.startDate)} → ${formatDate(created.endDate)}`,
      });
    }
  };

  // ===== Detail drawer field mutations (each persists via a real PATCH) =====
  const withChecklist = (mutate: (list: { text: string; done: boolean }[]) => { text: string; done: boolean }[]) => {
    if (!detailTask) return;
    patchTask(detailTask.id, { checklist: mutate(detailTask.checklist ?? []) });
  };
  const withSubtasks = (mutate: (list: { text: string; done: boolean }[]) => { text: string; done: boolean }[]) => {
    if (!detailTask) return;
    patchTask(detailTask.id, { subtasks: mutate(detailTask.subtasks ?? []) });
  };

  // Assignees derived from real tasks currently in view + the company's real
  // staff/driver roster (meta.assignees).
  const assigneeFilterOptions = useMemo(() => {
    const set = new Set<string>(meta.assignees);
    tasks.forEach((t) => set.add(t.assignee));
    return Array.from(set).sort();
  }, [tasks, meta.assignees]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Operations Hub"
        description={`${firstName}, here's the work across ${activeSprint?.name ?? "all sprints"}.`}
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
                {sprints.length === 0 && (
                  <div className="px-2 py-2 text-[11px] text-muted-foreground/70">No sprints yet.</div>
                )}
                {sprints.map((s) => (
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
                    {s.goal && <span className="line-clamp-1 text-[11px] text-muted-foreground/80">{s.goal}</span>}
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
            {activeSprint.goal || "No goal set for this sprint."}
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
            {loaded ? `${filteredTasks.length} tasks` : "Loading…"}
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
          sprints={sprints}
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
        sprints={sprints}
        open={detailOpen}
        onClose={closeDetail}
        onChangeStatus={(status) => detailTask && patchTask(detailTask.id, { status })}
        onToggleChecklist={(idx) =>
          withChecklist((list) => list.map((c, i) => (i === idx ? { ...c, done: !c.done } : c)))
        }
        onAddChecklist={(text) => withChecklist((list) => [...list, { text, done: false }])}
        onRemoveChecklist={(idx) => withChecklist((list) => list.filter((_, i) => i !== idx))}
        onToggleSubtask={(idx) =>
          withSubtasks((list) => list.map((s, i) => (i === idx ? { ...s, done: !s.done } : s)))
        }
        onAddSubtask={(text) => withSubtasks((list) => [...list, { text, done: false }])}
        onRemoveSubtask={(idx) => withSubtasks((list) => list.filter((_, i) => i !== idx))}
        onPostComment={(text) => detailTask && postComment(detailTask.id, text)}
        onUploadAttachment={(file) => detailTask && uploadAttachment(detailTask.id, file)}
      />
      <TaskCreateDrawer
        key={`create-${createOpen}-${createInitialStatus}`}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        initialStatus={createInitialStatus}
        defaultSprintId={sprintId !== "all" ? sprintId : ""}
        sprints={sprints}
        meta={meta}
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

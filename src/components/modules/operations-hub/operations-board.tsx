"use client";

import { useMemo } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, useDroppable } from "@dnd-kit/core";
import { Plus, Inbox, CalendarClock, CircleSlash, Eye, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";
import { TaskCard } from "./task-card";
import { PRIORITY_EFFORT } from "./_helpers";

interface BoardProps {
  tasks: Task[];
  onTaskOpen: (task: Task) => void;
  onTaskMove: (taskId: string, status: Task["status"]) => void;
  onCreateInColumn: (status: Task["status"]) => void;
  onAcceptRean: (task: Task) => void;
  onDismissRean: (task: Task) => void;
}

interface ColumnDef {
  id: Task["status"];
  label: string;
  description: string;
  icon: React.ReactNode;
}

const COLUMNS: ColumnDef[] = [
  { id: "Backlog", label: "Backlog", description: "Not yet committed", icon: <Inbox className="h-3.5 w-3.5" /> },
  { id: "Planned", label: "Planned", description: "Queued for this sprint", icon: <CalendarClock className="h-3.5 w-3.5" /> },
  { id: "In Progress", label: "In Progress", description: "Being worked on", icon: <Loader2 className="h-3.5 w-3.5" /> },
  { id: "Blocked", label: "Blocked", description: "Awaiting dependency", icon: <CircleSlash className="h-3.5 w-3.5" /> },
  { id: "Under Review", label: "Under Review", description: "Pending approval", icon: <Eye className="h-3.5 w-3.5" /> },
  { id: "Completed", label: "Completed", description: "Done this sprint", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
];

function Column({
  def,
  tasks,
  onTaskOpen,
  onCreate,
  onAcceptRean,
  onDismissRean,
}: {
  def: ColumnDef;
  tasks: Task[];
  onTaskOpen: (t: Task) => void;
  onCreate: () => void;
  onAcceptRean: (t: Task) => void;
  onDismissRean: (t: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: def.id, data: { type: "column", status: def.id } });

  const totalEffort = useMemo(
    () => tasks.reduce((sum, t) => sum + PRIORITY_EFFORT[t.priority], 0),
    [tasks],
  );

  return (
    <div className="flex w-[280px] shrink-0 flex-col rounded-[6px] border border-border bg-muted/30">
      {/* Column header */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-muted-foreground">{def.icon}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[12px] font-medium tracking-tight text-foreground">{def.label}</h3>
              <span className="tabular rounded-full border border-border bg-card px-1.5 text-[10px] font-medium text-muted-foreground">
                {tasks.length}
              </span>
            </div>
            <p className="truncate text-[10px] text-muted-foreground">{def.description}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="tabular text-[11px] font-medium text-foreground">{totalEffort} pts</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">effort</div>
        </div>
      </div>

      {/* Card list */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[140px] flex-1 flex-col gap-2 overflow-y-auto p-2 scrollbar-thin transition-colors",
          isOver && "bg-foreground/[0.03]",
        )}
        style={{ maxHeight: "calc(100vh - 320px)" }}
      >
        {tasks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-8 text-center">
            <span className="text-[11px] text-muted-foreground/70">Drop tasks here</span>
          </div>
        ) : (
          tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onOpen={onTaskOpen}
              onAccept={onAcceptRean}
              onDismiss={onDismissRean}
            />
          ))
        )}

        {/* Create task at bottom */}
        <button
          onClick={onCreate}
          className="mt-1 flex items-center justify-center gap-1.5 rounded-[5px] border border-dashed border-border py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          Add task
        </button>
      </div>
    </div>
  );
}

export function OperationsBoard({
  tasks,
  onTaskOpen,
  onTaskMove,
  onCreateInColumn,
  onAcceptRean,
  onDismissRean,
}: BoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const grouped = useMemo(() => {
    const g: Record<Task["status"], Task[]> = {
      Backlog: [],
      Planned: [],
      "In Progress": [],
      Blocked: [],
      "Under Review": [],
      Completed: [],
    };
    tasks.forEach((t) => g[t.status]?.push(t));
    return g;
  }, [tasks]);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const taskId = String(active.id);
    const newStatus = String(over.id) as Task["status"];
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    onTaskMove(taskId, newStatus);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {COLUMNS.map((def) => (
          <Column
            key={def.id}
            def={def}
            tasks={grouped[def.id]}
            onTaskOpen={onTaskOpen}
            onCreate={() => onCreateInColumn(def.id)}
            onAcceptRean={onAcceptRean}
            onDismissRean={onDismissRean}
          />
        ))}
      </div>
    </DndContext>
  );
}

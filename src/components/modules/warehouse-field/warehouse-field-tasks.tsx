"use client";

import { useState } from "react";
import { useWarehouseFieldStore } from "@/lib/store/warehouse-field-store";
import type { WarehouseTaskStatus } from "@/lib/store/warehouse-field-store";
import {
  useWarehouseFieldTasks,
  taskKindLabel,
  taskStatusColor,
  TASK_STATUS_FLOW,
  type WarehouseTaskKind,
} from "./_helpers";
import { ClipboardList, PackagePlus, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Filter = "all" | WarehouseTaskKind | "exception";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "putaway", label: "Putaway" },
  { id: "pick", label: "Pick" },
  { id: "dispatch", label: "Dispatch" },
  { id: "exception", label: "Exceptions" },
];

const ALL_STATUSES: WarehouseTaskStatus[] = [...TASK_STATUS_FLOW, "Exception"];

export function WarehouseFieldTasks() {
  const tasks = useWarehouseFieldTasks();
  const { activeTaskId, setActiveTask, taskStatus, setTaskStatus } = useWarehouseFieldStore();
  const [filter, setFilter] = useState<Filter>("all");

  const effective = (id: string, fallback: WarehouseTaskStatus) => taskStatus[id] || fallback;

  const filtered = tasks.filter((t) => {
    const status = effective(t.id, t.defaultStatus);
    if (filter === "exception") return status === "Exception";
    if (filter === "all") return true;
    return t.kind === filter;
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[18px] font-semibold tracking-tight">Today's Tasks</h1>
        <p className="text-[12px] text-muted-foreground tabular-nums">
          {tasks.length} assigned ·{" "}
          {tasks.filter((t) => effective(t.id, t.defaultStatus) !== "Completed").length} open
        </p>
      </header>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "h-8 rounded-full border px-3 text-[12px] font-medium transition-colors",
              filter === f.id
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="rounded-[6px] border border-dashed border-border p-8 text-center">
          <ClipboardList className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-[13px] font-medium">No tasks in this view</p>
          <p className="text-[11px] text-muted-foreground">Try a different filter.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => {
            const status = effective(t.id, t.defaultStatus);
            const isActive = activeTaskId === t.id;
            const isDone = status === "Completed";
            return (
              <li key={t.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveTask(isActive ? null : t.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveTask(isActive ? null : t.id);
                    }
                  }}
                  className={cn(
                    "block w-full cursor-pointer overflow-hidden rounded-[6px] border bg-background text-left transition-colors",
                    isActive ? "border-foreground" : "border-border hover:bg-accent/30"
                  )}
                >
                  {/* Header strip */}
                  <div className="flex items-center justify-between border-b border-border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <TaskKindIcon kind={t.kind} />
                      <span className="text-[12px] font-semibold tabular-nums">{t.refId}</span>
                      {isActive && (
                        <span className="rounded-[3px] bg-foreground px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-background">
                          Active
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "rounded-[4px] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        taskStatusColor(status)
                      )}
                    >
                      {status}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-1 p-3 text-[12px]">
                    <p className="font-medium">{t.title}</p>
                    <p className="text-muted-foreground">{t.subtitle}</p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
                    <span className="tabular-nums">
                      {t.skuCount} SKUs · {t.totalQty} units
                    </span>
                    <span>{t.dueLabel}</span>
                  </div>

                  {/* Status stepper */}
                  {isActive && !isDone && (
                    <div className="border-t border-border bg-accent/20 px-3 py-2.5">
                      <div className="mb-1.5 text-[10px] text-muted-foreground">Tap to update status</div>
                      <div className="flex flex-wrap gap-1">
                        {ALL_STATUSES.map((s) => (
                          <button
                            key={s}
                            onClick={(e) => {
                              e.stopPropagation();
                              setTaskStatus(t.id, s);
                              useWarehouseFieldStore.getState().addActivity({
                                type: s === "Exception" ? "EXCEPTION" : "STATUS_UPDATE",
                                taskId: t.id,
                                taskKind: t.kind,
                                refId: t.refId,
                                payload: { status: s, from: status },
                                note:
                                  s === "Exception"
                                    ? `Exception flagged on ${t.refId}`
                                    : `Marked as ${s}`,
                              });
                              if (s !== status) {
                                toast.success(`${t.refId}: ${s}`, {
                                  description: `${taskKindLabel(t.kind)} · ${t.title}`,
                                });
                              }
                            }}
                            className={cn(
                              "h-6 rounded-[4px] border px-2 text-[10px] font-medium transition-colors",
                              s === status
                                ? "border-foreground bg-foreground text-background"
                                : "border-border text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TaskKindIcon({ kind }: { kind: WarehouseTaskKind }) {
  const Icon = kind === "putaway" ? PackagePlus : kind === "pick" ? ClipboardList : Truck;
  return <Icon className="h-3.5 w-3.5 text-muted-foreground" />;
}

"use client";

import { useWarehouseFieldStore } from "@/lib/store/warehouse-field-store";
import type { WarehouseActivityType } from "@/lib/store/warehouse-field-store";
import {
  useWarehouseFieldTasks,
  useActiveWarehouseTask,
  computeTaskKpis,
  taskKindLabel,
  taskStatusColor,
  TASK_STATUS_FLOW,
  relativeTime,
  type WarehouseTaskKind,
} from "./_helpers";
import {
  PackagePlus,
  ClipboardList,
  Truck,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Navigation,
  Camera,
  Warehouse,
  Clock,
  ScanLine,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Tab } from "./index";

export function WarehouseFieldHome({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const tasks = useWarehouseFieldTasks();
  const task = useActiveWarehouseTask();
  const {
    crewName,
    godown,
    duty,
    checkIn,
    checkOut,
    activities,
    taskStatus,
    setTaskStatus,
  } = useWarehouseFieldStore();

  const kpis = computeTaskKpis(tasks, taskStatus);
  const myStatus = task ? taskStatus[task.id] || task.defaultStatus : null;
  const statusIdx =
    task && myStatus !== "Exception"
      ? TASK_STATUS_FLOW.indexOf(myStatus as (typeof TASK_STATUS_FLOW)[number])
      : -1;
  const recent = activities.slice(0, 4);

  return (
    <div className="space-y-4">
      {/* Greeting + shift toggle */}
      <section className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short" })}
          </p>
          <h1 className="text-[18px] font-semibold tracking-tight">{crewName}</h1>
          <p className="text-[12px] text-muted-foreground">{godown}</p>
        </div>
        <button
          onClick={() => {
            if (duty.checkedIn) {
              checkOut();
              toast.success("Checked out", { description: "Shift ended." });
            } else {
              checkIn();
              toast.success("Checked in", { description: "Shift started." });
            }
          }}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-[5px] border px-3 text-[12px] font-medium transition-colors",
            duty.checkedIn
              ? "border-foreground bg-foreground text-background"
              : "border-border text-foreground hover:bg-accent"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              duty.checkedIn ? "bg-background animate-pulse" : "bg-muted-foreground"
            )}
          />
          {duty.checkedIn ? "On Shift" : "Check In"}
        </button>
      </section>

      {/* Today's task summary */}
      <section className="grid grid-cols-4 gap-2">
        <KpiTile icon={PackagePlus} label="Putaway" value={kpis.pendingPutaways} />
        <KpiTile icon={ClipboardList} label="Picks" value={kpis.pendingPicks} />
        <KpiTile icon={Truck} label="Dispatch" value={kpis.pendingDispatch} />
        <KpiTile icon={AlertTriangle} label="Exceptions" value={kpis.exceptions} />
      </section>

      {/* Next task card */}
      {task ? (
        <section className="overflow-hidden rounded-[6px] border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border bg-accent/30 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <TaskKindIcon kind={task.kind} />
              <span className="text-[12px] font-semibold">{taskKindLabel(task.kind)} task</span>
            </div>
            <span className="text-[11px] font-medium tabular-nums text-muted-foreground">{task.refId}</span>
          </div>
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{task.title}</p>
                <p className="text-[11px] text-muted-foreground">{task.subtitle}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">SKUs · Units</p>
                <p className="text-[13px] font-semibold tabular-nums">
                  {task.skuCount} · {task.totalQty}
                </p>
              </div>
            </div>

            {/* Status progress */}
            <div className="border-t border-border pt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</span>
                <span
                  className={cn(
                    "rounded-[4px] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    taskStatusColor(myStatus!)
                  )}
                >
                  {myStatus}
                </span>
              </div>
              {myStatus !== "Exception" && (
                <div className="flex items-center gap-1">
                  {TASK_STATUS_FLOW.map((s, i) => {
                    const done = i <= statusIdx;
                    const current = i === statusIdx;
                    return (
                      <div
                        key={s}
                        className={cn(
                          "h-1.5 flex-1 rounded-full",
                          done ? "bg-foreground" : "bg-border",
                          current && "animate-pulse"
                        )}
                        title={s}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick status advance */}
            {myStatus !== "Exception" && statusIdx >= 0 && statusIdx < TASK_STATUS_FLOW.length - 1 && (
              <button
                onClick={() => {
                  const next = TASK_STATUS_FLOW[statusIdx + 1];
                  setTaskStatus(task.id, next);
                  useWarehouseFieldStore.getState().addActivity({
                    type: "STATUS_UPDATE",
                    taskId: task.id,
                    taskKind: task.kind,
                    refId: task.refId,
                    payload: { status: next, from: myStatus },
                    note: `Marked as ${next}`,
                  });
                  toast.success(`Status: ${next}`, {
                    description:
                      next === "Completed"
                        ? "Task complete - confirm with SKU + photo in Capture."
                        : `From ${myStatus} to ${next}.`,
                  });
                }}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-[5px] bg-foreground text-[13px] font-medium text-background transition-colors hover:bg-foreground/90"
              >
                <Navigation className="h-4 w-4" />
                Advance to {TASK_STATUS_FLOW[statusIdx + 1]}
              </button>
            )}
            {myStatus === "Completed" && (
              <div className="flex h-10 items-center justify-center gap-2 rounded-[5px] border border-foreground text-[13px] font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Task Completed
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-[6px] border border-dashed border-border p-6 text-center">
          <Warehouse className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
          <p className="text-[13px] font-medium">No tasks assigned right now</p>
          <p className="text-[11px] text-muted-foreground">
            New putaway, pick, or dispatch tasks will appear here.
          </p>
        </section>
      )}

      {/* Quick capture actions */}
      <section>
        <h2 className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Quick Capture
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <QuickAction icon={PackagePlus} label="Putaway" onClick={() => onNavigate("capture")} />
          <QuickAction icon={ClipboardList} label="Pick" onClick={() => onNavigate("capture")} />
          <QuickAction icon={Truck} label="Dispatch" onClick={() => onNavigate("capture")} />
        </div>
      </section>

      {/* Recent activity */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Recent Activity
          </h2>
          <button
            onClick={() => onNavigate("records")}
            className="flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            All <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-[6px] border border-dashed border-border p-4 text-center text-[12px] text-muted-foreground">
            No activity yet. Confirm a task to get started.
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-[6px] border border-border">
            {recent.map((a) => (
              <li key={a.id} className="flex items-center gap-3 bg-background px-3 py-2.5">
                <ActivityIcon type={a.type} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium">{a.note || a.type}</p>
                  <p className="text-[10px] tabular-nums text-muted-foreground">
                    {relativeTime(a.createdAt)}
                    {a.refId ? ` · ${a.refId}` : ""}
                  </p>
                </div>
                {a.photoDataUrl && (
                  <img
                    src={a.photoDataUrl}
                    alt="capture"
                    className="h-8 w-8 rounded-[3px] border border-border object-cover"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function KpiTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof PackagePlus;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[6px] border border-border p-3">
      <div className="flex items-center justify-between">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <p className="mt-1.5 text-[18px] font-semibold leading-none tabular-nums">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Camera;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-[6px] border border-border bg-background py-3 text-[11px] font-medium transition-colors hover:bg-accent active:scale-[0.98]"
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}

function TaskKindIcon({ kind }: { kind: WarehouseTaskKind }) {
  const Icon = kind === "putaway" ? PackagePlus : kind === "pick" ? ClipboardList : Truck;
  return <Icon className="h-4 w-4" />;
}

function ActivityIcon({ type }: { type: WarehouseActivityType }) {
  const map: Record<WarehouseActivityType, typeof Camera> = {
    STATUS_UPDATE: Navigation,
    SCAN: ScanLine,
    EXCEPTION: AlertTriangle,
    CHECK_IN: Clock,
    CHECK_OUT: Clock,
    NOTE: StickyNote,
  };
  const Icon = map[type] || StickyNote;
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-border">
      <Icon className="h-4 w-4" />
    </span>
  );
}

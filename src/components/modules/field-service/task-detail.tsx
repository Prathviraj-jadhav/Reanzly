"use client";

import { useState } from "react";
import { DetailLayout, InfoRow, InfoSection, StatCard } from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { FIELD_TASKS, type FieldTask, type ChecklistItem, type PartUsed, type TimeEntry } from "./_helpers";
import {
  Pencil,
  Wrench,
  MapPin,
  User,
  Phone,
  CheckCircle2,
  Clock,
  Package,
  PenTool,
  ClipboardList,
  Play,
  CircleDot,
  Timer,
  Star,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatDateTime,
  relativeTime,
  formatDuration,
  typeBadge,
  statusBadge,
  priorityBadge,
  STATUS_TRANSITIONS,
  type TaskStatus,
} from "./_helpers";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "worksheet", label: "Worksheet" },
  { id: "parts", label: "Parts" },
  { id: "time", label: "Time" },
  { id: "signature", label: "Signature" },
];

interface TaskDetailProps {
  taskId: string;
}

export function TaskDetail({ taskId }: TaskDetailProps) {
  const { navigate } = useAppStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [record, setRecord] = useState<FieldTask | undefined>(
    () => FIELD_TASKS.find((t) => t.id === taskId || t.taskId === taskId),
  );

  const task = record;

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Task <span className="tabular">{taskId}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => navigate("field-service")}>Back to Field Service</Btn>
      </div>
    );
  }

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (newStatus === task.status) return;
    setRecord((prev) =>
      prev
        ? {
            ...prev,
            status: newStatus,
            updatedAt: new Date().toISOString(),
            completedAt: newStatus === "Completed" ? new Date().toISOString() : prev.completedAt,
          }
        : prev,
    );
    toast.success(`Status updated`, { description: `${task.status} → ${newStatus}` });
  };

  const toggleChecklist = (itemId: string) => {
    setRecord((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        checklist: prev.checklist.map((c) =>
          c.id === itemId
            ? { ...c, done: !c.done, ts: !c.done ? new Date().toISOString() : undefined }
            : c,
        ),
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const addPart = () => {
    const newPart: PartUsed = {
      id: `p-${Date.now()}`,
      name: "New part",
      partNo: "-",
      qty: 1,
      unitCost: 0,
    };
    setRecord((prev) =>
      prev ? { ...prev, parts: [...prev.parts, newPart], updatedAt: new Date().toISOString() } : prev,
    );
    toast.success("Part added");
  };

  const removePart = (id: string) => {
    setRecord((prev) =>
      prev ? { ...prev, parts: prev.parts.filter((p) => p.id !== id) } : prev,
    );
  };

  const stopTimeEntry = (id: string) => {
    setRecord((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        timeEntries: prev.timeEntries.map((e) => {
          if (e.id === id && !e.end) {
            const end = new Date().toISOString();
            const minutes = Math.round((new Date(end).getTime() - new Date(e.start).getTime()) / 60000);
            return { ...e, end, minutes };
          }
          return e;
        }),
      };
    });
    toast.success("Time entry stopped");
  };

  const startTimeEntry = () => {
    const newEntry: TimeEntry = {
      id: `t-${Date.now()}`,
      label: "Work session",
      start: new Date().toISOString(),
      minutes: 0,
    };
    setRecord((prev) =>
      prev ? { ...prev, timeEntries: [...prev.timeEntries, newEntry] } : prev,
    );
    toast.success("Time entry started");
  };

  const captureSignature = () => {
    setRecord((prev) =>
      prev ? { ...prev, signatureCaptured: true, updatedAt: new Date().toISOString() } : prev,
    );
    toast.success("Customer signature captured");
  };

  const totalPartsCost = task.parts.reduce((s, p) => s + p.qty * p.unitCost, 0);
  const totalTimeMins = task.timeEntries.reduce((s, e) => s + e.minutes, 0);
  const checklistDone = task.checklist.filter((c) => c.done).length;
  const checklistTotal = task.checklist.length;

  const typeMeta = typeBadge(task.type);
  const statusMeta = statusBadge(task.status);
  const priorityMeta = priorityBadge(task.priority);

  const actions = (
    <>
      <Btn icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => toast("Edit task", { description: task.taskId })} aria-label="Edit">
        <span className="hidden sm:inline">Edit</span>
      </Btn>
      <Btn variant="primary" icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => handleStatusChange("Completed")} disabled={task.status === "Completed" || task.status === "Cancelled"}>
        <span className="hidden sm:inline">Complete</span>
        <span className="sm:hidden">Done</span>
      </Btn>
    </>
  );

  const quickActions = [
    { label: "Reassign technician", onClick: () => toast("Reassign task", { description: task.taskId }) },
    { label: "Reschedule", onClick: () => toast("Reschedule task", { description: task.taskId }) },
    { label: "Open worksheet", onClick: () => setActiveTab("worksheet") },
    { label: "Capture signature", onClick: () => setActiveTab("signature") },
    {
      label: "Cancel task",
      onClick: () => {
        handleStatusChange("Cancelled");
        navigate("field-service");
      },
    },
  ];

  return (
    <DetailLayout
      title={task.taskId}
      subtitle={task.title}
      badges={
        <>
          <StatusBadge variant={typeMeta.variant}>{task.type}</StatusBadge>
          <StatusBadge variant={statusMeta.variant} pulse={statusMeta.pulse}>{task.status}</StatusBadge>
          <StatusBadge variant={priorityMeta.variant} pulse={priorityMeta.pulse}>{task.priority}</StatusBadge>
        </>
      }
      meta={
        <>
          <span className="flex items-center gap-1"><User className="h-3 w-3" />{task.technician}</span>
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{task.location.split(",")[0]}</span>
          <span className="tabular">{formatDateTime(task.scheduledAt)}</span>
        </>
      }
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={actions}
      quickActions={quickActions}
    >
      {/* ===== Overview ===== */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Type" value={task.type} icon={<Wrench className="h-3.5 w-3.5" />} />
            <StatCard label="Status" value={task.status} icon={<Clock className="h-3.5 w-3.5" />} />
            <StatCard label="Checklist" value={`${checklistDone}/${checklistTotal}`} icon={<ClipboardList className="h-3.5 w-3.5" />} hint={`${checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0}% done`} />
            <StatCard label="Time logged" value={formatDuration(totalTimeMins)} icon={<Timer className="h-3.5 w-3.5" />} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InfoSection title="Task Details">
              <InfoRow label="Task ID" value={<span className="tabular">{task.taskId}</span>} mono />
              <InfoRow label="Title" value={task.title} />
              <InfoRow label="Type" value={<StatusBadge variant={typeBadge(task.type).variant}>{task.type}</StatusBadge>} />
              <InfoRow label="Status" value={<StatusBadge variant={statusBadge(task.status).variant}>{task.status}</StatusBadge>} />
              <InfoRow label="Priority" value={<StatusBadge variant={priorityBadge(task.priority).variant}>{task.priority}</StatusBadge>} />
              <InfoRow label="Technician" value={task.technician} />
              <InfoRow label="Scheduled" value={<span className="tabular">{formatDateTime(task.scheduledAt)}</span>} mono />
              {task.completedAt && (
                <InfoRow label="Completed" value={<span className="tabular">{formatDateTime(task.completedAt)}</span>} mono />
              )}
              <InfoRow label="Created" value={<span className="tabular">{formatDateTime(task.createdAt)}</span>} mono />
              {task.vehicleRef && (
                <InfoRow label="Vehicle ref" value={<span className="tabular">{task.vehicleRef}</span>} mono />
              )}
            </InfoSection>

            <InfoSection title="Customer & Location">
              <div className="px-4 py-3 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] bg-muted">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-foreground">{task.customer}</div>
                    <div className="text-[11px] text-muted-foreground tabular">{task.customerCode}</div>
                    <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{task.contactName}</span>
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{task.contactPhone}</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Location</div>
                  <div className="flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-[13px] text-foreground leading-relaxed">{task.location}</span>
                  </div>
                  {task.locationLat && task.locationLng && (
                    <div className="mt-1 text-[11px] text-muted-foreground tabular">
                      {task.locationLat.toFixed(4)}, {task.locationLng.toFixed(4)}
                    </div>
                  )}
                </div>
                <div className="border-t border-border pt-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Description</div>
                  <p className="text-[13px] text-foreground leading-relaxed">{task.description}</p>
                </div>
                {STATUS_TRANSITIONS[task.status].length > 0 && (
                  <div className="border-t border-border pt-3">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Change Status</div>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_TRANSITIONS[task.status].map((s) => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(s)}
                          className="flex h-7 items-center rounded-[4px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </InfoSection>
          </div>
        </div>
      )}

      {/* ===== Worksheet ===== */}
      {activeTab === "worksheet" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Digital Worksheet</span>
              </div>
              <span className="text-[11px] text-muted-foreground tabular">{checklistDone}/{checklistTotal} complete</span>
            </div>
            {task.checklist.length === 0 ? (
              <div className="px-4 py-10 text-center text-[12px] text-muted-foreground">
                No checklist items defined for this task type.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {task.checklist.map((item) => (
                  <ChecklistRow key={item.id} item={item} onToggle={() => toggleChecklist(item.id)} />
                ))}
              </div>
            )}
          </div>

          <InfoSection title="Technician Notes">
            <div className="px-4 py-3">
              <Textarea
                placeholder="Add notes about the work performed, observations, or follow-up actions…"
                className="min-h-[100px] rounded-[5px] text-[13px] bg-background"
              />
              <div className="mt-2 flex justify-end">
                <Btn size="sm" variant="primary" onClick={() => toast.success("Notes saved")}>Save notes</Btn>
              </div>
            </div>
          </InfoSection>
        </div>
      )}

      {/* ===== Parts ===== */}
      {activeTab === "parts" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Parts Used</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-muted-foreground tabular">Total: ₹{totalPartsCost.toLocaleString("en-IN")}</span>
                <Btn size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={addPart}>Add part</Btn>
              </div>
            </div>
            {task.parts.length === 0 ? (
              <div className="px-4 py-10 text-center text-[12px] text-muted-foreground">
                No parts consumed for this task yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-2 text-left font-medium">Part name</th>
                      <th className="px-4 py-2 text-left font-medium">Part #</th>
                      <th className="px-4 py-2 text-right font-medium">Qty</th>
                      <th className="px-4 py-2 text-right font-medium">Unit cost</th>
                      <th className="px-4 py-2 text-right font-medium">Subtotal</th>
                      <th className="px-4 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {task.parts.map((p) => (
                      <tr key={p.id} className="hover:bg-accent/30 transition-colors">
                        <td className="px-4 py-2.5 text-foreground">{p.name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground tabular">{p.partNo}</td>
                        <td className="px-4 py-2.5 text-right text-foreground tabular">{p.qty}</td>
                        <td className="px-4 py-2.5 text-right text-foreground tabular">₹{p.unitCost.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-2.5 text-right text-foreground font-medium tabular">₹{(p.qty * p.unitCost).toLocaleString("en-IN")}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => removePart(p.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Remove part"
                          >
                            <span className="text-[14px]">×</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/20">
                      <td colSpan={4} className="px-4 py-2.5 text-right text-[11px] uppercase tracking-wider text-muted-foreground">Total</td>
                      <td className="px-4 py-2.5 text-right text-foreground font-medium tabular">₹{totalPartsCost.toLocaleString("en-IN")}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Time ===== */}
      {activeTab === "time" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Total time" value={formatDuration(totalTimeMins)} icon={<Timer className="h-3.5 w-3.5" />} />
            <StatCard label="Entries" value={String(task.timeEntries.length)} icon={<Clock className="h-3.5 w-3.5" />} />
            <StatCard label="Active timer" value={task.timeEntries.some((e) => !e.end) ? "running" : "none"} icon={task.timeEntries.some((e) => !e.end) ? <CircleDot className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} />
          </div>

          <div className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Time Capture</span>
              </div>
              <Btn size="sm" icon={<Play className="h-3.5 w-3.5" />} onClick={startTimeEntry}>Start timer</Btn>
            </div>
            {task.timeEntries.length === 0 ? (
              <div className="px-4 py-10 text-center text-[12px] text-muted-foreground">
                No time logged yet. Start a timer to capture work duration.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {task.timeEntries.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-border">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-foreground">{e.label}</div>
                      <div className="text-[11px] text-muted-foreground tabular">
                        {formatDateTime(e.start)} {e.end ? `→ ${formatDateTime(e.end)}` : "· running"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[13px] font-medium text-foreground tabular">
                        {e.end ? formatDuration(e.minutes) : `${Math.round((Date.now() - new Date(e.start).getTime()) / 60000)}m`}
                      </div>
                      {!e.end && (
                        <button
                          onClick={() => stopTimeEntry(e.id)}
                          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          stop
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Signature ===== */}
      {activeTab === "signature" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PenTool className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Customer Signature</span>
              </div>
              <StatusBadge variant={task.signatureCaptured ? "outline" : "muted"}>
                {task.signatureCaptured ? "captured" : "pending"}
              </StatusBadge>
            </div>
            <div className="p-4">
              <div className="rounded-[5px] border border-dashed border-border bg-background">
                {task.signatureCaptured ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12">
                    <PenTool className="h-8 w-8 text-muted-foreground" />
                    <div className="text-[13px] font-medium text-foreground">Signature captured</div>
                    <div className="text-[11px] text-muted-foreground tabular">
                      {task.contactName} · {formatDateTime(task.updatedAt)}
                    </div>
                    <Btn size="sm" variant="ghost" onClick={() => toast("Re-capture signature")}>Re-capture</Btn>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-12">
                    <PenTool className="h-8 w-8 text-muted-foreground" />
                    <div className="text-[13px] font-medium text-foreground">No signature captured</div>
                    <div className="text-[11px] text-muted-foreground max-w-xs text-center">
                      Capture the customer's signature on completion to acknowledge the work performed.
                    </div>
                    <Btn size="sm" variant="primary" icon={<PenTool className="h-3.5 w-3.5" />} onClick={captureSignature}>
                      Capture signature
                    </Btn>
                  </div>
                )}
              </div>

              {task.customerFeedback && (
                <div className="mt-4 border-t border-border pt-4">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Customer feedback</div>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={cn(
                            "h-3.5 w-3.5",
                            n <= (task.rating ?? 0) ? "text-foreground" : "text-muted-foreground/30",
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-[13px] text-foreground leading-relaxed flex-1">{task.customerFeedback}</p>
                  </div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Customer name</div>
                  <Input value={task.contactName} readOnly className="h-8 rounded-[5px] text-[13px] bg-muted/30" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Contact number</div>
                  <Input value={task.contactPhone} readOnly className="h-8 rounded-[5px] text-[13px] bg-muted/30 tabular" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DetailLayout>
  );
}

function ChecklistRow({ item, onToggle }: { item: ChecklistItem; onToggle: () => void }) {
  return (
    <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/30 transition-colors">
      <Checkbox checked={item.done} onCheckedChange={onToggle} className="data-[state=checked]:bg-foreground data-[state=checked]:text-background" />
      <div className="flex-1 min-w-0">
        <div className={cn("text-[13px]", item.done ? "text-muted-foreground line-through" : "text-foreground")}>
          {item.label}
        </div>
        {item.ts && (
          <div className="text-[10px] text-muted-foreground tabular mt-0.5">{relativeTime(item.ts)}</div>
        )}
      </div>
      {item.done && <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />}
    </label>
  );
}

"use client";
import { useState, useMemo } from "react";
import { DetailLayout, InfoRow, InfoSection, StatCard } from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { VEHICLES, VENDORS, ISSUES } from "@/lib/mock-data";
import type { WorkOrder } from "@/lib/types";
import {
  Pencil,
  Wrench,
  Truck,
  User,
  Clock,
  CheckCircle2,
  Package,
  ChevronRight,
  History,
  Coins,
  AlertTriangle,
  Image as ImageIcon,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatDate,
  formatDateTime,
  formatINR,
  relativeTime,
  statusVariant,
  priorityVariant,
  buildWoActivity,
  PARTS,
} from "./_helpers";
import { cn } from "@/lib/utils";
import { EditWorkOrderDrawer } from "./edit-work-order-drawer";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "parts", label: "Parts Consumed" },
  { id: "linked", label: "Linked Issues" },
  { id: "photos", label: "Photos" },
  { id: "activity", label: "Activity Log" },
];

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  flag: CheckCircle2,
  truck: Truck,
  user: User,
  play: Clock,
  clock: Clock,
  check: CheckCircle2,
  x: AlertTriangle,
};

interface WorkOrderDetailProps {
  workOrderId: string;
  workOrders: WorkOrder[];
  onUpdate: (id: string, data: Partial<WorkOrder>) => Promise<boolean>;
}

export function WorkOrderDetail({ workOrderId, workOrders, onUpdate: onUpdateReal }: WorkOrderDetailProps) {
  const { navigate, navigateDetail } = useAppStore();
  const [activeTab, setActiveTab] = useState("overview");
  const record = workOrders.find((w) => w.workOrderId === workOrderId);
  const [editing, setEditing] = useState(false);

  const wo = record;

  const handleUpdate = (id: string, data: Partial<WorkOrder>) => {
    onUpdateReal(id, data);
  };

  // Deterministic parts consumed (3-5 parts)
  const consumedParts = useMemo(() => {
    if (!wo) return [];
    const m = wo.workOrderId.match(/(\d+)/);
    const seed = m ? Number(m[1]) : 1;
    const count = 2 + (seed % 3);
    return PARTS.slice(0, count).map((p) => ({
      ...p,
      qty: 1 + (seed % 3),
      total: (1 + (seed % 3)) * p.unitCost,
    }));
  }, [wo]);

  // Linked issues - vehicle-based
  const linkedIssues = useMemo(() => {
    if (!wo) return [];
    return ISSUES.filter((i) => i.vehicle === wo.vehicle).slice(0, 5);
  }, [wo]);

  // Tech notes
  const techNotes = useMemo(() => {
    if (!wo) return [];
    return [
      { author: wo.technician || "Workshop Bay 2", ts: wo.createdDate, text: "Initial diagnostic completed - confirmed root cause. Ordering replacement parts." },
      { author: wo.technician || "Workshop Bay 2", ts: wo.estimatedCompletion || wo.createdDate, text: "Parts received. Disassembly started. No further complications expected." },
      ...(wo.status === "Completed"
        ? [{ author: wo.technician || "Workshop Bay 2", ts: wo.estimatedCompletion || wo.createdDate, text: "Repair complete. Vehicle test-driven for 5 km. All systems within spec." }]
        : []),
    ];
  }, [wo]);

  if (!wo) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Work order <span className="tabular">{workOrderId}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => navigate("maintenance")}>Back to Maintenance</Btn>
      </div>
    );
  }

  const vehicle = VEHICLES.find((v) => v.name === wo.vehicle);
  const vendor = VENDORS.find((v) => v.companyName === wo.vendor);
  const activity = buildWoActivity(wo);

  // Cost summary
  const partsTotal = consumedParts.reduce((s, p) => s + p.total, 0);
  const laborHours = 4 + (wo.workOrderId.length % 6);
  const laborRate = 350;
  const laborCost = laborHours * laborRate;
  const estimatedTotal = partsTotal + laborCost;
  const actualTotal = wo.actualCost || estimatedTotal;
  const variance = actualTotal - wo.estimatedCost;

  const actions = (
    <>
      <Btn icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(true)} aria-label="Edit">
        <span className="hidden sm:inline">Edit</span>
      </Btn>
      {wo.status !== "Completed" && (
        <Btn
          variant="primary"
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          onClick={() => {
            handleUpdate(wo.id, { status: "Completed" });
            toast.success("Work order completed", { description: wo.workOrderId });
          }}
        >
          <span className="hidden sm:inline">Mark Complete</span>
          <span className="sm:hidden">Complete</span>
        </Btn>
      )}
    </>
  );

  const quickActions = [
    { label: "Print Work Order", onClick: () => toast("Generating PDF", { description: wo.workOrderId }) },
    { label: "Add Parts", onClick: () => toast("Add parts to work order", { description: wo.workOrderId }) },
    { label: "Add Technician Note", onClick: () => toast("Open note editor", { description: wo.workOrderId }) },
    {
      label: "Cancel Work Order",
      onClick: () => {
        handleUpdate(wo.id, { status: "Cancelled" });
        toast(`Work order cancelled`, { description: wo.workOrderId });
        navigate("maintenance");
      },
    },
  ];

  return (
    <DetailLayout
      title={wo.workOrderId}
      subtitle={wo.title}
      badges={
        <>
          <StatusBadge variant={statusVariant(wo.status)}>{wo.status}</StatusBadge>
          <StatusBadge variant={priorityVariant(wo.priority)}>{wo.priority}</StatusBadge>
          <StatusBadge variant="outline">{wo.type}</StatusBadge>
        </>
      }
      meta={
        <>
          <span className="flex items-center gap-1"><Truck className="h-3 w-3" />{wo.vehicle}</span>
          {wo.vendor && <span className="flex items-center gap-1"><Package className="h-3 w-3" />{wo.vendor}</span>}
          <span className="tabular">{formatDate(wo.createdDate)}</span>
          {wo.estimatedCompletion && <span className="tabular">est. {formatDate(wo.estimatedCompletion)}</span>}
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
            <StatCard label="Priority" value={wo.priority} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
            <StatCard label="Status" value={wo.status} icon={<Clock className="h-3.5 w-3.5" />} />
            <StatCard label="Estimated Cost" value={formatINR(wo.estimatedCost)} icon={<Coins className="h-3.5 w-3.5" />} />
            <StatCard label="Actual Cost" value={wo.actualCost ? formatINR(wo.actualCost) : "Pending"} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
          </div>

          {/* Cost Summary - est vs actual */}
          <div className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-2.5 flex items-center gap-2">
              <Coins className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Cost Summary - Estimated vs Actual</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
              <CostCell label="Parts" est={formatINR(partsTotal)} actual={formatINR(partsTotal)} />
              <CostCell label="Labor" est={`${laborHours}h · ${formatINR(laborCost)}`} actual={`${laborHours}h · ${formatINR(laborCost)}`} />
              <CostCell label="Total" est={formatINR(estimatedTotal)} actual={formatINR(actualTotal)} />
              <CostCell
                label="Variance"
                est="baseline"
                actual={formatINR(variance)}
                variance={variance !== 0}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InfoSection title="Work Order Details">
              <InfoRow label="Work Order ID" value={<span className="tabular">{wo.workOrderId}</span>} />
              <InfoRow label="Title" value={wo.title} />
              <InfoRow label="Type" value={wo.type} />
              <InfoRow label="Priority" value={<StatusBadge variant={priorityVariant(wo.priority)}>{wo.priority}</StatusBadge>} />
              <InfoRow label="Status" value={<StatusBadge variant={statusVariant(wo.status)}>{wo.status}</StatusBadge>} />
              <InfoRow label="Created" value={<span className="tabular">{formatDateTime(wo.createdDate)}</span>} />
              <InfoRow label="Est. Completion" value={wo.estimatedCompletion ? <span className="tabular">{formatDate(wo.estimatedCompletion)}</span> : "-"} />
              <InfoRow label="Estimated Cost" value={<span className="tabular">{formatINR(wo.estimatedCost)}</span>} />
              <InfoRow label="Actual Cost" value={wo.actualCost ? <span className="tabular">{formatINR(wo.actualCost)}</span> : "-"} />
            </InfoSection>

            <InfoSection title="Linked Entities">
              <div className="px-4 py-3 flex flex-col gap-3">
                <button
                  onClick={() => vehicle && navigateDetail("vehicles", vehicle.id)}
                  className="flex items-center justify-between gap-3 rounded-[5px] border border-border px-3 py-2.5 hover:bg-accent transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] bg-muted">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-foreground truncate">{wo.vehicle}</div>
                      <div className="text-[11px] text-muted-foreground tabular truncate">{vehicle?.licensePlate || "-"} · {vehicle?.type || "-"}</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>

                {vendor && (
                  <button
                    onClick={() => navigateDetail("vendors", vendor.id)}
                    className="flex items-center justify-between gap-3 rounded-[5px] border border-border px-3 py-2.5 hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] bg-muted">
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-foreground truncate">{vendor.companyName}</div>
                        <div className="text-[11px] text-muted-foreground tabular truncate">{vendor.type} · {vendor.city}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                )}

                {wo.technician && (
                  <div className="flex items-center gap-3 rounded-[5px] border border-border px-3 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] bg-muted">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-foreground truncate">{wo.technician}</div>
                      <div className="text-[11px] text-muted-foreground">Assigned technician</div>
                    </div>
                  </div>
                )}
              </div>
            </InfoSection>
          </div>

          {/* Tech notes */}
          <InfoSection title="Technician Notes">
            <div className="px-4 py-3 flex flex-col gap-3">
              {techNotes.map((n, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-muted">
                    <StickyNote className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-medium text-foreground">{n.author}</span>
                      <span className="text-[11px] text-muted-foreground tabular">{relativeTime(n.ts)}</span>
                    </div>
                    <p className="text-[12px] text-foreground mt-0.5">{n.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </InfoSection>
        </div>
      )}

      {/* ===== Parts Consumed ===== */}
      {activeTab === "parts" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Parts Count" value={String(consumedParts.length)} icon={<Package className="h-3.5 w-3.5" />} />
            <StatCard label="Labor Hours" value={`${laborHours} h`} icon={<Clock className="h-3.5 w-3.5" />} />
            <StatCard label="Total Cost" value={formatINR(estimatedTotal)} icon={<Coins className="h-3.5 w-3.5" />} />
          </div>

          <div className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Parts Consumed</span>
              </div>
              <Btn size="sm" icon={<Package className="h-3 w-3" />} onClick={() => toast("Add parts to work order", { description: wo.workOrderId })}>Add Part</Btn>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Part Name</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Part #</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Qty</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Unit Cost</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {consumedParts.map((p) => (
                    <tr key={p.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-2.5 text-[13px] text-foreground">{p.name}</td>
                      <td className="px-4 py-2.5 text-[12px] tabular text-muted-foreground">{p.number}</td>
                      <td className="px-4 py-2.5 text-[13px] tabular text-right">{p.qty}</td>
                      <td className="px-4 py-2.5 text-[13px] tabular text-right">{formatINR(p.unitCost)}</td>
                      <td className="px-4 py-2.5 text-[13px] tabular font-medium text-right">{formatINR(p.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-muted/30">
                    <td colSpan={4} className="px-4 py-2.5 text-[12px] font-medium uppercase tracking-wider text-muted-foreground text-right">Parts Total</td>
                    <td className="px-4 py-2.5 text-[14px] tabular font-medium text-right">{formatINR(partsTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="rounded-[6px] border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Labor</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-[12px]">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-muted-foreground">Hours</span>
                <span className="text-[16px] tabular font-medium text-foreground">{laborHours} h</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-muted-foreground">Rate</span>
                <span className="text-[16px] tabular font-medium text-foreground">{formatINR(laborRate)}/h</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-muted-foreground">Cost</span>
                <span className="text-[16px] tabular font-medium text-foreground">{formatINR(laborCost)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Linked Issues ===== */}
      {activeTab === "linked" && (
        <div className="flex flex-col gap-4">
          <InfoSection title="Issues Linked to This Work Order">
            {linkedIssues.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <AlertTriangle className="h-5 w-5 text-muted-foreground mx-auto" />
                <p className="text-[13px] text-foreground mt-2 font-medium">No linked issues</p>
                <p className="text-[12px] text-muted-foreground">Issues for this vehicle will surface here.</p>
              </div>
            ) : (
              linkedIssues.map((iss) => (
                <button
                  key={iss.id}
                  onClick={() => navigateDetail("issues", iss.issueId)}
                  className="w-full flex items-center justify-between gap-3 py-2 hover:bg-accent/40 -mx-1 px-1 rounded-[4px] transition-colors text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="tabular text-[11px] text-muted-foreground">{iss.issueId}</span>
                      <StatusBadge variant={iss.severity === "Critical" ? "solid" : iss.severity === "High" ? "outline" : "muted"}>
                        {iss.severity}
                      </StatusBadge>
                    </div>
                    <p className="text-[13px] text-foreground truncate mt-0.5">{iss.title}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))
            )}
          </InfoSection>
        </div>
      )}

      {/* ===== Photos ===== */}
      {activeTab === "photos" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-[6px] border border-border bg-card p-8 flex flex-col items-center justify-center gap-2 text-center">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
            <p className="text-[13px] text-foreground font-medium">No photos attached</p>
            <p className="text-[12px] text-muted-foreground">Upload before/after repair photos to document the work.</p>
            <Btn size="sm" variant="outline" icon={<ImageIcon className="h-3.5 w-3.5" />} onClick={() => toast("Open photo uploader")} className="mt-2">
              Upload Photos
            </Btn>
          </div>
        </div>
      )}

      {/* ===== Activity Log ===== */}
      {activeTab === "activity" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-[6px] border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5">
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Timeline</h3>
            </div>
            <div className="px-4 py-3">
              <div className="relative">
                {activity.map((evt, i) => {
                  const Icon = ICONS[evt.icon] || History;
                  return (
                    <div key={i} className="flex items-start gap-3 pb-5 last:pb-0 relative">
                      {i < activity.length - 1 && (
                        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
                      )}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card z-10">
                        <Icon className="h-3.5 w-3.5 text-foreground" />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-[13px] font-medium text-foreground">{evt.label}</p>
                          <span className="text-[11px] text-muted-foreground tabular shrink-0">{relativeTime(evt.ts)}</span>
                        </div>
                        <p className="text-[12px] text-muted-foreground mt-0.5">{evt.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <EditWorkOrderDrawer
        open={editing}
        workOrder={wo}
        onClose={() => setEditing(false)}
        onUpdate={handleUpdate}
      />
    </DetailLayout>
  );
}

function CostCell({
  label,
  est,
  actual,
  variance,
}: {
  label: string;
  est: string;
  actual: string;
  variance?: boolean;
}) {
  return (
    <div className="px-4 py-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] text-muted-foreground tabular">est. {est}</span>
        <span className={cn("text-[15px] tabular font-medium text-foreground", variance && "text-foreground")}>{actual}</span>
      </div>
    </div>
  );
}

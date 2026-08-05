"use client";
import { useState, useMemo } from "react";
import { DetailLayout, InfoRow, InfoSection, StatCard } from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { StatusBadge, inspectionResultBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { INSPECTIONS, VEHICLES, DRIVERS, ISSUES } from "@/lib/mock-data";
import type { Inspection } from "@/lib/types";
import {
  Pencil,
  Printer,
  FileDown,
  Sparkles,
  CheckCircle2,
  XCircle,
  CircleSlash,
  Truck,
  User,
  Gauge,
  ClipboardCheck,
  Image as ImageIcon,
  AlertTriangle,
  Link2,
  History,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatDate,
  formatDateTime,
  formatNumber,
  relativeTime,
  seedChecklist,
  type ChecklistItemDef,
} from "./_helpers";
import { cn } from "@/lib/utils";
import { EditInspectionDrawer } from "./edit-inspection-drawer";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "checklist", label: "Checklist" },
  { id: "photos", label: "Photos" },
  { id: "issues", label: "Linked Issues" },
  { id: "activity", label: "Activity Log" },
];

interface InspectionDetailProps {
  inspectionId: string;
  initialTab?: string;
}

export function InspectionDetail({ inspectionId, initialTab }: InspectionDetailProps) {
  const { navigate, navigateDetail } = useAppStore();
  const [activeTab, setActiveTab] = useState(initialTab || "overview");
  const [record, setRecord] = useState<Inspection | undefined>(
    () => INSPECTIONS.find((i) => i.inspectionId === inspectionId),
  );
  const [editing, setEditing] = useState(false);

  const inspection = record;

  const handleUpdate = (id: string, data: Partial<Inspection>) => {
    setRecord((prev) => (prev ? { ...prev, ...data } : prev));
  };

  const checklist = useMemo<ChecklistItemDef[]>(() => {
    if (!inspection) return [];
    // Derive a deterministic seed from inspectionId
    const m = inspection.inspectionId.match(/(\d+)/);
    const seed = m ? Number(m[1]) : 1;
    return seedChecklist(inspection.type, seed);
  }, [inspection]);

  if (!inspection) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Inspection <span className="tabular">{inspectionId}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => navigate("inspection")}>Back to Inspections</Btn>
      </div>
    );
  }

  const vehicle = VEHICLES.find((v) => v.name === inspection.vehicle);
  const driver = DRIVERS.find((d) => d.name === inspection.driver);
  const meta = inspectionResultBadge(inspection.result);

  // Linked issues - derived from issues mentioning this vehicle/inspection
  const linkedIssues = ISSUES.filter((i) => i.vehicle === inspection.vehicle).slice(0, 6);

  // Activity log - deterministic timeline
  const activityLog = [
    { icon: ClipboardCheck, label: "Inspection scheduled", detail: `by ${inspection.inspector} · ${formatDateTime(inspection.date)}`, ts: inspection.date },
    { icon: CheckCircle2, label: "Checklist completed", detail: `${checklist.length} items reviewed`, ts: inspection.date },
    ...(inspection.result === "Fail"
      ? [{ icon: AlertTriangle, label: "Failed items escalated", detail: `${checklist.filter((c) => c.result === "Fail").length} issues created`, ts: inspection.date }]
      : []),
    ...(inspection.linkedIssues > 0
      ? [{ icon: Link2, label: "Linked issues updated", detail: `${inspection.linkedIssues} issues tied to this inspection`, ts: inspection.date }]
      : []),
    { icon: History, label: "Report archived", detail: `PDF generated · ${relativeTime(inspection.date)}`, ts: inspection.date },
  ];

  // Compute stats
  const passCount = checklist.filter((c) => c.result === "Pass").length;
  const failCount = checklist.filter((c) => c.result === "Fail").length;
  const naCount = checklist.filter((c) => c.result === "N/A").length;
  const photos = checklist.filter((c) => c.photoName);

  const actions = (
    <>
      <Btn icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(true)} aria-label="Edit">
        <span className="hidden sm:inline">Edit</span>
      </Btn>
      <Btn variant="primary" icon={<FileDown className="h-3.5 w-3.5" />} onClick={() => toast.success("PDF report generated", { description: inspection.inspectionId })}>
        <span className="hidden sm:inline">Download Report</span>
        <span className="sm:hidden">Report</span>
      </Btn>
    </>
  );

  const quickActions = [
    { label: "Print Report", onClick: () => toast("Opening print dialog", { description: inspection.inspectionId }) },
    { label: "Duplicate Inspection", onClick: () => toast("Inspection duplicated", { description: inspection.inspectionId }) },
    { label: "Create Work Order", onClick: () => toast("Work order drafted", { description: `From ${inspection.inspectionId}` }) },
    {
      label: "Cancel Inspection",
      onClick: () => {
        toast(`Inspection cancelled`, { description: inspection.inspectionId });
        navigate("inspection");
      },
    },
  ];

  return (
    <DetailLayout
      title={inspection.inspectionId}
      subtitle={`${inspection.type} inspection · ${inspection.vehicle}`}
      badges={
        <StatusBadge variant={meta.variant} pulse={meta.pulse}>
          {inspection.result}
        </StatusBadge>
      }
      meta={
        <>
          <span className="flex items-center gap-1"><ClipboardCheck className="h-3 w-3" />{inspection.inspector}</span>
          <span className="tabular">{formatDate(inspection.date)}</span>
          <span className="flex items-center gap-1 tabular"><Gauge className="h-3 w-3" />{formatNumber(inspection.odometer)} km</span>
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
            <StatCard label="Checklist Items" value={String(checklist.length)} icon={<ClipboardCheck className="h-3.5 w-3.5" />} />
            <StatCard label="Passed" value={String(passCount)} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
            <StatCard label="Failed" value={String(failCount)} icon={<XCircle className="h-3.5 w-3.5" />} />
            <StatCard label="Photos" value={String(photos.length)} icon={<ImageIcon className="h-3.5 w-3.5" />} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InfoSection title="Inspection Details">
              <InfoRow label="Inspection ID" value={<span className="tabular">{inspection.inspectionId}</span>} />
              <InfoRow label="Type" value={inspection.type} />
              <InfoRow label="Result" value={<StatusBadge variant={meta.variant} pulse={meta.pulse}>{inspection.result}</StatusBadge>} />
              <InfoRow label="Date" value={<span className="tabular">{formatDateTime(inspection.date)}</span>} />
              <InfoRow label="Inspector" value={inspection.inspector} />
              <InfoRow label="Odometer" value={<span className="tabular">{formatNumber(inspection.odometer)} km</span>} />
              <InfoRow label="Linked Issues" value={<span className="tabular">{inspection.linkedIssues}</span>} />
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
                      <div className="text-[13px] font-medium text-foreground truncate">{inspection.vehicle}</div>
                      <div className="text-[11px] text-muted-foreground tabular truncate">
                        {vehicle?.licensePlate || "-"} · {vehicle?.type || "-"}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>

                {driver && (
                  <button
                    onClick={() => navigateDetail("drivers-staff", driver.id)}
                    className="flex items-center justify-between gap-3 rounded-[5px] border border-border px-3 py-2.5 hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] bg-muted">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-foreground truncate">{driver.name}</div>
                        <div className="text-[11px] text-muted-foreground tabular truncate">
                          License: {driver.licenseNumber || "-"}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                )}
              </div>
            </InfoSection>
          </div>
        </div>
      )}

      {/* ===== Checklist ===== */}
      {activeTab === "checklist" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Passed" value={`${passCount}/${checklist.length}`} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
            <StatCard label="Failed" value={`${failCount}/${checklist.length}`} icon={<XCircle className="h-3.5 w-3.5" />} />
            <StatCard label="N/A" value={`${naCount}/${checklist.length}`} icon={<CircleSlash className="h-3.5 w-3.5" />} />
          </div>

          {Object.entries(
            checklist.reduce<Record<string, ChecklistItemDef[]>>((acc, c) => {
              (acc[c.section] = acc[c.section] || []).push(c);
              return acc;
            }, {}),
          ).map(([section, items]) => (
            <div key={section} className="rounded-[6px] border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{section}</h3>
                <span className="text-[11px] text-muted-foreground tabular">{items.length} items</span>
              </div>
              <div className="divide-y divide-border">
                {items.map((c) => (
                  <div key={c.id} className="px-4 py-3 flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border",
                        c.result === "Pass" && "border-border bg-muted text-foreground",
                        c.result === "Fail" && "border-foreground bg-foreground text-background",
                        c.result === "N/A" && "border-border bg-background text-muted-foreground",
                        c.result === "Pending" && "border-dashed border-border text-muted-foreground",
                      )}
                    >
                      {c.result === "Pass" && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {c.result === "Fail" && <XCircle className="h-3.5 w-3.5" />}
                      {c.result === "N/A" && <CircleSlash className="h-3.5 w-3.5" />}
                      {c.result === "Pending" && <span className="text-[11px] tabular">?</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[13px] text-foreground">{c.label}</p>
                        <StatusBadge
                          variant={
                            c.result === "Pass" ? "outline" : c.result === "Fail" ? "solid" : c.result === "N/A" ? "muted" : "muted"
                          }
                        >
                          {c.result}
                        </StatusBadge>
                      </div>
                      {c.notes && (
                        <div className="mt-1.5 rounded-[5px] border border-border bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground">
                          {c.notes}
                        </div>
                      )}
                      {c.photoName && (
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <ImageIcon className="h-3 w-3" />
                          <span className="tabular">{c.photoName}</span>
                          <span className="tabular">· {c.photoSize}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== Photos ===== */}
      {activeTab === "photos" && (
        <div className="flex flex-col gap-4">
          {photos.length === 0 ? (
            <div className="rounded-[6px] border border-border bg-card p-12 flex flex-col items-center justify-center gap-2 text-center">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
              <p className="text-[13px] text-foreground font-medium">No photos attached</p>
              <p className="text-[12px] text-muted-foreground">Photos captured during failed checklist items appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((p) => (
                <div key={p.id} className="rounded-[6px] border border-border bg-card overflow-hidden">
                  <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-medium text-foreground truncate">{p.photoName}</span>
                      <StatusBadge variant="solid">Fail</StatusBadge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{p.label}</p>
                    <p className="text-[10px] text-muted-foreground tabular mt-1">{p.photoSize} · {p.section}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== Linked Issues ===== */}
      {activeTab === "issues" && (
        <div className="flex flex-col gap-4">
          <InfoSection
            title="Issues Linked to This Inspection"
            action={
              <Btn size="sm" icon={<Sparkles className="h-3 w-3" />} onClick={() => toast("Rean analysing inspection for new issues")}>
                Re-scan with Rean
              </Btn>
            }
          >
            {linkedIssues.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Link2 className="h-5 w-5 text-muted-foreground mx-auto" />
                <p className="text-[13px] text-foreground mt-2 font-medium">No linked issues</p>
                <p className="text-[12px] text-muted-foreground">Issues raised from this inspection will appear here.</p>
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
                    <p className="text-[11px] text-muted-foreground mt-0.5">Source: {iss.source} · {relativeTime(iss.createdDate)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))
            )}
          </InfoSection>
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
                {activityLog.map((evt, i) => (
                  <div key={i} className="flex items-start gap-3 pb-5 last:pb-0 relative">
                    {i < activityLog.length - 1 && (
                      <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
                    )}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card z-10">
                      <evt.icon className="h-3.5 w-3.5 text-foreground" />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-[13px] font-medium text-foreground">{evt.label}</p>
                        <span className="text-[11px] text-muted-foreground tabular shrink-0">{relativeTime(evt.ts)}</span>
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-0.5">{evt.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <EditInspectionDrawer
        open={editing}
        inspection={inspection}
        onClose={() => setEditing(false)}
        onUpdate={handleUpdate}
      />
    </DetailLayout>
  );
}

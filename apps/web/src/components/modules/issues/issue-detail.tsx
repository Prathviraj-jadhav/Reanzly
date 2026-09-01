"use client";
import { useState, useMemo, useEffect } from "react";
import { DetailLayout, InfoRow, InfoSection, StatCard } from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { StatusBadge, issueSeverityBadge } from "@/components/shared/status-badge";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import type { Issue, Vehicle, Driver, Inspection, WorkOrder } from "@/lib/types";
import {
  Pencil,
  Wrench,
  Sparkles,
  Truck,
  User,
  Flag,
  Clock,
  CheckCircle2,
  Package,
  Archive,
  Play,
  ChevronRight,
  MessageSquare,
  Image as ImageIcon,
  History,
  ClipboardCheck,
  AlertTriangle,
  LifeBuoy,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatDate,
  formatDateTime,
  relativeTime,
  statusBadgeVariant,
  severityBadgeVariant,
  STATUS_TRANSITIONS,
  buildIssueActivity,
} from "./_helpers";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { EditIssueDrawer } from "./edit-issue-drawer";
import { RaiseToReanzlyDialog } from "./raise-to-reanzly-dialog";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "comments", label: "Comments" },
  { id: "photos", label: "Photos" },
  { id: "linked", label: "Linked Records" },
  { id: "activity", label: "Activity Log" },
];

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  flag: Flag,
  user: User,
  play: Play,
  package: Package,
  check: CheckCircle2,
  archive: Archive,
};

interface IssueDetailProps {
  issueId: string;
  issues: Issue[];
  vehicles: Vehicle[];
  drivers: Driver[];
  inspections: Inspection[];
  workOrders: WorkOrder[];
  onUpdate: (id: string, data: Partial<Issue>) => Promise<boolean>;
}

export function IssueDetail({ issueId, issues, vehicles, drivers, inspections, workOrders, onUpdate }: IssueDetailProps) {
  const { navigateCompat: navigate, navigateDetailCompat: navigateDetail } = useNavigateCompat();
  const [activeTab, setActiveTab] = useState("overview");
  const [comment, setComment] = useState("");
  const issue = issues.find((i) => i.issueId === issueId);
  const [editing, setEditing] = useState(false);
  const [raiseOpen, setRaiseOpen] = useState(false);

  const handleUpdate = (id: string, data: Partial<Issue>) => {
    onUpdate(id, data);
  };

  // Deterministic comment thread
  const comments = useMemo(() => {
    if (!issue) return [];
    const m = issue.issueId.match(/(\d+)/);
    const seed = m ? Number(m[1]) : 1;
    return [
      { user: issue.reporter, role: "Reporter", text: issue.description, ts: issue.createdDate, initial: issue.reporter[0] },
      { user: issue.assignee, role: "Assignee", text: "Acknowledged. Scheduling a workshop slot for diagnostic review.", ts: relativeTime(issue.createdDate), initial: issue.assignee[0] },
      ...(issue.source === "Rean"
        ? [{ user: "Rean AI", role: "Anomaly Engine", text: "Pattern matched against historical anomalies on similar vehicle class. Confidence: 87%.", ts: relativeTime(issue.createdDate), initial: "R" }]
        : []),
      ...(seed % 2 === 0
        ? [{ user: "Workshop Bay 2", role: "Maintenance", text: "Parts ordered - expected arrival in 2 working days.", ts: relativeTime(issue.createdDate), initial: "W" }]
        : []),
    ];
  }, [issue]);

  // Deterministic photo gallery
  const photos = useMemo(() => {
    if (!issue) return [];
    const m = issue.issueId.match(/(\d+)/);
    const seed = m ? Number(m[1]) : 1;
    return [
      { name: `evidence_${issue.issueId.toLowerCase()}_1.jpg`, size: "1.4 MB", caption: "Initial capture at depot", ts: issue.createdDate },
      { name: `evidence_${issue.issueId.toLowerCase()}_2.jpg`, size: "2.1 MB", caption: "Close-up of affected component", ts: issue.createdDate },
      ...(seed % 3 === 0 ? [{ name: `evidence_${issue.issueId.toLowerCase()}_3.jpg`, size: "0.9 MB", caption: "Re-test after first repair attempt", ts: issue.createdDate }] : []),
    ];
  }, [issue]);

  if (!issue) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Issue <span className="tabular">{issueId}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => navigate("issues")}>Back to Issues</Btn>
      </div>
    );
  }

  const vehicle = vehicles.find((v) => v.name === issue.vehicle);
  const driver = drivers.find((d) => d.name === issue.reporter);
  const reporterDriver = drivers.find((d) => d.name === issue.reporter);
  const linkedInspection = inspections.find((i) => i.vehicle === issue.vehicle);
  const linkedWorkOrders = workOrders.filter((w) => w.vehicle === issue.vehicle).slice(0, 3);

  const severityMeta = issueSeverityBadge(issue.severity);
  const activity = buildIssueActivity(issue);

  const handleStatusChange = (newStatus: string) => {
    toast.success(`Status updated`, { description: `${issue.status} → ${newStatus}` });
  };

  const handleCommentSubmit = () => {
    if (!comment.trim()) return;
    toast.success("Comment posted");
    setComment("");
  };

  const actions = (
    <>
      <Btn icon={<LifeBuoy className="h-3.5 w-3.5" />} onClick={() => setRaiseOpen(true)} aria-label="Raise to Reanzly">
        <span className="hidden sm:inline">Raise to Reanzly</span>
        <span className="sm:hidden">Raise</span>
      </Btn>
      <Btn icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(true)} aria-label="Edit">
        <span className="hidden sm:inline">Edit</span>
      </Btn>
      <Btn variant="primary" icon={<Wrench className="h-3.5 w-3.5" />} onClick={() => toast.success("Work order drafted", { description: `From ${issue.issueId}` })}>
        <span className="hidden sm:inline">Create Work Order</span>
        <span className="sm:hidden">Work Order</span>
      </Btn>
    </>
  );

  const quickActions = [
    { label: "Reassign", onClick: () => toast("Reassign issue", { description: issue.issueId }) },
    { label: "Duplicate", onClick: () => toast("Issue duplicated", { description: issue.issueId }) },
    { label: "Link Inspection", onClick: () => toast("Linking inspection", { description: issue.issueId }) },
    {
      label: "Close Issue",
      onClick: () => {
        toast.success(`Issue closed`, { description: issue.issueId });
        navigate("issues");
      },
    },
  ];

  return (
    <DetailLayout
      title={issue.issueId}
      subtitle={issue.title}
      badges={
        <>
          <StatusBadge variant={severityMeta.variant} pulse={severityMeta.pulse}>{issue.severity}</StatusBadge>
          <StatusBadge variant={statusBadgeVariant(issue.status)}>{issue.status}</StatusBadge>
          {issue.source === "Rean" && (
            <StatusBadge variant="solid"><Sparkles className="h-3 w-3" />Rean</StatusBadge>
          )}
        </>
      }
      meta={
        <>
          <span className="flex items-center gap-1"><Flag className="h-3 w-3" />{issue.reporter}</span>
          <span className="flex items-center gap-1"><User className="h-3 w-3" />{issue.assignee}</span>
          <span className="tabular">{formatDate(issue.createdDate)}</span>
          {issue.resolutionDate && <span className="tabular">resolved {formatDate(issue.resolutionDate)}</span>}
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
            <StatCard label="Severity" value={issue.severity} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
            <StatCard label="Status" value={issue.status} icon={<Clock className="h-3.5 w-3.5" />} />
            <StatCard label="Source" value={issue.source} icon={<Flag className="h-3.5 w-3.5" />} />
            <StatCard label="Age" value={relativeTime(issue.createdDate)} icon={<History className="h-3.5 w-3.5" />} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InfoSection title="Issue Details">
              <InfoRow label="Issue ID" value={<span className="tabular">{issue.issueId}</span>} />
              <InfoRow label="Title" value={issue.title} />
              <InfoRow label="Severity" value={<StatusBadge variant={severityBadgeVariant(issue.severity)}>{issue.severity}</StatusBadge>} />
              <InfoRow label="Status" value={<StatusBadge variant={statusBadgeVariant(issue.status)}>{issue.status}</StatusBadge>} />
              <InfoRow label="Source" value={issue.source} />
              <InfoRow label="Reporter" value={issue.reporter} />
              <InfoRow label="Assignee" value={issue.assignee} />
              <InfoRow label="Created" value={<span className="tabular">{formatDateTime(issue.createdDate)}</span>} />
              <InfoRow label="Resolved" value={issue.resolutionDate ? <span className="tabular">{formatDate(issue.resolutionDate)}</span> : "-"} />
            </InfoSection>

            <InfoSection title="Description & Status Control">
              <div className="px-4 py-3 flex flex-col gap-3">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Description</div>
                  <p className="text-[13px] text-foreground leading-relaxed">{issue.description}</p>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Change Status</div>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_TRANSITIONS[issue.status].map((s) => (
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
              </div>
            </InfoSection>
          </div>
        </div>
      )}

      {/* ===== Comments ===== */}
      {activeTab === "comments" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Thread</span>
              </div>
              <span className="text-[11px] text-muted-foreground tabular">{comments.length} comments</span>
            </div>
            <div className="px-4 py-3 flex flex-col gap-3">
              {comments.map((c, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[12px] font-medium tabular text-foreground">
                    {c.initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[13px] font-medium text-foreground">{c.user}</span>
                        <span className="text-[11px] text-muted-foreground">{c.role}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground tabular shrink-0">{c.ts}</span>
                    </div>
                    <p className="text-[13px] text-foreground mt-1 leading-relaxed">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border p-3">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a comment…"
                className="min-h-[60px] rounded-[5px] text-[13px] bg-background mb-2"
              />
              <div className="flex justify-end">
                <Btn size="sm" variant="primary" onClick={handleCommentSubmit} disabled={!comment.trim()}>
                  Post Comment
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Photos ===== */}
      {activeTab === "photos" && (
        <div className="flex flex-col gap-4">
          {photos.length === 0 ? (
            <div className="rounded-[6px] border border-border bg-card p-12 flex flex-col items-center justify-center gap-2 text-center">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
              <p className="text-[13px] text-foreground font-medium">No photos attached</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((p, i) => (
                <div key={i} className="rounded-[6px] border border-border bg-card overflow-hidden">
                  <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="px-3 py-2.5">
                    <div className="text-[12px] font-medium text-foreground truncate tabular">{p.name}</div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{p.caption}</p>
                    <p className="text-[10px] text-muted-foreground/80 mt-1 tabular">{p.size} · {relativeTime(p.ts)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== Linked Records ===== */}
      {activeTab === "linked" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InfoSection title="Vehicle">
              {vehicle ? (
                <div className="px-4 py-3">
                  <button
                    onClick={() => navigateDetail("vehicles", vehicle.id)}
                    className="w-full flex items-center justify-between gap-3 rounded-[5px] border border-border px-3 py-2.5 hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] bg-muted">
                        <Truck className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-foreground truncate">{vehicle.name}</div>
                        <div className="text-[11px] text-muted-foreground tabular truncate">{vehicle.licensePlate} · {vehicle.type}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">No vehicle linked</div>
              )}
            </InfoSection>

            <InfoSection title="Reporter">
              {reporterDriver ? (
                <div className="px-4 py-3">
                  <button
                    onClick={() => navigateDetail("drivers-staff", reporterDriver.id)}
                    className="w-full flex items-center justify-between gap-3 rounded-[5px] border border-border px-3 py-2.5 hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] bg-muted">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-foreground truncate">{reporterDriver.name}</div>
                        <div className="text-[11px] text-muted-foreground tabular truncate">{reporterDriver.role} · {reporterDriver.department}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                </div>
              ) : (
                <div className="px-4 py-3 text-[12px] text-foreground">{issue.reporter}</div>
              )}
            </InfoSection>
          </div>

          <InfoSection title="Linked Inspection">
            {linkedInspection ? (
              <div className="px-4 py-3">
                <button
                  onClick={() => navigateDetail("inspection", linkedInspection.inspectionId)}
                  className="w-full flex items-center justify-between gap-3 rounded-[5px] border border-border px-3 py-2.5 hover:bg-accent transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] bg-muted">
                      <ClipboardCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-foreground tabular truncate">{linkedInspection.inspectionId}</div>
                      <div className="text-[11px] text-muted-foreground tabular truncate">{linkedInspection.type} · {formatDate(linkedInspection.date)}</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">No inspection linked to this issue</div>
            )}
          </InfoSection>

          <InfoSection title="Work Orders">
            {linkedWorkOrders.length === 0 ? (
              <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">No work orders yet - create one to track the fix</div>
            ) : (
              <div className="px-4 py-3 flex flex-col gap-2">
                {linkedWorkOrders.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => navigateDetail("maintenance", w.workOrderId)}
                    className="w-full flex items-center justify-between gap-3 rounded-[5px] border border-border px-3 py-2.5 hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] bg-muted">
                        <Wrench className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-foreground tabular truncate">{w.workOrderId} · {w.title}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{w.status} · {w.priority} priority</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
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
                {activity.map((evt, i) => {
                  const Icon = ICONS[evt.icon] || Flag;
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

      <EditIssueDrawer
        open={editing}
        issue={issue}
        onClose={() => setEditing(false)}
        onUpdate={handleUpdate}
      />

      <RaiseToReanzlyDialog
        open={raiseOpen}
        onClose={() => setRaiseOpen(false)}
        prefill={{
          subject: `[${issue.issueId}] ${issue.title}`,
          description: issue.description,
          sourceIssueId: issue.issueId,
        }}
      />
    </DetailLayout>
  );
}

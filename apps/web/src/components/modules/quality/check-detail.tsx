"use client";
import { useState, useMemo } from "react";
import { DetailLayout, InfoRow, InfoSection, StatCard } from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import {
  Pencil,
  FileDown,
  CheckCircle2,
  XCircle,
  CircleSlash,
  AlertTriangle,
  AlertCircle,
  User,
  MapPin,
  ClipboardCheck,
  Gauge,
  ListChecks,
  Target,
  Wrench,
  History,
  ChevronRight,
  Truck,
  PackageCheck,
  FileText,
  ClipboardList,
} from "lucide-react";
import { toastSuccess, toastInfo, toastError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  formatDate,
  formatDateTime,
  relativeTime,
  checkResultBadge,
  checkStatusBadge,
  findingSeverityBadge,
  caStatusBadge,
  type QualityCheck,
  type CheckType,
  type CheckFinding,
  type ControlPoint,
  type CorrectiveAction,
} from "./_helpers";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "findings", label: "Findings" },
  { id: "control-points", label: "Control Points" },
  { id: "corrective-actions", label: "Corrective Actions" },
];

const TYPE_ICON: Record<CheckType, React.ComponentType<{ className?: string }>> = {
  Vehicle: Truck,
  "Goods Receipt": PackageCheck,
  Service: Wrench,
  Document: FileText,
  "Process Audit": ClipboardList,
};

interface CheckDetailProps {
  checkId: string;
  initialTab?: string;
  checks: QualityCheck[];
  onUpdate: (id: string, updated: QualityCheck) => void;
}

export function CheckDetail({ checkId, initialTab, checks, onUpdate }: CheckDetailProps) {
    const { goToModule: navigate, goToDetail: navigateDetail } = useAppNavigation();
  const [activeTab, setActiveTab] = useState(initialTab || "overview");
  const check = useMemo<QualityCheck | undefined>(
    () => checks.find((c) => c.id === checkId),
    [checks, checkId],
  );

  if (!check) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Quality check <span className="tabular">{checkId}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => navigate("quality")}>Back to Quality</Btn>
      </div>
    );
  }

  const meta = checkResultBadge(check.result);
  const statusMeta = checkStatusBadge(check.status);
  const TypeIcon = TYPE_ICON[check.type] || ClipboardCheck;

  const passCount = check.controlPoints.filter((c) => c.result === "Pass").length;
  const failCount = check.controlPoints.filter((c) => c.result === "Fail").length;
  const conditionalCount = check.controlPoints.filter((c) => c.result === "Conditional").length;
  const waivedCount = check.controlPoints.filter((c) => c.result === "Waived").length;
  const openCAPs = check.correctiveActions.filter((ca) => ca.status !== "Completed").length;

  const actions = (
    <>
      <Btn icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => toastInfo("Open check editor", check.checkId)} aria-label="Edit">
        <span className="hidden sm:inline">Edit</span>
      </Btn>
      <Btn variant="primary" icon={<FileDown className="h-3.5 w-3.5" />} onClick={() => toastSuccess("PDF report generated", check.checkId)}>
        <span className="hidden sm:inline">Download Report</span>
        <span className="sm:hidden">Report</span>
      </Btn>
    </>
  );

  const quickActions = [
    { label: "Print Report", onClick: () => toastInfo("Opening print dialog", check.checkId) },
    { label: "Duplicate Check", onClick: () => toastSuccess("Check duplicated", check.checkId) },
    { label: "Re-verify Findings", onClick: () => toastInfo("Re-running conformance check", check.checkId) },
    {
      label: check.status === "Cancelled" ? "Reopen Check" : "Cancel Check",
      onClick: () => {
        const nextStatus = check.status === "Cancelled" ? "Scheduled" : "Cancelled";
        void fetch(`/api/quality-checks/${check.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        })
          .then((res) => (res.ok ? res.json() : Promise.reject()))
          .then(({ check: updated }) => {
            onUpdate(check.id, updated);
            toastSuccess(`Check ${nextStatus === "Cancelled" ? "cancelled" : "reopened"}`, check.checkId);
          })
          .catch(() => toastError("Could not update check", check.checkId));
      },
    },
  ];

  return (
    <DetailLayout
      title={check.checkId}
      subtitle={`${check.type} check · ${check.reference}`}
      badges={
        <>
          <StatusBadge variant="outline">
            <TypeIcon className="h-3 w-3" /> {check.type}
          </StatusBadge>
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>
            {check.result}
          </StatusBadge>
          <StatusBadge variant={statusMeta.variant} pulse={statusMeta.pulse}>
            {check.status}
          </StatusBadge>
        </>
      }
      meta={
        <>
          <span className="flex items-center gap-1"><ClipboardCheck className="h-3 w-3" />{check.inspector}</span>
          <span className="tabular">{formatDate(check.date)}</span>
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{check.location}</span>
          <span className="flex items-center gap-1"><Gauge className="h-3 w-3" />{check.score}%</span>
        </>
      }
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={actions}
      quickActions={quickActions}
      lastUpdated={<span>Last verified {relativeTime(check.date)} · by {check.inspector}</span>}
    >
      {/* ===== Overview ===== */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Score" value={`${check.score}%`} icon={<Gauge className="h-3.5 w-3.5" />} hint={`out of 100`} />
            <StatCard label="Control Points" value={String(check.controlPoints.length)} icon={<ListChecks className="h-3.5 w-3.5" />} hint={`${passCount} pass · ${failCount} fail`} />
            <StatCard label="Findings" value={String(check.findings.length)} icon={<AlertTriangle className="h-3.5 w-3.5" />} hint={`${check.findings.filter((f) => f.severity === "Critical" || f.severity === "High").length} high+`} />
            <StatCard label="Open CAPs" value={String(openCAPs)} icon={<Wrench className="h-3.5 w-3.5" />} hint="corrective actions" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InfoSection title="Check Details">
              <InfoRow label="Check ID" value={<span className="tabular">{check.checkId}</span>} />
              <InfoRow label="Type" value={check.type} />
              <InfoRow label="Reference" value={check.reference} />
              <InfoRow label="Result" value={<StatusBadge variant={meta.variant} pulse={meta.pulse}>{check.result}</StatusBadge>} />
              <InfoRow label="Status" value={<StatusBadge variant={statusMeta.variant} pulse={statusMeta.pulse}>{check.status}</StatusBadge>} />
              <InfoRow label="Score" value={<span className="tabular">{check.score}%</span>} />
              <InfoRow label="Inspector" value={check.inspector} />
              <InfoRow label="Date" value={<span className="tabular">{formatDateTime(check.date)}</span>} />
              <InfoRow label="Location" value={check.location} />
            </InfoSection>

            <InfoSection title="Control Point Summary">
              <div className="px-4 py-3 flex flex-col gap-3">
                <SummaryRow icon={<CheckCircle2 className="h-4 w-4" />} label="Passed" value={passCount} total={check.controlPoints.length} />
                <SummaryRow icon={<XCircle className="h-4 w-4" />} label="Failed" value={failCount} total={check.controlPoints.length} />
                <SummaryRow icon={<AlertTriangle className="h-4 w-4" />} label="Conditional" value={conditionalCount} total={check.controlPoints.length} />
                <SummaryRow icon={<CircleSlash className="h-4 w-4" />} label="Waived" value={waivedCount} total={check.controlPoints.length} />
              </div>
            </InfoSection>
          </div>

          {check.notes && (
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-1.5 flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Inspector Notes</span>
              </div>
              <p className="text-[13px] text-foreground">{check.notes}</p>
            </div>
          )}

          {check.referenceModule && check.referenceEntity && (
            <InfoSection title="Linked Reference">
              <div className="px-4 py-3">
                <button
                  onClick={() => navigateDetail(check.referenceModule as never, check.referenceEntity as string)}
                  className="flex items-center justify-between gap-3 rounded-[5px] border border-border px-3 py-2.5 hover:bg-accent transition-colors text-left w-full"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] bg-muted">
                      <TypeIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-foreground truncate">{check.reference}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{check.referenceModule}</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              </div>
            </InfoSection>
          )}
        </div>
      )}

      {/* ===== Findings ===== */}
      {activeTab === "findings" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Total Findings" value={String(check.findings.length)} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
            <StatCard label="Critical" value={String(check.findings.filter((f) => f.severity === "Critical").length)} icon={<XCircle className="h-3.5 w-3.5" />} />
            <StatCard label="High" value={String(check.findings.filter((f) => f.severity === "High").length)} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
            <StatCard label="Resolved" value={String(check.findings.filter((f) => f.status === "Resolved").length)} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
          </div>

          {check.findings.length === 0 ? (
            <div className="rounded-[6px] border border-border bg-card p-12 flex flex-col items-center justify-center gap-2 text-center">
              <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
              <p className="text-[13px] text-foreground font-medium">No findings raised</p>
              <p className="text-[12px] text-muted-foreground">All control points were within tolerance during this check.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {check.findings.map((f) => (
                <FindingCard key={f.id} finding={f} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== Control Points ===== */}
      {activeTab === "control-points" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Passed" value={`${passCount}/${check.controlPoints.length}`} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
            <StatCard label="Failed" value={`${failCount}/${check.controlPoints.length}`} icon={<XCircle className="h-3.5 w-3.5" />} />
            <StatCard label="Conditional" value={`${conditionalCount}/${check.controlPoints.length}`} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
            <StatCard label="Waived" value={`${waivedCount}/${check.controlPoints.length}`} icon={<CircleSlash className="h-3.5 w-3.5" />} />
          </div>

          <div className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-2.5">
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Measured Control Points</h3>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[820px] text-left">
                <thead className="border-b border-border bg-muted/40">
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Control Point</th>
                    <th className="px-4 py-2 font-medium">Target</th>
                    <th className="px-4 py-2 font-medium">Actual</th>
                    <th className="px-4 py-2 font-medium">Method</th>
                    <th className="px-4 py-2 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {check.controlPoints.map((cp) => (
                    <ControlPointRow key={cp.id} cp={cp} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Target values come from the {check.type} control-point template. Variance against target drives the auto-finding logic.
          </p>
        </div>
      )}

      {/* ===== Corrective Actions ===== */}
      {activeTab === "corrective-actions" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Total CAPs" value={String(check.correctiveActions.length)} icon={<Wrench className="h-3.5 w-3.5" />} />
            <StatCard label="Open / In Progress" value={String(check.correctiveActions.filter((ca) => ca.status === "Open" || ca.status === "In Progress").length)} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
            <StatCard label="Completed" value={String(check.correctiveActions.filter((ca) => ca.status === "Completed").length)} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
          </div>

          {check.correctiveActions.length === 0 ? (
            <div className="rounded-[6px] border border-border bg-card p-12 flex flex-col items-center justify-center gap-2 text-center">
              <Wrench className="h-6 w-6 text-muted-foreground" />
              <p className="text-[13px] text-foreground font-medium">No corrective actions linked</p>
              <p className="text-[12px] text-muted-foreground">CAPs are auto-created from findings on this check.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {check.correctiveActions.map((ca) => (
                <CAPCard key={ca.id} ca={ca} />
              ))}
            </div>
          )}
        </div>
      )}
    </DetailLayout>
  );
}

// ===== Summary row =====
function SummaryRow({ icon, label, value, total }: { icon: React.ReactNode; label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-[12px] text-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden sm:block h-1.5 w-20 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
        </div>
        <span className="tabular text-[12px] font-medium text-foreground">{value}/{total}</span>
      </div>
    </div>
  );
}

// ===== Finding card =====
function FindingCard({ finding }: { finding: CheckFinding }) {
  const sev = findingSeverityBadge(finding.severity);
  const variant = finding.status === "Open" ? "outline" : finding.status === "Acknowledged" ? "muted" : "muted";
  return (
    <div className="rounded-[6px] border border-border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="tabular text-[12px] text-muted-foreground">{finding.id}</span>
          <StatusBadge variant={sev.variant} pulse={sev.pulse}>{finding.severity}</StatusBadge>
        </div>
        <StatusBadge variant={variant}>{finding.status}</StatusBadge>
      </div>
      <div className="px-4 py-3 flex flex-col gap-2">
        <p className="text-[13px] text-foreground">{finding.description}</p>
        {finding.location && (
          <p className="text-[11px] text-muted-foreground">
            <span className="text-[10px] uppercase tracking-wider">Location · </span>{finding.location}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground tabular">
          <span className="flex items-center gap-1"><User className="h-3 w-3" />{finding.raisedBy}</span>
          <span>{formatDate(finding.raisedOn)}</span>
          {finding.correctiveActionId && (
            <span className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 tabular">
              CAP: {finding.correctiveActionId}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Control point row =====
function ControlPointRow({ cp }: { cp: ControlPoint }) {
  const meta = checkResultBadge(cp.result);
  const variant = meta.variant === "solid" ? "border-foreground bg-foreground/[0.04]" : "border-border bg-background";
  return (
    <tr className={cn("text-[12px]", variant)}>
      <td className="px-4 py-3 text-foreground">
        <div className="flex items-center gap-2">
          <Target className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="font-medium">{cp.name}</span>
        </div>
        {cp.notes && (
          <div className="ml-5 mt-1 text-[11px] text-muted-foreground">{cp.notes}</div>
        )}
      </td>
      <td className="px-4 py-3 tabular text-muted-foreground whitespace-nowrap">{cp.target}</td>
      <td className="px-4 py-3 tabular text-foreground font-medium whitespace-nowrap">
        {cp.actual} <span className="text-muted-foreground font-normal">{cp.unit}</span>
      </td>
      <td className="px-4 py-3 text-muted-foreground text-[11px]">{cp.method}</td>
      <td className="px-4 py-3">
        <StatusBadge variant={meta.variant} pulse={meta.pulse}>{cp.result}</StatusBadge>
      </td>
    </tr>
  );
}

// ===== Corrective action card =====
function CAPCard({ ca }: { ca: CorrectiveAction }) {
  const meta = caStatusBadge(ca.status);
  const isOverdue = ca.status === "Overdue" || (ca.status !== "Completed" && new Date(ca.dueDate).getTime() < Date.now());
  return (
    <div className="rounded-[6px] border border-border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="tabular text-[12px] text-muted-foreground">{ca.id}</span>
          <StatusBadge variant="muted">{ca.priority}</StatusBadge>
        </div>
        <StatusBadge variant={meta.variant} pulse={meta.pulse}>{ca.status}</StatusBadge>
      </div>
      <div className="px-4 py-3 flex flex-col gap-2">
        <p className="text-[13px] font-medium text-foreground">{ca.title}</p>
        <p className="text-[12px] text-muted-foreground">{ca.description}</p>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground tabular">
          <span className="flex items-center gap-1"><User className="h-3 w-3" />{ca.owner}</span>
          <span className={cn(isOverdue && "text-foreground font-medium")}>
            <span className="text-[10px] uppercase tracking-wider">Due · </span>{formatDate(ca.dueDate)}
          </span>
          {ca.linkedFindingId && (
            <span className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 tabular">
              Finding: {ca.linkedFindingId}
            </span>
          )}
          {ca.completedOn && (
            <span className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 tabular">
              Completed: {formatDate(ca.completedOn)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Local AlertCircle import fallback (used in Overview notes callout)

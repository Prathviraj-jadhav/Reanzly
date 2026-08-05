"use client";

import { useState } from "react";
import { DetailLayout, InfoRow, InfoSection, StatCard } from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import {
  APPROVAL_REQUESTS,
  type ApprovalRequest,
  type ApproverStep,
  type ApproverState,
  type ApprovalStatus,
} from "./_helpers";
import {
  Check,
  X,
  Forward,
  Clock,
  User,
  Building2,
  FileText,
  History,
  ArrowRight,
  GitBranch,
  Ban,
  CornerDownRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatDate,
  formatDateTime,
  relativeTime,
  formatINR,
  typeBadge,
  statusBadge,
  approverStateBadge,
} from "./_helpers";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "approvers", label: "Approvers" },
  { id: "decision", label: "Decision" },
  { id: "history", label: "History" },
];

interface ApprovalDetailProps {
  requestId: string;
}

export function ApprovalDetail({ requestId }: ApprovalDetailProps) {
  const { navigate } = useAppStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [comment, setComment] = useState("");
  const [decision, setDecision] = useState<"approve" | "reject" | "delegate" | "">("");
  const [delegateTo, setDelegateTo] = useState("");
  const [record, setRecord] = useState<ApprovalRequest | undefined>(
    () => APPROVAL_REQUESTS.find((r) => r.id === requestId || r.requestId === requestId),
  );

  const req = record;

  if (!req) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Request <span className="tabular">{requestId}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => navigate("approvals")}>Back to Approvals</Btn>
      </div>
    );
  }

  const handleDecision = () => {
    if (!decision) {
      toast("Select a decision", { description: "Choose approve / reject / delegate" });
      return;
    }
    if (decision === "delegate" && !delegateTo.trim()) {
      toast("Delegation target required", { description: "Pick an approver to delegate to" });
      return;
    }
    const newStatus: ApprovalStatus =
      decision === "approve" ? "Approved" : decision === "reject" ? "Rejected" : "Delegated";
    const now = new Date().toISOString();
    const action =
      decision === "approve" ? "Approved" : decision === "reject" ? "Rejected" : "Delegated";
    setRecord((prev) => {
      if (!prev) return prev;
      // Mark the current pending step with the decision
      const approvers = prev.approvers.map((a) =>
        a.name === prev.currentApprover && a.state === "Pending"
          ? {
              ...a,
              state: (decision === "approve"
                ? "Approved"
                : decision === "reject"
                  ? "Rejected"
                  : "Delegated") as ApproverState,
              decisionAt: now,
              comment: comment.trim() || undefined,
              delegatedTo: decision === "delegate" ? delegateTo.trim() : undefined,
            }
          : a,
      );
      // If approved, find next pending step
      let newCurrent = prev.currentApprover;
      if (decision === "approve") {
        const next = approvers.find((a) => a.state === "Pending" && !a.delegatedTo);
        if (next) {
          newCurrent = next.name;
        }
        // all approved → status falls through to the computed status below
      } else if (decision === "reject") {
        // skip remaining pending steps
        approvers.forEach((a) => {
          if (a.state === "Pending") a.state = "Skipped";
        });
      } else if (decision === "delegate") {
        // Add the delegated approver as a new pending step if not present
        const exists = approvers.find((a) => a.name === delegateTo.trim());
        if (!exists) {
          approvers.push({
            id: `a-${Date.now()}`,
            name: delegateTo.trim(),
            role: "Delegated approver",
            order: approvers.length + 1,
            state: "Pending",
          });
        }
        newCurrent = delegateTo.trim();
      }
      return {
        ...prev,
        approvers,
        currentApprover: newCurrent,
        status:
          decision === "approve"
            ? approvers.some((a) => a.state === "Pending")
              ? "Pending"
              : "Approved"
            : newStatus,
        decidedAt:
          decision === "reject" || (decision === "approve" && !approvers.some((a) => a.state === "Pending"))
            ? now
            : prev.decidedAt,
        history: [
          ...prev.history,
          {
            id: `h-${Date.now()}`,
            actor: "You",
            action,
            detail:
              decision === "delegate"
                ? `Delegated to ${delegateTo.trim()}${comment.trim() ? " · " + comment.trim() : ""}`
                : `${comment.trim() ? comment.trim() : "No comment"}`,
            ts: now,
          },
        ],
      };
    });
    toast.success(`Request ${action.toLowerCase()}`, {
      description: `${req.requestId} · ${comment.trim() || "no comment"}`,
    });
    setComment("");
    setDecision("");
    setDelegateTo("");
  };

  const handleWithdraw = () => {
    const now = new Date().toISOString();
    setRecord((prev) =>
      prev
        ? {
            ...prev,
            status: "Withdrawn",
            decidedAt: now,
            history: [
              ...prev.history,
              {
                id: `h-${Date.now()}`,
                actor: prev.requester,
                action: "Withdrew request",
                detail: "Request withdrawn by requester",
                ts: now,
              },
            ],
          }
        : prev,
    );
    toast.success(`Request withdrawn`, { description: req.requestId });
  };

  const typeMeta = typeBadge(req.type);
  const statusMeta = statusBadge(req.status);
  const canDecide = req.status === "Pending" || req.status === "Delegated";

  const actions = (
    <>
      <Btn icon={<Ban className="h-3.5 w-3.5" />} onClick={handleWithdraw} disabled={!canDecide && req.status !== "Pending"}>
        <span className="hidden sm:inline">Withdraw</span>
      </Btn>
      <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={() => { setDecision("approve"); setActiveTab("decision"); }} disabled={!canDecide}>
        <span className="hidden sm:inline">Decide</span>
      </Btn>
    </>
  );

  const quickActions = [
    { label: "Approve", onClick: () => { setDecision("approve"); setActiveTab("decision"); } },
    { label: "Reject", onClick: () => { setDecision("reject"); setActiveTab("decision"); } },
    { label: "Delegate", onClick: () => { setDecision("delegate"); setActiveTab("decision"); } },
    { label: "View approver chain", onClick: () => setActiveTab("approvers") },
    { label: "View history", onClick: () => setActiveTab("history") },
  ];

  return (
    <DetailLayout
      title={req.requestId}
      subtitle={req.title}
      badges={
        <>
          <StatusBadge variant={typeMeta.variant}>{req.type}</StatusBadge>
          <StatusBadge variant={statusMeta.variant} pulse={statusMeta.pulse}>{req.status}</StatusBadge>
        </>
      }
      meta={
        <>
          <span className="flex items-center gap-1"><User className="h-3 w-3" />{req.requester}</span>
          <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{req.department}</span>
          {req.amount > 0 && <span className="tabular">{formatINR(req.amount)}</span>}
          <span className="tabular">{formatDate(req.submittedAt)}</span>
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
            <StatCard label="Type" value={req.type} icon={<FileText className="h-3.5 w-3.5" />} />
            <StatCard label="Status" value={req.status} icon={<Clock className="h-3.5 w-3.5" />} />
            <StatCard label="Amount" value={req.amount > 0 ? formatINR(req.amount) : "—"} icon={<FileText className="h-3.5 w-3.5" />} />
            <StatCard label="Chain mode" value={req.chainMode} icon={<GitBranch className="h-3.5 w-3.5" />} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InfoSection title="Request Details">
              <InfoRow label="Request ID" value={<span className="tabular">{req.requestId}</span>} mono />
              <InfoRow label="Title" value={req.title} />
              <InfoRow label="Type" value={<StatusBadge variant={typeBadge(req.type).variant}>{req.type}</StatusBadge>} />
              <InfoRow label="Status" value={<StatusBadge variant={statusBadge(req.status).variant}>{req.status}</StatusBadge>} />
              <InfoRow label="Priority" value={req.priority} />
              <InfoRow label="Chain mode" value={req.chainMode} />
              <InfoRow label="Amount" value={req.amount > 0 ? <span className="tabular">{formatINR(req.amount)}</span> : "—"} mono />
              <InfoRow label="Requester" value={req.requester} />
              <InfoRow label="Department" value={req.department} />
              <InfoRow label="Submitted" value={<span className="tabular">{formatDateTime(req.submittedAt)}</span>} mono />
              {req.decidedAt && (
                <InfoRow label="Decided" value={<span className="tabular">{formatDateTime(req.decidedAt)}</span>} mono />
              )}
              {req.relatedRef && (
                <InfoRow label="Related ref" value={<span className="tabular">{req.relatedRef}</span>} mono />
              )}
            </InfoSection>

            <InfoSection title="Description & Payload">
              <div className="px-4 py-3 flex flex-col gap-3">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Description</div>
                  <p className="text-[13px] text-foreground leading-relaxed">{req.description}</p>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Structured payload</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {Object.entries(req.payload).map(([k, v]) => (
                      <div key={k} className="flex items-baseline justify-between gap-2 border-b border-border/40 py-1">
                        <span className="text-[11px] text-muted-foreground">{k}</span>
                        <span className="text-[12px] text-foreground tabular text-right">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </InfoSection>
          </div>
        </div>
      )}

      {/* ===== Approvers ===== */}
      {activeTab === "approvers" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Approval Chain</span>
              </div>
              <StatusBadge variant="outline">{req.chainMode}</StatusBadge>
            </div>
            <div className="p-4">
              {req.chainMode === "Sequential" ? (
                <SequentialChain approvers={req.approvers} currentApprover={req.currentApprover} />
              ) : (
                <ParallelChain approvers={req.approvers} currentApprover={req.currentApprover} />
              )}
            </div>
          </div>

          <div className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-2.5">
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Approver Details</h3>
            </div>
            <div className="divide-y divide-border">
              {req.approvers.map((a) => (
                <ApproverRow key={a.id} step={a} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== Decision ===== */}
      {activeTab === "decision" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Decision</span>
              </div>
              <StatusBadge variant={canDecide ? "outline" : "muted"}>
                {canDecide ? "awaiting your decision" : req.status}
              </StatusBadge>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Action</div>
                <div className="flex flex-wrap gap-2">
                  <DecisionOption
                    active={decision === "approve"}
                    disabled={!canDecide}
                    onClick={() => setDecision("approve")}
                    icon={<Check className="h-3.5 w-3.5" />}
                    label="Approve"
                  />
                  <DecisionOption
                    active={decision === "reject"}
                    disabled={!canDecide}
                    onClick={() => setDecision("reject")}
                    icon={<X className="h-3.5 w-3.5" />}
                    label="Reject"
                  />
                  <DecisionOption
                    active={decision === "delegate"}
                    disabled={!canDecide}
                    onClick={() => setDecision("delegate")}
                    icon={<Forward className="h-3.5 w-3.5" />}
                    label="Delegate"
                  />
                </div>
              </div>

              {decision === "delegate" && (
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Delegate to</div>
                  <Select value={delegateTo} onValueChange={setDelegateTo}>
                    <SelectTrigger className="h-8 w-full max-w-sm rounded-[5px] text-[13px]">
                      <SelectValue placeholder="Pick an approver" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin">
                      <SelectItem value="Meera Iyer">Meera Iyer · Finance Controller</SelectItem>
                      <SelectItem value="Rajeev Menon">Rajeev Menon · CFO</SelectItem>
                      <SelectItem value="Sanjay Gupta">Sanjay Gupta · CEO</SelectItem>
                      <SelectItem value="Vikram Deshmukh">Vikram Deshmukh · Ops Manager</SelectItem>
                      <SelectItem value="Karan Bhatia">Karan Bhatia · Procurement Head</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Comment</div>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment for the audit trail…"
                  className="min-h-[80px] rounded-[5px] text-[13px] bg-background"
                />
              </div>

              <div className="flex items-center justify-between border-t border-border pt-3">
                <p className="text-[11px] text-muted-foreground">
                  Decision will be recorded in the audit trail with your name and timestamp.
                </p>
                <Btn
                  variant="primary"
                  icon={<Check className="h-3.5 w-3.5" />}
                  onClick={handleDecision}
                  disabled={!canDecide || !decision}
                >
                  Submit decision
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== History ===== */}
      {activeTab === "history" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-[6px] border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5">
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Audit Trail</h3>
            </div>
            <div className="px-4 py-3">
              <div className="relative">
                {req.history.map((evt, i) => (
                  <div key={evt.id} className="flex items-start gap-3 pb-5 last:pb-0 relative">
                    {i < req.history.length - 1 && (
                      <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
                    )}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card z-10">
                      <History className="h-3.5 w-3.5 text-foreground" />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-[13px] font-medium text-foreground">{evt.action}</p>
                        <span className="text-[11px] text-muted-foreground tabular shrink-0">{relativeTime(evt.ts)}</span>
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        <span className="font-medium text-foreground/80">{evt.actor}</span> · {evt.detail}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 tabular mt-0.5">{formatDateTime(evt.ts)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </DetailLayout>
  );
}

// ===== Approver chain visualisations =====

function SequentialChain({
  approvers,
  currentApprover,
}: {
  approvers: ApproverStep[];
  currentApprover: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {approvers.map((a, i) => {
        const m = approverStateBadge(a.state);
        const isCurrent = a.name === currentApprover && a.state === "Pending";
        return (
          <div key={a.id} className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-2 rounded-[5px] border px-3 py-2 transition-colors",
                a.state === "Approved" && "border-foreground/40 bg-muted/40",
                a.state === "Rejected" && "border-border bg-muted/20 opacity-70",
                a.state === "Pending" && isCurrent && "border-foreground bg-foreground/5",
                a.state === "Pending" && !isCurrent && "border-border",
                a.state === "Delegated" && "border-dashed border-border",
                a.state === "Skipped" && "border-border bg-muted/10 opacity-50",
              )}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] font-medium tabular">
                {a.order}
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] font-medium text-foreground">{a.name}</span>
                <span className="text-[10px] text-muted-foreground">{a.role}</span>
              </div>
              <StatusBadge variant={m.variant} pulse={m.pulse}>{a.state}</StatusBadge>
            </div>
            {i < approvers.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
        );
      })}
    </div>
  );
}

function ParallelChain({
  approvers,
  currentApprover,
}: {
  approvers: ApproverStep[];
  currentApprover: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <GitBranch className="h-3 w-3" />
        All approvers receive the request simultaneously. Any rejection rejects the request; all must approve.
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {approvers.map((a) => {
          const m = approverStateBadge(a.state);
          const isCurrent = a.name === currentApprover && a.state === "Pending";
          return (
            <div
              key={a.id}
              className={cn(
                "flex items-start gap-2 rounded-[5px] border px-3 py-2 transition-colors",
                a.state === "Approved" && "border-foreground/40 bg-muted/40",
                a.state === "Pending" && isCurrent && "border-foreground bg-foreground/5",
                a.state === "Pending" && !isCurrent && "border-border",
              )}
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium tabular">
                {a.order}
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[12px] font-medium text-foreground truncate">{a.name}</span>
                <span className="text-[10px] text-muted-foreground truncate">{a.role}</span>
                <StatusBadge variant={m.variant} pulse={m.pulse}>{a.state}</StatusBadge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ApproverRow({ step }: { step: ApproverStep }) {
  const m = approverStateBadge(step.state);
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium tabular">
        {step.order}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-medium text-foreground">{step.name}</span>
            <span className="text-[11px] text-muted-foreground">{step.role}</span>
          </div>
          <StatusBadge variant={m.variant} pulse={m.pulse}>{step.state}</StatusBadge>
        </div>
        {step.delegatedTo && (
          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <CornerDownRight className="h-3 w-3" />
            Delegated to <span className="text-foreground font-medium">{step.delegatedTo}</span>
          </div>
        )}
        {step.comment && (
          <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{step.comment}</p>
        )}
        {step.decisionAt && (
          <p className="text-[10px] text-muted-foreground/70 tabular mt-0.5">{formatDateTime(step.decisionAt)}</p>
        )}
      </div>
    </div>
  );
}

function DecisionOption({
  active,
  disabled,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-9 items-center gap-2 rounded-[5px] border px-3 text-[13px] font-medium transition-colors tap",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-foreground hover:bg-accent",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

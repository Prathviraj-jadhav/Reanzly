"use client";

/* ============================================================
   SLMApprovalsTab - Tab 3.
   All approvals (pending + decided) sorted by requestedAt desc.
   Pending rows show Approve / Deny + optional note input.
   Decided rows show decision badge + decidedBy + decidedAt.
   ============================================================ */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useSuperadminStore } from "./_store";
import { formatDateTime, relativeTime } from "./_helpers";
import type { AgentRun, ApprovalRequest } from "@/lib/slm/types";
import { toolById } from "@/lib/slm/tools";
import { StatusBadge } from "@/components/shared/status-badge";
import { Btn } from "@/components/shared/btn";
import { Input } from "@/components/ui/input";
import {
  ShieldAlert, CheckCircle2, Clock, Wrench, ChevronRight, User,
} from "lucide-react";
import {
  SectionHeader, EmptyPanel,
  approvalStatusVariant, impactChipVariant,
} from "./slm-helpers";

// Status label map (the types file doesn't expose one for ApprovalStatus).
const APPROVAL_LABEL: Record<ApprovalRequest["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  denied: "Denied",
  expired: "Expired",
};

interface Props {
  readOnly: boolean;
  onOpenRun: (r: AgentRun) => void;
}

export function SLMApprovalsTab({ readOnly, onOpenRun }: Props) {
  const pendingApprovals = useSuperadminStore((s) => s.pendingApprovals);
  const agentRuns = useSuperadminStore((s) => s.agentRuns);
  const agents = useSuperadminStore((s) => s.agents);
  const decideApproval = useSuperadminStore((s) => s.decideApproval);

  // Local note draft keyed by approval id.
  const [notes, setNotes] = useState<Record<string, string>>({});

  const sorted = useMemo(
    () => [...pendingApprovals].sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
    ),
    [pendingApprovals],
  );
  const pendingCount = useMemo(
    () => sorted.filter((a) => a.status === "pending").length,
    [sorted],
  );

  function agentName(id: string): string {
    return agents.find((a) => a.id === id)?.name ?? id;
  }
  function handleDecision(req: ApprovalRequest, decision: "approved" | "denied") {
    if (readOnly) return;
    const note = notes[req.id]?.trim();
    decideApproval(req.id, decision, note || undefined);
    toast.success(`Approval ${decision}`, {
      description: `${req.toolName} ${decision}${note ? ` - ${note}` : ""}`,
    });
    setNotes((prev) => {
      if (!note) return prev;
      const next = { ...prev };
      delete next[req.id];
      return next;
    });
  }
  function openRunForApproval(req: ApprovalRequest) {
    const r = agentRuns.find((x) => x.id === req.runId);
    if (r) onOpenRun(r);
    else toast.error("Run not found", { description: `Run ${req.runId} may have aged out.` });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Summary header */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-border bg-card px-4 py-2.5">
        <SectionHeader
          icon={<ShieldAlert className="h-3.5 w-3.5" />}
          title="Approval queue"
          subtitle={`${pendingCount} pending · ${sorted.length} total`}
        />
        {readOnly && (
          <span className="rounded-[3px] border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Read-only view
          </span>
        )}
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <EmptyPanel
          icon={<CheckCircle2 className="h-4 w-4" />}
          title="No approval requests"
          description="When an agent encounters a high-impact tool, its request will appear here for review."
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((req) => {
            const tool = toolById(req.toolId);
            const isPending = req.status === "pending";
            return (
              <div
                key={req.id}
                className="rounded-[6px] border border-border bg-card p-3"
              >
                {/* Top row: agent + tool + impact + status */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12.5px] font-medium text-foreground">
                    {agentName(req.agentId)}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="inline-flex items-center gap-1 rounded-[3px] border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                    <Wrench className="h-3 w-3" />
                    {req.toolName}
                  </span>
                  <StatusBadge variant={impactChipVariant(req.impact)}>
                    {req.impact}
                  </StatusBadge>
                  <StatusBadge
                    variant={approvalStatusVariant(req.status)}
                    pulse={isPending}
                  >
                    {APPROVAL_LABEL[req.status]}
                  </StatusBadge>
                  <button
                    onClick={() => openRunForApproval(req)}
                    className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground tap"
                  >
                    Open run
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>

                {/* Reason */}
                <p className="mt-2 text-[12px] leading-relaxed text-foreground">
                  {req.reason}
                </p>

                {/* Args preview */}
                <pre className="mt-2 overflow-x-auto rounded-[5px] border border-border bg-background px-2.5 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {JSON.stringify(req.args, null, 2)}
                </pre>

                {/* Footer row */}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                  <div className="flex flex-wrap items-center gap-3 text-[10.5px] text-muted-foreground tabular">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Requested {relativeTime(req.requestedAt)}
                    </span>
                    {req.decidedAt && (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Decided {formatDateTime(req.decidedAt)}
                      </span>
                    )}
                    {req.decidedBy && (
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {req.decidedBy}
                      </span>
                    )}
                    {tool && (
                      <span>{tool.module} module</span>
                    )}
                  </div>

                  {/* Action area */}
                  {isPending && !readOnly ? (
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                      <Input
                        value={notes[req.id] ?? ""}
                        onChange={(e) =>
                          setNotes((p) => ({ ...p, [req.id]: e.target.value }))
                        }
                        placeholder="Optional note..."
                        className="h-7 w-full rounded-[5px] border-border bg-background px-2 text-[12px] sm:w-56"
                      />
                      <div className="flex items-center gap-1.5">
                        <Btn
                          variant="primary"
                          size="sm"
                          onClick={() => handleDecision(req, "approved")}
                        >
                          Approve
                        </Btn>
                        <Btn
                          variant="outline"
                          size="sm"
                          onClick={() => handleDecision(req, "denied")}
                        >
                          Deny
                        </Btn>
                      </div>
                    </div>
                  ) : isPending && readOnly ? (
                    <span className="text-[10px] text-muted-foreground">
                      Read-only - cannot decide
                    </span>
                  ) : req.decisionNote ? (
                    <span className="rounded-[3px] border border-border bg-muted/30 px-2 py-0.5 text-[10.5px] text-muted-foreground">
                      Note: {req.decisionNote}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SLMApprovalsTab;

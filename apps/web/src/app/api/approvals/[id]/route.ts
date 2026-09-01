import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { toDTO } from "../route";

// Accepts both the real cuid `id` and the display `requestId` (APR-####),
// since the module's own links/search use either interchangeably.
async function findApproval(companyId: string, idOrRequestId: string) {
  return db.approvalRequest.findFirst({
    where: { companyId, OR: [{ id: idOrRequestId }, { requestId: idOrRequestId }] },
  });
}

type ApproverState = "Pending" | "Approved" | "Rejected" | "Delegated" | "Skipped";

interface ApproverStep {
  id: string;
  name: string;
  role: string;
  order: number;
  state: ApproverState;
  decisionAt?: string;
  comment?: string;
  delegatedTo?: string;
}

interface ApprovalHistoryEntry {
  id: string;
  actor: string;
  action: string;
  detail: string;
  ts: string;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "approvals");
  if (denied) return denied;
  const { id } = await params;

  const request = await findApproval(sessionUser.companyId, id);
  if (!request) return NextResponse.json({ error: "Approval request not found." }, { status: 404 });
  return NextResponse.json({ request: toDTO(request) });
}

// Single generic PATCH covering the four decisions the detail view can take
// on a request - approve / reject / delegate / withdraw - mirroring the
// advancement rules the module previously computed only in client state
// (approval-detail.tsx's handleDecision/handleWithdraw), now applied
// server-side so the decision actually persists.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "approvals");
  if (denied) return denied;
  const { id } = await params;

  const existing = await findApproval(sessionUser.companyId, id);
  if (!existing) return NextResponse.json({ error: "Approval request not found." }, { status: 404 });

  const body = await req.json();
  const action = String(body.action || "");
  if (!["approve", "reject", "delegate", "withdraw"].includes(action)) {
    return NextResponse.json({ error: "action must be one of approve, reject, delegate, withdraw." }, { status: 400 });
  }
  if (existing.status !== "Pending" && existing.status !== "Delegated") {
    return NextResponse.json({ error: `Cannot act on a request that is already ${existing.status}.` }, { status: 400 });
  }

  const now = new Date();
  const comment = body.comment ? String(body.comment).trim() || undefined : undefined;
  const approvers: ApproverStep[] = JSON.parse(existing.approversJson || "[]");
  const history: ApprovalHistoryEntry[] = JSON.parse(existing.historyJson || "[]");
  const data: Record<string, unknown> = {};
  let historyEntry: ApprovalHistoryEntry;

  if (action === "withdraw") {
    data.status = "Withdrawn";
    data.decidedAt = now;
    historyEntry = {
      id: `h-${now.getTime()}`,
      actor: sessionUser.name,
      action: "Withdrew request",
      detail: comment || "Request withdrawn",
      ts: now.toISOString(),
    };
  } else {
    // approve / reject / delegate all act on the current pending step, i.e.
    // the step whose approver name matches currentApprover and is Pending -
    // same lookup the client used before this decision was ever persisted.
    const stepIdx = approvers.findIndex((a) => a.name === existing.currentApprover && a.state === "Pending");
    if (stepIdx === -1) {
      return NextResponse.json({ error: "No pending step found for the current approver." }, { status: 400 });
    }

    if (action === "approve") {
      approvers[stepIdx] = { ...approvers[stepIdx], state: "Approved", decisionAt: now.toISOString(), comment };
      const next = approvers.find((a) => a.state === "Pending" && !a.delegatedTo);
      const stillPending = approvers.some((a) => a.state === "Pending");
      data.currentApprover = next ? next.name : existing.currentApprover;
      data.status = stillPending ? "Pending" : "Approved";
      if (!stillPending) data.decidedAt = now;
      historyEntry = {
        id: `h-${now.getTime()}`,
        actor: sessionUser.name,
        action: "Approved",
        detail: comment || "No comment",
        ts: now.toISOString(),
      };
    } else if (action === "reject") {
      approvers[stepIdx] = { ...approvers[stepIdx], state: "Rejected", decisionAt: now.toISOString(), comment };
      for (let i = 0; i < approvers.length; i++) {
        if (approvers[i].state === "Pending") approvers[i] = { ...approvers[i], state: "Skipped" };
      }
      data.status = "Rejected";
      data.decidedAt = now;
      historyEntry = {
        id: `h-${now.getTime()}`,
        actor: sessionUser.name,
        action: "Rejected",
        detail: comment || "No comment",
        ts: now.toISOString(),
      };
    } else {
      // delegate
      const delegateTo = String(body.delegateTo || "").trim();
      if (!delegateTo) {
        return NextResponse.json({ error: "delegateTo is required to delegate." }, { status: 400 });
      }
      approvers[stepIdx] = { ...approvers[stepIdx], state: "Delegated", decisionAt: now.toISOString(), comment, delegatedTo: delegateTo };
      const alreadyExists = approvers.some((a) => a.name === delegateTo);
      if (!alreadyExists) {
        approvers.push({
          id: `a-${now.getTime()}`,
          name: delegateTo,
          role: "Delegated approver",
          order: approvers.length + 1,
          state: "Pending",
        });
      }
      data.currentApprover = delegateTo;
      data.status = "Delegated";
      historyEntry = {
        id: `h-${now.getTime()}`,
        actor: sessionUser.name,
        action: "Delegated",
        detail: `Delegated to ${delegateTo}${comment ? " · " + comment : ""}`,
        ts: now.toISOString(),
      };
    }
    data.approversJson = JSON.stringify(approvers);
  }

  data.historyJson = JSON.stringify([...history, historyEntry]);

  const updated = await db.approvalRequest.update({ where: { id: existing.id }, data });

  await logAudit({
    sessionUser,
    action: action === "approve" ? "APPROVE" : action === "reject" ? "REJECT" : "STATUS_CHANGE",
    entity: "ApprovalRequest",
    entityId: updated.requestId,
    description: `${updated.requestId} ${historyEntry.action.toLowerCase()}: ${existing.status} → ${updated.status}`,
  });

  return NextResponse.json({ request: toDTO(updated) });
}

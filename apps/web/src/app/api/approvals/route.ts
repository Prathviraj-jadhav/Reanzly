import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

// Real CRUD for the tenant-facing Approvals module (configurable
// sequential/parallel approval chains with delegation), replacing the
// module's entirely client-only APPROVAL_REQUESTS mock array. This is
// deliberately a separate model from superadmin's `pendingApprovals` (an
// unrelated internal-staff/platform-action concept - see
// src/components/modules/superadmin/_store.ts). approvers/history/payload
// are stored as JSON text columns, same convention as HelpdeskTicket's
// sla/messages/activity.

type Row = Awaited<ReturnType<typeof db.approvalRequest.findFirstOrThrow>>;

export function toDTO(a: Row) {
  return {
    id: a.id,
    requestId: a.requestId,
    type: a.type,
    title: a.title,
    description: a.description,
    requester: a.requester,
    requesterEmail: a.requesterEmail,
    department: a.department,
    amount: a.amount,
    currency: a.currency,
    currentApprover: a.currentApprover,
    status: a.status,
    submittedAt: a.submittedAt.toISOString(),
    decidedAt: a.decidedAt ? a.decidedAt.toISOString() : undefined,
    priority: a.priority,
    chainMode: a.chainMode,
    approvers: JSON.parse(a.approversJson || "[]"),
    history: JSON.parse(a.historyJson || "[]"),
    relatedRef: a.relatedRef ?? undefined,
    payload: JSON.parse(a.payloadJson || "{}"),
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "approvals");
  if (denied) return denied;

  const requests = await db.approvalRequest.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { submittedAt: "desc" },
  });
  return NextResponse.json({ requests: requests.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "approvals");
  if (denied) return denied;

  const body = await req.json();
  const title = String(body.title || "").trim();
  const requester = String(body.requester || "").trim();
  const department = String(body.department || "").trim();
  const description = String(body.description || "").trim();
  if (!title || !requester || !department || !description) {
    return NextResponse.json({ error: "title, requester, department, and description are required." }, { status: 400 });
  }

  const count = await db.approvalRequest.count({ where: { companyId: sessionUser.companyId } });
  const requestId = `APR-${String(1001 + count)}`;
  const now = new Date();

  const approvers: Array<{ name: string; order: number }> = Array.isArray(body.approvers) ? body.approvers : [];
  const firstApprover = approvers.length > 0
    ? approvers.reduce((min, a) => (a.order < min.order ? a : min), approvers[0]).name
    : undefined;

  const created = await db.approvalRequest.create({
    data: {
      companyId: sessionUser.companyId,
      requestId,
      type: body.type || "Expense",
      title,
      description,
      requester,
      requesterEmail: body.requesterEmail || "-",
      department,
      amount: Number.isFinite(body.amount) ? Number(body.amount) : 0,
      currency: body.currency || "INR",
      currentApprover: body.currentApprover || firstApprover || requester,
      status: "Pending",
      priority: body.priority || "Medium",
      chainMode: body.chainMode || "Sequential",
      relatedRef: body.relatedRef || null,
      payloadJson: JSON.stringify(body.payload ?? {}),
      approversJson: JSON.stringify(approvers),
      historyJson: JSON.stringify(
        Array.isArray(body.history) && body.history.length > 0
          ? body.history
          : [{ id: `h-${now.getTime()}`, actor: requester, action: "Submitted request", detail: description.slice(0, 80), ts: now.toISOString() }],
      ),
    },
  });

  await logAudit({
    sessionUser,
    action: "CREATE",
    entity: "ApprovalRequest",
    entityId: created.requestId,
    description: `Submitted approval request: ${created.title} (${created.type})`,
  });

  return NextResponse.json({ request: toDTO(created) }, { status: 201 });
}

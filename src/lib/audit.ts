import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

// Real, append-only audit trail backed by the `AuditLog` Prisma model - the
// model already existed in the schema but had zero consumers before this;
// every "Recent Activity" / "Audit Trail" widget in the app was inventing
// its own fake actor identities client-side instead. This is the one real
// write path every module's mutation routes should call through so those
// widgets show who actually did what, using the real signed-in user.

type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT" | "STATUS_CHANGE" | "LOGIN" | "LOGOUT" | "EXPORT";

export async function logAudit(params: {
  sessionUser: SessionUser;
  action: AuditAction;
  entity: string;
  entityId?: string;
  description: string;
}): Promise<void> {
  const { sessionUser, action, entity, entityId, description } = params;
  await db.auditLog.create({
    data: {
      companyId: sessionUser.companyId,
      actorId: sessionUser.id,
      action,
      entity,
      entityId: entityId ?? null,
      newValue: description,
    },
  });
}

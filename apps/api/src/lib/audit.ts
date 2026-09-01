import type { PrismaClient } from "@reanzly/database";
import type { AuthContext } from "@reanzly/auth";

type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "APPROVE"
  | "REJECT"
  | "STATUS_CHANGE"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT";

export async function logAudit(
  db: PrismaClient,
  params: {
    auth: AuthContext;
    action: AuditAction;
    entity: string;
    entityId?: string;
    description: string;
  },
): Promise<void> {
  const { auth, action, entity, entityId, description } = params;
  await db.auditLog.create({
    data: {
      companyId: auth.companyId,
      actorId: auth.id,
      action,
      entity,
      entityId: entityId ?? null,
      newValue: description,
    },
  });
}

import { db } from "@/lib/db";

// Platform-level audit trail for the Superadmin portal - cross-tenant,
// no companyId. Call this from any Superadmin route as its underlying
// action becomes real (mirrors src/lib/audit.ts's role for the tenant
// App Portal). See SuperadminAuditLog in schema.prisma for why this is a
// separate model from the tenant AuditLog.
export async function logSuperadminAudit(params: {
  actor: string;
  action: string;
  target: string;
  module: string;
  ip?: string;
}): Promise<void> {
  await db.superadminAuditLog.create({
    data: {
      actor: params.actor,
      action: params.action,
      target: params.target,
      module: params.module,
      ip: params.ip ?? null,
    },
  });
}

// Seeds a realistic AuditLog backlog (the model existed but had zero
// consumers before this session's HR/Compliance/Settings rewiring) using
// only real Users as actors and real Employee/LeaveRequest/PayrollRun/
// HrPosition rows as entities - replacing HR's old hardcoded RECENT_ACTIVITY
// mock array, which used fake emails ("hr@reanzly.in") that didn't match
// any real seeded account.
//
// Also backfills any CRM Lead/Deal rows whose ownerId still holds one of
// the old invented CRM_OWNERS names (Rohan Kapoor, Sneha Iyer, etc.) - those
// names were live-editable picklist defaults, so real rows created before
// today's fix could already have them stored.
//
// Idempotent: skips the AuditLog seed if this company already has rows;
// the CRM backfill re-runs safely (a no-op once no old names remain).
// Run with: bun run src/scripts/seed-audit-log.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000 - Math.random() * 3_600_000);
}
function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

const OLD_TO_NEW_OWNER: Record<string, string> = {
  "Rohan Kapoor": "Rohit Sharma",
  "Sneha Iyer": "Anil Reddy",
  "Amit Saxena": "Naresh Patel",
  "Priya Menon": "Reena Mehta",
  "Karthik Reddy": "Faisal Ahmed",
  "Divya Nair": "Vikram Deshmukh",
};

async function backfillCrmOwners() {
  let fixed = 0;
  for (const [oldName, newName] of Object.entries(OLD_TO_NEW_OWNER)) {
    const leadRes = await db.lead.updateMany({ where: { companyId: COMPANY_ID, ownerId: oldName }, data: { ownerId: newName } });
    const dealRes = await db.deal.updateMany({ where: { companyId: COMPANY_ID, ownerId: oldName }, data: { ownerId: newName } });
    fixed += leadRes.count + dealRes.count;
  }
  console.log(`[seed-audit-log] backfilled ${fixed} CRM Lead/Deal rows off invented owner names.`);
}

async function main() {
  console.log("[seed-audit-log] starting...");

  await backfillCrmOwners();

  const existing = await db.auditLog.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-audit-log] already seeded (${existing} entries found) - skipping backlog seed.`);
    return;
  }

  const employees = await db.employee.findMany({ where: { companyId: COMPANY_ID }, take: 10, orderBy: { createdAt: "desc" } });
  const leaveRequests = await db.leaveRequest.findMany({ where: { companyId: COMPANY_ID }, take: 6, include: { employee: true } });
  const positions = await db.hrPosition.findMany({ where: { companyId: COMPANY_ID }, take: 3 });
  const payrollRuns = await db.payrollRun.findMany({ where: { companyId: COMPANY_ID }, take: 2, orderBy: { month: "desc" } });

  if (employees.length === 0) {
    console.log("[seed-audit-log] no Employee rows found - run seed-hr-full.ts first. Skipping.");
    return;
  }

  const HR_ACTOR = "hr-manager"; // Sunita Rao
  const OWNER_ACTOR = "owner"; // Vikram Deshmukh

  const entries: { actorId: string; action: string; entity: string; entityId: string; description: string; timestamp: Date }[] = [];

  employees.slice(0, 5).forEach((e, i) => {
    entries.push({
      actorId: HR_ACTOR, action: "CREATE", entity: "Employee", entityId: e.code,
      description: `Added new employee record: ${e.name} (${e.designation})`,
      timestamp: daysAgo(2 + i * 3),
    });
  });

  leaveRequests.forEach((r, i) => {
    const approved = i % 3 !== 0;
    entries.push({
      actorId: HR_ACTOR,
      action: approved ? "APPROVE" : "REJECT",
      entity: "LeaveRequest",
      entityId: r.id,
      description: `${approved ? "Approved" : "Rejected"} ${r.type} leave for ${r.employee.name} (${r.days}d)`,
      timestamp: daysAgo(1 + i),
    });
  });

  positions.forEach((p, i) => {
    entries.push({
      actorId: OWNER_ACTOR, action: "CREATE", entity: "Position", entityId: p.positionId,
      description: `Opened new position: ${p.title} (${p.openings} opening${p.openings === 1 ? "" : "s"})`,
      timestamp: daysAgo(10 + i * 5),
    });
  });

  payrollRuns.forEach((r, i) => {
    entries.push({
      actorId: HR_ACTOR, action: "APPROVE", entity: "PayrollRun", entityId: r.id,
      description: `Approved payroll run for ${r.month}`,
      timestamp: daysAgo(4 + i * 30),
    });
    if (r.paidAt) {
      entries.push({
        actorId: HR_ACTOR, action: "STATUS_CHANGE", entity: "PayrollRun", entityId: r.id,
        description: `Disbursed payroll run for ${r.month}`,
        timestamp: daysAgo(3 + i * 30),
      });
    }
  });

  // A few settings/system-flavored entries so the log doesn't read as
  // HR-only, using real actors doing plausible non-HR admin actions.
  const systemActors = ["owner", "fleet-manager", "safety-officer"];
  const systemEntries = [
    { action: "UPDATE", entity: "Role", entityId: "fleet-manager", description: "Updated role permissions for Fleet Manager" },
    { action: "LOGIN", entity: "Session", entityId: "", description: "Signed in" },
    { action: "CREATE", entity: "ApiKey", entityId: "Finance Export", description: "Created API key: Finance Export (read-only)" },
  ];
  systemEntries.forEach((se, i) => {
    entries.push({ ...se, actorId: pick(systemActors, i), timestamp: daysAgo(5 + i * 2) });
  });

  for (const e of entries) {
    await db.auditLog.create({
      data: {
        companyId: COMPANY_ID,
        actorId: e.actorId,
        action: e.action,
        entity: e.entity,
        entityId: e.entityId || null,
        newValue: e.description,
        timestamp: e.timestamp,
      },
    });
  }

  console.log(`[seed-audit-log] seeded ${entries.length} real audit log entries.`);
}

main()
  .catch((e) => {
    console.error("[seed-audit-log] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

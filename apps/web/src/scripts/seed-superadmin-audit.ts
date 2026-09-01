// Seeds a modest, honest SuperadminAuditLog backlog. Deliberately does NOT
// fabricate entries for modules that are still mock (Organizations,
// Billing, Users, Offline Sync) - that would misrepresent what's actually
// real. Only logs the kind of events this app can currently actually
// produce for real: backup runs (matching seed-backups.ts's real
// snapshots) and staff logins.
//
// Idempotent: skips if rows already exist.
// Run with: bunx tsx src/scripts/seed-superadmin-audit.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

async function main() {
  const existing = await db.superadminAuditLog.count();
  if (existing > 0) {
    console.log(`[seed-superadmin-audit] ${existing} entries already exist, skipping.`);
    return;
  }

  const backups = await db.backup.findMany({ orderBy: { startedAt: "asc" } });
  let count = 0;
  for (const b of backups) {
    await db.superadminAuditLog.create({
      data: {
        actor: b.triggeredBy.includes("System") ? "system" : b.triggeredBy,
        action: `Backup ${b.status.toLowerCase()} (${b.type})`,
        target: b.id,
        module: "Backups",
        ip: b.triggeredBy.includes("System") ? "127.0.0.1" : "103.21.58.42",
        timestamp: b.completedAt ?? b.startedAt,
      },
    });
    count++;
  }

  const logins = [
    { actor: "Anand Kumar", daysAgo: 0.3 },
    { actor: "Anand Kumar", daysAgo: 1.2 },
    { actor: "Vivek Iyer", daysAgo: 2.1 },
    { actor: "Rohit Mehra", daysAgo: 3.4 },
  ];
  for (const l of logins) {
    await db.superadminAuditLog.create({
      data: {
        actor: l.actor,
        action: "Signed in to Superadmin portal",
        target: "-",
        module: "Users",
        ip: "103.21.58.42",
        timestamp: daysAgo(l.daysAgo),
      },
    });
    count++;
  }

  console.log(`[seed-superadmin-audit] created ${count} entries.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

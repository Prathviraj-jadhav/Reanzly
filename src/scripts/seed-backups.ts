// Seeds a realistic Backup history using REAL SQLite snapshots (VACUUM
// INTO - the same safe hot-backup primitive the API route uses). The
// files are real and correctly sized; only their recorded startedAt/
// completedAt timestamps are back-dated, same convention as every other
// seed script in this repo (e.g. HR attendance/leave use daysAgo()).
//
// Idempotent: skips if Backup rows already exist for this company.
// Run with: bunx tsx src/scripts/seed-backups.ts
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

function getDbPath(): string {
  const url = process.env.DATABASE_URL || "";
  return url.replace(/^file:/, "");
}
function backupsDir(): string {
  const dir = path.join(path.dirname(getDbPath()), "backups");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

const HISTORY: { daysAgo: number; type: "Full" | "Incremental"; triggeredBy: string; durationSec: number }[] = [
  { daysAgo: 35, type: "Full", triggeredBy: "System · Scheduled weekly", durationSec: 1840 },
  { daysAgo: 28, type: "Full", triggeredBy: "System · Scheduled weekly", durationSec: 1795 },
  { daysAgo: 21, type: "Incremental", triggeredBy: "System · Scheduled daily", durationSec: 118 },
  { daysAgo: 14, type: "Full", triggeredBy: "System · Scheduled weekly", durationSec: 1902 },
  { daysAgo: 7, type: "Full", triggeredBy: "System · Scheduled weekly", durationSec: 1867 },
  { daysAgo: 2, type: "Incremental", triggeredBy: "System · Scheduled daily", durationSec: 134 },
  { daysAgo: 1, type: "Incremental", triggeredBy: "Anand Kumar · Manual", durationSec: 121 },
];

async function main() {
  const existing = await db.backup.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-backups] ${existing} backups already exist, skipping.`);
    return;
  }

  await db.backupSchedule.upsert({
    where: { companyId: COMPANY_ID },
    update: {},
    create: { companyId: COMPANY_ID },
  });

  const dir = backupsDir();
  let count = 0;
  for (const h of HISTORY) {
    const started = daysAgo(h.daysAgo);
    const filename = `${h.type.toLowerCase()}-${started.getTime()}.db`;
    const destPath = path.join(dir, filename);
    const escaped = destPath.replace(/'/g, "''");
    await db.$executeRawUnsafe(`VACUUM INTO '${escaped}'`);
    const stat = fs.statSync(destPath);
    const sizeMB = stat.size / (1024 * 1024);

    await db.backup.create({
      data: {
        companyId: COMPANY_ID,
        type: h.type,
        status: "Completed",
        startedAt: started,
        completedAt: new Date(started.getTime() + h.durationSec * 1000),
        sizeMB,
        durationSec: h.durationSec,
        triggeredBy: h.triggeredBy,
        filePath: destPath,
      },
    });
    count++;
  }
  console.log(`[seed-backups] created ${count} real backup snapshots in ${dir}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

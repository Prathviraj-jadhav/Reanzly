import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { db } from "@/lib/db";
import { logSuperadminAudit } from "@/lib/superadmin-audit";
import { COMPANY_ID, backupsDir } from "./_lib";
import { requireSuperadmin } from "@/lib/permissions";

function toDTO(b: {
  id: string; type: string; status: string; startedAt: Date; completedAt: Date | null;
  sizeMB: number; durationSec: number; triggeredBy: string; restoredAt: Date | null;
}) {
  return {
    id: b.id,
    type: b.type,
    status: b.status,
    startedAt: b.startedAt.toISOString(),
    completedAt: b.completedAt ? b.completedAt.toISOString() : undefined,
    sizeMB: b.sizeMB,
    durationSec: b.durationSec,
    triggeredBy: b.triggeredBy,
    restoredAt: b.restoredAt ? b.restoredAt.toISOString() : undefined,
  };
}

export async function GET() {
  const auth = await requireSuperadmin();
  if (auth instanceof NextResponse) return auth;
  const backups = await db.backup.findMany({
    where: { companyId: COMPANY_ID },
    orderBy: { startedAt: "desc" },
  });
  return NextResponse.json({ backups: backups.map(toDTO) });
}

// Runs a real SQLite hot backup via `VACUUM INTO` - safe under concurrent
// reads/writes (unlike copying the .db file directly, which can grab a
// torn snapshot mid-write). Both "Full" and "Incremental" produce the same
// real full snapshot: SQLite has no built-in differential-backup primitive
// to make a genuine incremental real without a lot of extra infrastructure,
// so the type is preserved as a labeling choice rather than faked.
export async function POST(req: NextRequest) {
  const auth = await requireSuperadmin();
  if (auth instanceof NextResponse) return auth;
  const body = await req.json().catch(() => ({}));
  const type = body.type === "Incremental" ? "Incremental" : "Full";
  const triggeredBy = auth.name;

  const already = await db.backup.findFirst({ where: { companyId: COMPANY_ID, status: "Running" } });
  if (already) {
    return NextResponse.json({ error: "A backup is already running." }, { status: 409 });
  }

  const started = new Date();
  const running = await db.backup.create({
    data: { companyId: COMPANY_ID, type, status: "Running", startedAt: started, triggeredBy },
  });

  try {
    const dir = backupsDir();
    const filename = `${type.toLowerCase()}-${started.getTime()}.db`;
    const destPath = path.join(dir, filename);
    const escaped = destPath.replace(/'/g, "''");
    await db.$executeRawUnsafe(`VACUUM INTO '${escaped}'`);

    const stat = fs.statSync(destPath);
    const sizeMB = stat.size / (1024 * 1024);
    const durationSec = Math.max(1, Math.round((Date.now() - started.getTime()) / 1000));

    const completed = await db.backup.update({
      where: { id: running.id },
      data: { status: "Completed", completedAt: new Date(), sizeMB, durationSec, filePath: destPath },
    });
    await logSuperadminAudit({
      actor: triggeredBy,
      action: "backup.run",
      target: completed.id,
      module: "Backups",
    });
    return NextResponse.json({ backup: toDTO(completed) }, { status: 201 });
  } catch (err) {
    await db.backup.update({
      where: { id: running.id },
      data: { status: "Failed", completedAt: new Date(), durationSec: Math.round((Date.now() - started.getTime()) / 1000) },
    });
    await logSuperadminAudit({
      actor: triggeredBy,
      action: "backup.failed",
      target: running.id,
      module: "Backups",
    });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Backup failed." }, { status: 500 });
  }
}

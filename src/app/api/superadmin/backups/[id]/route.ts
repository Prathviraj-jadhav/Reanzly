import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import { db } from "@/lib/db";
import { logSuperadminAudit } from "@/lib/superadmin-audit";
import { COMPANY_ID } from "../_lib";
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

// "Restore" verifies the real snapshot file is present and readable on
// disk and marks it Restored - it deliberately does NOT swap the live
// database file. Overwriting the DB Prisma is actively connected to while
// the app is running is unsafe (Windows file-locking, in-flight
// transactions) and would need the server stopped to do correctly; that's
// an operator action, not something a running API request should trigger.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperadmin();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const existing = await db.backup.findFirst({ where: { id, companyId: COMPANY_ID } });
  if (!existing) return NextResponse.json({ error: "Backup not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (body.action !== "restore") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }
  if (existing.status !== "Completed" && existing.status !== "Restored") {
    return NextResponse.json({ error: `Cannot restore a backup that is ${existing.status.toLowerCase()}.` }, { status: 400 });
  }
  if (!existing.filePath || !fs.existsSync(existing.filePath)) {
    return NextResponse.json({ error: "Snapshot file is missing on disk." }, { status: 409 });
  }

  const updated = await db.backup.update({
    where: { id },
    data: { status: "Restored", restoredAt: new Date() },
  });
  await logSuperadminAudit({
    actor: auth.name,
    action: "backup.restore",
    target: updated.id,
    module: "Backups",
  });
  return NextResponse.json({ backup: toDTO(updated) });
}

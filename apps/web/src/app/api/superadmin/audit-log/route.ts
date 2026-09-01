import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperadmin } from "@/lib/permissions";

function toDTO(a: {
  id: string; actor: string; action: string; target: string; module: string;
  ip: string | null; timestamp: Date;
}) {
  return {
    id: a.id,
    actor: a.actor,
    action: a.action,
    target: a.target,
    timestamp: a.timestamp.toISOString(),
    ip: a.ip ?? "",
    module: a.module,
  };
}

export async function GET() {
  const auth = await requireSuperadmin();
  if (auth instanceof NextResponse) return auth;
  const entries = await db.superadminAuditLog.findMany({
    orderBy: { timestamp: "desc" },
    take: 1000,
  });
  return NextResponse.json({ auditLog: entries.map(toDTO) });
}

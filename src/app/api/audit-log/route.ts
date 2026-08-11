import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Real audit trail read endpoint - backs every "Recent Activity"/"Audit
// Trail" widget in the app (HR, Compliance, Settings) off the single real
// AuditLog table instead of each module inventing its own fake actor data.
// Optional ?entity=Employee&entity=LeaveRequest (repeatable) narrows the
// feed to the entities a given widget cares about; ?limit caps rows.

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entities = searchParams.getAll("entity");
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);

  const rows = await db.auditLog.findMany({
    where: {
      companyId: sessionUser.companyId,
      ...(entities.length > 0 ? { entity: { in: entities } } : {}),
    },
    include: { actor: { select: { name: true, email: true, role: true } } },
    orderBy: { timestamp: "desc" },
    take: limit,
  });

  return NextResponse.json({
    entries: rows.map((r) => ({
      id: r.id,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      description: r.newValue ?? "",
      actorName: r.actor?.name ?? "System",
      actorEmail: r.actor?.email ?? "",
      actorRole: r.actor?.role ?? "",
      timestamp: r.timestamp.toISOString(),
    })),
  });
}

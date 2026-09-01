import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { toRunLogDTO } from "@/lib/automation-engine";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "automation");
  if (denied) return denied;

  const logs = await db.automationRunLog.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ logs: logs.map(toRunLogDTO) });
}

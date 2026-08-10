import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { toAutomationDTO, toRunLogDTO, runAutomationOnce } from "@/lib/automation-engine";

// "Run Now" - runs the exact same real engine (src/lib/automation-engine.ts)
// that a scheduled/recurring run uses, so a manual run and a scheduled run
// always do identical real work: a targeted query against real data, real
// action execution (Create Task / Create Work Order / Trigger Rean
// Analysis), and a real AutomationRunLog row.

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "automation");
  if (denied) return denied;
  const { id } = await params;

  const automation = await db.automation.findFirst({ where: { id, companyId: sessionUser.companyId } });
  if (!automation) return NextResponse.json({ error: "Automation not found." }, { status: 404 });

  const result = await runAutomationOnce(id);
  if (!result) return NextResponse.json({ error: "Automation not found." }, { status: 404 });

  return NextResponse.json({
    automation: toAutomationDTO(result.automation),
    log: toRunLogDTO(result.log),
    tasksCreated: result.tasksCreated,
    workOrdersCreated: result.workOrdersCreated,
  });
}

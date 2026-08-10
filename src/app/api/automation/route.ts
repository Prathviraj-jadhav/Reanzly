import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { toAutomationDTO } from "./_lib";

// Real CRUD for the Automation module. The `Automation` Prisma model already
// existed but had zero consumers anywhere in src/ - no companyId, no API
// routes - the UI read entirely from mock-data.ts's AUTOMATIONS array
// instead. This wires it up for real.

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "automation");
  if (denied) return denied;

  const automations = await db.automation.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ automations: automations.map(toAutomationDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "automation");
  if (denied) return denied;

  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "name is required." }, { status: 400 });
  if (!Array.isArray(body.actions) || body.actions.length === 0) {
    return NextResponse.json({ error: "At least one action is required." }, { status: 400 });
  }

  try {
    const created = await db.automation.create({
      data: {
        companyId: sessionUser.companyId,
        name,
        description: body.description || null,
        trigger: body.trigger || "",
        triggerCategory: body.triggerCategory || "Trip",
        conditions: JSON.stringify(body.conditions ?? []),
        actions: JSON.stringify(body.actions ?? []),
        status: body.activate === false ? "Paused" : "Active",
        createdBy: sessionUser.name,
      },
    });
    return NextResponse.json({ automation: toAutomationDTO(created) }, { status: 201 });
  } catch (e) {
    console.error("POST /api/automation error:", e);
    return NextResponse.json({ error: "Could not create automation." }, { status: 500 });
  }
}

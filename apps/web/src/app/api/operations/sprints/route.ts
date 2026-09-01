import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { toSprintDTO } from "../_lib";

// Real CRUD for Operations Hub sprints, replacing the 4 hardcoded entries in
// operations-hub/_helpers.ts's SPRINTS array (no DB backing existed at all).

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "operations-hub");
  if (denied) return denied;

  const sprints = await db.sprint.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { startDate: "asc" },
  });
  return NextResponse.json({ sprints: sprints.map(toSprintDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "operations-hub");
  if (denied) return denied;

  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "name is required." }, { status: 400 });

  const startDate = body.startDate ? new Date(body.startDate) : new Date();
  const endDate = body.endDate ? new Date(body.endDate) : new Date(Date.now() + 14 * 86_400_000);

  try {
    const created = await db.sprint.create({
      data: {
        companyId: sessionUser.companyId,
        name,
        goal: body.goal || null,
        startDate,
        endDate,
        status: body.status || "Planned",
      },
    });
    return NextResponse.json({ sprint: toSprintDTO(created) }, { status: 201 });
  } catch (e) {
    console.error("POST /api/operations/sprints error:", e);
    return NextResponse.json({ error: "Could not create sprint." }, { status: 500 });
  }
}

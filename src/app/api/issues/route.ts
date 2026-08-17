import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

function toDTO(i: {
  id: string; issueId: string; title: string; severity: string; status: string;
  reportedBy: string | null; assignee: string | null; source: string; description: string | null;
  createdAt: Date; resolvedAt: Date | null; vehicle: { name: string } | null;
}) {
  return {
    id: i.id,
    issueId: i.issueId,
    title: i.title,
    severity: i.severity,
    vehicle: i.vehicle?.name ?? undefined,
    reporter: i.reportedBy ?? "Unknown",
    assignee: i.assignee ?? "Unassigned",
    status: i.status,
    createdDate: i.createdAt.toISOString(),
    resolutionDate: i.resolvedAt ? i.resolvedAt.toISOString() : undefined,
    source: i.source,
    description: i.description ?? "",
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "issues");
  if (denied) return denied;
  const issues = await db.issue.findMany({
    where: { companyId: sessionUser.companyId },
    include: { vehicle: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ issues: issues.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "issues");
  if (denied) return denied;

  const body = await req.json();
  const title = String(body.title || "").trim();
  if (!title) return NextResponse.json({ error: "title is required." }, { status: 400 });

  const vehicleName = String(body.vehicle || "").trim();
  const matchedVehicle = vehicleName
    ? await db.vehicle.findFirst({ where: { companyId: sessionUser.companyId, name: vehicleName } })
    : null;

  const issueId = body.issueId?.trim() || `ISS-${Date.now()}`;

  try {
    const created = await db.issue.create({
      data: {
        companyId: sessionUser.companyId,
        issueId,
        vehicleId: matchedVehicle?.id ?? null,
        category: body.category || "Breakdown",
        severity: body.severity || "Medium",
        title,
        description: body.description || null,
        status: body.status || "Open",
        reportedBy: sessionUser.name,
        assignee: body.assignee || null,
        source: body.source || "Manual",
      },
      include: { vehicle: { select: { name: true } } },
    });
    return NextResponse.json({ issue: toDTO(created) }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "An issue with that ID already exists." }, { status: 409 });
    }
    console.error("POST /api/issues error:", e);
    return NextResponse.json({ error: "Could not create issue." }, { status: 500 });
  }
}

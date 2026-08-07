import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

// Real CRUD for the Quality module (previously had no Prisma model at all -
// quality/_helpers.tsx's QUALITY_CHECKS was purely generated mock data,
// disconnected even from the module's own lifted "checks" state once a new
// check was created). Nested collections (findings/controlPoints/
// correctiveActions/activity) are JSON-stringified columns - see the
// QualityCheck model comment in schema.prisma.

function toCheckDTO(c: {
  id: string; checkId: string; type: string; reference: string; referenceEntity: string | null;
  referenceModule: string | null; inspector: string; date: Date; result: string; status: string;
  score: number; location: string | null; findingsJson: string | null; controlPointsJson: string | null;
  correctiveActionsJson: string | null; activityJson: string | null; notes: string | null;
}) {
  return {
    id: c.id,
    checkId: c.checkId,
    type: c.type,
    reference: c.reference,
    referenceEntity: c.referenceEntity ?? undefined,
    referenceModule: c.referenceModule ?? undefined,
    inspector: c.inspector,
    date: c.date.toISOString(),
    result: c.result,
    status: c.status,
    score: c.score,
    location: c.location ?? "",
    findings: JSON.parse(c.findingsJson || "[]"),
    controlPoints: JSON.parse(c.controlPointsJson || "[]"),
    correctiveActions: JSON.parse(c.correctiveActionsJson || "[]"),
    activity: JSON.parse(c.activityJson || "[]"),
    notes: c.notes ?? undefined,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const checks = await db.qualityCheck.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ checks: checks.map(toCheckDTO) });
}

async function nextCheckId(companyId: string) {
  const existing = await db.qualityCheck.findMany({ where: { companyId }, select: { checkId: true } });
  const max = existing
    .map((x) => parseInt(x.checkId.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n))
    .reduce((a, b) => Math.max(a, b), 7099);
  return `QC-${String(max + 1).padStart(5, "0")}`;
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "quality");
  if (denied) return denied;

  const body = await req.json();
  const reference = String(body.reference || "").trim();
  if (!reference) {
    return NextResponse.json({ error: "reference is required." }, { status: 400 });
  }

  const checkId = await nextCheckId(sessionUser.companyId);
  const now = new Date().toISOString();

  try {
    const created = await db.qualityCheck.create({
      data: {
        companyId: sessionUser.companyId,
        checkId,
        type: body.type || "Vehicle",
        reference,
        referenceEntity: body.referenceEntity || null,
        referenceModule: body.referenceModule || null,
        inspector: String(body.inspector || sessionUser.name),
        date: body.date ? new Date(body.date) : new Date(),
        result: body.result || "Conditional",
        status: body.status || "Scheduled",
        score: Number.isFinite(body.score) ? body.score : 0,
        location: body.location || null,
        findingsJson: "[]",
        controlPointsJson: "[]",
        correctiveActionsJson: "[]",
        activityJson: JSON.stringify([
          {
            id: `act-${Date.now()}`,
            ts: now,
            actor: body.inspector || sessionUser.name,
            action: "Check scheduled",
            detail: `${body.type || "Vehicle"} check ${checkId} scheduled`,
          },
        ]),
        notes: body.notes || null,
      },
    });
    return NextResponse.json({ check: toCheckDTO(created) }, { status: 201 });
  } catch (e) {
    console.error("POST /api/quality-checks error:", e);
    return NextResponse.json({ error: "Could not create quality check." }, { status: 500 });
  }
}

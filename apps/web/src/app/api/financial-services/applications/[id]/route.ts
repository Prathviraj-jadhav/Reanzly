import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { toFinancingApplicationDTO, isResolvedStatus } from "@/lib/financial-services-engine";

const WITHDRAWABLE = new Set(["draft", "submitted", "under_review"]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "financial-services");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.financingApplication.findFirst({ where: { id, companyId: sessionUser.companyId } });
  if (!existing) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.action === "withdraw") {
    if (!WITHDRAWABLE.has(existing.status)) {
      return NextResponse.json({ error: "Only draft, submitted, or under-review applications can be withdrawn." }, { status: 400 });
    }
    data.status = "rejected";
    data.notes = "Withdrawn by applicant.";
    data.resolvedAt = new Date();
  } else if (body.status !== undefined) {
    data.status = body.status;
    data.resolvedAt = isResolvedStatus(body.status) ? new Date() : null;
  }
  if (body.notes !== undefined && body.action !== "withdraw") data.notes = body.notes || null;

  try {
    const updated = await db.financingApplication.update({ where: { id }, data });
    return NextResponse.json({ application: toFinancingApplicationDTO(updated) });
  } catch (e) {
    console.error("PATCH /api/financial-services/applications/[id] error:", e);
    return NextResponse.json({ error: "Could not update application." }, { status: 500 });
  }
}

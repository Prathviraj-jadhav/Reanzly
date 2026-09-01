import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { toCustomReportDTO } from "./_lib";

// Real CRUD for custom reports. Previously a static hardcoded array
// (CUSTOM_REPORTS in _helpers.tsx) - "Save Custom" from a generated
// report was just a toast, it never actually added anything to that list.

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "reports");
  if (denied) return denied;

  const reports = await db.customReport.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ reports: reports.map(toCustomReportDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "reports");
  if (denied) return denied;

  const body = await req.json();
  const name = String(body.name || "").trim();
  const baseReportId = String(body.baseReportId || "");
  if (!name || !baseReportId) return NextResponse.json({ error: "name and baseReportId are required." }, { status: 400 });

  try {
    const created = await db.customReport.create({
      data: {
        companyId: sessionUser.companyId,
        name,
        baseReportId,
        category: body.category || "Custom",
        description: body.description || null,
        filters: body.filters ? JSON.stringify(body.filters) : null,
        createdBy: sessionUser.name,
      },
    });
    return NextResponse.json({ report: toCustomReportDTO(created) }, { status: 201 });
  } catch (e) {
    console.error("POST /api/reports/custom error:", e);
    return NextResponse.json({ error: "Could not save custom report." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { generateReportData, type ReportFilters } from "@/lib/reports-engine";
import { toCustomReportDTO } from "../../_lib";

// "Run Now" - re-generates the underlying report for real using this
// custom report's saved filters, and increments the real run count.

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "reports");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.customReport.findFirst({ where: { id, companyId: sessionUser.companyId } });
  if (!existing) return NextResponse.json({ error: "Custom report not found." }, { status: 404 });

  let filters: ReportFilters = { datePreset: "30d" };
  try {
    if (existing.filters) filters = { datePreset: "30d", ...JSON.parse(existing.filters) };
  } catch { /* ignore, fall back to default */ }

  const data = await generateReportData(sessionUser.companyId, existing.baseReportId, filters);

  const updated = await db.customReport.update({
    where: { id },
    data: { lastRun: new Date(), runCount: { increment: 1 } },
  });

  return NextResponse.json({ report: toCustomReportDTO(updated), data });
}

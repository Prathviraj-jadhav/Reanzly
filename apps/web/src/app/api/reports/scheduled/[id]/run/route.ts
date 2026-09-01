import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { generateReportData } from "@/lib/reports-engine";
import { toScheduledReportDTO, computeNextRun } from "../../_lib";

// "Run Now" - really regenerates the report's data (the same real
// aggregation the Report Library tab uses) and advances lastRun/nextRun.
// Does not send an email (no mail integration in this app).

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "reports");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.scheduledReport.findFirst({ where: { id, companyId: sessionUser.companyId } });
  if (!existing) return NextResponse.json({ error: "Schedule not found." }, { status: 404 });

  const data = await generateReportData(sessionUser.companyId, existing.reportId, { datePreset: "30d" });

  const updated = await db.scheduledReport.update({
    where: { id },
    data: { lastRun: new Date(), nextRun: computeNextRun(existing.frequency, existing.deliveryTime) },
  });

  return NextResponse.json({ schedule: toScheduledReportDTO(updated), rowCount: data.rows.length });
}

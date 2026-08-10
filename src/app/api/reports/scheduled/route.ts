import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { toScheduledReportDTO, computeNextRun } from "./_lib";

// Real CRUD for scheduled reports. Previously pure client-side state
// (scheduledList in index.tsx) seeded once from mock-data.ts's
// SCHEDULED_REPORTS array and lost on every page refresh.
//
// "Delivery" is honestly scoped to persistence + on-demand regeneration
// (Run Now) - actually emailing the output on a cadence would need a real
// mail integration this app doesn't build (third-party API keys are
// off-limits), so recipients/format are stored for real but nothing is
// actually sent automatically yet.

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "reports");
  if (denied) return denied;

  const schedules = await db.scheduledReport.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ schedules: schedules.map(toScheduledReportDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "reports");
  if (denied) return denied;

  const body = await req.json();
  const reportId = String(body.reportId || "");
  const reportName = String(body.reportName || "");
  if (!reportId || !reportName) return NextResponse.json({ error: "reportId and reportName are required." }, { status: 400 });
  const frequency = body.frequency || "Daily";
  const deliveryTime = body.deliveryTime || "08:00";
  const recipients = String(body.recipients || "").split(",").map((s: string) => s.trim()).filter(Boolean);

  try {
    const created = await db.scheduledReport.create({
      data: {
        companyId: sessionUser.companyId,
        reportId,
        reportName,
        category: body.category || "Operations",
        frequency,
        deliveryTime,
        recipients: JSON.stringify(recipients),
        format: body.format || "PDF",
        status: "Active",
        nextRun: computeNextRun(frequency, deliveryTime),
        createdBy: sessionUser.name,
      },
    });
    return NextResponse.json({ schedule: toScheduledReportDTO(created) }, { status: 201 });
  } catch (e) {
    console.error("POST /api/reports/scheduled error:", e);
    return NextResponse.json({ error: "Could not create schedule." }, { status: 500 });
  }
}

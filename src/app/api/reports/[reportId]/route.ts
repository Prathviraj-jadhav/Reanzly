import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { generateReportData, type ReportFilters } from "@/lib/reports-engine";

// Real report data generation, replacing generated-report.tsx's client-side
// switch over mock-data.ts arrays.

export async function GET(req: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "reports");
  if (denied) return denied;
  const { reportId } = await params;

  const { searchParams } = new URL(req.url);
  const filters: ReportFilters = {
    datePreset: (searchParams.get("datePreset") as ReportFilters["datePreset"]) || "30d",
    customStart: searchParams.get("customStart") || undefined,
    customEnd: searchParams.get("customEnd") || undefined,
    vehicleGroup: searchParams.get("vehicleGroup") || undefined,
    vehicleType: searchParams.get("vehicleType") || undefined,
  };

  const data = await generateReportData(sessionUser.companyId, reportId, filters);
  return NextResponse.json(data);
}

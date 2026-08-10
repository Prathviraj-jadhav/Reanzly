import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { computeEligibility } from "@/lib/financial-services-engine";

// Real eligibility math (Invoice Discounting credit line, Working Capital
// sizing, Fuel Card limit, avg processing time) - previously computed
// client-side from mock-data.ts's INVOICES/VEHICLES arrays.

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "financial-services");
  if (denied) return denied;

  const data = await computeEligibility(sessionUser.companyId);
  return NextResponse.json(data);
}

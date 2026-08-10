import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { toFinancingApplicationDTO, nextApplicationNumber } from "@/lib/financial-services-engine";

// Real CRUD for financing applications. Previously a Zustand store
// persisted to browser localStorage - not shared across users/devices,
// not scoped to a company, lost if localStorage was ever cleared.

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "financial-services");
  if (denied) return denied;

  const applications = await db.financingApplication.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ applications: applications.map(toFinancingApplicationDTO) });
}

const VALID_PRODUCTS = new Set(["Invoice Discounting", "Working Capital Loan", "Fuel Card Credit Line"]);

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "financial-services");
  if (denied) return denied;

  const body = await req.json();
  const productType = String(body.productType || "");
  if (!VALID_PRODUCTS.has(productType)) return NextResponse.json({ error: "Invalid productType." }, { status: 400 });
  const requestedAmount = Number(body.requestedAmount);
  if (!requestedAmount || requestedAmount <= 0) return NextResponse.json({ error: "requestedAmount must be greater than zero." }, { status: 400 });
  const tenureMonths = Number(body.tenureMonths);
  if (!tenureMonths || tenureMonths <= 0) return NextResponse.json({ error: "tenureMonths must be greater than zero." }, { status: 400 });
  const linkedInvoiceIds = Array.isArray(body.linkedInvoiceIds) ? body.linkedInvoiceIds.map(String) : [];
  if (productType === "Invoice Discounting" && linkedInvoiceIds.length === 0) {
    return NextResponse.json({ error: "Select at least one invoice to finance against." }, { status: 400 });
  }

  try {
    const applicationNumber = await nextApplicationNumber(sessionUser.companyId);
    const created = await db.financingApplication.create({
      data: {
        companyId: sessionUser.companyId,
        applicationNumber,
        productType,
        linkedInvoiceIds: JSON.stringify(linkedInvoiceIds),
        requestedAmount,
        tenureMonths,
        status: "submitted",
        notes: body.notes || null,
        createdBy: sessionUser.name,
      },
    });
    return NextResponse.json({ application: toFinancingApplicationDTO(created) }, { status: 201 });
  } catch (e) {
    console.error("POST /api/financial-services/applications error:", e);
    return NextResponse.json({ error: "Could not submit application." }, { status: 500 });
  }
}

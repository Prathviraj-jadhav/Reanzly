import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getPortalCustomer, requirePortalCustomer } from "@/lib/vendor-portal";

// GET/PATCH /api/vendor-portal/profile
// Real Customer row for this portal session, replacing the hardcoded
// VENDOR_PROFILE mock. Only the self-service contact fields (contactPerson/
// designation/email/phone) are writable from the portal - GSTIN, credit
// limit, payment terms, and account manager stay admin-managed, matching
// vendor-profile.tsx's existing "locked vs editable" split.
function toDTO(c: {
  id: string; companyName: string; legalEntity: string | null; gstin: string | null;
  billingAddress: string | null; city: string | null; state: string | null; pincode: string | null;
  contactPerson: string | null; designation: string | null; email: string | null; phone: string | null;
  paymentTerms: string | null; creditLimit: number; outstandingBalance: number;
  onboardingDate: Date | null; accountManager: string | null; pan: string | null;
}) {
  return {
    vendorId: c.id,
    companyName: c.companyName,
    legalEntity: c.legalEntity ?? "",
    gstin: c.gstin ?? "",
    registeredAddress: c.billingAddress ?? "",
    city: c.city ?? "",
    state: c.state ?? "",
    pincode: c.pincode ?? "",
    contactPerson: c.contactPerson ?? "",
    designation: c.designation ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    paymentTerms: c.paymentTerms ?? "",
    creditLimitINR: c.creditLimit,
    outstandingBalanceINR: c.outstandingBalance,
    onboardingDate: c.onboardingDate ? c.onboardingDate.toISOString() : "",
    accountManager: c.accountManager ?? "",
    pan: c.pan ?? "",
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const customer = await getPortalCustomer(sessionUser);
  const denied = requirePortalCustomer(customer);
  if (denied) return denied;
  return NextResponse.json({ profile: toDTO(customer!) });
}

const EDITABLE_FIELDS = ["contactPerson", "designation", "email", "phone"] as const;

export async function PATCH(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const customer = await getPortalCustomer(sessionUser);
  const denied = requirePortalCustomer(customer);
  if (denied) return denied;

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = String(body[field] || "").trim() || null;
  }

  const updated = await db.customer.update({ where: { id: customer!.id }, data });
  return NextResponse.json({ profile: toDTO(updated) });
}

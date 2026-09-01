import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

// Real CRUD for the Vendors module, replacing pure client-side state
// seeded from src/lib/mock-data.ts's VENDORS array.

function toVendorDTO(v: {
  id: string; companyName: string; contactPerson: string | null; phone: string | null;
  gstin: string | null; city: string | null; type: string | null; status: string;
  email: string | null; paymentTerms: string | null; rating: number;
}) {
  return {
    id: v.id,
    companyName: v.companyName,
    contactPerson: v.contactPerson ?? "",
    phone: v.phone ?? "",
    gstin: v.gstin ?? "",
    city: v.city ?? "",
    type: v.type ?? "Maintenance Workshop",
    status: v.status,
    email: v.email ?? "",
    paymentTerms: v.paymentTerms ?? "",
    rating: v.rating,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "vendors");
  if (denied) return denied;
  const vendors = await db.vendor.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ vendors: vendors.map(toVendorDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "vendors");
  if (denied) return denied;

  const body = await req.json();
  const companyName = String(body.companyName || "").trim();
  if (!companyName) {
    return NextResponse.json({ error: "companyName is required." }, { status: 400 });
  }

  const created = await db.vendor.create({
    data: {
      companyId: sessionUser.companyId,
      companyName,
      contactPerson: body.contactPerson || null,
      phone: body.phone || null,
      email: body.email || null,
      gstin: body.gstin || null,
      city: body.city || null,
      type: body.type || null,
      status: body.status || "Active",
      paymentTerms: body.paymentTerms || null,
      rating: Number.isFinite(body.rating) ? body.rating : 0,
    },
  });
  return NextResponse.json({ vendor: toVendorDTO(created) }, { status: 201 });
}

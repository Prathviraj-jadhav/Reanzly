import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const EDITABLE_FIELDS = [
  "companyName", "contactPerson", "phone", "email", "gstin", "city",
  "type", "status", "paymentTerms", "rating",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;

  const existing = await db.vendor.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = body[field];
  }

  const updated = await db.vendor.update({ where: { id }, data });
  return NextResponse.json({
    vendor: {
      id: updated.id,
      companyName: updated.companyName,
      contactPerson: updated.contactPerson ?? "",
      phone: updated.phone ?? "",
      gstin: updated.gstin ?? "",
      city: updated.city ?? "",
      type: updated.type ?? "Maintenance Workshop",
      status: updated.status,
      email: updated.email ?? "",
      paymentTerms: updated.paymentTerms ?? "",
      rating: updated.rating,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;

  const existing = await db.vendor.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
  }

  await db.vendor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

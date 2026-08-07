import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const FIELD_MAP: Record<string, string> = {
  name: "name",
  email: "email",
  contact: "phone",
  city: "city",
  role: "role",
  department: "department",
  status: "status",
  licenseNumber: "licenseNumber",
  assignedVehicle: "assignedVehicle",
  rating: "rating",
  tripsCompleted: "tripsCompleted",
  onTimeRate: "onTimeRate",
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;

  const existing = await db.driver.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Driver not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const [dtoField, dbField] of Object.entries(FIELD_MAP)) {
    if (dtoField in body) data[dbField] = body[dtoField];
  }
  if ("licenseExpiry" in body) {
    data.licenseExpiry = body.licenseExpiry ? new Date(body.licenseExpiry) : null;
  }

  const updated = await db.driver.update({ where: { id }, data });
  return NextResponse.json({
    driver: {
      id: updated.id,
      name: updated.name,
      role: updated.role,
      department: updated.department ?? "",
      status: updated.status,
      contact: updated.phone ?? "",
      assignedVehicle: updated.assignedVehicle ?? undefined,
      licenseNumber: updated.licenseNumber ?? "",
      licenseExpiry: updated.licenseExpiry ? updated.licenseExpiry.toISOString() : "",
      lastActive: updated.lastActive ? updated.lastActive.toISOString() : "",
      email: updated.email ?? "",
      rating: updated.rating,
      tripsCompleted: updated.tripsCompleted,
      onTimeRate: updated.onTimeRate,
      city: updated.city ?? "",
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;

  const existing = await db.driver.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Driver not found." }, { status: 404 });
  }

  await db.driver.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

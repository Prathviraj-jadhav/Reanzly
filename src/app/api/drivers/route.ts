import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Real CRUD for the Drivers & Staff module, replacing what was previously
// pure client-side state seeded from src/lib/mock-data.ts's DRIVERS array.

function toDriverDTO(d: {
  id: string; name: string; role: string; department: string | null; status: string;
  phone: string | null; assignedVehicle: string | null; licenseNumber: string | null;
  licenseExpiry: Date | null; lastActive: Date | null; email: string | null;
  rating: number; tripsCompleted: number; onTimeRate: number; city: string | null;
}) {
  return {
    id: d.id,
    name: d.name,
    role: d.role,
    department: d.department ?? "",
    status: d.status,
    contact: d.phone ?? "",
    assignedVehicle: d.assignedVehicle ?? undefined,
    licenseNumber: d.licenseNumber ?? "",
    licenseExpiry: d.licenseExpiry ? d.licenseExpiry.toISOString() : "",
    lastActive: d.lastActive ? d.lastActive.toISOString() : "",
    email: d.email ?? "",
    rating: d.rating,
    tripsCompleted: d.tripsCompleted,
    onTimeRate: d.onTimeRate,
    city: d.city ?? "",
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const drivers = await db.driver.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ drivers: drivers.map(toDriverDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  const created = await db.driver.create({
    data: {
      companyId: sessionUser.companyId,
      name,
      email: body.email || null,
      phone: body.contact || null,
      role: body.role || "Driver",
      department: body.department || null,
      status: body.status || "Active",
      licenseNumber: body.licenseNumber || null,
      licenseExpiry: body.licenseExpiry ? new Date(body.licenseExpiry) : null,
      lastActive: body.lastActive ? new Date(body.lastActive) : new Date(),
      city: body.city || null,
      assignedVehicle: body.assignedVehicle || null,
      rating: Number.isFinite(body.rating) ? body.rating : 0,
      tripsCompleted: Number.isFinite(body.tripsCompleted) ? body.tripsCompleted : 0,
      onTimeRate: Number.isFinite(body.onTimeRate) ? body.onTimeRate : 0,
    },
  });
  return NextResponse.json({ driver: toDriverDTO(created) }, { status: 201 });
}

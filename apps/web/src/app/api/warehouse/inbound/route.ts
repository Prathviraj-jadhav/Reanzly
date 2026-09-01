/** @deprecated Use /api/v1/warehouse/* (Fastify). Rollback via `NEXT_PUBLIC_WAREHOUSE_API_VERSION=legacy`. */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { warehouseCreateMappers } from "@/lib/warehouse/create-fields";
import { requireModuleAccess } from "@/lib/permissions";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "warehouse");
  if (denied) return denied;

  const data = await db.warehouseInbound.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ shipments: data });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "warehouse");
  if (denied) return denied;

  const body = await req.json();
  try {
    const created = await db.warehouseInbound.create({
      data: warehouseCreateMappers.inbound(body, sessionUser.companyId),
    });
    return NextResponse.json({ shipment: created }, { status: 201 });
  } catch (e: any) {
    console.error("POST error:", e);
    return NextResponse.json({ error: "Could not create record." }, { status: 500 });
  }
}

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

  const data = await db.warehouseSku.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ skus: data });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "warehouse");
  if (denied) return denied;

  const body = await req.json();
  try {
    const created = await db.warehouseSku.create({
      data: warehouseCreateMappers.sku(body, sessionUser.companyId),
    });
    return NextResponse.json({ sku: created }, { status: 201 });
  } catch (e: any) {
    console.error("POST error:", e);
    return NextResponse.json({ error: "Could not create record." }, { status: 500 });
  }
}

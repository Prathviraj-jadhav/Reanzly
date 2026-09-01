/** @deprecated Use /api/v1/warehouse/* (Fastify). Rollback via NEXT_PUBLIC_WAREHOUSE_API_VERSION=legacy. */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "warehouse");
  if (denied) return denied;

  
  const body = await req.json();
  try {
    const record = await db.warehouseCycleCount.findUnique({ where: { id } });
    if (!record || record.companyId !== sessionUser.companyId) {
        return NextResponse.json({ error: "Not found or access denied." }, { status: 404 });
    }
    const updated = await db.warehouseCycleCount.update({
        where: { id },
        data: body,
    });
    return NextResponse.json({ count: updated });
  } catch (e: any) {
    console.error("PATCH error:", e);
    return NextResponse.json({ error: "Could not update record." }, { status: 500 });
  }
}

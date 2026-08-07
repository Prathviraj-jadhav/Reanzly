import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

const EDITABLE_FIELDS = ["status", "notes", "deliveryLocation", "paymentTerms", "buyer"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "purchase");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.purchaseOrder.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Purchase order not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = body[field];
  }

  if ("status" in body && body.status !== existing.status) {
    const activity = JSON.parse(existing.activityJson || "[]");
    activity.push({
      id: `act-${Date.now()}`,
      ts: new Date().toISOString(),
      actor: sessionUser.name,
      action: `Status → ${body.status}`,
    });
    data.activityJson = JSON.stringify(activity);
  }

  const updated = await db.purchaseOrder.update({ where: { id }, data });

  return NextResponse.json({
    purchaseOrder: {
      id: updated.id,
      poNumber: updated.poNumber,
      vendor: updated.vendorName,
      vendorId: updated.vendorId ?? "",
      category: updated.category,
      poDate: updated.poDate.toISOString(),
      expectedDelivery: updated.expectedDelivery ? updated.expectedDelivery.toISOString() : "",
      deliveryLocation: updated.deliveryLocation ?? "",
      paymentTerms: updated.paymentTerms ?? "",
      buyer: updated.buyer ?? "",
      status: updated.status,
      currency: "INR",
      subtotal: updated.subtotal / 100,
      taxTotal: updated.taxTotal / 100,
      total: updated.total / 100,
      notes: updated.notes ?? undefined,
      lines: JSON.parse(updated.linesJson || "[]"),
      receipts: JSON.parse(updated.receiptsJson || "[]"),
      bills: JSON.parse(updated.billsJson || "[]"),
      activity: JSON.parse(updated.activityJson || "[]"),
    },
  });
}

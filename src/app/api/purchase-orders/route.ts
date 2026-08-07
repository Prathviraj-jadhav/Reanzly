import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

// Real CRUD for the Purchase module (previously had no Prisma model at
// all - purchase/_helpers.tsx's PURCHASE_ORDERS was static mock data, and
// PODetail read from that same frozen array rather than the module's own
// lifted "orders" state). Lines/receipts/bills/activity are JSON-stringified
// columns - see the PurchaseOrder model comment in schema.prisma. Money
// fields are paise in the DB, rupees at this DTO boundary (matching the
// Expense/LorryReceipt precedent).

function toPODTO(p: {
  id: string; poNumber: string; vendorId: string | null; vendorName: string; category: string;
  poDate: Date; expectedDelivery: Date | null; deliveryLocation: string | null; paymentTerms: string | null;
  buyer: string | null; status: string; subtotal: number; taxTotal: number; total: number; notes: string | null;
  linesJson: string | null; receiptsJson: string | null; billsJson: string | null; activityJson: string | null;
}) {
  return {
    id: p.id,
    poNumber: p.poNumber,
    vendor: p.vendorName,
    vendorId: p.vendorId ?? "",
    category: p.category,
    poDate: p.poDate.toISOString(),
    expectedDelivery: p.expectedDelivery ? p.expectedDelivery.toISOString() : "",
    deliveryLocation: p.deliveryLocation ?? "",
    paymentTerms: p.paymentTerms ?? "",
    buyer: p.buyer ?? "",
    status: p.status,
    currency: "INR" as const,
    subtotal: p.subtotal / 100,
    taxTotal: p.taxTotal / 100,
    total: p.total / 100,
    notes: p.notes ?? undefined,
    lines: JSON.parse(p.linesJson || "[]"),
    receipts: JSON.parse(p.receiptsJson || "[]"),
    bills: JSON.parse(p.billsJson || "[]"),
    activity: JSON.parse(p.activityJson || "[]"),
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const orders = await db.purchaseOrder.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { poDate: "desc" },
  });
  return NextResponse.json({ purchaseOrders: orders.map(toPODTO) });
}

async function nextPoNumber(companyId: string) {
  const existing = await db.purchaseOrder.findMany({ where: { companyId }, select: { poNumber: true } });
  const max = existing
    .map((x) => parseInt(x.poNumber.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n))
    .reduce((a, b) => Math.max(a, b), 2499);
  return `RZ-PO-${String(max + 1).padStart(5, "0")}`;
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "purchase");
  if (denied) return denied;

  const body = await req.json();
  const vendorId = String(body.vendorId || "");
  const vendor = vendorId
    ? await db.vendor.findFirst({ where: { id: vendorId, companyId: sessionUser.companyId } })
    : null;
  if (!vendor) {
    return NextResponse.json({ error: "A valid vendor is required." }, { status: 400 });
  }

  const lines = Array.isArray(body.lines) ? body.lines : [];
  const subtotal = lines.reduce((s: number, l: any) => s + Number(l.qty || 0) * Number(l.unitPrice || 0), 0);
  const taxTotal = lines.reduce((s: number, l: any) => {
    const sub = Number(l.qty || 0) * Number(l.unitPrice || 0);
    return s + (sub * Number(l.taxRate || 0)) / 100;
  }, 0);
  const total = subtotal + taxTotal;

  const poNumber = await nextPoNumber(sessionUser.companyId);
  const now = new Date().toISOString();
  const buyer = String(body.buyer || sessionUser.name);

  const dtoLines = lines.map((l: any, i: number) => {
    const sub = Number(l.qty || 0) * Number(l.unitPrice || 0);
    const tax = (sub * Number(l.taxRate || 0)) / 100;
    return {
      id: `pol-${i + 1}`,
      itemCode: l.itemCode || "MISC",
      description: l.description || "",
      category: l.category || body.category || "",
      uom: l.uom || "Each",
      qty: Number(l.qty || 0),
      receivedQty: 0,
      unitPrice: Number(l.unitPrice || 0),
      taxRate: Number(l.taxRate || 0),
      taxAmount: Math.round(tax),
      total: Math.round(sub + tax),
    };
  });

  try {
    const created = await db.purchaseOrder.create({
      data: {
        companyId: sessionUser.companyId,
        poNumber,
        vendorId: vendor.id,
        vendorName: vendor.companyName,
        category: body.category || "Spare Parts",
        poDate: body.poDate ? new Date(body.poDate) : new Date(),
        expectedDelivery: body.expectedDelivery ? new Date(body.expectedDelivery) : null,
        deliveryLocation: body.deliveryLocation || null,
        paymentTerms: body.paymentTerms || vendor.paymentTerms || null,
        buyer,
        status: "Draft",
        subtotal: Math.round(subtotal * 100),
        taxTotal: Math.round(taxTotal * 100),
        total: Math.round(total * 100),
        notes: body.notes || null,
        linesJson: JSON.stringify(dtoLines),
        receiptsJson: "[]",
        billsJson: "[]",
        activityJson: JSON.stringify([
          { id: `act-${Date.now()}`, ts: now, actor: buyer, action: "PO created", detail: `Drafted PO ${poNumber} for ${vendor.companyName}` },
        ]),
      },
    });
    return NextResponse.json({ purchaseOrder: toPODTO(created) }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "A purchase order with that number already exists." }, { status: 409 });
    }
    console.error("POST /api/purchase-orders error:", e);
    return NextResponse.json({ error: "Could not create purchase order." }, { status: 500 });
  }
}

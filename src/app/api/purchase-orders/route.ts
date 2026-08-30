import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {
      companyId: session.companyId,
    };

    if (status) {
      where.status = status;
    }

    const pos = await db.purchaseOrder.findMany({
      where,
      orderBy: { poDate: "desc" },
    });

    const parsedPos = pos.map((p) => ({
      ...p,
      lines: p.linesJson ? JSON.parse(p.linesJson) : [],
      receipts: p.receiptsJson ? JSON.parse(p.receiptsJson) : [],
      bills: p.billsJson ? JSON.parse(p.billsJson) : [],
      activity: p.activityJson ? JSON.parse(p.activityJson) : [],
      // Ensure currency is set for the frontend interface if needed
      currency: "INR",
    }));

    return NextResponse.json({ purchaseOrders: parsedPos });
  } catch (error) {
    console.error("GET /api/purchase-orders error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const count = await db.purchaseOrder.count({
      where: { companyId: session.companyId },
    });
    const poNumber = `PO-${String(count + 1).padStart(5, "0")}`;

    const po = await db.purchaseOrder.create({
      data: {
        companyId: session.companyId,
        poNumber,
        vendorId: body.vendorId || null,
        vendorName: body.vendorName || body.vendor || "Unknown",
        category: body.category,
        poDate: body.poDate ? new Date(body.poDate) : new Date(),
        expectedDelivery: body.expectedDelivery ? new Date(body.expectedDelivery) : null,
        deliveryLocation: body.deliveryLocation || null,
        paymentTerms: body.paymentTerms || null,
        buyer: body.buyer || null,
        status: body.status || "Draft",
        subtotal: body.subtotal || 0,
        taxTotal: body.taxTotal || 0,
        total: body.total || 0,
        notes: body.notes || "",
        linesJson: body.lines ? JSON.stringify(body.lines) : "[]",
        receiptsJson: "[]",
        billsJson: "[]",
        activityJson: "[]",
      },
    });

    return NextResponse.json({
      purchaseOrder: {
        ...po,
        lines: body.lines || [],
        receipts: [],
        bills: [],
        activity: [],
        currency: "INR",
      }
    });
  } catch (error) {
    console.error("POST /api/purchase-orders error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

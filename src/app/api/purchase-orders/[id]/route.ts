import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const po = await db.purchaseOrder.findFirst({
      where: {
        id: params.id,
        companyId: session.companyId,
      },
    });

    if (!po) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const parsedPo = {
      ...po,
      lines: po.linesJson ? JSON.parse(po.linesJson) : [],
      receipts: po.receiptsJson ? JSON.parse(po.receiptsJson) : [],
      bills: po.billsJson ? JSON.parse(po.billsJson) : [],
      activity: po.activityJson ? JSON.parse(po.activityJson) : [],
      currency: "INR",
    };

    return NextResponse.json({ po: parsedPo });
  } catch (error) {
    console.error("GET /api/purchase-orders/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const dataToUpdate: any = {};
    if (body.status) dataToUpdate.status = body.status;
    if (body.expectedDelivery) dataToUpdate.expectedDelivery = new Date(body.expectedDelivery);
    if (body.notes !== undefined) dataToUpdate.notes = body.notes;
    
    // Convert arrays back to JSON strings if they are present in the update
    if (body.lines) dataToUpdate.linesJson = JSON.stringify(body.lines);
    if (body.receipts) dataToUpdate.receiptsJson = JSON.stringify(body.receipts);
    if (body.bills) dataToUpdate.billsJson = JSON.stringify(body.bills);
    if (body.activity) dataToUpdate.activityJson = JSON.stringify(body.activity);

    const po = await db.purchaseOrder.update({
      where: {
        id: params.id,
        companyId: session.companyId,
      },
      data: dataToUpdate,
    });

    const parsedPo = {
      ...po,
      lines: po.linesJson ? JSON.parse(po.linesJson) : [],
      receipts: po.receiptsJson ? JSON.parse(po.receiptsJson) : [],
      bills: po.billsJson ? JSON.parse(po.billsJson) : [],
      activity: po.activityJson ? JSON.parse(po.activityJson) : [],
      currency: "INR",
    };

    return NextResponse.json({ purchaseOrder: parsedPo });
  } catch (error) {
    console.error("PATCH /api/purchase-orders/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deleted = await db.purchaseOrder.deleteMany({
      where: {
        id: params.id,
        companyId: session.companyId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/purchase-orders/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

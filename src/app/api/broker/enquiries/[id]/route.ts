import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cacheInvalidate } from "@/lib/cache";

// ===== Broker Enquiry Detail API =====
// PATCH - update enquiry status (New -> Quoted -> Won/Lost) and optionally the
//         quotedRate. Used when the broker sends a quote on an inbound enquiry
//         or marks it won/lost.

const ALLOWED_STATUSES = new Set(["New", "Quoted", "Won", "Lost"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (typeof body.status === "string") {
      if (!ALLOWED_STATUSES.has(body.status)) {
        return NextResponse.json(
          { error: `status must be one of ${[...ALLOWED_STATUSES].join(", ")}` },
          { status: 400 }
        );
      }
      data.status = body.status;
    }
    if (typeof body.quotedRate === "number") {
      data.quotedRate = body.quotedRate;
    } else if (body.quotedRate === null) {
      data.quotedRate = null;
    }

    const updated = await db.brokerEnquiry.update({
      where: { id },
      data,
    });

    cacheInvalidate("broker:enquiries", "broker:dashboard");

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[broker/enquiries/[id] PATCH]", error);
    return NextResponse.json({ error: "Unable to update enquiry." }, { status: 500 });
  }
}

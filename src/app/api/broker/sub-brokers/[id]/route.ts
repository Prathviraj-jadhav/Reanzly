import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cacheInvalidate } from "@/lib/cache";
import { safeParseJson, toJsonString } from "@/lib/broker";

// ===== Sub-Broker Detail API =====
// PATCH  - update sub-broker status / markup / coverage / settlement cycle /
//          GST treatment.
// DELETE - remove a sub-broker from the network. Cascades from the
//          brokerProfile relation.

const ALLOWED_SETTLEMENT_CYCLES = new Set(["Weekly", "Fortnightly", "Monthly"]);
const ALLOWED_GST_TREATMENTS = new Set(["Forward Charge", "Reverse Charge"]);
const ALLOWED_STATUSES = new Set(["Active", "Pending", "Suspended"]);

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
    if (typeof body.markupPct === "number") {
      if (body.markupPct < 0 || body.markupPct > 50) {
        return NextResponse.json({ error: "markupPct must be between 0 and 50" }, { status: 400 });
      }
      data.markupPct = body.markupPct;
    }
    if (Array.isArray(body.coverageLanes)) {
      data.coverageLanes = toJsonString(body.coverageLanes.filter((l) => typeof l === "string"));
    }
    if (typeof body.settlementCycle === "string" && ALLOWED_SETTLEMENT_CYCLES.has(body.settlementCycle)) {
      data.settlementCycle = body.settlementCycle;
    }
    if (typeof body.gstTreatment === "string" && ALLOWED_GST_TREATMENTS.has(body.gstTreatment)) {
      data.gstTreatment = body.gstTreatment;
    }
    if (typeof body.gstin === "string") data.gstin = body.gstin || null;
    if (typeof body.settlementsDueINR === "number") data.settlementsDueINR = body.settlementsDueINR;
    if (typeof body.contactName === "string") data.contactName = body.contactName;
    if (typeof body.email === "string") data.email = body.email;
    if (typeof body.phone === "string") data.phone = body.phone;

    const updated = await db.subBroker.update({
      where: { id },
      data,
    });

    cacheInvalidate("broker:sub-brokers", "broker:dashboard");

    return NextResponse.json({
      ...updated,
      coverageLanes: safeParseJson<string[]>(updated.coverageLanes, []),
    });
  } catch (error) {
    console.error("[broker/sub-brokers/[id] PATCH]", error);
    return NextResponse.json({ error: "Unable to update sub-broker." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.subBroker.delete({ where: { id } });

    cacheInvalidate("broker:sub-brokers", "broker:dashboard");

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[broker/sub-brokers/[id] DELETE]", error);
    return NextResponse.json({ error: "Unable to remove sub-broker." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cacheInvalidate } from "@/lib/cache";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { getSessionBrokerProfile, requireBrokerProfile, appendBrokerLedgerEntry } from "@/lib/broker";

// ===== Settlement Cycle Detail API =====
// PATCH - advance a settlement cycle through its lifecycle
//        (Draft -> Approved -> Paid). Other fields can also be updated before
//        approval (commissionPct, tdsPct, etc.) - the API recomputes derived
//        totals so they always stay consistent.

const ALLOWED_STATUSES = new Set(["Draft", "Approved", "Paid"]);
const ALLOWED_GST_TREATMENTS = new Set(["Forward Charge", "Reverse Charge"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "broker-settlements");
  if (denied) return denied;

  try {
    const profile = await getSessionBrokerProfile(sessionUser);
    const notLinked = requireBrokerProfile(profile);
    if (notLinked) return notLinked;

    const { id } = await params;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // First read the existing row so we can recompute derived totals when the
    // commission/tds/gross inputs change.
    const existing = await db.settlementCycle.findUnique({ where: { id } });
    if (!existing || existing.brokerProfileId !== profile!.id) {
      return NextResponse.json({ error: "Settlement cycle not found." }, { status: 404 });
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

    const grossValueINR =
      typeof body.grossValueINR === "number" ? body.grossValueINR : existing.grossValueINR;
    const grossTrips =
      typeof body.grossTrips === "number" ? Math.max(0, Math.floor(body.grossTrips)) : existing.grossTrips;
    const commissionPct =
      typeof body.commissionPct === "number" ? body.commissionPct : existing.commissionPct;
    const tdsPct = typeof body.tdsPct === "number" ? body.tdsPct : existing.tdsPct;
    const gstTreatment =
      typeof body.gstTreatment === "string" && ALLOWED_GST_TREATMENTS.has(body.gstTreatment)
        ? body.gstTreatment
        : existing.gstTreatment;

    const commissionEarnedINR = Math.round((grossValueINR * commissionPct) / 100);
    const tdsDeductedINR = Math.round((commissionEarnedINR * tdsPct) / 100);
    const netPayableINR = commissionEarnedINR - tdsDeductedINR;

    data.grossValueINR = grossValueINR;
    data.grossTrips = grossTrips;
    data.commissionPct = commissionPct;
    data.tdsPct = tdsPct;
    data.gstTreatment = gstTreatment;
    data.commissionEarnedINR = commissionEarnedINR;
    data.tdsDeductedINR = tdsDeductedINR;
    data.netPayableINR = netPayableINR;

    if (typeof body.periodStart === "string") {
      const d = new Date(body.periodStart);
      if (!isNaN(d.getTime())) data.periodStart = d;
    }
    if (typeof body.periodEnd === "string") {
      const d = new Date(body.periodEnd);
      if (!isNaN(d.getTime())) data.periodEnd = d;
    }

    const updated = await db.settlementCycle.update({
      where: { id },
      data,
    });

    // Commission credit on Draft->Approved, payout debit on Approved->Paid -
    // this is the write path the route's own cache-tag invalidation already
    // implied but never actually performed.
    if (existing.status === "Draft" && updated.status === "Approved") {
      await appendBrokerLedgerEntry(profile!.id, {
        type: "Credit",
        description: `Commission - ${updated.cycleId}`,
        refId: updated.cycleId,
        amountINR: updated.netPayableINR,
      });
      await db.brokerProfile.update({
        where: { id: profile!.id },
        data: { nextPayoutDate: new Date(Date.now() + 7 * 86_400_000), nextPayoutAmount: updated.netPayableINR },
      });
    } else if (existing.status === "Approved" && updated.status === "Paid") {
      const payRef = `PAY-${new Date().toISOString().slice(0, 10)}`;
      await appendBrokerLedgerEntry(profile!.id, {
        type: "Debit",
        description: `Payout - NACH credit to ${profile!.bankName ?? "registered account"}${profile!.bankAccountNumber ? " ****" + profile!.bankAccountNumber.slice(-4) : ""}`,
        refId: payRef,
        amountINR: updated.netPayableINR,
      });
      await db.brokerProfile.update({
        where: { id: profile!.id },
        data: { nextPayoutDate: null, nextPayoutAmount: 0 },
      });
    }

    cacheInvalidate("broker:settlements", "broker:dashboard", "broker:ledger", "broker:bank-details", "broker:profile");

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[broker/settlements/[id] PATCH]", error);
    return NextResponse.json({ error: "Unable to update settlement cycle." }, { status: 500 });
  }
}

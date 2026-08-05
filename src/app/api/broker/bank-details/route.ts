import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cacheInvalidate } from "@/lib/cache";
import { getDefaultBrokerProfile } from "@/lib/broker";

// ===== Broker Bank Details API =====
// GET   - return the bank details stored on the broker profile (NACH-registered
//         account, IFSC, UMR, next payout).
// PATCH - update bank details (bank name, branch, account name/number, IFSC,
//         NACH UMR, next payout date/amount). Used by the Bank Details page
//         when the broker edits their NACH-registered account.

export async function GET() {
  try {
    const profile = await getDefaultBrokerProfile();
    if (!profile) {
      return NextResponse.json({}, { status: 200 });
    }
    return NextResponse.json({
      bankName: profile.bankName,
      bankBranch: profile.bankBranch,
      bankAccountName: profile.bankAccountName,
      bankAccountNumber: profile.bankAccountNumber,
      bankIfsc: profile.bankIfsc,
      nachUmr: profile.nachUmr,
      nextPayoutDate: profile.nextPayoutDate,
      nextPayoutAmount: profile.nextPayoutAmount,
      brokerCode: profile.brokerCode,
      companyName: profile.companyName,
    });
  } catch (error) {
    console.error("[broker/bank-details GET]", error);
    return NextResponse.json({ error: "Unable to fetch bank details." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const profile = await getDefaultBrokerProfile();
    if (!profile) {
      return NextResponse.json({ error: "Broker profile not found." }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};

    if (typeof body.bankName === "string") data.bankName = body.bankName || null;
    if (typeof body.bankBranch === "string") data.bankBranch = body.bankBranch || null;
    if (typeof body.bankAccountName === "string") data.bankAccountName = body.bankAccountName || null;
    if (typeof body.bankAccountNumber === "string") data.bankAccountNumber = body.bankAccountNumber || null;
    if (typeof body.bankIfsc === "string") data.bankIfsc = body.bankIfsc || null;
    if (typeof body.nachUmr === "string") data.nachUmr = body.nachUmr || null;
    if (typeof body.nextPayoutAmount === "number") data.nextPayoutAmount = body.nextPayoutAmount;
    if (typeof body.nextPayoutDate === "string") {
      const d = new Date(body.nextPayoutDate);
      if (!isNaN(d.getTime())) data.nextPayoutDate = d;
    }

    const updated = await db.brokerProfile.update({
      where: { id: profile.id },
      data,
    });

    cacheInvalidate("broker:profile", "broker:bank-details", "broker:dashboard");

    return NextResponse.json({
      bankName: updated.bankName,
      bankBranch: updated.bankBranch,
      bankAccountName: updated.bankAccountName,
      bankAccountNumber: updated.bankAccountNumber,
      bankIfsc: updated.bankIfsc,
      nachUmr: updated.nachUmr,
      nextPayoutDate: updated.nextPayoutDate,
      nextPayoutAmount: updated.nextPayoutAmount,
      brokerCode: updated.brokerCode,
      companyName: updated.companyName,
    });
  } catch (error) {
    console.error("[broker/bank-details PATCH]", error);
    return NextResponse.json({ error: "Unable to update bank details." }, { status: 500 });
  }
}

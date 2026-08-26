import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { getSessionBrokerProfile, requireBrokerProfile } from "@/lib/broker";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const denied = requireModuleAccess(sessionUser, "broker-console");
  if (denied) return denied;

  try {
    const profile = await getSessionBrokerProfile(sessionUser);
    const noProfileError = requireBrokerProfile(profile);
    if (noProfileError) return noProfileError;

    const mandates = await db.nachMandate.findMany({
      where: { brokerProfileId: profile!.id },
      orderBy: { createdOn: "desc" },
    });

    return NextResponse.json(mandates.map(m => ({
      ...m,
      createdOn: m.createdOn.toISOString(),
      nextDebit: m.nextDebit?.toISOString(),
    })));
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to load mandates." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const denied = requireModuleAccess(sessionUser, "broker-console");
  if (denied) return denied;

  try {
    const profile = await getSessionBrokerProfile(sessionUser);
    const noProfileError = requireBrokerProfile(profile);
    if (noProfileError) return noProfileError;

    const body = await req.json();

    const mandate = await db.nachMandate.create({
      data: {
        brokerProfileId: profile!.id,
        mandateId: body.mandateId || `NACH-${body.bank?.substring(0, 4).toUpperCase() || 'BNK'}-${Math.floor(Math.random() * 1000000)}`,
        party: body.party,
        partyType: body.partyType,
        bank: body.bank,
        accountLast4: body.accountLast4,
        amountINR: body.amountINR,
        frequency: body.frequency || "Monthly",
        status: "Active",
        nextDebit: body.nextDebit ? new Date(body.nextDebit) : undefined,
      },
    });

    return NextResponse.json({
      ...mandate,
      createdOn: mandate.createdOn.toISOString(),
      nextDebit: mandate.nextDebit?.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to create mandate.", details: err.message }, { status: 500 });
  }
}

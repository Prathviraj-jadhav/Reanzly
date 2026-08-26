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

    const runs = await db.payoutRun.findMany({
      where: { brokerProfileId: profile!.id },
      orderBy: { date: "desc" },
      include: { recipients: true },
    });

    return NextResponse.json(runs.map(r => ({
      ...r,
      date: r.date.toISOString(),
      completedAt: r.completedAt?.toISOString(),
    })));
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to load payouts." }, { status: 500 });
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

    const run = await db.payoutRun.create({
      data: {
        brokerProfileId: profile!.id,
        runNo: body.runNo || `PAY-${new Date().toISOString().slice(0, 10)}-${Math.floor(Math.random() * 1000)}`,
        date: body.date ? new Date(body.date) : new Date(),
        cycle: body.cycle || "Monthly",
        totalAmountINR: body.totalAmountINR || 0,
        recipientsCount: body.recipients ? body.recipients.length : 0,
        status: body.status || "Draft",
        bankRef: body.bankRef,
        recipients: {
          create: body.recipients ? body.recipients.map((r: any) => ({
            name: r.name,
            amountINR: r.amountINR,
            status: r.status || "Draft",
            utr: r.utr,
          })) : [],
        },
      },
      include: { recipients: true },
    });

    return NextResponse.json({
      ...run,
      date: run.date.toISOString(),
      completedAt: run.completedAt?.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to start payout run.", details: err.message }, { status: 500 });
  }
}

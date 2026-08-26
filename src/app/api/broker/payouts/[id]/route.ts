import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { getSessionBrokerProfile, requireBrokerProfile } from "@/lib/broker";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const denied = requireModuleAccess(sessionUser, "broker-console");
  if (denied) return denied;

  try {
    const profile = await getSessionBrokerProfile(sessionUser);
    const noProfileError = requireBrokerProfile(profile);
    if (noProfileError) return noProfileError;

    const body = await req.json();

    // Verify ownership
    const existing = await db.payoutRun.findUnique({ where: { id: params.id } });
    if (!existing || existing.brokerProfileId !== profile!.id) {
      return NextResponse.json({ error: "Payout run not found." }, { status: 404 });
    }

    const updated = await db.payoutRun.update({
      where: { id: params.id },
      data: {
        status: body.status !== undefined ? body.status : undefined,
        bankRef: body.bankRef !== undefined ? body.bankRef : undefined,
        completedAt: body.status === "Completed" && existing.status !== "Completed" ? new Date() : undefined,
      },
      include: { recipients: true },
    });

    return NextResponse.json({
      ...updated,
      date: updated.date.toISOString(),
      completedAt: updated.completedAt?.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to update payout run.", details: err.message }, { status: 500 });
  }
}

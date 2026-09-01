import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { getSessionBrokerProfile, requireBrokerProfile } from "@/lib/broker";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "broker-network");
  if (denied) return denied;

  try {
    const profile = await getSessionBrokerProfile(sessionUser);
    const notLinked = requireBrokerProfile(profile);
    if (notLinked) return notLinked;

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === "file_tax") {
      const updated = await db.brokerTaxReturn.updateMany({
        where: { id: id, brokerProfileId: profile!.id },
        data: { status: "Filed", filedDate: new Date() },
      });
      if (updated.count === 0) return NextResponse.json({ error: "Tax return not found or unauthorized." }, { status: 404 });
      return NextResponse.json({ success: true, status: "Filed" });
    }

    if (action === "renew_license") {
      const updated = await db.brokerLicense.updateMany({
        where: { id: id, brokerProfileId: profile!.id },
        data: { status: "Valid" }, // Simplified renewal just resetting status for demo
      });
      if (updated.count === 0) return NextResponse.json({ error: "License not found or unauthorized." }, { status: 404 });
      return NextResponse.json({ success: true, status: "Valid" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[broker/compliance/[id] PATCH]", error);
    return NextResponse.json({ error: "Unable to update compliance record." }, { status: 500 });
  }
}

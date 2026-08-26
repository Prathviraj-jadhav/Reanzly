import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { getSessionBrokerProfile, requireBrokerProfile } from "@/lib/broker";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "broker-network");
  if (denied) return denied;

  try {
    const profile = await getSessionBrokerProfile(sessionUser);
    if (!profile) return NextResponse.json({ taxReturns: [], licenses: [] });
    
    const [taxReturns, licenses] = await Promise.all([
      db.brokerTaxReturn.findMany({
        where: { brokerProfileId: profile.id },
        orderBy: { createdAt: "desc" },
      }),
      db.brokerLicense.findMany({
        where: { brokerProfileId: profile.id },
        orderBy: { expiresAt: "asc" },
      })
    ]);
    
    return NextResponse.json({ taxReturns, licenses });
  } catch (error) {
    console.error("[broker/compliance GET]", error);
    return NextResponse.json({ error: "Unable to fetch broker compliance." }, { status: 500 });
  }
}

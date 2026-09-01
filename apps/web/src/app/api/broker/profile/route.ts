import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cacheInvalidate } from "@/lib/cache";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { getSessionBrokerProfile, requireBrokerProfile, safeParseJson, toJsonString } from "@/lib/broker";

// ===== Broker Profile API =====
// GET  - return this session's own broker profile.
// PATCH - update commercial settings: markup, settlement cycle, GST treatment,
//         coverage lanes.

const ALLOWED_SETTLEMENT_CYCLES = new Set(["Weekly", "Fortnightly", "Monthly"]);
const ALLOWED_GST_TREATMENTS = new Set(["Forward Charge", "Reverse Charge"]);

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "broker-console");
  if (denied) return denied;

  try {
    const profile = await getSessionBrokerProfile(sessionUser);
    if (!profile) {
      // Empty state - frontend hook will fall back to seed data.
      return NextResponse.json({}, { status: 200 });
    }
    return NextResponse.json({
      ...profile,
      coverageLanes: safeParseJson<string[]>(profile.coverageLanes, []),
      marketplaceListingJson: safeParseJson<any>(profile.marketplaceListingJson, {}),
    });
  } catch (error) {
    console.error("[broker/profile GET]", error);
    return NextResponse.json({ error: "Unable to fetch broker profile." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "broker-console");
  if (denied) return denied;

  try {
    const profile = await getSessionBrokerProfile(sessionUser);
    const notLinked = requireBrokerProfile(profile);
    if (notLinked) return notLinked;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};

    if (typeof body.markupPct === "number") {
      if (body.markupPct < 0 || body.markupPct > 50) {
        return NextResponse.json({ error: "markupPct must be between 0 and 50" }, { status: 400 });
      }
      data.markupPct = body.markupPct;
    }

    if (typeof body.settlementCycle === "string") {
      if (!ALLOWED_SETTLEMENT_CYCLES.has(body.settlementCycle)) {
        return NextResponse.json(
          { error: `settlementCycle must be one of ${[...ALLOWED_SETTLEMENT_CYCLES].join(", ")}` },
          { status: 400 }
        );
      }
      data.settlementCycle = body.settlementCycle;
    }

    if (typeof body.gstTreatment === "string") {
      if (!ALLOWED_GST_TREATMENTS.has(body.gstTreatment)) {
        return NextResponse.json(
          { error: `gstTreatment must be one of ${[...ALLOWED_GST_TREATMENTS].join(", ")}` },
          { status: 400 }
        );
      }
      data.gstTreatment = body.gstTreatment;
    }

    if (Array.isArray(body.coverageLanes)) {
      const lanes = body.coverageLanes.filter((l) => typeof l === "string");
      data.coverageLanes = toJsonString(lanes);
    }

    if (typeof body.gstin === "string") data.gstin = body.gstin || null;
    if (typeof body.companyName === "string") data.companyName = body.companyName;
    if (typeof body.contactName === "string") data.contactName = body.contactName;
    if (typeof body.phone === "string") data.phone = body.phone;
    
    if (body.marketplaceListingJson && typeof body.marketplaceListingJson === "object") {
      data.marketplaceListingJson = toJsonString(body.marketplaceListingJson);
    }

    const updated = await db.brokerProfile.update({
      where: { id: profile!.id },
      data,
    });

    cacheInvalidate("broker:profile", "broker:dashboard");

    return NextResponse.json({
      ...updated,
      coverageLanes: safeParseJson<string[]>(updated.coverageLanes, []),
      marketplaceListingJson: safeParseJson<any>(updated.marketplaceListingJson, {}),
    });
  } catch (error) {
    console.error("[broker/profile PATCH]", error);
    return NextResponse.json({ error: "Unable to update broker profile." }, { status: 500 });
  }
}

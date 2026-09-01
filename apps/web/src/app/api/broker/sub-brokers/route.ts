import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cacheInvalidate } from "@/lib/cache";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { getSessionBrokerProfile, requireBrokerProfile, safeParseJson, toJsonString } from "@/lib/broker";

// ===== Sub-Brokers API =====
// GET  - list all sub-brokers onboarded under this session's own broker profile.
// POST - onboard a new sub-broker. Generates the next RZSB-XXX broker code.

const ALLOWED_SETTLEMENT_CYCLES = new Set(["Weekly", "Fortnightly", "Monthly"]);
const ALLOWED_GST_TREATMENTS = new Set(["Forward Charge", "Reverse Charge"]);
const ALLOWED_STATUSES = new Set(["Active", "Pending", "Suspended"]);

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "broker-console");
  if (denied) return denied;

  try {
    const profile = await getSessionBrokerProfile(sessionUser);
    if (!profile) return NextResponse.json([]);

    const rows = await db.subBroker.findMany({
      where: { brokerProfileId: profile.id },
      orderBy: { onboardedAt: "desc" },
    });

    return NextResponse.json(
      rows.map((r) => ({
        ...r,
        coverageLanes: safeParseJson<string[]>(r.coverageLanes, []),
      }))
    );
  } catch (error) {
    console.error("[broker/sub-brokers GET]", error);
    return NextResponse.json({ error: "Unable to fetch sub-brokers." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
    const brokerProfileId = profile!.id;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name : "";
    const contactName = typeof body.contactName === "string" ? body.contactName : "";
    const email = typeof body.email === "string" ? body.email : "";
    const phone = typeof body.phone === "string" ? body.phone : "";
    if (!name || !contactName || !email || !phone) {
      return NextResponse.json(
        { error: "name, contactName, email, and phone are required" },
        { status: 400 }
      );
    }

    const markupPct = typeof body.markupPct === "number" ? body.markupPct : 5;
    const settlementCycle =
      typeof body.settlementCycle === "string" && ALLOWED_SETTLEMENT_CYCLES.has(body.settlementCycle)
        ? body.settlementCycle
        : "Weekly";
    const gstTreatment =
      typeof body.gstTreatment === "string" && ALLOWED_GST_TREATMENTS.has(body.gstTreatment)
        ? body.gstTreatment
        : "Forward Charge";
    const coverageLanes = Array.isArray(body.coverageLanes)
      ? body.coverageLanes.filter((l) => typeof l === "string")
      : [];
    const gstin = typeof body.gstin === "string" ? body.gstin : null;
    const status =
      typeof body.status === "string" && ALLOWED_STATUSES.has(body.status) ? body.status : "Pending";

    // Generate next broker code: RZSB-XXX based on existing count + 1.
    const count = await db.subBroker.count({ where: { brokerProfileId } });
    const brokerCode = `RZSB-${String(count + 1).padStart(3, "0")}`;

    const created = await db.subBroker.create({
      data: {
        brokerProfileId,
        name,
        brokerCode,
        contactName,
        email,
        phone,
        markupPct,
        coverageLanes: toJsonString(coverageLanes),
        settlementCycle,
        gstTreatment,
        gstin,
        status,
        settlementsDueINR: 0,
      },
    });

    cacheInvalidate("broker:sub-brokers", "broker:dashboard");

    return NextResponse.json(
      {
        ...created,
        coverageLanes: safeParseJson<string[]>(created.coverageLanes, []),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[broker/sub-brokers POST]", error);
    return NextResponse.json({ error: "Unable to onboard sub-broker." }, { status: 500 });
  }
}

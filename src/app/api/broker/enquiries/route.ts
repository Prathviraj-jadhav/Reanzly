import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cacheInvalidate } from "@/lib/cache";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { getSessionBrokerProfile, requireBrokerProfile } from "@/lib/broker";

// ===== Broker Enquiries API =====
// GET  - list all enquiries for this session's own broker profile, newest first.
// POST - create a new enquiry (received from a customer).

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "broker-marketplace");
  if (denied) return denied;

  try {
    const profile = await getSessionBrokerProfile(sessionUser);
    if (!profile) return NextResponse.json([]);

    const rows = await db.brokerEnquiry.findMany({
      where: { brokerProfileId: profile.id },
      orderBy: { receivedAt: "desc" },
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[broker/enquiries GET]", error);
    return NextResponse.json({ error: "Unable to fetch enquiries." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "broker-marketplace");
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

    const lane = typeof body.lane === "string" ? body.lane : "";
    const vehicleType = typeof body.vehicleType === "string" ? body.vehicleType : "";
    const customer = typeof body.customer === "string" ? body.customer : "";
    if (!lane || !vehicleType || !customer) {
      return NextResponse.json(
        { error: "lane, vehicleType, and customer are required" },
        { status: 400 }
      );
    }

    const weightTon = typeof body.weightTon === "number" ? body.weightTon : 0;
    const expectedRatePerKm = typeof body.expectedRatePerKm === "number" ? body.expectedRatePerKm : 0;
    const pickupDateRaw = typeof body.pickupDate === "string" ? body.pickupDate : "";
    const pickupDate = pickupDateRaw ? new Date(pickupDateRaw) : new Date();
    if (isNaN(pickupDate.getTime())) {
      return NextResponse.json({ error: "Invalid pickupDate" }, { status: 400 });
    }

    // Generate next enquiry id: enq-XXXX based on count + 2401 baseline (matches seed).
    const count = await db.brokerEnquiry.count({ where: { brokerProfileId } });
    const enquiryId = `enq-${String(2401 + count).padStart(4, "0")}`;

    const created = await db.brokerEnquiry.create({
      data: {
        brokerProfileId,
        enquiryId,
        lane,
        vehicleType,
        weightTon,
        expectedRatePerKm,
        customer,
        pickupDate,
        status: "New",
      },
    });

    cacheInvalidate("broker:enquiries", "broker:dashboard");

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[broker/enquiries POST]", error);
    return NextResponse.json({ error: "Unable to create enquiry." }, { status: 500 });
  }
}

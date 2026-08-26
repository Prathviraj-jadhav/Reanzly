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
    if (!profile) return NextResponse.json([]);
    
    const docs = await db.brokerDocument.findMany({
      where: { brokerProfileId: profile.id },
      orderBy: { uploadedAt: "desc" },
    });
    
    return NextResponse.json(docs);
  } catch (error) {
    console.error("[broker/documents GET]", error);
    return NextResponse.json({ error: "Unable to fetch broker documents." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "broker-network");
  if (denied) return denied;

  try {
    const profile = await getSessionBrokerProfile(sessionUser);
    const notLinked = requireBrokerProfile(profile);
    if (notLinked) return notLinked;

    const body = await req.json().catch(() => ({}));
    
    const name = String(body.name || "").trim();
    const type = String(body.type || "Other");
    const fileName = String(body.fileName || "document.pdf");
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const doc = await db.brokerDocument.create({
      data: {
        brokerProfileId: profile!.id,
        name,
        type,
        fileName,
        notes: body.notes ? String(body.notes) : null,
        expiresAt,
        status: "Valid",
      },
    });

    return NextResponse.json(doc);
  } catch (error) {
    console.error("[broker/documents POST]", error);
    return NextResponse.json({ error: "Unable to upload document." }, { status: 500 });
  }
}

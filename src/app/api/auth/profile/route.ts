import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Real profile read/write for the current session's own User row (Settings
// > Profile). Distinct from /api/auth/me, which only exposes the narrow
// SessionUser identity shape used pervasively for auth checks - this route
// exposes and updates the fuller self-service profile fields.

const EDITABLE_FIELDS = [
  "name",
  "phone",
  "altEmail",
  "altPhone",
  "dob",
  "gender",
  "address",
  "jobTitle",
  "department",
  "reportingManager",
  "language",
  "timezone",
] as const;

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const user = await db.user.findUnique({ where: { id: sessionUser.id } });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  return NextResponse.json({
    profile: {
      name: user.name,
      email: user.email,
      altEmail: user.altEmail ?? "",
      phone: user.phone ?? "",
      altPhone: user.altPhone ?? "",
      dob: user.dob ? user.dob.toISOString().slice(0, 10) : "",
      gender: user.gender ?? "",
      address: user.address ?? "",
      jobTitle: user.jobTitle ?? "",
      department: user.department ?? "",
      reportingManager: user.reportingManager ?? "",
      language: user.language ?? "",
      timezone: user.timezone ?? "",
    },
  });
}

export async function PATCH(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json();
  const data: Record<string, string | Date | null> = {};

  for (const field of EDITABLE_FIELDS) {
    if (!(field in body)) continue;
    const raw = String(body[field] ?? "").trim();
    if (field === "dob") {
      data.dob = raw ? new Date(raw) : null;
    } else if (field === "name") {
      if (!raw) {
        return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
      }
      data.name = raw;
    } else {
      data[field] = raw || null;
    }
  }

  const updated = await db.user.update({ where: { id: sessionUser.id }, data });

  return NextResponse.json({
    profile: {
      name: updated.name,
      email: updated.email,
      altEmail: updated.altEmail ?? "",
      phone: updated.phone ?? "",
      altPhone: updated.altPhone ?? "",
      dob: updated.dob ? updated.dob.toISOString().slice(0, 10) : "",
      gender: updated.gender ?? "",
      address: updated.address ?? "",
      jobTitle: updated.jobTitle ?? "",
      department: updated.department ?? "",
      reportingManager: updated.reportingManager ?? "",
      language: updated.language ?? "",
      timezone: updated.timezone ?? "",
    },
  });
}

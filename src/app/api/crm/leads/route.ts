import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Real CRUD for CRM Leads, replacing the Zustand+localStorage `reanzly-crm`
// store's leads slice. DTO field names match the frontend's Lead interface
// (src/components/modules/crm/_data.ts) exactly so crm/_store.ts can swap
// its backing implementation without any consuming component changing.

function toDTO(l: {
  id: string; leadId: string; name: string; company: string | null; source: string;
  laneInterest: string | null; status: string; ownerId: string | null; score: number;
  phone: string | null; email: string | null; city: string | null; createdAt: Date;
  nextFollowUp: Date | null; notes: string | null;
}) {
  return {
    id: l.id,
    leadId: l.leadId,
    name: l.name,
    company: l.company ?? "",
    source: l.source,
    laneInterest: l.laneInterest ?? "",
    status: l.status,
    owner: l.ownerId ?? "",
    score: l.score,
    phone: l.phone ?? "",
    email: l.email ?? "",
    city: l.city ?? "",
    created: l.createdAt.toISOString(),
    nextFollowUp: l.nextFollowUp ? l.nextFollowUp.toISOString() : undefined,
    notes: l.notes ?? "",
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const leads = await db.lead.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ leads: leads.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "name is required." }, { status: 400 });

  const created = await db.lead.create({
    data: {
      companyId: sessionUser.companyId,
      leadId: `RZ-LEAD-${Date.now().toString(36).toUpperCase()}`,
      name,
      company: body.company || null,
      source: body.source || "Inbound",
      laneInterest: body.laneInterest || null,
      status: body.status || "New",
      ownerId: body.owner || null,
      score: Number.isFinite(body.score) ? body.score : 0,
      phone: body.phone || null,
      email: body.email || null,
      city: body.city || null,
      nextFollowUp: body.nextFollowUp ? new Date(body.nextFollowUp) : null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json({ lead: toDTO(created) }, { status: 201 });
}

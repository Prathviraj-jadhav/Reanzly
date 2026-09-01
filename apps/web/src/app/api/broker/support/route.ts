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

    const tickets = await db.helpdeskTicket.findMany({
      where: {
        companyId: sessionUser.companyId,
        customerCode: profile!.brokerCode,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tickets.map(t => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      resolvedAt: t.resolvedAt?.toISOString(),
      messages: JSON.parse(t.messagesJson || "[]"),
    })));
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to load support tickets." }, { status: 500 });
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

    const newTicket = await db.helpdeskTicket.create({
      data: {
        companyId: sessionUser.companyId,
        ticketId: `TKT-${Math.floor(Math.random() * 90000 + 10000)}`,
        subject: body.subject,
        description: body.description,
        customer: profile!.companyName,
        customerCode: profile!.brokerCode,
        priority: body.priority || "Medium",
        status: "New",
        channel: "Portal",
        team: "Broker Support",
        assignee: "Unassigned",
        requester: profile!.contactName,
        requesterEmail: profile!.email,
        category: body.category || "General",
        messagesJson: JSON.stringify([
          {
            id: `msg-${Date.now()}`,
            author: profile!.contactName,
            role: "customer",
            text: body.description,
            ts: new Date().toISOString(),
          }
        ]),
      },
    });

    return NextResponse.json({
      ...newTicket,
      createdAt: newTicket.createdAt.toISOString(),
      updatedAt: newTicket.updatedAt.toISOString(),
      resolvedAt: newTicket.resolvedAt?.toISOString(),
      messages: JSON.parse(newTicket.messagesJson),
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to create support ticket.", details: err.message }, { status: 500 });
  }
}

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

    const existing = await db.helpdeskTicket.findUnique({
      where: { id: params.id, companyId: sessionUser.companyId },
    });

    if (!existing || existing.customerCode !== profile!.brokerCode) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    let messages = JSON.parse(existing.messagesJson || "[]");
    if (body.message) {
      messages.push({
        id: `msg-${Date.now()}`,
        author: profile!.contactName,
        role: "customer",
        text: body.message,
        ts: new Date().toISOString(),
      });
    }

    const updated = await db.helpdeskTicket.update({
      where: { id: params.id },
      data: {
        messagesJson: JSON.stringify(messages),
        status: existing.status === "Resolved" || existing.status === "Closed" ? "New" : existing.status,
      },
    });

    return NextResponse.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      resolvedAt: updated.resolvedAt?.toISOString(),
      messages: JSON.parse(updated.messagesJson),
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to update support ticket.", details: err.message }, { status: 500 });
  }
}

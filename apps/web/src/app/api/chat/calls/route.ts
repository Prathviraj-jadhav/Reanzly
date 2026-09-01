import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Scheduled calls. The Call model and chat-service's call:invite handler
// (mini-services/chat-service/index.ts) already support *resuming* a
// scheduled call via scheduledCallId - this route is what actually creates
// that row and lets a user see/cancel their own upcoming ones. Signaling
// (ringing, SDP/ICE) stays entirely in chat-service; this is just the
// at-rest record, same split as the rest of Call's own schema comment.

// GET /api/chat/calls?conversationId=... (conversationId optional)
// Returns this user's own scheduled calls, soonest first.
export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const conversationId = req.nextUrl.searchParams.get("conversationId");

  // participantIds is a JSON string column, not a native array - SQLite/
  // Prisma can't filter its contents server-side, so fetch this company's
  // scheduled calls and filter membership in JS. Fine at this data scale
  // (same trade-off `db-tool.ts` already makes for its own capped queries).
  const candidates = await db.call.findMany({
    where: {
      companyId: sessionUser.companyId,
      status: "scheduled",
      ...(conversationId ? { conversationId } : {}),
    },
    orderBy: { scheduledFor: "asc" },
  });

  const mine = candidates.filter((c) => {
    try {
      return (JSON.parse(c.participantIds) as string[]).includes(sessionUser.id);
    } catch {
      return false;
    }
  });

  return NextResponse.json({
    calls: mine.map((c) => ({
      id: c.id,
      conversationId: c.conversationId,
      type: c.type,
      scheduledFor: c.scheduledFor,
      initiatorId: c.initiatorId,
      participantIds: JSON.parse(c.participantIds),
      createdAt: c.createdAt,
    })),
  });
}

// POST /api/chat/calls
// Body: { conversationId?, calleeId, type: "audio"|"video", scheduledFor: ISO string }
export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json();
  const conversationId: string | null = body.conversationId ? String(body.conversationId) : null;
  const calleeId = String(body.calleeId || "");
  const type = body.type === "video" ? "video" : "audio";
  const scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;

  if (!calleeId) {
    return NextResponse.json({ error: "calleeId is required" }, { status: 400 });
  }
  if (!scheduledFor || Number.isNaN(scheduledFor.getTime())) {
    return NextResponse.json({ error: "scheduledFor must be a valid date" }, { status: 400 });
  }
  if (scheduledFor.getTime() < Date.now() - 60_000) {
    return NextResponse.json({ error: "scheduledFor must be in the future" }, { status: 400 });
  }

  if (conversationId) {
    const participant = await db.chatParticipant.findFirst({
      where: { conversationId, userId: sessionUser.id },
    });
    if (!participant) {
      return NextResponse.json({ error: "Not a participant of that conversation." }, { status: 403 });
    }
  }

  const call = await db.call.create({
    data: {
      companyId: sessionUser.companyId,
      conversationId,
      initiatorId: sessionUser.id,
      type,
      status: "scheduled",
      participantIds: JSON.stringify([sessionUser.id, calleeId]),
      scheduledFor,
    },
  });

  return NextResponse.json({
    call: {
      id: call.id,
      conversationId: call.conversationId,
      type: call.type,
      scheduledFor: call.scheduledFor,
      initiatorId: call.initiatorId,
      participantIds: JSON.parse(call.participantIds),
    },
  });
}

// DELETE /api/chat/calls?callId=...
// Only the initiator can cancel their own still-scheduled call.
export async function DELETE(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const callId = req.nextUrl.searchParams.get("callId");
  if (!callId) {
    return NextResponse.json({ error: "callId is required" }, { status: 400 });
  }

  const call = await db.call.findUnique({ where: { id: callId } });
  if (!call || call.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Call not found." }, { status: 404 });
  }
  if (call.initiatorId !== sessionUser.id) {
    return NextResponse.json({ error: "Only the call's organizer can cancel it." }, { status: 403 });
  }
  if (call.status !== "scheduled") {
    return NextResponse.json({ error: "Call is no longer scheduled." }, { status: 409 });
  }

  await db.call.update({ where: { id: callId }, data: { status: "cancelled", endedAt: new Date() } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ROLE_ARCHETYPES } from "@/lib/mock-data";
import type { Conversation } from "@/lib/types";
import { getSessionUser } from "@/lib/auth";

// POST /api/chat/conversations
// Body:
//   { kind: "dm", otherUserId }              -> find or create a DM
//   { kind: "join_channel", channelId }      -> join an open channel
//   { kind: "create_group", name, memberIds } -> create a group
//
// The acting user (`userId` below) always comes from the verified session,
// never the request body - otherwise any caller could create DMs, join
// channels, or create groups as any other user.
//
// After creation, the route pings the chat service's /internal/broadcast so the
// other participant(s) get a `conversation:new` event on their open socket.
export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const userId = sessionUser.id;

  const body = await req.json();
  const kind = body?.kind;

  // Resolve role display data for participant rows.
  function roleFor(id: string) {
    if (id === "rean") {
      return { name: "Rean", role: "AI", initials: "RE" };
    }
    const r = ROLE_ARCHETYPES.find((x) => x.id === id);
    return { name: r?.name ?? id, role: r?.name.split(" ")[1] ?? "Staff", initials: r?.initials ?? "??".slice(0, 2) };
  }

  if (kind === "dm") {
    const otherUserId = String(body.otherUserId || "");
    if (!otherUserId) {
      return NextResponse.json({ error: "otherUserId required" }, { status: 400 });
    }
    // Find an existing DM between these two (type=direct, both participants).
    const existing = await db.chatConversation.findFirst({
      where: {
        type: "direct",
        participants: { every: { userId: { in: [userId, otherUserId] } } },
      },
      include: { participants: true },
    });
    // Ensure exactly 2 participants.
    if (existing && existing.participants.length === 2) {
      return NextResponse.json({ conversation: serializeConversation(existing) });
    }

    const me = roleFor(userId);
    const other = roleFor(otherUserId);
    const name =
      otherUserId === "rean" ? "Rean" : `${me.name} & ${other.name}`;
    const conv = await db.chatConversation.create({
      data: {
        name,
        type: "direct",
        private: true,
        createdBy: userId,
        participants: {
          create: [
            { userId, userName: me.name, userRole: me.role, userInitials: me.initials },
            { userId: otherUserId, userName: other.name, userRole: other.role, userInitials: other.initials },
          ],
        },
      },
      include: { participants: true },
    });
    await broadcastConversationNew(conv, [userId, otherUserId]);
    return NextResponse.json({ conversation: serializeConversation(conv) });
  }

  if (kind === "join_channel") {
    const channelId = String(body.channelId || "");
    if (!channelId) {
      return NextResponse.json({ error: "channelId required" }, { status: 400 });
    }
    const me = roleFor(userId);
    const existing = await db.chatParticipant.findUnique({
      where: { conversationId_userId: { conversationId: channelId, userId } },
    });
    if (existing) {
      return NextResponse.json({ joined: true, already: true });
    }
    await db.chatParticipant.create({
      data: { conversationId: channelId, userId, userName: me.name, userRole: me.role, userInitials: me.initials },
    });
    await broadcastRoomEvent(`conv:${channelId}`, "presence:update", { userId, presence: "online" });
    return NextResponse.json({ joined: true });
  }

  if (kind === "create_group") {
    const name = String(body.name || "").trim();
    const memberIds: string[] = Array.isArray(body.memberIds) ? body.memberIds : [];
    if (!name || memberIds.length === 0) {
      return NextResponse.json({ error: "name and memberIds required" }, { status: 400 });
    }
    const allIds = Array.from(new Set([userId, ...memberIds]));
    const conv = await db.chatConversation.create({
      data: {
        name,
        type: "group",
        private: true,
        createdBy: userId,
        participants: {
          create: allIds.map((id) => {
            const r = roleFor(id);
            return { userId: id, userName: r.name, userRole: r.role, userInitials: r.initials };
          }),
        },
      },
      include: { participants: true },
    });
    await broadcastConversationNew(conv, allIds);
    return NextResponse.json({ conversation: serializeConversation(conv) });
  }

  return NextResponse.json({ error: "unknown kind" }, { status: 400 });
}

function serializeConversation(conv: any): Conversation {
  return {
    id: conv.id,
    name: conv.name,
    type: conv.type,
    participants: conv.participants.map((p: any) => p.userId),
    unread: 0,
    isMember: true,
    private: conv.private,
    description: conv.description ?? undefined,
    topic: conv.topic ?? undefined,
  };
}

// Notify the chat service so it can fan out a `conversation:new` event to the
// listed users' personal rooms and tell the sender's socket to join the room.
async function broadcastConversationNew(conv: any, userIds: string[]) {
  try {
    await fetch("http://localhost:3003/internal/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "conversation:new",
        userIds,
        payload: { conversation: serializeConversation(conv), userIds },
      }),
    });
  } catch (e) {
    // Chat service may be down; the client will reconcile on next init().
    console.error("[chat] broadcast conversation:new failed:", e);
  }
}

async function broadcastRoomEvent(room: string, event: string, payload: any) {
  try {
    await fetch("http://localhost:3003/internal/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, room, payload }),
    });
  } catch (e) {
    console.error("[chat] broadcast room event failed:", e);
  }
}

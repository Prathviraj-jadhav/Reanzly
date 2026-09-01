import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ChatMessage } from "@/lib/types";
import { chatInternalBroadcastHeaders, chatServiceBaseUrl } from "@/lib/chat-broadcast";

// POST /api/chat/messages
// REST fallback for sending a message when the socket isn't connected. The
// socket path is preferred (it persists + fans out atomically); this route
// just persists so the next init() picks it up. Returns the saved message.
//
// sender identity comes from the verified session, never from the request
// body - a client-supplied senderId would let any caller post messages as
// any other user.
export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json();
  const conversationId = body?.conversationId;
  const senderId = sessionUser.id;
  const senderName = sessionUser.name;
  const senderRole = sessionUser.role;
  const text = String(body?.text || "").slice(0, 5000);
  if (!conversationId || (!text && !body?.attachment && !body?.isPoll)) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  // Verify sender is a participant.
  const participating = await db.chatParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: senderId } },
  });
  if (!participating) {
    return NextResponse.json({ error: "not a participant" }, { status: 403 });
  }
  const msg = await db.chatMessage.create({
    data: {
      conversationId,
      senderId,
      senderName,
      senderRole,
      text,
      parentId: body?.parentId ?? null,
      attachment: body?.attachment ? JSON.stringify(body.attachment) : null,
      forwardedFrom: body?.forwardedFrom ? JSON.stringify(body.forwardedFrom) : null,
      isRean: !!body?.isRean,
      isPoll: body?.isPoll ? JSON.stringify(body.isPoll) : null,
      isCommandResult: !!body?.isCommandResult,
    },
  });
  await db.chatConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });
  // Best-effort fan-out via the chat service.
  try {
    await fetch(`${chatServiceBaseUrl()}/internal/broadcast`, {
      method: "POST",
      headers: chatInternalBroadcastHeaders(),
      body: JSON.stringify({
        event: "message:new",
        room: `conv:${conversationId}`,
        payload: {
          id: msg.id,
          conversationId: msg.conversationId,
          sender: msg.senderName,
          senderId: msg.senderId,
          senderRole: msg.senderRole,
          text: msg.text,
          timestamp: msg.createdAt.toISOString(),
          read: true,
          parentId: msg.parentId ?? null,
          attachment: msg.attachment ? JSON.parse(msg.attachment) : null,
          forwardedFrom: msg.forwardedFrom ? JSON.parse(msg.forwardedFrom) : null,
          isRean: msg.isRean,
          isPoll: msg.isPoll ? JSON.parse(msg.isPoll) : null,
          isCommandResult: msg.isCommandResult,
          pinned: msg.pinned,
          reactions: [],
          readBy: [],
        },
      }),
    });
  } catch {}
  return NextResponse.json({ ok: true, id: msg.id });
}

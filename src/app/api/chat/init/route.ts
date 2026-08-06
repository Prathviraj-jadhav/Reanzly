import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type {
  ChatMessage,
  Conversation,
  ChatEntity,
  PresenceState,
} from "@/lib/types";
import { ROLE_ARCHETYPES, REAN_ENTITY } from "@/lib/mock-data";
import { getSessionUser } from "@/lib/auth";

// GET /api/chat/init
// Returns the full initial chat state for the *real, session-verified*
// current user - not a client-supplied userId, which would let any caller
// request any other user's private conversation history:
//   - conversations they participate in (with unread counts + last message)
//   - recent messages (last 60 per conversation, top-level + thread replies)
//   - all chat entities (roles + Rean) for mention/DM UI
//   - presence map (everyone offline by default; the socket server flips to online)
//
// This is the REST hydration path. Once loaded, the socket.io service pushes
// real-time deltas (message:new, typing:update, reaction:update, ...).
export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const userId = sessionUser.id;

  // Conversations the user is a participant in.
  const participations = await db.chatParticipant.findMany({
    where: { userId },
    include: {
      conversation: {
        include: { participants: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });

  // All chat entities (from ROLE_ARCHETYPES + Rean).
  const entities: ChatEntity[] = [
    ...ROLE_ARCHETYPES.map((r) => ({
      id: r.id,
      name: r.name,
      email: `${r.name.toLowerCase().replace(/\s+/g, ".")}@reanzly.in`,
      role: r.name.split(" ")[1] || "Staff",
      avatar: r.avatar,
      branch: r.branch,
      initials: r.initials,
      presence: "offline" as PresenceState,
    })),
    REAN_ENTITY,
  ];

  const conversations: Conversation[] = [];
  const allMessages: ChatMessage[] = [];

  for (const p of participations) {
    const conv = p.conversation;
    const participantIds = conv.participants.map((pp) => pp.userId);

    const lastReadAt = p.lastReadAt ? new Date(p.lastReadAt) : new Date(0);
    const unreadMessages = await db.chatMessage.findMany({
      where: {
        conversationId: conv.id,
        senderId: { not: userId },
        createdAt: { gt: lastReadAt },
        parentId: null,
      },
      select: { id: true },
    });

    const recentTopLevel = await db.chatMessage.findMany({
      where: { conversationId: conv.id, parentId: null },
      orderBy: { createdAt: "desc" },
      take: 60,
    });
    const topLevelIds = recentTopLevel.map((m) => m.id);
    const threadReplies = topLevelIds.length
      ? await db.chatMessage.findMany({
          where: { conversationId: conv.id, parentId: { in: topLevelIds } },
          orderBy: { createdAt: "asc" },
        })
      : [];

    const combined = [...recentTopLevel, ...threadReplies];

    for (const m of combined) {
      const reactions = await db.chatReaction.findMany({ where: { messageId: m.id } });
      const readBy = await db.chatReadReceipt.findMany({ where: { messageId: m.id } });
      allMessages.push({
        id: m.id,
        conversationId: m.conversationId,
        sender: m.senderName,
        senderId: m.senderId,
        senderRole: m.senderRole,
        text: m.text,
        timestamp: m.createdAt.toISOString(),
        read: m.senderId === userId || readBy.some((r) => r.userId === userId),
        readBy: readBy.map((r) => r.userId),
        isRean: m.isRean,
        attachment: m.attachment ? JSON.parse(m.attachment) : undefined,
        forwardedFrom: m.forwardedFrom ? JSON.parse(m.forwardedFrom) : undefined,
        isPoll: m.isPoll ? JSON.parse(m.isPoll) : undefined,
        isCommandResult: m.isCommandResult,
        pinned: m.pinned,
        parentId: m.parentId ?? undefined,
        reactions: reactions.length
          ? Object.entries(
              reactions.reduce<Record<string, string[]>>((acc, r) => {
                (acc[r.emoji] ||= []).push(r.userId);
                return acc;
              }, {})
            ).map(([emoji, users]) => ({ emoji, users }))
          : undefined,
      });
    }

    const lastMsg = conv.messages[0];
    conversations.push({
      id: conv.id,
      name: conv.name,
      type: conv.type as Conversation["type"],
      participants: participantIds,
      lastMessage: lastMsg?.text.slice(0, 120),
      lastTimestamp: lastMsg?.createdAt.toISOString(),
      unread: unreadMessages.length,
      description: conv.description ?? undefined,
      isMember: true,
      private: conv.private,
      topic: conv.topic ?? undefined,
    });
  }

  return NextResponse.json({
    conversations,
    messages: allMessages,
    entities,
    currentUserId: userId,
  });
}

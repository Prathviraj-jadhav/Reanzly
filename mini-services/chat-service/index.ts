// Reanzly Real-Time Chat Service
// Socket.io server on port 3003. Reads/writes the same SQLite DB the Next.js
// app uses (via Prisma), but here via bun:sqlite for zero-dependency access.
//
// Events (client -> server):
//   message:send    { conversationId, text, parentId?, attachment?, forwardedFrom?, isPoll? }
//   message:edit    { messageId, text }
//   typing:start    { conversationId }
//   typing:stop     { conversationId }
//   reaction:toggle { messageId, emoji }
//   message:read    { conversationId }
//   message:pin     { messageId, pinned }
//   message:delete  { messageId }          (soft-delete: tombstones, doesn't remove the row)
//   poll:vote       { messageId, optionId }
//
// Events (server -> client):
//   message:new        ChatMessagePayload
//   message:updated    { id, pinned? } | { id, text, edited, editedAt } | { id, deleted: true }
//   typing:update      { conversationId, userId, name, typing }
//   reaction:update    { messageId, emoji, users }
//   read:update        { conversationId, userId, lastReadAt }
//   presence:update    { userId, presence }
//   conversation:new   ConversationPayload (when a DM is created)
//   poll:updated        { messageId, options: { id, text, votes: string[] }[] }
//   connected          { userId, conversations: string[] }
//
// NOTE: there is no "message:deleted" event - deletion is soft (tombstone) and is
// broadcast as "message:updated" with { id, deleted: true } instead.

import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { Database } from "bun:sqlite";

// ===== DB =====
// Same DB the Next.js/Prisma process uses. Derive from DATABASE_URL (file:...)
// so this works across environments instead of a hardcoded sandbox path.
const envUrl = process.env.DATABASE_URL;
const DB_PATH = envUrl?.startsWith("file:")
  ? envUrl.slice("file:".length).replace(/^"|"$/g, "")
  : new URL("../../db/custom.db", import.meta.url).pathname;
const db = new Database(DB_PATH);
// WAL mode so the Next.js/Prisma process and this socket process can read/write
// concurrently without blocking each other.
db.run("PRAGMA journal_mode=WAL;");
db.run("PRAGMA busy_timeout=5000;");

// ===== Types =====
interface AuthPayload {
  userId: string;
  userName: string;
  userRole: string;
  userInitials?: string;
}

interface ChatMessagePayload {
  id: string;
  conversationId: string;
  sender: string;
  senderId: string;
  senderRole: string;
  text: string;
  parentId: string | null;
  attachment: any | null;
  forwardedFrom: any | null;
  isRean: boolean;
  isPoll: any | null;
  isCommandResult: boolean;
  pinned: boolean;
  timestamp: string;
  reactions: { emoji: string; users: string[] }[];
  readBy: string[];
}

// ===== Helpers =====
function rowToMessage(row: any): ChatMessagePayload {
  const reactions = db
    .query("SELECT emoji, userId FROM ChatReaction WHERE messageId = ?")
    .all(row.id) as { emoji: string; userId: string }[];
  const reactionMap = new Map<string, string[]>();
  for (const r of reactions) {
    if (!reactionMap.has(r.emoji)) reactionMap.set(r.emoji, []);
    reactionMap.get(r.emoji)!.push(r.userId);
  }
  const readBy = (
    db
      .query("SELECT userId FROM ChatReadReceipt WHERE messageId = ?")
      .all(row.id) as { userId: string }[]
  ).map((r) => r.userId);
  return {
    id: row.id,
    conversationId: row.conversationId,
    // Client ChatMessage type uses `sender` (display name), not `senderName`.
    sender: row.senderName,
    senderId: row.senderId,
    senderRole: row.senderRole,
    text: row.text,
    parentId: row.parentId ?? null,
    attachment: row.attachment ? JSON.parse(row.attachment) : null,
    forwardedFrom: row.forwardedFrom ? JSON.parse(row.forwardedFrom) : null,
    isRean: !!row.isRean,
    isPoll: row.isPoll ? JSON.parse(row.isPoll) : null,
    isCommandResult: !!row.isCommandResult,
    pinned: !!row.pinned,
    // Client ChatMessage type uses `timestamp` (ISO string), not `createdAt`.
    timestamp: new Date(row.createdAt).toISOString(),
    reactions: Array.from(reactionMap.entries()).map(([emoji, users]) => ({ emoji, users })),
    readBy,
  };
}

function getUserConversations(userId: string): string[] {
  const rows = db
    .query("SELECT conversationId FROM ChatParticipant WHERE userId = ?")
    .all(userId) as { conversationId: string }[];
  return rows.map((r) => r.conversationId);
}

function isParticipant(conversationId: string, userId: string): boolean {
  const row = db
    .query("SELECT id FROM ChatParticipant WHERE conversationId = ? AND userId = ?")
    .get(conversationId, userId);
  return !!row;
}

function insertMessage(params: {
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  parentId?: string | null;
  attachment?: any | null;
  forwardedFrom?: any | null;
  isRean?: boolean;
  isPoll?: any | null;
  isCommandResult?: boolean;
}): ChatMessagePayload | null {
  try {
    const id = `msg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    db.query(
      `INSERT INTO ChatMessage (id, conversationId, senderId, senderName, senderRole, text, parentId, attachment, forwardedFrom, isRean, isPoll, isCommandResult, pinned)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    ).run(
      id,
      params.conversationId,
      params.senderId,
      params.senderName,
      params.senderRole,
      params.text,
      params.parentId ?? null,
      params.attachment ? JSON.stringify(params.attachment) : null,
      params.forwardedFrom ? JSON.stringify(params.forwardedFrom) : null,
      params.isRean ? 1 : 0,
      params.isPoll ? JSON.stringify(params.isPoll) : null,
      params.isCommandResult ? 1 : 0
    );
    db.query("UPDATE ChatConversation SET updatedAt = ? WHERE id = ?").run(
      new Date().toISOString(),
      params.conversationId
    );
    const row = db.query("SELECT * FROM ChatMessage WHERE id = ?").get(id);
    return row ? rowToMessage(row) : null;
  } catch (e) {
    console.error("[chat] insertMessage error:", e);
    return null;
  }
}

// ===== Rean AI integration =====
// When a user sends a message in the Rean DM conversation, we call the Next.js
// /api/rean endpoint and post the AI reply as a real message from "rean".
async function triggerReanReply(conversationId: string, context: string, role: string) {
  try {
    // Typing indicator while Rean "thinks".
    io.to(`conv:${conversationId}`).emit("typing:update", {
      conversationId,
      userId: "rean",
      name: "Rean",
      typing: true,
    });
    const res = await fetch("http://localhost:3000/api/rean", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: context, role }),
    });
    const data = await res.json();
    const reply = data.reply || "I couldn't process that. Try rephrasing.";
    io.to(`conv:${conversationId}`).emit("typing:update", {
      conversationId,
      userId: "rean",
      name: "Rean",
      typing: false,
    });
    const msg = insertMessage({
      conversationId,
      senderId: "rean",
      senderName: "Rean",
      senderRole: "AI",
      text: reply,
      isRean: true,
    });
    if (msg) io.to(`conv:${conversationId}`).emit("message:new", msg);
  } catch (e) {
    console.error("[chat] Rean reply error:", e);
    io.to(`conv:${conversationId}`).emit("typing:update", {
      conversationId,
      userId: "rean",
      name: "Rean",
      typing: false,
    });
    const msg = insertMessage({
      conversationId,
      senderId: "rean",
      senderName: "Rean",
      senderRole: "AI",
      text: "Connection issue. Try again in a moment.",
      isRean: true,
    });
    if (msg) io.to(`conv:${conversationId}`).emit("message:new", msg);
  }
}

function isReanConversation(conversationId: string): boolean {
  const row = db
    .query("SELECT userId FROM ChatParticipant WHERE conversationId = ? AND userId = ?")
    .get(conversationId, "rean");
  return !!row;
}

// ===== Presence =====
// userId -> Set<socketId>. A user may have multiple tabs open.
const onlineSockets = new Map<string, Set<string>>();

function setOnline(userId: string, socketId: string) {
  if (!onlineSockets.has(userId)) onlineSockets.set(userId, new Set());
  onlineSockets.get(userId)!.add(socketId);
  io.emit("presence:update", { userId, presence: "online" });
}

function setOffline(userId: string, socketId: string) {
  const set = onlineSockets.get(userId);
  if (set) {
    set.delete(socketId);
    if (set.size === 0) {
      onlineSockets.delete(userId);
      io.emit("presence:update", { userId, presence: "offline" });
    }
  }
}

// ===== HTTP server + Socket.io =====
const httpServer = createServer();
const io = new Server(httpServer, {
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Internal broadcast endpoint - used by the Next.js REST API to fan out events
// (e.g. when a new DM conversation is created via REST, tell both participants).
// IMPORTANT: socket.io also listens on httpServer "request" events. We must
// only handle OUR routes (/internal/broadcast and /chat-health) and ignore
// everything else (socket.io polling/upgrades), otherwise we get
// "Cannot writeHead headers after they are sent".
httpServer.on("request", (req, res) => {
  // socket.io (path: "/") intercepts all GET requests and writes a response
  // for non-engine.io paths. We only handle our POST /internal/broadcast route
  // and guard against headers already being sent.
  if (res.headersSent) return;
  if (req.method === "POST" && req.url === "/internal/broadcast") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      if (res.headersSent) return;
      try {
        const { event, room, payload, userIds } = JSON.parse(body);
        if (userIds && Array.isArray(userIds)) {
          for (const uid of userIds) io.to(`user:${uid}`).emit(event, payload);
        } else if (room) {
          io.to(room).emit(event, payload);
        } else {
          io.emit(event, payload);
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400);
        res.end("bad payload");
      }
    });
    return;
  }
  // All other requests (socket.io polling, upgrades, GETs) are handled by
  // socket.io's own request listener - we do nothing here.
});

io.use((socket: Socket, next) => {
  const auth = socket.handshake.auth as AuthPayload;
  if (!auth || !auth.userId) {
    return next(new Error("no auth"));
  }
  (socket as any).user = auth;
  next();
});

io.on("connection", (socket: Socket) => {
  const user = (socket as any).user as AuthPayload;
  const { userId, userName, userRole } = user;

  // Join all conversation rooms the user is a participant in.
  const convIds = getUserConversations(userId);
  for (const cid of convIds) socket.join(`conv:${cid}`);
  // Personal room for direct user-targeted events (new DM creation).
  socket.join(`user:${userId}`);
  setOnline(userId, socket.id);

  socket.emit("connected", { userId, conversations: convIds });
  console.log(`[chat] ${userName} (${userId}) connected - ${convIds.length} conversations`);

  // ===== message:send =====
  socket.on("message:send", (payload: any) => {
    const conversationId = payload?.conversationId;
    if (!conversationId || !isParticipant(conversationId, userId)) return;
    const text = String(payload?.text || "").slice(0, 5000);
    if (!text && !payload?.attachment && !payload?.isPoll) return;

    const msg = insertMessage({
      conversationId,
      senderId: userId,
      senderName: userName,
      senderRole: userRole,
      text,
      parentId: payload?.parentId ?? null,
      attachment: payload?.attachment ?? null,
      forwardedFrom: payload?.forwardedFrom ?? null,
      isPoll: payload?.isPoll ?? null,
      isCommandResult: !!payload?.isCommandResult,
    });
    if (!msg) return;
    io.to(`conv:${conversationId}`).emit("message:new", msg);

    // Trigger a Rean AI reply when:
    //   - the message is sent in the Rean DM conversation, OR
    //   - the message text mentions @[Rean](rean)
    // Skip command-result messages (e.g. /help output) so Rean doesn't echo itself.
    const mentionsRean = /@\[Rean\]\(rean\)/.test(text);
    if (!payload?.isCommandResult && (isReanConversation(conversationId) || mentionsRean)) {
      // For mention-in-channel, strip the mention token so Rean gets clean text.
      const cleanCtx = mentionsRean ? text.replace(/@\[Rean\]\(rean\)\s*/g, "") : text;
      triggerReanReply(conversationId, cleanCtx, userRole).catch(console.error);
    }
  });

  // ===== room:join =====
  // Called by a client after creating/joining a new conversation via REST, so
  // their socket starts receiving events for that conversation room.
  socket.on("room:join", (payload: any) => {
    const conversationId = payload?.conversationId;
    if (!conversationId) return;
    // Verify the user is actually a participant before joining the room.
    if (!isParticipant(conversationId, userId)) return;
    socket.join(`conv:${conversationId}`);
  });

  // ===== typing =====
  socket.on("typing:start", (payload: any) => {
    const conversationId = payload?.conversationId;
    if (!conversationId || !isParticipant(conversationId, userId)) return;
    socket.to(`conv:${conversationId}`).emit("typing:update", {
      conversationId,
      userId,
      name: userName,
      typing: true,
    });
  });

  socket.on("typing:stop", (payload: any) => {
    const conversationId = payload?.conversationId;
    if (!conversationId) return;
    socket.to(`conv:${conversationId}`).emit("typing:update", {
      conversationId,
      userId,
      name: userName,
      typing: false,
    });
  });

  // ===== reaction:toggle =====
  socket.on("reaction:toggle", (payload: any) => {
    const messageId = payload?.messageId;
    const emoji = String(payload?.emoji || "").slice(0, 32);
    if (!messageId || !emoji) return;
    const msgRow = db.query("SELECT conversationId FROM ChatMessage WHERE id = ?").get(messageId) as
      | { conversationId: string }
      | null;
    if (!msgRow) return;
    if (!isParticipant(msgRow.conversationId, userId)) return;

    const existing = db
      .query("SELECT id FROM ChatReaction WHERE messageId = ? AND userId = ? AND emoji = ?")
      .get(messageId, userId, emoji);
    if (existing) {
      db.query("DELETE FROM ChatReaction WHERE id = ?").run(existing.id);
    } else {
      db.query("INSERT INTO ChatReaction (id, messageId, userId, emoji) VALUES (?, ?, ?, ?)").run(
        `rxn_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        messageId,
        userId,
        emoji
      );
    }
    const users = (
      db
        .query("SELECT userId FROM ChatReaction WHERE messageId = ? AND emoji = ?")
        .all(messageId, emoji) as { userId: string }[]
    ).map((r) => r.userId);
    io.to(`conv:${msgRow.conversationId}`).emit("reaction:update", { messageId, emoji, users });
  });

  // ===== message:read =====
  socket.on("message:read", (payload: any) => {
    const conversationId = payload?.conversationId;
    if (!conversationId || !isParticipant(conversationId, userId)) return;
    const now = new Date().toISOString();
    db.query("UPDATE ChatParticipant SET lastReadAt = ? WHERE conversationId = ? AND userId = ?").run(
      now,
      conversationId,
      userId
    );
    // Record read receipts for all messages in this conversation not yet read by user.
    db.query(
      `INSERT OR IGNORE INTO ChatReadReceipt (id, messageId, userId)
       SELECT 'rcpt_' || m.id || '_' || ?, m.id, ? FROM ChatMessage m
       WHERE m.conversationId = ? AND m.senderId != ?`
    ).run(userId, userId, conversationId, userId);
    io.to(`conv:${conversationId}`).emit("read:update", {
      conversationId,
      userId,
      lastReadAt: now,
    });
  });

  // ===== message:pin =====
  socket.on("message:pin", (payload: any) => {
    const messageId = payload?.messageId;
    const pinned = !!payload?.pinned;
    if (!messageId) return;
    const msgRow = db.query("SELECT conversationId FROM ChatMessage WHERE id = ?").get(messageId) as
      | { conversationId: string }
      | null;
    if (!msgRow) return;
    if (!isParticipant(msgRow.conversationId, userId)) return;
    db.query("UPDATE ChatMessage SET pinned = ? WHERE id = ?").run(pinned ? 1 : 0, messageId);
    io.to(`conv:${msgRow.conversationId}`).emit("message:updated", { id: messageId, pinned });
  });

  // ===== message:delete =====
  // Soft-delete: the row stays (so replies/threads/reactions referencing it don't
  // dangle) but is tombstoned - text cleared and `deleted` flagged. Broadcast as
  // "message:updated" so clients patch the existing message in place.
  socket.on("message:delete", (payload: any) => {
    const messageId = payload?.messageId;
    if (!messageId) return;
    const msgRow = db
      .query("SELECT conversationId, senderId FROM ChatMessage WHERE id = ?")
      .get(messageId) as { conversationId: string; senderId: string } | null;
    if (!msgRow) return;
    // Only the sender can delete their own message.
    if (msgRow.senderId !== userId) return;
    db.query("UPDATE ChatMessage SET deleted = 1, text = '' WHERE id = ?").run(messageId);
    io.to(`conv:${msgRow.conversationId}`).emit("message:updated", { id: messageId, deleted: true });
  });

  // ===== message:edit =====
  socket.on("message:edit", (payload: any) => {
    const messageId = payload?.messageId;
    if (!messageId) return;
    const text = String(payload?.text ?? "").slice(0, 5000);
    if (!text) return;
    const msgRow = db
      .query("SELECT conversationId, senderId, deleted FROM ChatMessage WHERE id = ?")
      .get(messageId) as { conversationId: string; senderId: string; deleted: number } | null;
    if (!msgRow) return;
    // Only the sender can edit their own message, and a tombstoned message can't
    // be edited back to life.
    if (msgRow.senderId !== userId || msgRow.deleted) return;
    const editedAt = new Date().toISOString();
    db.query("UPDATE ChatMessage SET text = ?, edited = 1, editedAt = ? WHERE id = ?").run(
      text,
      editedAt,
      messageId
    );
    io.to(`conv:${msgRow.conversationId}`).emit("message:updated", {
      id: messageId,
      text,
      edited: true,
      editedAt,
    });
  });

  // ===== poll:vote =====
  socket.on("poll:vote", (payload: any) => {
    const messageId = payload?.messageId;
    const optionId = payload?.optionId ? String(payload.optionId) : null;
    if (!messageId || !optionId) return;
    const msgRow = db
      .query("SELECT conversationId, isPoll FROM ChatMessage WHERE id = ?")
      .get(messageId) as { conversationId: string; isPoll: string | null } | null;
    if (!msgRow || !msgRow.isPoll) return;
    if (!isParticipant(msgRow.conversationId, userId)) return;

    let poll: { question: string; options: { id: string; text: string; votes: string[] }[] };
    try {
      poll = JSON.parse(msgRow.isPoll);
    } catch {
      return;
    }
    // Ignore votes for an option that doesn't exist on this poll.
    if (!poll.options?.some((o) => o.id === optionId)) return;

    db.query(
      `INSERT INTO ChatPollVote (id, messageId, userId, optionId, createdAt)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(messageId, userId) DO UPDATE SET optionId = excluded.optionId`
    ).run(
      `pv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      messageId,
      userId,
      optionId,
      new Date().toISOString()
    );

    // Recompute the full tally from ChatPollVote (source of truth) and rebuild
    // each option's votes array, then persist the merged shape back onto the
    // message row so future reads see the up-to-date poll.
    const allVotes = db
      .query("SELECT userId, optionId FROM ChatPollVote WHERE messageId = ?")
      .all(messageId) as { userId: string; optionId: string }[];
    const votesByOption = new Map<string, string[]>();
    for (const v of allVotes) {
      if (!votesByOption.has(v.optionId)) votesByOption.set(v.optionId, []);
      votesByOption.get(v.optionId)!.push(v.userId);
    }
    const options = poll.options.map((opt) => ({
      id: opt.id,
      text: opt.text,
      votes: votesByOption.get(opt.id) ?? [],
    }));
    poll.options = options;

    db.query("UPDATE ChatMessage SET isPoll = ? WHERE id = ?").run(JSON.stringify(poll), messageId);
    io.to(`conv:${msgRow.conversationId}`).emit("poll:updated", { messageId, options });
  });

  socket.on("disconnect", () => {
    setOffline(userId, socket.id);
    console.log(`[chat] ${userName} (${userId}) disconnected`);
  });

  socket.on("error", (err: any) => console.error(`[chat] socket error (${userId}):`, err));
});

const PORT = 3003;
httpServer.listen(PORT, () => {
  console.log(`[chat] Reanzly chat service running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  console.log("[chat] SIGTERM, shutting down...");
  httpServer.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  console.log("[chat] SIGINT, shutting down...");
  httpServer.close(() => process.exit(0));
});

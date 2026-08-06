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
//   -- WebRTC call signaling (relayed peer-to-peer, server never touches media) --
//   call:invite       { conversationId?, calleeIds: string[], type: "audio"|"video", scheduledCallId? }
//                      ACK callback: { ok: true, callId } | { ok: false, error }
//   call:accept       { callId }
//   call:reject       { callId }
//   call:cancel       { callId }           (caller gives up before anyone answers)
//   call:end          { callId }           (hang up a ringing/active call)
//   call:offer        { callId, sdp }      (relayed as-is to the other party)
//   call:answer       { callId, sdp }      (relayed as-is to the other party)
//   call:ice-candidate{ callId, candidate }(relayed as-is to the other party)
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
//   -- WebRTC call signaling (server -> client) --
//   call:incoming      { callId, conversationId, type, caller: {id,name,role}, participantIds }
//                       (delivered to each callee's personal "user:<id>" room)
//   call:accepted       { callId, by: {id,name} }   (delivered to the whole "call:<id>" room)
//   call:rejected       { callId, by: {id,name} }
//   call:cancelled      { callId }
//   call:ended          { callId, by?: {id,name}, reason?: "disconnect" }
//   call:offer/answer/ice-candidate - same shape as inbound, plus `from: userId`
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

// ===== Session validation =====
// Reads the same Session/User tables Next.js's /api/auth/* routes write to
// (via Prisma there, raw bun:sqlite here - same DB file). This is what makes
// chat identity real: nothing about "who is connecting" is ever trusted from
// client-supplied data - it's always looked up against a real, server-issued
// session token.
interface VerifiedUser {
  userId: string;
  userName: string;
  userRole: string;
  companyId: string;
}

function parseCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

function validateSessionToken(token: string | null): VerifiedUser | null {
  if (!token) return null;
  const row = db
    .query(
      `SELECT u.id as userId, u.name as userName, u.role as userRole, u.companyId as companyId, s.expiresAt as expiresAt
       FROM Session s JOIN User u ON u.id = s.userId
       WHERE s.token = ?`
    )
    .get(token) as (VerifiedUser & { expiresAt: string }) | null;
  if (!row) return null;
  if (parseDbTimestamp(row.expiresAt).getTime() < Date.now()) return null;
  return { userId: row.userId, userName: row.userName, userRole: row.userRole, companyId: row.companyId };
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
// Prisma's SQLite provider stores `DateTime @default(now())` columns as
// SQLite's CURRENT_TIMESTAMP - always UTC, but formatted as a naive
// 'YYYY-MM-DD HH:MM:SS' string with no timezone marker. `new Date(...)` on a
// string like that is NOT parsed as UTC per the ECMAScript spec - it's
// parsed using the runtime's *local* timezone (on Windows, Bun resolves that
// via the OS setting - e.g. IST - regardless of what a wrapping shell's own
// `date` command reports). That silently shifts every timestamp by the
// local UTC offset, and `.toISOString()` bakes the wrong moment into an
// otherwise-well-formed string, so the corruption isn't visible until a
// client converts it back to local time and lands on the wrong clock digits.
// Numbers (epoch ms, from Prisma-write paths elsewhere) and already-tagged
// ISO strings (with 'T'/'Z'/an offset) parse correctly as-is; only the
// naive-string case needs explicit UTC tagging before parsing.
function parseDbTimestamp(value: string | number): Date {
  if (typeof value === "number") return new Date(value);
  if (/[TZ]|[+-]\d\d:\d\d$/.test(value)) return new Date(value);
  return new Date(value.replace(" ", "T") + "Z");
}

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
    timestamp: parseDbTimestamp(row.createdAt).toISOString(),
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

// ===== Call helpers =====
// Reads/writes the same `Call` table Prisma owns (see prisma/schema.prisma)
// via raw bun:sqlite, same pattern as every other table in this file. Status
// lifecycle: scheduled -> ringing -> active -> ended
//                              \-> missed (callee explicitly rejected, or
//                                  never answered before a disconnect)
//                      ringing -> cancelled (caller gave up before answer)
interface CallRow {
  id: string;
  companyId: string;
  conversationId: string | null;
  initiatorId: string;
  type: string;
  status: string;
  participantIds: string; // JSON string array
  scheduledFor: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

function getCall(callId: string): CallRow | null {
  return (db.query("SELECT * FROM Call WHERE id = ?").get(callId) as CallRow | null) ?? null;
}

function callParticipantIds(call: CallRow): string[] {
  try {
    const ids = JSON.parse(call.participantIds);
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
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
// CORS_ORIGIN must be an explicit origin (not "*") because the session
// cookie needs `credentials: true` to cross from the app's origin to this
// service's own port, and browsers reject wildcard-origin CORS responses
// on credentialed requests.
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
const io = new Server(httpServer, {
  path: "/",
  cors: { origin: CORS_ORIGIN, methods: ["GET", "POST"], credentials: true },
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
  // The session cookie (HttpOnly, set by /api/auth/login) rides along
  // automatically on the handshake HTTP request when the client connects
  // with `withCredentials: true` - it is never readable by client JS, so a
  // malicious client cannot forge or read another user's token. Client-sent
  // `auth.userId` (if present at all) is display-only convenience for logs,
  // never trusted for identity.
  const token = parseCookie(socket.handshake.headers.cookie, "reanzly_session");
  const verified = validateSessionToken(token);
  if (!verified) {
    return next(new Error("unauthorized - please sign in"));
  }
  (socket as any).user = verified;
  next();
});

io.on("connection", (socket: Socket) => {
  const user = (socket as any).user as VerifiedUser;
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

  // ===== call:invite =====
  // Caller starts an immediate (or "start now" on a scheduled) call. Creates
  // a `Call` row (status "ringing"), joins the caller's own socket to the
  // call's private room, and delivers an incoming-call notification to each
  // callee's personal "user:<id>" room (the same room message-DM-creation
  // already uses). Identity for `initiatorId`/`caller` always comes from the
  // verified session (`userId`/`userName`/`userRole` above) - never from the
  // client payload. Acks the callId back to the caller via the socket.io
  // callback so it doesn't need a second round-trip event.
  socket.on("call:invite", (payload: any, ack?: (res: any) => void) => {
    const reply = typeof ack === "function" ? ack : () => {};
    const conversationId: string | null = payload?.conversationId ? String(payload.conversationId) : null;
    const type = payload?.type === "video" ? "video" : "audio";
    const calleeIds: string[] = Array.isArray(payload?.calleeIds)
      ? Array.from(new Set(payload.calleeIds.filter((id: any) => typeof id === "string" && id && id !== userId)))
      : [];
    if (calleeIds.length === 0) return reply({ ok: false, error: "no callee specified" });
    if (conversationId) {
      if (!isParticipant(conversationId, userId)) return reply({ ok: false, error: "not a participant" });
      for (const cid of calleeIds) {
        if (!isParticipant(conversationId, cid)) return reply({ ok: false, error: "callee not in conversation" });
      }
    }
    const participantIds = Array.from(new Set([userId, ...calleeIds]));

    // Starting a previously-scheduled call: reuse its row instead of
    // creating a duplicate, as long as it's still "scheduled" and this user
    // was the one who scheduled it.
    const scheduledCallId: string | null = payload?.scheduledCallId ? String(payload.scheduledCallId) : null;
    let callId: string;
    if (scheduledCallId) {
      const existing = getCall(scheduledCallId);
      if (!existing || existing.status !== "scheduled" || existing.initiatorId !== userId) {
        return reply({ ok: false, error: "scheduled call not found" });
      }
      db.query("UPDATE Call SET status = 'ringing' WHERE id = ?").run(scheduledCallId);
      callId = scheduledCallId;
    } else {
      callId = `call_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      try {
        db.query(
          `INSERT INTO Call (id, companyId, conversationId, initiatorId, type, status, participantIds)
           VALUES (?, ?, ?, ?, ?, 'ringing', ?)`
        ).run(callId, user.companyId, conversationId, userId, type, JSON.stringify(participantIds));
      } catch (e) {
        console.error("[chat] call:invite insert error:", e);
        return reply({ ok: false, error: "failed to create call" });
      }
    }

    socket.join(`call:${callId}`);
    const invitePayload = {
      callId,
      conversationId,
      type,
      caller: { id: userId, name: userName, role: userRole },
      participantIds,
    };
    for (const cid of calleeIds) io.to(`user:${cid}`).emit("call:incoming", invitePayload);
    console.log(`[chat] call:invite ${callId} ${userName} -> ${calleeIds.join(",")} (${type})`);
    reply({ ok: true, callId });
  });

  // ===== call:accept =====
  socket.on("call:accept", (payload: any) => {
    const callId = payload?.callId ? String(payload.callId) : null;
    if (!callId) return;
    const call = getCall(callId);
    if (!call || call.status !== "ringing") return;
    if (!callParticipantIds(call).includes(userId)) return;
    db.query("UPDATE Call SET status = 'active', startedAt = ? WHERE id = ?").run(new Date().toISOString(), callId);
    socket.join(`call:${callId}`);
    io.to(`call:${callId}`).emit("call:accepted", { callId, by: { id: userId, name: userName } });
  });

  // ===== call:reject =====
  // Callee explicitly declines a ringing call -> "missed" (never connected).
  socket.on("call:reject", (payload: any) => {
    const callId = payload?.callId ? String(payload.callId) : null;
    if (!callId) return;
    const call = getCall(callId);
    if (!call || call.status !== "ringing") return;
    if (!callParticipantIds(call).includes(userId)) return;
    db.query("UPDATE Call SET status = 'missed', endedAt = ? WHERE id = ?").run(new Date().toISOString(), callId);
    io.to(`call:${callId}`).emit("call:rejected", { callId, by: { id: userId, name: userName } });
  });

  // ===== call:cancel =====
  // Caller gives up before anyone answered.
  socket.on("call:cancel", (payload: any) => {
    const callId = payload?.callId ? String(payload.callId) : null;
    if (!callId) return;
    const call = getCall(callId);
    if (!call || call.status !== "ringing" || call.initiatorId !== userId) return;
    db.query("UPDATE Call SET status = 'cancelled', endedAt = ? WHERE id = ?").run(new Date().toISOString(), callId);
    io.to(`call:${callId}`).emit("call:cancelled", { callId });
  });

  // ===== call:end =====
  // Hang up a ringing or active call, from either party.
  socket.on("call:end", (payload: any) => {
    const callId = payload?.callId ? String(payload.callId) : null;
    if (!callId) return;
    const call = getCall(callId);
    if (!call) return;
    if (!callParticipantIds(call).includes(userId)) return;
    if (call.status === "ended" || call.status === "cancelled" || call.status === "missed") return;
    db.query("UPDATE Call SET status = 'ended', endedAt = ? WHERE id = ?").run(new Date().toISOString(), callId);
    io.to(`call:${callId}`).emit("call:ended", { callId, by: { id: userId, name: userName } });
  });

  // ===== call:offer / call:answer / call:ice-candidate =====
  // Pure SDP/ICE relay to whoever else is in the call's room - the server
  // never inspects or modifies the payload, it's opaque WebRTC signaling
  // between exactly the two peers in `call:<callId>`.
  socket.on("call:offer", (payload: any) => {
    const callId = payload?.callId ? String(payload.callId) : null;
    if (!callId || !payload?.sdp) return;
    socket.to(`call:${callId}`).emit("call:offer", { callId, sdp: payload.sdp, from: userId });
  });

  socket.on("call:answer", (payload: any) => {
    const callId = payload?.callId ? String(payload.callId) : null;
    if (!callId || !payload?.sdp) return;
    socket.to(`call:${callId}`).emit("call:answer", { callId, sdp: payload.sdp, from: userId });
  });

  socket.on("call:ice-candidate", (payload: any) => {
    const callId = payload?.callId ? String(payload.callId) : null;
    if (!callId || !payload?.candidate) return;
    socket.to(`call:${callId}`).emit("call:ice-candidate", { callId, candidate: payload.candidate, from: userId });
  });

  socket.on("disconnect", () => {
    setOffline(userId, socket.id);
    // If that was this user's last open socket, any call they were ringing
    // or actively on is now unreachable from their side - resolve it rather
    // than leaving a "ringing"/"active" row (and the other party's UI)
    // stuck forever.
    if (!onlineSockets.has(userId)) {
      try {
        const liveCalls = db
          .query(`SELECT id, status FROM Call WHERE status IN ('ringing','active') AND participantIds LIKE ?`)
          .all(`%"${userId}"%`) as { id: string; status: string }[];
        for (const c of liveCalls) {
          const nowIso = new Date().toISOString();
          if (c.status === "ringing") {
            db.query("UPDATE Call SET status = 'missed', endedAt = ? WHERE id = ?").run(nowIso, c.id);
            io.to(`call:${c.id}`).emit("call:cancelled", { callId: c.id, reason: "disconnect" });
          } else {
            db.query("UPDATE Call SET status = 'ended', endedAt = ? WHERE id = ?").run(nowIso, c.id);
            io.to(`call:${c.id}`).emit("call:ended", { callId: c.id, reason: "disconnect" });
          }
        }
      } catch (e) {
        console.error("[chat] disconnect call cleanup error:", e);
      }
    }
    console.log(`[chat] ${userName} (${userId}) disconnected`);
  });

  socket.on("error", (err: any) => console.error(`[chat] socket error (${userId}):`, err));
});

const PORT = 3003;
httpServer.listen(PORT, () => {
  console.log(`[chat] Reanzly chat service running on port ${PORT}`);
  console.log(
    "[chat] call signaling events registered: call:invite, call:accept, call:reject, call:cancel, call:end, call:offer, call:answer, call:ice-candidate"
  );
});

process.on("SIGTERM", () => {
  console.log("[chat] SIGTERM, shutting down...");
  httpServer.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  console.log("[chat] SIGINT, shutting down...");
  httpServer.close(() => process.exit(0));
});

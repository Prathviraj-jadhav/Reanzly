"use client";
// ===========================================================================
// Reanzly Chat Store - REAL-TIME
// ===========================================================================
// Backed by:
//   - REST:    GET /api/chat/init?userId=...  (hydration on login)
//              POST /api/chat/conversations    (DM / group / join-channel)
//   - Socket:  mini-services/chat-service (port 3003) for live events:
//              message:send, typing:start/stop, reaction:toggle,
//              message:read, message:pin, message:delete
//              + inbound: message:new, typing:update, reaction:update,
//                         read:update, presence:update, conversation:new,
//                         message:updated, message:deleted
//
// NO mock data. NO simulate* functions. Every message persists to the DB and
// fans out to every connected client in real time.
//
// Drafts remain local-only (persisted to localStorage) since they're a
// per-device UI affordance, not shared state.
// ===========================================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ChatMessage,
  Conversation,
  ChatAttachment,
  PresenceState,
  ChatEntity,
} from "@/lib/types";
import { connectChatSocket, disconnectChatSocket, getChatSocket } from "@/lib/chat/socket-client";

// ===== Typing throttle =====
const TYPING_STOP_DELAY = 2000; // emit typing:stop after this long of inactivity
const TYPING_START_THROTTLE = 1500; // don't re-emit typing:start more often than this

interface ChatState {
  conversations: Conversation[];
  messages: ChatMessage[];
  entities: ChatEntity[];
  activeConversationId: string;
  drafts: Record<string, { text: string; replyToId?: string }>;
  presence: Record<string, PresenceState>;
  typing: Record<string, { userId: string; name: string; until: number } | undefined>;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string;
  hydrated: boolean;
  connected: boolean;
  loading: boolean;
  error: string | null;

  // ===== Lifecycle =====
  init: (userId: string, userName: string, userRole: string, initials?: string) => Promise<void>;
  teardown: () => void;
  setCurrentUser: (id: string, name?: string, role?: string) => void;

  // ===== Conversation navigation =====
  setActiveConversation: (id: string) => void;

  // ===== Messaging =====
  sendMessage: (params: {
    conversationId: string;
    text: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    attachment?: ChatAttachment;
    parentId?: string;
    isPoll?: { question: string; options: { text: string; votes: string[] }[] };
    isCommandResult?: boolean;
  }) => string;
  deleteMessage: (messageId: string) => void;

  // ===== Reactions =====
  addReaction: (messageId: string, emoji: string, userId: string) => void;
  removeReaction: (messageId: string, emoji: string, userId: string) => void;

  // ===== Pin =====
  pinMessage: (messageId: string) => void;
  unpinMessage: (messageId: string) => void;

  // ===== Reply / forward =====
  replyTo: (conversationId: string, parentId: string) => void;
  forwardMessage: (
    messageId: string,
    targetConversationId: string,
    senderId: string,
    senderName: string,
    senderRole: string
  ) => void;

  // ===== Read receipts =====
  markRead: (conversationId: string) => void;
  markMessageReadBy: (messageId: string, userId: string) => void;

  // ===== Drafts =====
  setDraft: (conversationId: string, text: string, replyToId?: string) => void;
  clearDraft: (conversationId: string) => void;

  // ===== Conversation management =====
  createConversation: (
    c: Omit<Conversation, "unread" | "lastMessage" | "lastTimestamp"> & { unread?: number }
  ) => string;
  startDm: (otherUserId: string) => Promise<string | null>;
  startGroup: (name: string, memberIds: string[]) => Promise<string | null>;
  joinChannel: (channelId: string, userId: string) => void;
  leaveChannel: (channelId: string, userId: string) => void;

  // ===== Typing =====
  notifyTyping: (conversationId: string) => void;
  setTyping: (conversationId: string, userId: string, name: string) => void;
  clearTyping: (conversationId: string) => void;
  clearExpiredTyping: () => void;

  // ===== Presence =====
  setPresence: (entityId: string, state: PresenceState) => void;

  // ===== Polls =====
  castVote: (messageId: string, optionIndex: number, userId: string) => void;
}

// Per-conversation typing throttle state (module-level, not persisted).
const typingLastEmitted: Record<string, number> = {};
const typingStopTimers: Record<string, ReturnType<typeof setTimeout>> = {};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      messages: [],
      entities: [],
      activeConversationId: "",
      drafts: {},
      presence: {},
      typing: {},
      currentUserId: "",
      currentUserName: "",
      currentUserRole: "",
      hydrated: false,
      connected: false,
      loading: false,
      error: null,

      // ===== init: hydrate from REST, then connect the socket and wire events =====
      init: async (userId, userName, userRole, initials) => {
        if (!userId) return;
        set({ loading: true, error: null, currentUserId: userId, currentUserName: userName, currentUserRole: userRole });

        // 1. Hydrate from REST.
        try {
          const res = await fetch(`/api/chat/init?userId=${encodeURIComponent(userId)}`, {
            cache: "no-store",
          });
          if (!res.ok) throw new Error(`init failed: ${res.status}`);
          const data = await res.json();
          const firstConvId = data.conversations[0]?.id ?? "";
          set({
            conversations: data.conversations,
            messages: data.messages,
            entities: data.entities,
            // Keep the active conversation if it's still in the list; otherwise pick the first.
            activeConversationId:
              get().activeConversationId &&
              data.conversations.some((c: Conversation) => c.id === get().activeConversationId)
                ? get().activeConversationId
                : firstConvId,
            hydrated: true,
            loading: false,
          });
        } catch (e: any) {
          set({ loading: false, error: e?.message || "failed to load chat", hydrated: true });
        }

        // 2. Connect the socket and wire inbound events.
        try {
          const sock = await connectChatSocket({ userId, userName, userRole, userInitials: initials });

          const wire = (s: any) => {
            set({ connected: true });

            // Defensive: init() may be called multiple times for the same
            // socket (e.g., navigating between ChatModule and ChatPanel, or
            // when the role changes). Without this, each call stacks another
            // set of event handlers on the same socket, causing duplicate
            // state updates (and wasted work) for every inbound event.
            const INBOUND_EVENTS = [
              "message:new",
              "typing:update",
              "reaction:update",
              "presence:update",
              "read:update",
              "conversation:new",
              "message:updated",
              "message:deleted",
              "disconnect",
            ] as const;
            for (const ev of INBOUND_EVENTS) {
              s.removeAllListeners(ev);
            }
            s.io.removeAllListeners("reconnect");

            s.on("message:new", (msg: ChatMessage) => {
              // Dedupe by id (the sender may receive their own echo).
              if (get().messages.some((m) => m.id === msg.id)) return;
              set((s) => {
                const convs = s.conversations.map((c) =>
                  c.id === msg.conversationId
                    ? {
                        ...c,
                        lastMessage: msg.attachment
                          ? msg.attachment.name
                          : msg.isPoll
                            ? `Poll: ${msg.isPoll.question}`
                            : msg.text.slice(0, 120),
                        lastTimestamp: msg.timestamp,
                        // Bump unread only if this isn't the active conversation and
                        // the sender isn't the current user.
                        unread:
                          s.activeConversationId === msg.conversationId || msg.senderId === s.currentUserId
                            ? c.unread
                            : c.unread + 1,
                      }
                    : c
                );
                return { messages: [...s.messages, msg], conversations: convs };
              });
              // If the message landed in the active conversation, mark it read.
              if (get().activeConversationId === msg.conversationId && msg.senderId !== get().currentUserId) {
                get().markRead(msg.conversationId);
              }
            });

            s.on("typing:update", (payload: { conversationId: string; userId: string; name: string; typing: boolean }) => {
              set((st) => {
                if (payload.typing) {
                  return {
                    typing: {
                      ...st.typing,
                      [payload.conversationId]: {
                        userId: payload.userId,
                        name: payload.name,
                        until: Date.now() + 3000,
                      },
                    },
                  };
                }
                const next = { ...st.typing };
                delete next[payload.conversationId];
                return { typing: next };
              });
            });

            s.on("reaction:update", (payload: { messageId: string; emoji: string; users: string[] }) => {
              set((st) => ({
                messages: st.messages.map((m) => {
                  if (m.id !== payload.messageId) return m;
                  const reactions = m.reactions ? [...m.reactions] : [];
                  const idx = reactions.findIndex((r) => r.emoji === payload.emoji);
                  if (payload.users.length === 0) {
                    if (idx >= 0) reactions.splice(idx, 1);
                  } else if (idx >= 0) {
                    reactions[idx] = { emoji: payload.emoji, users: payload.users };
                  } else {
                    reactions.push({ emoji: payload.emoji, users: payload.users });
                  }
                  return { ...m, reactions };
                }),
              }));
            });

            s.on("presence:update", (payload: { userId: string; presence: PresenceState }) => {
              set((st) => ({
                presence: { ...st.presence, [payload.userId]: payload.presence },
                entities: st.entities.map((e) =>
                  e.id === payload.userId ? { ...e, presence: payload.presence } : e
                ),
              }));
            });

            s.on("read:update", (payload: { conversationId: string; userId: string; lastReadAt: string }) => {
              set((st) => ({
                messages: st.messages.map((m) => {
                  if (m.conversationId !== payload.conversationId) return m;
                  if (m.senderId !== st.currentUserId) return m;
                  const readBy = m.readBy ? [...m.readBy] : [];
                  if (!readBy.includes(payload.userId)) readBy.push(payload.userId);
                  return { ...m, readBy };
                }),
              }));
            });

            s.on("conversation:new", (payload: { conversation: Conversation; userIds: string[] }) => {
              set((st) => {
                if (st.conversations.some((c) => c.id === payload.conversation.id)) return st;
                return {
                  conversations: [...st.conversations, payload.conversation],
                  // The newly created conversation may be the one we want active
                  // (if we initiated it, startDm handles activation).
                };
              });
            });

            s.on("message:updated", (payload: { id: string; pinned?: boolean }) => {
              set((st) => ({
                messages: st.messages.map((m) =>
                  m.id === payload.id ? { ...m, pinned: payload.pinned ?? m.pinned } : m
                ),
              }));
            });

            s.on("message:deleted", (payload: { id: string }) => {
              set((st) => ({ messages: st.messages.filter((m) => m.id !== payload.id) }));
            });

            // On reconnect, re-hydrate in case we missed events while disconnected.
            s.io.on("reconnect", () => {
              set({ connected: true });
              fetch(`/api/chat/init?userId=${encodeURIComponent(get().currentUserId)}`, { cache: "no-store" })
                .then((r) => r.json())
                .then((data) => {
                  set({
                    conversations: data.conversations,
                    messages: data.messages,
                    entities: data.entities,
                  });
                })
                .catch(() => {});
            });

            s.on("disconnect", () => set({ connected: false }));
          };

          if (sock.connected) wire(sock);
          else sock.once("connect", () => wire(sock));
        } catch (e) {
          set({ connected: false });
        }
      },

      teardown: () => {
        disconnectChatSocket();
        set({ connected: false });
      },

      setCurrentUser: (id, name, role) =>
        set({ currentUserId: id, currentUserName: name ?? "", currentUserRole: role ?? "" }),

      setActiveConversation: (id) => {
        set({ activeConversationId: id });
        // Mark read immediately + tell the server.
        get().markRead(id);
      },

      sendMessage: (params) => {
        const sock = getChatSocket();
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        // Optimistic: show the message locally with a temp id so the UI is instant.
        const optimistic: ChatMessage = {
          id: tempId,
          conversationId: params.conversationId,
          sender: params.senderName,
          senderId: params.senderId,
          senderRole: params.senderRole,
          text: params.text,
          timestamp: new Date().toISOString(),
          read: true,
          attachment: params.attachment,
          parentId: params.parentId,
          isPoll: params.isPoll,
          isCommandResult: params.isCommandResult,
          reactions: [],
          readBy: [],
        };
        set((s) => ({
          messages: [...s.messages, optimistic],
          conversations: s.conversations.map((c) =>
            c.id === params.conversationId
              ? {
                  ...c,
                  lastMessage: params.attachment
                    ? params.attachment.name
                    : params.isPoll
                      ? `Poll: ${params.isPoll.question}`
                      : params.text.slice(0, 120),
                  lastTimestamp: optimistic.timestamp,
                }
              : c
          ),
        }));

        if (sock && sock.connected) {
          sock.emit("message:send", {
            conversationId: params.conversationId,
            text: params.text,
            parentId: params.parentId ?? null,
            attachment: params.attachment ?? null,
            isPoll: params.isPoll ?? null,
            isCommandResult: !!params.isCommandResult,
          });
          // When the server echoes the real message back via `message:new`,
          // remove the optimistic temp entry (matched by conversationId + text + senderId).
          const onEcho = (msg: ChatMessage) => {
            if (
              msg.conversationId === params.conversationId &&
              msg.senderId === params.senderId &&
              msg.text === params.text &&
              !msg.id.startsWith("temp_")
            ) {
              set((s) => ({ messages: s.messages.filter((m) => m.id !== tempId) }));
              sock.off("message:new", onEcho);
            }
          };
          sock.on("message:new", onEcho);
          // Safety: clear the listener after 10s even if no echo (avoid leaks).
          setTimeout(() => sock.off("message:new", onEcho), 10000);
        } else {
          // Fallback: if socket isn't connected, POST via REST so the message
          // still persists (the next init() will load it).
          fetch("/api/chat/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(params),
          }).catch(() => {});
        }
        return tempId;
      },

      deleteMessage: (messageId) => {
        const sock = getChatSocket();
        if (sock && sock.connected) {
          sock.emit("message:delete", { messageId });
        }
        // Optimistic removal; server broadcast will confirm.
        set((s) => ({ messages: s.messages.filter((m) => m.id !== messageId) }));
      },

      addReaction: (messageId, emoji, userId) => {
        const sock = getChatSocket();
        // Optimistic.
        set((s) => ({
          messages: s.messages.map((m) => {
            if (m.id !== messageId) return m;
            const reactions = m.reactions ? [...m.reactions] : [];
            const idx = reactions.findIndex((r) => r.emoji === emoji);
            if (idx >= 0) {
              if (!reactions[idx].users.includes(userId)) reactions[idx] = { emoji, users: [...reactions[idx].users, userId] };
            } else reactions.push({ emoji, users: [userId] });
            return { ...m, reactions };
          }),
        }));
        if (sock && sock.connected) sock.emit("reaction:toggle", { messageId, emoji });
      },

      removeReaction: (messageId, emoji, userId) => {
        const sock = getChatSocket();
        set((s) => ({
          messages: s.messages.map((m) => {
            if (m.id !== messageId) return m;
            const reactions = m.reactions ? [...m.reactions] : [];
            const idx = reactions.findIndex((r) => r.emoji === emoji);
            if (idx >= 0) reactions[idx] = { emoji, users: reactions[idx].users.filter((u) => u !== userId) };
            return { ...m, reactions: reactions.filter((r) => r.users.length > 0) };
          }),
        }));
        if (sock && sock.connected) sock.emit("reaction:toggle", { messageId, emoji });
      },

      pinMessage: (messageId) => {
        const sock = getChatSocket();
        if (sock && sock.connected) sock.emit("message:pin", { messageId, pinned: true });
        set((s) => ({ messages: s.messages.map((m) => (m.id === messageId ? { ...m, pinned: true } : m)) }));
      },

      unpinMessage: (messageId) => {
        const sock = getChatSocket();
        if (sock && sock.connected) sock.emit("message:pin", { messageId, pinned: false });
        set((s) => ({ messages: s.messages.map((m) => (m.id === messageId ? { ...m, pinned: false } : m)) }));
      },

      replyTo: (_conversationId, parentId) => {
        const convId = get().activeConversationId;
        const draft = get().drafts[convId] || { text: "" };
        set((s) => ({
          drafts: { ...s.drafts, [convId]: { ...draft, replyToId: parentId } },
        }));
      },

      forwardMessage: (messageId, targetConversationId, senderId, senderName, senderRole) => {
        const src = get().messages.find((m) => m.id === messageId);
        if (!src) return;
        // Forward = send a new message in the target conversation with a
        // forwardedFrom marker. Goes through the normal socket pipeline so it
        // persists and fans out.
        get().sendMessage({
          conversationId: targetConversationId,
          text: src.text,
          senderId,
          senderName,
          senderRole,
          attachment: src.attachment,
        });
      },

      markRead: (conversationId) => {
        const sock = getChatSocket();
        if (sock && sock.connected) sock.emit("message:read", { conversationId });
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, unread: 0 } : c
          ),
          messages: s.messages.map((m) =>
            m.conversationId === conversationId ? { ...m, read: true } : m
          ),
        }));
      },

      markMessageReadBy: () => {
        // No-op now; read receipts are handled via the server's message:read
        // event which writes ChatReadReceipt rows. Kept for API compat.
      },

      setDraft: (conversationId, text, replyToId) =>
        set((s) => ({
          drafts: {
            ...s.drafts,
            [conversationId]: {
              text,
              replyToId: replyToId ?? s.drafts[conversationId]?.replyToId,
              updatedAt: Date.now(),
            },
          },
        })),

      clearDraft: (conversationId) =>
        set((s) => {
          const next = { ...s.drafts };
          delete next[conversationId];
          return { drafts: next };
        }),

      createConversation: (c) => {
        // Local-only optimistic add. Real creation flows through startDm() /
        // the REST API which also notifies the other participant via socket.
        const id = c.id || `local_${Date.now()}`;
        const conv: Conversation = { ...c, unread: c.unread ?? 0 };
        set((s) => ({ conversations: [...s.conversations, conv], activeConversationId: id }));
        return id;
      },

      startDm: async (otherUserId) => {
        const { currentUserId, currentUserName, currentUserRole } = get();
        if (!currentUserId) return null;
        try {
          const res = await fetch("/api/chat/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: "dm", userId: currentUserId, otherUserId }),
          });
          if (!res.ok) return null;
          const data = await res.json();
          const conv = data.conversation as Conversation;
          // The other participant's socket will get a `conversation:new` event
          // from the broadcast. We just need to add it locally + activate.
          set((s) => {
            if (s.conversations.some((c) => c.id === conv.id)) return s;
            return { conversations: [...s.conversations, conv], activeConversationId: conv.id };
          });
          // Re-join the socket room for this conversation (server added the
          // participant row, but our socket joined rooms on connect - we need
          // to join the new room now).
          const sock = getChatSocket();
          if (sock && sock.connected) sock.emit("room:join", { conversationId: conv.id });
          return conv.id;
        } catch (e) {
          console.error("[chat] startDm error:", e);
          return null;
        }
      },

      startGroup: async (name, memberIds) => {
        const { currentUserId } = get();
        if (!currentUserId) return null;
        try {
          const res = await fetch("/api/chat/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: "create_group", userId: currentUserId, name, memberIds }),
          });
          if (!res.ok) return null;
          const data = await res.json();
          const conv = data.conversation as Conversation;
          set((s) => {
            if (s.conversations.some((c) => c.id === conv.id)) return s;
            return { conversations: [...s.conversations, conv], activeConversationId: conv.id };
          });
          const sock = getChatSocket();
          if (sock && sock.connected) sock.emit("room:join", { conversationId: conv.id });
          return conv.id;
        } catch (e) {
          console.error("[chat] startGroup error:", e);
          return null;
        }
      },

      joinChannel: (channelId, _userId) => {
        const { currentUserId, currentUserName, currentUserRole } = get();
        fetch("/api/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "join_channel", userId: currentUserId, channelId }),
        })
          .then((r) => r.json())
          .then(() => {
            const sock = getChatSocket();
            if (sock && sock.connected) sock.emit("room:join", { conversationId: channelId });
            set((s) => ({
              conversations: s.conversations.map((c) =>
                c.id === channelId ? { ...c, isMember: true, participants: [...c.participants, currentUserId] } : c
              ),
              activeConversationId: channelId,
            }));
          })
          .catch(() => {});
      },

      leaveChannel: (channelId, _userId) => {
        // Optimistic UI update; full leave-channel REST can be added later.
        const { currentUserId } = get();
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === channelId
              ? {
                  ...c,
                  isMember: false,
                  participants: c.participants.filter((p) => p !== currentUserId),
                }
              : c
          ),
        }));
      },

      notifyTyping: (conversationId) => {
        const sock = getChatSocket();
        if (!sock || !sock.connected) return;
        const now = Date.now();
        const last = typingLastEmitted[conversationId] ?? 0;
        if (now - last > TYPING_START_THROTTLE) {
          sock.emit("typing:start", { conversationId });
          typingLastEmitted[conversationId] = now;
        }
        // Reset the stop timer.
        if (typingStopTimers[conversationId]) clearTimeout(typingStopTimers[conversationId]);
        typingStopTimers[conversationId] = setTimeout(() => {
          sock.emit("typing:stop", { conversationId });
          delete typingStopTimers[conversationId];
        }, TYPING_STOP_DELAY);
      },

      setTyping: (conversationId, userId, name) =>
        set((s) => ({
          typing: {
            ...s.typing,
            [conversationId]: { userId, name, until: Date.now() + 3000 },
          },
        })),

      clearTyping: (conversationId) =>
        set((s) => {
          const next = { ...s.typing };
          delete next[conversationId];
          return { typing: next };
        }),

      clearExpiredTyping: () =>
        set((s) => {
          const now = Date.now();
          const next: typeof s.typing = {};
          let changed = false;
          for (const [k, v] of Object.entries(s.typing)) {
            if (v && v.until > now) next[k] = v;
            else changed = true;
          }
          return changed ? { typing: next } : s;
        }),

      setPresence: (entityId, state) =>
        set((s) => ({ presence: { ...s.presence, [entityId]: state } })),

      castVote: (messageId, optionIndex, userId) => {
        // Polls: re-send the poll message with updated votes. Since polls are
        // stored as JSON in the message text, voting updates local state and
        // would need a dedicated socket event to sync. For now, vote locally
        // (per-device) - a full poll-sync can be added if needed.
        set((s) => ({
          messages: s.messages.map((m) => {
            if (m.id !== messageId || !m.isPoll) return m;
            const options = m.isPoll.options.map((opt, i) => {
              const hasVote = opt.votes.includes(userId);
              if (i === optionIndex) {
                return hasVote
                  ? { ...opt, votes: opt.votes.filter((u) => u !== userId) }
                  : { ...opt, votes: [...opt.votes, userId] };
              }
              return { ...opt, votes: opt.votes.filter((u) => u !== userId) };
            });
            return { ...m, isPoll: { ...m.isPoll, options } };
          }),
        }));
      },
    }),
    {
      name: "reanzly-chat",
      version: 3,
      // Only persist drafts + the last active conversation id. Conversations
      // and messages are NOT persisted - they're always hydrated from the DB.
      partialize: (s) => ({
        drafts: s.drafts,
        activeConversationId: s.activeConversationId,
      }),
      // v2 -> v3: discard old persisted mock messages/conversations.
      migrate: (_persisted, version) => {
        const persisted = (_persisted ?? {}) as Partial<ChatState>;
        if (version < 3) {
          return { drafts: {}, activeConversationId: "" };
        }
        return {
          drafts: persisted.drafts ?? {},
          activeConversationId: persisted.activeConversationId ?? "",
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);

// ===== EXPORTED CONSTANTS =====
export const CHAT_QUICK_EMOJIS = ["ack", "lol", "ty", "done", "seen", "pls", "ack", "flag", "urg", "idea", "no", "wip"];
export const SLASH_COMMANDS = [
  { cmd: "/summary", desc: "Ask Rean to summarize this conversation", args: "" },
  { cmd: "/assign", desc: "Create a task and assign it", args: "<task>" },
  { cmd: "/poll", desc: "Create a poll", args: "<question> | opt1 | opt2 | ..." },
  { cmd: "/pin", desc: "Pin the last message", args: "" },
  { cmd: "/help", desc: "Show available commands", args: "" },
] as const;

// ===== SELECTOR HELPERS =====
export function selectConvMessages(messages: ChatMessage[], conversationId: string): ChatMessage[] {
  return messages
    .filter((m) => m.conversationId === conversationId && !m.parentId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function selectThreadReplies(messages: ChatMessage[], parentId: string): ChatMessage[] {
  return messages
    .filter((m) => m.parentId === parentId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function selectPinnedMessages(messages: ChatMessage[], conversationId: string): ChatMessage[] {
  return messages
    .filter((m) => m.conversationId === conversationId && m.pinned)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

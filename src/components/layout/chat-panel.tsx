"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/app-store";
import { useChatStore, selectConvMessages } from "@/lib/store/chat-store";
import type { ChatEntity, Conversation, PresenceState } from "@/lib/types";
import { ChatComposer } from "@/components/modules/chat/chat-composer";
import { useChatCall, ChatCallHeaderButtons, ChatScheduledCallsBar, ChatCallOverlay } from "@/components/modules/chat/chat-call";
import { ChatMessageRow } from "@/components/modules/chat/chat-message";
import {
  conversationDisplayName,
  formatRelativeShort,
  plainTextOf,
  formatDayDivider,
  formatTime,
} from "@/components/modules/chat/chat-utils";
import {
  X,
  Hash,
  Sparkles,
  Search,
  Compass,
  Maximize2,
  Users,
  ArrowLeft,
} from "lucide-react";
import { ChatChannelBrowser } from "@/components/modules/chat/chat-channel-browser";
import { ChatForwardDialog } from "@/components/modules/chat/chat-forward-dialog";
import { ChatNewDmDialog } from "@/components/modules/chat/chat-new-dm-dialog";

/**
 * ChatPanel - compact slide-in chat for quick access.
 * Two panes (conversation list 180px + active conversation).
 * Shares the persisted `reanzly-chat` Zustand store with the full ChatModule.
 * "Open full chat" button deep-links into the chat module via useAppStore().navigate("chat").
 */
export function ChatPanel() {
  const { chatOpen, setChatOpen, currentRole, navigate, authUser } = useAppStore();
  // Real signup name when available, falling back to the role archetype's
  // demo persona name for quick-login / live-demo sessions.
  const displayName = authUser?.name?.trim() || currentRole.name;
  // The role *title* (e.g. "Owner / Director"), not a name fragment - the
  // `description` field is "{Role Title} - {longer description}".
  const roleTitle = currentRole.description?.split("-")[0]?.trim() || "Staff";
  const displayInitials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || currentRole.initials;

  const conversations = useChatStore((s) => s.conversations);
  const allMessages = useChatStore((s) => s.messages);
  const drafts = useChatStore((s) => s.drafts);
  const typing = useChatStore((s) => s.typing);
  const setChatActive = useChatStore((s) => s.setActiveConversation);
  const activeId = useChatStore((s) => s.activeConversationId);
  const init = useChatStore((s) => s.init);
  const connected = useChatStore((s) => s.connected);
  const loading = useChatStore((s) => s.loading);
  const clearExpiredTyping = useChatStore((s) => s.clearExpiredTyping);

  const [search, setSearch] = React.useState("");
  const [channelBrowserOpen, setChannelBrowserOpen] = React.useState(false);
  const [newDmOpen, setNewDmOpen] = React.useState(false);
  const [forwardId, setForwardId] = React.useState<string | null>(null);
  const [showList, setShowList] = React.useState(true); // for very small screens

  const entities: ChatEntity[] = useChatStore((s) => s.entities);

  // Hydrate the chat store + connect the socket when the panel opens (or when
  // the active role changes). Tear down on unmount so we don't leak sockets.
  React.useEffect(() => {
    if (!chatOpen) return;
    if (!currentRole?.id) return;
    void init(currentRole.id, displayName, roleTitle, displayInitials);
  }, [chatOpen, currentRole?.id, displayName, roleTitle, displayInitials, init]);

  // Keep typing indicators fresh.
  React.useEffect(() => {
    const interval = window.setInterval(() => {
      clearExpiredTyping();
    }, 500);
    return () => window.clearInterval(interval);
  }, [clearExpiredTyping]);

  if (!chatOpen) return null;

  const conv = conversations.find((c) => c.id === activeId);
  // BUG 6: use the selectConvMessages selector (sorts by timestamp ascending)
  // so the active-conversation view is always in chronological order.
  const convMessages = conv
    ? selectConvMessages(allMessages, conv.id)
    : [];
  const typingUser = typing[activeId];
  const typingActive = !!typingUser && Date.now() < typingUser.until;

  const filteredConvs = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenFullChat = () => {
    setChatOpen(false);
    navigate("chat");
  };

  const onMentionClick = (entityId: string, _name: string) => {
    const existing = conversations.find(
      (c) =>
        c.type === "direct" &&
        c.participants.includes(entityId) &&
        c.participants.includes(currentRole.id)
    );
    if (existing) setChatActive(existing.id);
  };

  const onChannelClick = (channelId: string, _name: string) => {
    setChatActive(channelId);
  };

  const handleSelectConv = (id: string) => {
    setChatActive(id);
    setShowList(false);
  };

  return (
    <div className="fixed right-0 top-0 z-40 flex h-full w-full max-w-3xl flex-col border-l border-border bg-background animate-slide-in-right">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2">
          {!showList && (
            <button
              onClick={() => setShowList(true)}
              className="flex h-6 w-6 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground sm:hidden"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="text-[13px] font-semibold">Messages</span>
          {/* Real-time connection indicator */}
          <span
            className={cn(
              "flex h-1.5 w-1.5 rounded-full",
              connected ? "bg-foreground" : loading ? "bg-muted-foreground animate-pulse" : "bg-border"
            )}
            title={connected ? "Connected" : loading ? "Connecting..." : "Offline"}
          />
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleOpenFullChat}
            className="flex h-7 items-center gap-1 rounded-[3px] border border-border px-1.5 text-[11px] font-medium hover:bg-accent"
            title="Open full chat module"
          >
            <Maximize2 className="h-3 w-3" />
            <span className="hidden sm:inline">Open full chat</span>
          </button>
          <button
            onClick={() => setChatOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Conversation list - full-width on mobile when visible, 180px
            sidebar on desktop. Hidden on mobile once a conversation is
            selected (showList=false) so the conversation gets full width. */}
        <div
          className={cn(
            "shrink-0 flex-col border-r border-border",
            showList ? "flex w-full sm:w-[180px]" : "hidden sm:flex sm:w-[180px]"
          )}
        >
          <div className="p-2">
            <div className="relative flex h-7 items-center">
              <Search className="pointer-events-none absolute left-2 h-3 w-3 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="h-7 w-full rounded-[4px] border border-border bg-muted/30 pl-6 pr-2 text-[11px] outline-none focus:border-foreground/30"
              />
            </div>
          </div>
          <div className="px-2 pb-1">
            <button
              onClick={() => setChannelBrowserOpen(true)}
              className="flex w-full items-center gap-1.5 rounded-[4px] px-1.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Compass className="h-3 w-3" />
              Browse channels
            </button>
            <button
              onClick={() => setNewDmOpen(true)}
              className="flex w-full items-center gap-1.5 rounded-[4px] px-1.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Sparkles className="h-3 w-3" />
              New DM
            </button>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto pb-2">
            {filteredConvs.map((c) => (
              <CompactConvRow
                key={c.id}
                conv={c}
                active={activeId === c.id}
                onClick={() => handleSelectConv(c.id)}
                entities={entities}
                currentUserId={currentRole.id}
                messages={allMessages}
              />
            ))}
          </div>
        </div>

        {/* Active conversation - full-width on mobile when the list is
            hidden, flex-1 on desktop alongside the list. */}
        <div className={cn("flex min-w-0 flex-1 flex-col overflow-hidden", showList && "hidden sm:flex")}>
          {conv ? (
            <CompactConversation
              conv={conv}
              messages={convMessages}
              typingUser={typingUser}
              typingActive={typingActive}
              entities={entities}
              currentUserId={currentRole.id}
              currentName={displayName}
              currentRole={roleTitle}
              drafts={drafts}
              onMentionClick={onMentionClick}
              onChannelClick={onChannelClick}
              onForward={(id) => setForwardId(id)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-[12px] text-muted-foreground">
              Select a conversation
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ChatChannelBrowser
        open={channelBrowserOpen}
        onOpenChange={setChannelBrowserOpen}
        currentUserId={currentRole.id}
      />
      <ChatForwardDialog
        open={!!forwardId}
        onOpenChange={(o) => !o && setForwardId(null)}
        messageId={forwardId}
        currentUserId={currentRole.id}
        currentName={displayName}
        currentRole={roleTitle}
      />
      <ChatNewDmDialog
        open={newDmOpen}
        onOpenChange={setNewDmOpen}
        currentUserId={currentRole.id}
      />
    </div>
  );
}

function CompactConvRow({
  conv,
  active,
  onClick,
  entities,
  currentUserId,
  messages,
}: {
  conv: Conversation;
  active: boolean;
  onClick: () => void;
  entities: ChatEntity[];
  currentUserId: string;
  messages: import("@/lib/types").ChatMessage[];
}) {
  // Real conversations get DB-generated cuids, never the old mock-data id
  // "c4" this used to check - detect the Rean DM by real participant
  // membership instead, or it never gets its Sparkles icon.
  const isRean = conv.participants.includes("rean");
  const isChannel = conv.type === "channel";
  const displayName = conversationDisplayName(conv, currentUserId, entities);
  const otherId = conv.participants.find((p) => p !== currentUserId);
  const otherEntity = otherId ? entities.find((e) => e.id === otherId) : undefined;
  const presence: PresenceState | undefined = otherEntity?.presence;

  // BUG 6: last-message preview must be the latest message by timestamp.
  // selectConvMessages filters by conversationId + sorts ascending by timestamp,
  // so its last element is the most recent top-level message.
  const convMsgs = selectConvMessages(messages, conv.id);
  const last = convMsgs[convMsgs.length - 1];

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full flex-col gap-0.5 border-l-2 px-2 py-1.5 text-left transition-colors",
        active ? "border-foreground bg-accent/50" : "border-transparent hover:bg-accent/30"
      )}
    >
      <div className="flex items-center gap-1.5">
        {isChannel ? (
          <Hash className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : isRean ? (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] bg-foreground text-background">
            <Sparkles className="h-2.5 w-2.5" />
          </span>
        ) : (
          <span className="relative flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] bg-muted text-[8px] font-medium">
            {otherEntity?.initials || displayName.slice(0, 2).toUpperCase()}
            {presence && (
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ring-1 ring-background",
                  presence === "online" ? "bg-foreground" : presence === "idle" ? "bg-muted-foreground" : "bg-border"
                )}
              />
            )}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium">
          {isChannel ? conv.name.replace(/^#/, "") : displayName}
        </span>
        {conv.unread > 0 && (
          <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-foreground px-1 font-mono text-[9px] font-semibold tabular-nums text-background">
            {conv.unread}
          </span>
        )}
      </div>
      {last && (
        <span className="truncate pl-4 text-[10px] text-muted-foreground">
          {plainTextOf(last.text).slice(0, 36)}
        </span>
      )}
    </button>
  );
}

function CompactConversation({
  conv,
  messages,
  typingUser,
  typingActive,
  entities,
  currentUserId,
  currentName,
  currentRole,
  drafts,
  onMentionClick,
  onChannelClick,
  onForward,
}: {
  conv: Conversation;
  messages: import("@/lib/types").ChatMessage[];
  typingUser: { userId: string; name: string; until: number } | undefined;
  typingActive: boolean;
  entities: ChatEntity[];
  currentUserId: string;
  currentName: string;
  currentRole: string;
  drafts: Record<string, { text: string; replyToId?: string }>;
  onMentionClick: (entityId: string, name: string) => void;
  onChannelClick: (channelId: string, name: string) => void;
  onForward: (messageId: string) => void;
}) {
  // Real conversations get DB-generated cuids, never the old mock-data id
  // "c4" this used to check - detect the Rean DM by real participant
  // membership instead, or it never gets its Sparkles icon.
  const isRean = conv.participants.includes("rean");
  const isChannel = conv.type === "channel";
  const allMessages = useChatStore((s) => s.messages);
  const displayName =
    conv.type === "direct"
      ? (() => {
          const otherId = conv.participants.find((p) => p !== currentUserId);
          if (otherId === "rean") return "Rean";
          return entities.find((e) => e.id === otherId)?.name || conv.name;
        })()
      : conv.name;

  const replyTargetId = drafts[conv.id]?.replyToId;
  const replyTarget = replyTargetId
    ? allMessages.find((m) => m.id === replyTargetId)
    : null;

  // ===== Call state (video / voice / screen-share / scheduling) - shared
  // with the full chat module via useChatCall so both surfaces stay in sync
  // with the same real RTCPeerConnection/getUserMedia session. =====
  const call = useChatCall(conv, currentUserId, entities);
  const { callMode } = call;

  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, typingActive]);

  return (
    <>
      {/* Conv header */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
        {isChannel ? (
          <Hash className="h-4 w-4 text-muted-foreground" />
        ) : isRean ? (
          <Sparkles className="h-4 w-4" />
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-[3px] bg-muted text-[9px] font-medium">
            {displayName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{displayName}</span>
        {isRean && (
          <span className="flex items-center gap-0.5 rounded-[3px] border border-foreground px-1 py-px text-[8px] font-medium uppercase tracking-wider">
            <Sparkles className="h-2 w-2" /> AI
          </span>
        )}
        {conv.type !== "channel" && (
          <>
            <ChatCallHeaderButtons call={call} conv={conv} />
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Users className="h-2.5 w-2.5" />
              <span className="font-mono tabular-nums">{conv.participants.length}</span>
            </div>
          </>
        )}
      </div>

      <ChatScheduledCallsBar call={call} currentUserId={currentUserId} />

      {/* min-h-0 lets this flex-1 overlay shrink properly inside the
          conversation pane's flex-col layout on short viewports. */}
      <ChatCallOverlay call={call} displayName={displayName} />

      {/* Messages (hidden while call overlay is open) */}
      {!callMode && (
        <>
          <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto py-2">
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center px-4 text-center text-[11px] text-muted-foreground">
                No messages yet. Say something to start the conversation.
              </div>
            )}
            {messages.map((m, idx) => {
              const prev = messages[idx - 1];
              const showDayDivider =
                !prev ||
                new Date(prev.timestamp).toDateString() !==
                  new Date(m.timestamp).toDateString();
              const showHeader =
                !prev ||
                prev.sender !== m.sender ||
                new Date(prev.timestamp).getTime() + 5 * 60_000 <
                  new Date(m.timestamp).getTime() ||
                showDayDivider;
              return (
                <React.Fragment key={m.id}>
                  {showDayDivider && (
                    <div className="my-2 flex items-center gap-2 px-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {formatDayDivider(m.timestamp)}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <ChatMessageRow
                    message={m}
                    conversation={conv}
                    entities={entities}
                    currentUserId={currentUserId}
                    currentRole={currentRole}
                    isMe={m.senderId === currentUserId}
                    showHeader={showHeader}
                    compact
                    onMentionClick={onMentionClick}
                    onChannelClick={onChannelClick}
                    onForward={onForward}
                    threadReplyCount={
                      allMessages.filter((x) => x.parentId === m.id).length
                    }
                  />
                </React.Fragment>
              );
            })}

            {typingActive && (
              <div className="flex items-center gap-2 px-3 py-1 text-[10px] text-muted-foreground">
                <span className="flex gap-0.5">
                  <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "150ms" }} />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "300ms" }} />
                </span>
                <span>
                  <span className="font-medium text-foreground">{typingUser?.name}</span> is typing…
                </span>
              </div>
            )}
          </div>

          {/* Composer */}
          <ChatComposer
            conversation={conv}
            currentUserId={currentUserId}
            currentName={currentName}
            currentRole={currentRole}
            replyTarget={replyTarget}
            onClearReply={() => {
              const d = drafts[conv.id];
              if (d) useChatStore.getState().setDraft(conv.id, d.text, undefined);
            }}
            onMentionClick={onMentionClick}
            onChannelClick={onChannelClick}
            compact
          />
        </>
      )}
    </>
  );
}

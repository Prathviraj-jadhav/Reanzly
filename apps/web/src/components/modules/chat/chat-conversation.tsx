"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  useChatStore,
  selectConvMessages,
  selectThreadReplies,
  selectPinnedMessages,
} from "@/lib/store/chat-store";
import type { ChatEntity, ChatMessage } from "@/lib/types";
import { ChatMessageRow } from "./chat-message";
import { ChatComposer } from "./chat-composer";
import { MessageText, formatDayDivider, formatTime, plainTextOf } from "./chat-utils";
import { useChatCall, ChatCallHeaderButtons, ChatScheduledCallsBar, ChatCallOverlay } from "./chat-call";
import {
  Hash,
  Sparkles,
  Search,
  Pin,
  ChevronUp,
  ChevronDown,
  X,
  Users,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ChatConversationProps {
  currentUserId: string;
  currentName: string;
  currentRole: string;
  onOpenThread: (messageId: string) => void;
  onForward: (messageId: string) => void;
  compact?: boolean;
}

export function ChatConversation({
  currentUserId,
  currentName,
  currentRole,
  onOpenThread,
  onForward,
  compact = false,
}: ChatConversationProps) {
  const conversations = useChatStore((s) => s.conversations);
  const allMessages = useChatStore((s) => s.messages);
  const activeId = useChatStore((s) => s.activeConversationId);
  const drafts = useChatStore((s) => s.drafts);
  const typing = useChatStore((s) => s.typing);
  const setActive = useChatStore((s) => s.setActiveConversation);
  const unpinMessage = useChatStore((s) => s.unpinMessage);
  const setCurrentUser = useChatStore((s) => s.setCurrentUser);
  const clearExpiredTyping = useChatStore((s) => s.clearExpiredTyping);

  const conv = conversations.find((c) => c.id === activeId);
  const entities: ChatEntity[] = useChatStore((s) => s.entities);

  const [searchOpen, setSearchOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [searchMatches, setSearchMatches] = React.useState<ChatMessage[]>([]);
  const [matchIdx, setMatchIdx] = React.useState(0);
  const [pinnedOpen, setPinnedOpen] = React.useState(false);
  const [zoomImage, setZoomImage] = React.useState<{ data: string; name: string } | null>(null);

  const replyTargetId = drafts[activeId]?.replyToId;
  const replyTarget = replyTargetId
    ? allMessages.find((m) => m.id === replyTargetId)
    : null;

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const messageElsRef = React.useRef<Map<string, HTMLDivElement>>(new Map());

  // BUG 3: register the current user id with the store so setActiveConversation
  // and the simulated-reply read-receipt wiring know who "me" is.
  React.useEffect(() => {
    setCurrentUser(currentUserId);
  }, [currentUserId, setCurrentUser]);

  // Auto-scroll to bottom on conversation change or new message
  const convMessages = React.useMemo(() => {
    if (!conv) return [];
    return selectConvMessages(allMessages, conv.id);
  }, [conv, allMessages]);

  const typingUser = typing[activeId];
  const typingActive = !!typingUser && Date.now() < typingUser.until;

  // Real WebRTC call state (voice/video/screen-share/scheduling), shared
  // with the compact chat drawer via useChatCall. conv may still be
  // undefined here (checked below) - the hook itself tolerates a null conv
  // so hook order stays stable across renders.
  const call = useChatCall(conv ?? null, currentUserId, entities);

  // BUG 4: typing indicator can stick. The dots gate on
  // `Date.now() < typingUser.until` evaluated at render time, but nothing
  // forces a re-render when the entry expires. Poll clearExpiredTyping on a
  // 500ms interval while typing is (or may be) active so the dots disappear
  // promptly and the store stays tidy.
  React.useEffect(() => {
    const interval = window.setInterval(() => {
      clearExpiredTyping();
    }, 500);
    return () => window.clearInterval(interval);
  }, [clearExpiredTyping]);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeId, convMessages.length, typingUser]);

  // Re-run search when query changes
  React.useEffect(() => {
    if (!search.trim() || !conv) {
      setSearchMatches([]);
      setMatchIdx(0);
      return;
    }
    const q = search.toLowerCase();
    const matches = allMessages
      .filter((m) => m.conversationId === conv.id && !m.parentId)
      .filter((m) => plainTextOf(m.text).toLowerCase().includes(q));
    setSearchMatches(matches);
    setMatchIdx(0);
  }, [search, allMessages, conv]);

  // Scroll to current match
  React.useEffect(() => {
    const m = searchMatches[matchIdx];
    if (!m) return;
    const el = messageElsRef.current.get(m.id);
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [matchIdx, searchMatches]);

  if (!conv) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
        Select a conversation
      </div>
    );
  }

  // Real conversations get DB-generated cuids, not the old mock-data id
  // "c4" this used to check - detect by real participant membership.
  const isRean = conv.participants.includes("rean");
  const isChannel = conv.type === "channel";
  const displayName =
    conv.type === "direct"
      ? (() => {
          const otherId = conv.participants.find((p) => p !== currentUserId);
          if (otherId === "rean") return "Rean";
          return entities.find((e) => e.id === otherId)?.name || conv.name;
        })()
      : conv.name;

  const pinned = selectPinnedMessages(allMessages, conv.id);

  const onMentionClick = (entityId: string, name: string) => {
    // Start a DM with the mentioned person if not already, else switch
    const existing = conversations.find(
      (c) =>
        c.type === "direct" &&
        c.participants.includes(entityId) &&
        c.participants.includes(currentUserId)
    );
    if (existing) {
      setActive(existing.id);
    }
    // otherwise no-op (would normally create one)
    void name;
  };

  const onChannelClick = (channelId: string, _name: string) => {
    setActive(channelId);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border">
        <div className="flex h-12 items-center gap-2 px-3">
          {isChannel ? (
            <Hash className="h-4 w-4 text-muted-foreground" />
          ) : isRean ? (
            <Sparkles className="h-4 w-4" />
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-[3px] bg-muted text-[10px] font-medium">
              {displayName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </span>
          )}
          <span className="text-[13px] font-semibold">{displayName}</span>
          {isRean && (
            <span className="flex items-center gap-0.5 rounded-[3px] border border-foreground px-1.5 py-px text-[9px] font-medium uppercase tracking-wider">
              <Sparkles className="h-2.5 w-2.5" /> AI
            </span>
          )}
          {conv.topic && (
            <span className="hidden truncate text-[11px] text-muted-foreground md:inline">
              · {conv.topic}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            {conv.type !== "channel" && (
              <div className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex">
                <Users className="h-3 w-3" />
                <span className="font-mono tabular-nums">{conv.participants.length}</span>
              </div>
            )}
            {conv.type === "channel" && (
              <div className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex">
                <Users className="h-3 w-3" />
                <span className="font-mono tabular-nums">{conv.participants.length}</span>
                <span>members</span>
              </div>
            )}

            <ChatCallHeaderButtons call={call} conv={conv} size="md" />

            {/* Search */}
            {searchOpen ? (
              <div className="flex items-center gap-1 rounded-[5px] border border-border bg-background px-1.5 py-0.5">
                <Search className="h-3 w-3 text-muted-foreground" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search messages"
                  className="h-5 w-32 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground"
                />
                {searchMatches.length > 0 && (
                  <>
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                      {matchIdx + 1}/{searchMatches.length}
                    </span>
                    <button
                      onClick={() => setMatchIdx((i) => (i - 1 + searchMatches.length) % searchMatches.length)}
                      className="hover:text-foreground"
                      aria-label="Previous match"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setMatchIdx((i) => (i + 1) % searchMatches.length)}
                      className="hover:text-foreground"
                      aria-label="Next match"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setSearch("");
                    setSearchOpen(false);
                  }}
                  className="hover:text-foreground"
                  aria-label="Close search"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="flex h-6 w-6 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Search messages"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Description bar */}
        {conv.description && (
          <div className="border-t border-border px-3 py-1 text-[11px] text-muted-foreground">
            {conv.description}
          </div>
        )}

        {/* Pinned bar */}
        {pinned.length > 0 && (
          <div className="border-t border-border bg-muted/20">
            <button
              onClick={() => setPinnedOpen((o) => !o)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] hover:bg-accent"
            >
              <Pin className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">
                Pinned · <span className="font-mono tabular-nums">{pinned.length}</span>
              </span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {plainTextOf(pinned[0].text)}
              </span>
              {pinnedOpen ? (
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
            {pinnedOpen && (
              <div className="max-h-64 overflow-y-auto scrollbar-thin border-t border-border">
                {pinned.map((m) => (
                  <div
                    key={m.id}
                    className="group flex items-start gap-2 px-3 py-1.5 text-[11px] hover:bg-accent"
                  >
                    <Pin className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-medium">{m.sender}</span>
                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                          {formatTime(m.timestamp)}
                        </span>
                      </div>
                      <div className="mt-0.5">
                        <MessageText text={m.text} className="text-foreground" />
                      </div>
                    </div>
                    <button
                      onClick={() => unpinMessage(m.id)}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Unpin"
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ChatScheduledCallsBar call={call} currentUserId={currentUserId} />
      <ChatCallOverlay call={call} displayName={displayName} />

      {/* Messages + composer (replaced by the call overlay above while a call is active) */}
      {call.callMode ? null : (
      <>
      <div
        ref={scrollRef}
        className="scrollbar-thin flex-1 overflow-y-auto py-2"
      >
        {convMessages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <div className="text-[12px]">No messages yet. Be the first to say something.</div>
          </div>
        )}
        {convMessages.map((m, idx) => {
          const prev = convMessages[idx - 1];
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
          const threadReplies = selectThreadReplies(allMessages, m.id);
          const isMatch = searchMatches.some((x) => x.id === m.id);
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
              <div
                ref={(el) => {
                  if (el) messageElsRef.current.set(m.id, el);
                  else messageElsRef.current.delete(m.id);
                }}
                className={cn(isMatch && "rounded-[5px] bg-accent/40")}
              >
                <ChatMessageRow
                  message={m}
                  conversation={conv}
                  entities={entities}
                  currentUserId={currentUserId}
                  currentRole={currentRole}
                  isMe={m.senderId === currentUserId}
                  showHeader={showHeader}
                  highlight={search.trim() ? search : undefined}
                  onReply={(id) => {
                    onOpenThread(id);
                  }}
                  onForward={onForward}
                  onOpenThread={onOpenThread}
                  onMentionClick={onMentionClick}
                  onChannelClick={onChannelClick}
                  onImageClick={(data, name) => setZoomImage({ data, name })}
                  threadReplyCount={threadReplies.length}
                />
              </div>
            </React.Fragment>
          );
        })}

        {/* Typing indicator (BUG 4: gating uses typingActive which is also
            refreshed by the clearExpiredTyping interval above) */}
        {typingActive && (
          <div className="flex items-center gap-2 px-3 py-1 text-[11px] text-muted-foreground">
            <span className="flex gap-0.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "300ms" }} />
            </span>
            <span>
              <span className="font-medium text-foreground">{typingUser.name}</span> is typing…
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
          // Clearing reply: keep text but clear replyToId in draft
          const d = drafts[conv.id];
          if (d) {
            useChatStore.getState().setDraft(conv.id, d.text, undefined);
          }
        }}
        onMentionClick={onMentionClick}
        onChannelClick={onChannelClick}
        compact={compact}
      />
      </>
      )}

      {/* Image zoom dialog */}
      <Dialog
        open={!!zoomImage}
        onOpenChange={(o) => !o && setZoomImage(null)}
      >
        <DialogContent showCloseButton className="max-w-3xl p-2">
          <DialogTitle className="sr-only">{zoomImage?.name}</DialogTitle>
          <DialogDescription className="sr-only">Image preview</DialogDescription>
          {zoomImage && (
            <img
              src={zoomImage.data}
              alt={zoomImage.name}
              className="max-h-[80vh] w-full rounded-[4px] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

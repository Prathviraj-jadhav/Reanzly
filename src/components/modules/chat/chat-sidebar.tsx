"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useChatStore, selectConvMessages } from "@/lib/store/chat-store";
import type { ChatEntity, ChatMessage, Conversation, PresenceState } from "@/lib/types";
import { ChatAvatar } from "./chat-avatar";
import { conversationDisplayName, formatRelativeShort, plainTextOf } from "./chat-utils";
import {
  Hash,
  Users,
  Search,
  Compass,
  Plus,
} from "lucide-react";

interface ChatSidebarProps {
  currentUserId: string;
  onOpenChannelBrowser: () => void;
  onOpenNewDm: () => void;
  compact?: boolean;
  className?: string;
}

type Tab = "channels" | "dms";

export function ChatSidebar({
  currentUserId,
  onOpenChannelBrowser,
  onOpenNewDm,
  compact = false,
  className,
}: ChatSidebarProps) {
  const conversations = useChatStore((s) => s.conversations);
  const messages = useChatStore((s) => s.messages);
  const activeId = useChatStore((s) => s.activeConversationId);
  const setActive = useChatStore((s) => s.setActiveConversation);
  const [tab, setTab] = React.useState<Tab>("channels");
  const [search, setSearch] = React.useState("");

  const entities: ChatEntity[] = useChatStore((s) => s.entities);

  const channels = conversations.filter((c) => c.type === "channel");
  const dms = conversations.filter((c) => c.type !== "channel");

  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredDms = dms.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      {/* Search */}
      <div className="shrink-0 border-b border-border p-2">
        <div className="relative flex h-7 items-center">
          <Search className="pointer-events-none absolute left-2 h-3 w-3 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="h-7 w-full rounded-[5px] border border-border bg-muted/30 pl-6 pr-2 text-[12px] outline-none focus:border-foreground/30"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 border-b border-border px-2 py-1.5">
        <div className="flex items-center gap-0.5 rounded-[5px] border border-border bg-background p-0.5">
          <TabBtn active={tab === "channels"} onClick={() => setTab("channels")}>
            <Hash className="h-3 w-3" />
            Channels
          </TabBtn>
          <TabBtn active={tab === "dms"} onClick={() => setTab("dms")}>
            <Users className="h-3 w-3" />
            DMs
          </TabBtn>
        </div>
      </div>

      {/* List */}
      <div className="scrollbar-thin flex-1 overflow-y-auto py-1">
        {tab === "channels" ? (
          <>
            <div className="px-2 pb-1">
              <button
                onClick={onOpenChannelBrowser}
                className="flex w-full items-center gap-1.5 rounded-[5px] px-2 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Compass className="h-3.5 w-3.5" />
                Browse channels
              </button>
            </div>
            {filteredChannels.length === 0 && (
              <div className="px-3 py-4 text-[11px] text-muted-foreground">No channels match.</div>
            )}
            {filteredChannels.map((c) => (
              <ConversationRow
                key={c.id}
                conv={c}
                active={activeId === c.id}
                onClick={() => setActive(c.id)}
                entities={entities}
                currentUserId={currentUserId}
                messages={messages}
                compact={compact}
              />
            ))}
          </>
        ) : (
          <>
            <div className="px-2 pb-1">
              <button
                onClick={onOpenNewDm}
                className="flex w-full items-center gap-1.5 rounded-[5px] px-2 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                New DM / group
              </button>
            </div>
            {filteredDms.length === 0 && (
              <div className="px-3 py-4 text-[11px] text-muted-foreground">No DMs match.</div>
            )}
            {filteredDms.map((c) => (
              <ConversationRow
                key={c.id}
                conv={c}
                active={activeId === c.id}
                onClick={() => setActive(c.id)}
                entities={entities}
                currentUserId={currentUserId}
                messages={messages}
                compact={compact}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex h-6 flex-1 items-center justify-center gap-1 rounded-[3px] text-[11px] font-medium transition-colors",
        active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function ConversationRow({
  conv,
  active,
  onClick,
  entities,
  currentUserId,
  messages,
  compact,
}: {
  conv: Conversation;
  active: boolean;
  onClick: () => void;
  entities: ChatEntity[];
  currentUserId: string;
  messages: ChatMessage[];
  compact?: boolean;
}) {
  // BUG 6: last-message preview must be the latest message by timestamp.
  // selectConvMessages already filters by conversationId + sorts ascending by
  // timestamp, so its last element is the most recent top-level message.
  const convMsgs = selectConvMessages(messages, conv.id);
  const last = convMsgs[convMsgs.length - 1];
  const isRean = conv.id === "c4";
  const isChannel = conv.type === "channel";
  const displayName = conversationDisplayName(conv, currentUserId, entities);

  // Other participant (for DMs) for presence
  const otherId = conv.participants.find((p) => p !== currentUserId);
  const otherEntity = otherId
    ? entities.find((e) => e.id === otherId)
    : undefined;
  const presence: PresenceState | undefined = otherEntity?.presence;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 border-l-2 px-2 py-1.5 text-left transition-colors",
        active
          ? "border-foreground bg-accent/60"
          : "border-transparent hover:bg-accent/30"
      )}
    >
      {isChannel ? (
        <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      ) : isRean ? (
        <ChatAvatar initials="RE" size="xs" isRean />
      ) : (
        <ChatAvatar
          initials={otherEntity?.initials || displayName.slice(0, 2).toUpperCase()}
          size="xs"
          presence={presence}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium">
            {isChannel ? conv.name.replace(/^#/, "") : displayName}
          </span>
          {conv.unread > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 font-mono text-[9px] font-semibold tabular-nums text-background">
              {conv.unread}
            </span>
          )}
        </div>
        {!compact && last && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="min-w-0 flex-1 truncate">
              {last.isRean ? "" : `${(last.sender || "").split(" ")[0]}: `}
              {plainTextOf(last.text).slice(0, 40)}
            </span>
            <span className="font-mono tabular-nums">{formatRelativeShort(last.timestamp)}</span>
          </div>
        )}
      </div>
    </button>
  );
}

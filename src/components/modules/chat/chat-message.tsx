"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { ChatMessage, ChatEntity, Conversation } from "@/lib/types";
import { ChatAvatar } from "./chat-avatar";
import { MessageText, formatTime } from "./chat-utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Smile,
  Reply,
  Pin,
  Forward,
  Copy,
  Trash2,
  MoreHorizontal,
  Check,
  Sparkles,
  FileText,
  Download,
  BarChart3,
} from "lucide-react";
import { CHAT_QUICK_EMOJIS, useChatStore } from "@/lib/store/chat-store";

interface ChatMessageRowProps {
  message: ChatMessage;
  conversation: Conversation;
  entities: ChatEntity[];
  currentUserId: string;
  currentRole: string;
  isMe: boolean;
  compact?: boolean;
  showHeader?: boolean;
  highlight?: string;
  onReply?: (messageId: string) => void;
  onForward?: (messageId: string) => void;
  onOpenThread?: (messageId: string) => void;
  onMentionClick?: (entityId: string, name: string) => void;
  onChannelClick?: (channelId: string, name: string) => void;
  onImageClick?: (data: string, name: string) => void;
  threadReplyCount?: number;
}

export function ChatMessageRow({
  message,
  conversation,
  entities,
  currentUserId,
  currentRole,
  isMe,
  compact = false,
  showHeader = true,
  highlight,
  onReply,
  onForward,
  onOpenThread,
  onMentionClick,
  onChannelClick,
  onImageClick,
  threadReplyCount = 0,
}: ChatMessageRowProps) {
  const [showActions, setShowActions] = React.useState(false);
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const addReaction = useChatStore((s) => s.addReaction);
  const removeReaction = useChatStore((s) => s.removeReaction);
  const pinMessage = useChatStore((s) => s.pinMessage);
  const unpinMessage = useChatStore((s) => s.unpinMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const castVote = useChatStore((s) => s.castVote);

  const isRean = !!message.isRean;
  const senderEntity = entities.find((e) => e.id === message.senderId);
  const presence = senderEntity?.presence;

  const handleQuickReaction = (emoji: string) => {
    const r = message.reactions?.find((x) => x.emoji === emoji);
    if (r && r.users.includes(currentUserId)) {
      removeReaction(message.id, emoji, currentUserId);
    } else {
      addReaction(message.id, emoji, currentUserId);
    }
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(message.text).catch(() => {});
  };

  const isDM = conversation.type === "direct";
  const otherRead = message.readBy?.some((u) => u !== currentUserId);

  // Shared menu items for the "more" dropdown - rendered both in the
  // desktop hover bar and the always-visible mobile button so mobile
  // (touch) users can reach reply / forward / pin / copy / delete
  // without a hover state.
  const moreMenuItems = (
    <>
      <DropdownMenuItem onClick={() => onReply?.(message.id)}>
        <Reply className="mr-2 h-3.5 w-3.5" /> Reply in thread
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onOpenThread?.(message.id)}>
        <Reply className="mr-2 h-3.5 w-3.5" /> Open thread
        {threadReplyCount > 0 && (
          <span className="ml-auto font-mono text-[10px] tabular-nums">
            {threadReplyCount}
          </span>
        )}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() =>
          message.pinned ? unpinMessage(message.id) : pinMessage(message.id)
        }
      >
        <Pin className="mr-2 h-3.5 w-3.5" />
        {message.pinned ? "Unpin" : "Pin to conversation"}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onForward?.(message.id)}>
        <Forward className="mr-2 h-3.5 w-3.5" /> Forward
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleCopy}>
        <Copy className="mr-2 h-3.5 w-3.5" /> Copy text
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => deleteMessage(message.id)}
        className="text-destructive focus:text-destructive"
      >
        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
      </DropdownMenuItem>
    </>
  );

  return (
    <div
      className={cn(
        "group relative flex gap-2 px-3",
        compact ? "py-0.5" : "py-1.5",
        showActions && "bg-accent/40",
        // BUG FIX: the current user's own messages were rendering left-aligned
        // with no visual distinction, so it looked like nothing was sent.
        // Mirror own messages to the right edge with a grey bubble so the
        // sender immediately sees their message land in the conversation.
        isMe && !isRean && "flex-row-reverse"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar or spacer for grouped messages */}
      {showHeader ? (
        <ChatAvatar
          initials={
            isMe && !isRean
              ? "Me"
              : senderEntity?.initials || (message.sender || "?").slice(0, 2).toUpperCase()
          }
          size="sm"
          presence={presence}
          isRean={isRean}
        />
      ) : (
        <div className="w-6 shrink-0" />
      )}

      <div className={cn("min-w-0 flex-1", isMe && !isRean && "flex flex-col items-end")}>
        {/* Header line */}
        {showHeader && (
          <div className={cn("flex items-baseline gap-2", isMe && !isRean && "flex-row-reverse")}>
            <span
              className={cn(
                "text-[12px] font-semibold",
                isRean ? "text-foreground" : "text-foreground"
              )}
            >
              {isRean ? "Rean" : isMe && !isRean ? "You" : message.sender}
            </span>
            {isRean && (
              <span className="flex items-center gap-0.5 rounded-[3px] border border-foreground px-1 py-px text-[8px] font-medium uppercase tracking-wider">
                <Sparkles className="h-2 w-2" /> AI
              </span>
            )}
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {formatTime(message.timestamp)}
            </span>
            {message.forwardedFrom && (
              <span className="text-[10px] text-muted-foreground">
                · forwarded from {message.forwardedFrom.sender}
              </span>
            )}
          </div>
        )}

        {/* Body */}
        <div
          className={cn(
            "mt-0.5 text-[13px] leading-relaxed",
            isRean && "rounded-[6px] border border-foreground bg-foreground px-2.5 py-1.5 text-background",
            // Own messages get a solid black bubble with white text so they
            // are immediately visually distinct from incoming messages.
            // This fixes the "messages not reflecting on user's side" complaint
            // - the previous bg-muted was too subtle and looked like nothing
            // had been sent.
            !isRean && isMe && "rounded-[6px] bg-foreground px-2.5 py-1.5 text-background"
          )}
        >
          {message.isPoll ? (
            <PollCard message={message} currentUserId={currentUserId} onVote={castVote} />
          ) : (
            <MessageText
              text={message.text}
              highlight={highlight}
              onMentionClick={onMentionClick}
              onChannelClick={onChannelClick}
              className={isRean || (!isRean && isMe) ? "text-background" : "text-foreground"}
            />
          )}
        </div>

        {/* Attachment */}
        {message.attachment && (
          <AttachmentCard
            attachment={message.attachment}
            onImageClick={onImageClick}
          />
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.reactions.map((r) => {
              const mine = r.users.includes(currentUserId);
              return (
                <button
                  key={r.emoji}
                  onClick={() =>
                    mine
                      ? removeReaction(message.id, r.emoji, currentUserId)
                      : addReaction(message.id, r.emoji, currentUserId)
                  }
                  className={cn(
                    "inline-flex h-5 items-center gap-1 rounded-[4px] border px-1.5 text-[11px] transition-colors",
                    mine
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background hover:bg-accent"
                  )}
                >
                  <span>{r.emoji}</span>
                  <span className="font-mono tabular-nums">{r.users.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Thread indicator */}
        {threadReplyCount > 0 && (
          <button
            onClick={() => onOpenThread?.(message.id)}
            className="mt-1 inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Reply className="h-3 w-3" />
            <span className="font-mono tabular-nums">{threadReplyCount}</span>
            <span>replies</span>
          </button>
        )}

        {/* Read receipt for DMs (only on my messages) */}
        {isDM && isMe && (
          <span
            className={cn(
              "mt-0.5 inline-flex items-center gap-0.5 font-mono text-[10px] tabular-nums",
              otherRead ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <Check className="h-3 w-3" />
            <Check className="-ml-1.5 h-3 w-3" />
          </span>
        )}
      </div>

      {/* Hover actions - desktop only (hover to reveal). Mobile uses the
          always-visible "more" button below. */}
      {showActions && (
        <div className="absolute -top-3 right-2 z-10 hidden items-center gap-px rounded-[5px] border border-border bg-background p-0.5 sm:flex">
          {/* Quick reactions */}
          {["ack", "lol", "ty"].map((e) => (
            <button
              key={e}
              onClick={() => handleQuickReaction(e)}
              className="flex h-6 w-6 items-center justify-center rounded-[3px] text-[13px] hover:bg-accent"
            >
              {e}
            </button>
          ))}

          {/* Emoji picker */}
          <DropdownMenu open={emojiOpen} onOpenChange={setEmojiOpen}>
            <DropdownMenuTrigger asChild>
              <button className="flex h-6 w-6 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground">
                <Smile className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <div className="grid grid-cols-6 gap-0.5 p-1">
                {CHAT_QUICK_EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => {
                      handleQuickReaction(e);
                      setEmojiOpen(false);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-[3px] text-[14px] hover:bg-accent"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* More actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-6 w-6 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              {moreMenuItems}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Mobile actions - always-visible "more" button (touch has no hover) */}
      <div className="absolute right-1 top-0.5 z-10 sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-6 w-6 items-center justify-center rounded-[3px] bg-background/80 text-muted-foreground backdrop-blur-sm hover:bg-accent hover:text-foreground"
              aria-label="Message actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[180px]">
            {moreMenuItems}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ===== Attachment card =====
function AttachmentCard({
  attachment,
  onImageClick,
}: {
  attachment: NonNullable<ChatMessage["attachment"]>;
  onImageClick?: (data: string, name: string) => void;
}) {
  if (attachment.type === "image") {
    return (
      <button
        onClick={() => onImageClick?.(attachment.data, attachment.name)}
        className="mt-1 block overflow-hidden rounded-[6px] border border-border bg-background"
      >
        <img
          src={attachment.data}
          alt={attachment.name}
          className="max-h-64 max-w-full object-cover"
        />
      </button>
    );
  }
  return (
    <a
      href={attachment.data}
      download={attachment.name}
      className="mt-1 flex items-center gap-2 rounded-[6px] border border-border bg-card px-2.5 py-2 hover:bg-accent"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-border bg-muted">
        <FileText className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-medium">{attachment.name}</div>
        <div className="font-mono text-[10px] tabular-nums text-muted-foreground">
          {formatBytesLocal(attachment.size)}
        </div>
      </div>
      <Download className="h-3.5 w-3.5 text-muted-foreground" />
    </a>
  );
}

function formatBytesLocal(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ===== Poll card =====
function PollCard({
  message,
  currentUserId,
  onVote,
}: {
  message: ChatMessage;
  currentUserId: string;
  onVote: (messageId: string, optionIndex: number, userId: string) => void;
}) {
  if (!message.isPoll) return null;
  const totalVotes = message.isPoll.options.reduce((acc, o) => acc + o.votes.length, 0);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[12px] font-medium">
        <BarChart3 className="h-3.5 w-3.5" />
        {message.isPoll.question}
      </div>
      <div className="space-y-1">
        {message.isPoll.options.map((opt, i) => {
          const voted = opt.votes.includes(currentUserId);
          const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
          return (
            <button
              key={i}
              onClick={() => onVote(message.id, i, currentUserId)}
              className={cn(
                "relative w-full overflow-hidden rounded-[5px] border px-2 py-1 text-left text-[12px] transition-colors",
                voted ? "border-foreground bg-foreground/5" : "border-border hover:bg-accent"
              )}
            >
              <div
                className="absolute inset-y-0 left-0 bg-muted"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between">
                <span className="font-medium">{opt.text}</span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {opt.votes.length} · {pct}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="font-mono text-[10px] tabular-nums text-muted-foreground">
        {totalVotes} votes
      </div>
    </div>
  );
}

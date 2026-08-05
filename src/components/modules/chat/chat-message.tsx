"use client";

import * as React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { cn } from "@/lib/utils";
import type { ChatMessage, ChatEntity, Conversation } from "@/lib/types";
import { ChatAvatar } from "./chat-avatar";
import { MessageText, formatTime, parseMessageBlocks, extractFirstUrl } from "./chat-utils";
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
  Pencil,
  X,
  Link2,
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
  const [editing, setEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(message.text);
  const addReaction = useChatStore((s) => s.addReaction);
  const removeReaction = useChatStore((s) => s.removeReaction);
  const pinMessage = useChatStore((s) => s.pinMessage);
  const unpinMessage = useChatStore((s) => s.unpinMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const editMessage = useChatStore((s) => s.editMessage);
  const castVote = useChatStore((s) => s.castVote);

  const isRean = !!message.isRean;
  const isDeleted = !!message.deleted;
  const senderEntity = entities.find((e) => e.id === message.senderId);
  const presence = senderEntity?.presence;

  // Only the sender may edit/delete their own (non-Rean) messages.
  const canModify = isMe && !isRean && !isDeleted;

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

  const startEdit = () => {
    setEditText(message.text);
    setEditing(true);
  };

  const saveEdit = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== message.text) {
      editMessage(message.id, trimmed);
    }
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const isDM = conversation.type === "direct";
  const isGroupOrChannel = conversation.type === "group" || conversation.type === "channel";
  const otherRead = message.readBy?.some((u) => u !== currentUserId);
  const readByOthers = (message.readBy ?? []).filter((u) => u !== currentUserId);

  // First bare URL in the message, for the lightweight (domain-only, no
  // network call) preview card rendered below the body.
  const firstUrl = !isDeleted && !message.isPoll && !editing ? extractFirstUrl(message.text) : null;

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
      {canModify && (
        <DropdownMenuItem onClick={startEdit}>
          <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
        </DropdownMenuItem>
      )}
      {canModify && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => deleteMessage(message.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
          </DropdownMenuItem>
        </>
      )}
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
            {!isDeleted && message.edited && (
              <span
                className="text-[10px] text-muted-foreground"
                title={message.editedAt ? `Edited ${formatTime(message.editedAt)}` : "Edited"}
              >
                (edited)
              </span>
            )}
            {message.forwardedFrom && (
              <span className="truncate text-[10px] text-muted-foreground">
                · forwarded from {message.forwardedFrom.sender}
                {message.forwardedFrom.conversationName ? ` in ${message.forwardedFrom.conversationName}` : ""}
              </span>
            )}
          </div>
        )}

        {/* Body */}
        <div
          className={cn(
            "mt-0.5 text-[13px] leading-relaxed",
            !isDeleted &&
              isRean &&
              "rounded-[6px] border border-foreground bg-foreground px-2.5 py-1.5 text-background",
            // Own messages get a solid black bubble with white text so they
            // are immediately visually distinct from incoming messages.
            // This fixes the "messages not reflecting on user's side" complaint
            // - the previous bg-muted was too subtle and looked like nothing
            // had been sent.
            !isDeleted && !isRean && isMe && "rounded-[6px] bg-foreground px-2.5 py-1.5 text-background"
          )}
        >
          {isDeleted ? (
            <span className="italic text-muted-foreground">This message was deleted</span>
          ) : editing ? (
            <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
              <textarea
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    saveEdit();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    cancelEdit();
                  }
                }}
                rows={Math.min(8, Math.max(2, editText.split("\n").length))}
                className={cn(
                  "w-72 max-w-full resize-none rounded-[5px] border px-2 py-1.5 text-[13px] leading-relaxed outline-none",
                  isRean || (!isRean && isMe)
                    ? "border-background/30 bg-background/10 text-background placeholder:text-background/50 focus:border-background/60"
                    : "border-border bg-background text-foreground focus:border-foreground/30"
                )}
              />
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={cancelEdit}
                  className={cn(
                    "flex h-6 items-center gap-1 rounded-[3px] border px-1.5 text-[11px] font-medium",
                    isRean || (!isRean && isMe)
                      ? "border-background/30 hover:bg-background/10"
                      : "border-border hover:bg-accent"
                  )}
                >
                  <X className="h-3 w-3" /> Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={!editText.trim()}
                  className={cn(
                    "flex h-6 items-center gap-1 rounded-[3px] border px-1.5 text-[11px] font-medium disabled:opacity-40",
                    isRean || (!isRean && isMe)
                      ? "border-background bg-background text-foreground hover:bg-background/90"
                      : "border-foreground bg-foreground text-background hover:bg-foreground/90"
                  )}
                >
                  <Check className="h-3 w-3" /> Save
                </button>
              </div>
            </div>
          ) : message.isPoll ? (
            <PollCard message={message} currentUserId={currentUserId} onVote={castVote} />
          ) : (
            <MessageBody
              text={message.text}
              highlight={highlight}
              onMentionClick={onMentionClick}
              onChannelClick={onChannelClick}
            />
          )}
        </div>

        {/* Attachment */}
        {!isDeleted && message.attachment && (
          <AttachmentCard
            attachment={message.attachment}
            onImageClick={onImageClick}
          />
        )}

        {/* Lightweight link preview (domain-only, parsed from the URL string -
            no network fetch) for the first bare URL found in the message. */}
        {firstUrl && <LinkPreviewCard url={firstUrl} />}

        {/* Reactions */}
        {!isDeleted && message.reactions && message.reactions.length > 0 && (
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

        {/* Seen-by avatar stack for groups/channels (only on my messages) */}
        {isGroupOrChannel && isMe && readByOthers.length > 0 && (
          <div
            className="mt-0.5 flex items-center -space-x-1.5"
            title={`Seen by ${readByOthers.length}`}
          >
            {readByOthers.slice(0, 3).map((uid) => {
              const ent = entities.find((e) => e.id === uid);
              const initials = ent?.initials || uid.slice(0, 2).toUpperCase();
              return (
                <span
                  key={uid}
                  className="flex h-4 w-4 items-center justify-center rounded-[3px] border border-background bg-muted text-[7px] font-medium text-foreground"
                >
                  {initials}
                </span>
              );
            })}
            {readByOthers.length > 3 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-[3px] border border-background bg-foreground text-[7px] font-medium text-background">
                +{readByOthers.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Hover actions - desktop only (hover to reveal). Mobile uses the
          always-visible "more" button below. Hidden entirely on tombstoned
          (deleted) messages - nothing left to react to, edit, reply to,
          pin, or forward. */}
      {!isDeleted && showActions && (
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
      {!isDeleted && (
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
      )}
    </div>
  );
}

// ===== Message body (markdown-lite block rendering) =====
// Composes parseMessageBlocks() (chat-utils.tsx) with MessageText for
// inline formatting/mentions, and CodeBlock (react-syntax-highlighter) for
// fenced code blocks.
function MessageBody({
  text,
  highlight,
  onMentionClick,
  onChannelClick,
}: {
  text: string;
  highlight?: string;
  onMentionClick?: (entityId: string, name: string) => void;
  onChannelClick?: (channelId: string, name: string) => void;
}) {
  const blocks = React.useMemo(() => parseMessageBlocks(text), [text]);
  return (
    <div className="space-y-1.5">
      {blocks.map((block, i) => {
        if (block.type === "code") {
          return <CodeBlock key={i} lang={block.lang} code={block.code} />;
        }
        if (block.type === "list") {
          return (
            <ul key={i} className="list-disc space-y-0.5 pl-4">
              {block.items.map((item, j) => (
                <li key={j}>
                  <MessageText
                    text={item}
                    highlight={highlight}
                    onMentionClick={onMentionClick}
                    onChannelClick={onChannelClick}
                  />
                </li>
              ))}
            </ul>
          );
        }
        if (block.text.length === 0) return null;
        return (
          <MessageText
            key={i}
            text={block.text}
            highlight={highlight}
            onMentionClick={onMentionClick}
            onChannelClick={onChannelClick}
          />
        );
      })}
    </div>
  );
}

// ===== Fenced code block (```lang ... ```) =====
// Uses react-syntax-highlighter's Prism build purely for the <pre>/<code>
// block structure, wrapping, and monospace layout - NOT for syntax colors.
// Passing style={{}} strips all per-token inline colors so highlighted code
// still inherits the surrounding monochrome text color (no indigo/blue
// tokens), matching the strict black/white/greyscale design system.
function CodeBlock({ lang, code }: { lang: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-[6px] border border-border bg-muted/30">
      {lang && (
        <div className="border-b border-border px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {lang}
        </div>
      )}
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language="text"
          style={{}}
          wrapLongLines={false}
          className="font-mono"
          customStyle={{
            margin: 0,
            padding: "8px 10px",
            background: "transparent",
            color: "inherit",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

// ===== Lightweight link preview card =====
// Domain-display only, parsed entirely from the URL string - no fetch/unfurl.
function LinkPreviewCard({ url }: { url: string }) {
  let hostname = url;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // Not a fully well-formed URL (shouldn't normally happen since the
    // source regex only matches http(s)://-prefixed strings) - fall back
    // to showing the raw string as the "hostname".
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="mt-1 flex items-center gap-2 rounded-[6px] border border-border bg-card px-2.5 py-2 hover:bg-accent"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border border-border bg-muted">
        <Link2 className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-medium">{hostname}</div>
        <div className="truncate font-mono text-[10px] text-muted-foreground">{url}</div>
      </div>
    </a>
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
  // `url` (real server storage URL) is preferred; `data` (base64) is the
  // client-side mock/legacy fallback - either may be absent.
  const src = attachment.url ?? attachment.data;

  if (attachment.type === "image") {
    return (
      <button
        onClick={() => src && onImageClick?.(src, attachment.name)}
        disabled={!src}
        className="mt-1 block overflow-hidden rounded-[6px] border border-border bg-background disabled:cursor-default"
      >
        {src ? (
          <img
            src={src}
            alt={attachment.name}
            className="max-h-64 max-w-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-32 items-center justify-center text-[11px] text-muted-foreground">
            Image unavailable
          </div>
        )}
      </button>
    );
  }
  return (
    <a
      href={src}
      download={attachment.name}
      onClick={(e) => {
        if (!src) e.preventDefault();
      }}
      className={cn(
        "mt-1 flex items-center gap-2 rounded-[6px] border border-border bg-card px-2.5 py-2",
        src ? "hover:bg-accent" : "cursor-default opacity-60"
      )}
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
  onVote: (messageId: string, optionId: string, userId: string) => void;
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
          // Defensive fallback for any legacy poll rows persisted before
          // options carried a stable id.
          const optId = opt.id || `opt_${i}`;
          const voted = opt.votes.includes(currentUserId);
          const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
          return (
            <button
              key={optId}
              onClick={() => onVote(message.id, optId, currentUserId)}
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

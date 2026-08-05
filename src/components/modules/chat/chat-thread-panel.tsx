"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useChatStore, selectThreadReplies } from "@/lib/store/chat-store";
import type { ChatEntity, ChatMessage } from "@/lib/types";
import { ChatMessageRow } from "./chat-message";
import { ChatComposer } from "./chat-composer";
import { X, Reply } from "lucide-react";

interface ChatThreadPanelProps {
  parentMessageId: string;
  currentUserId: string;
  currentName: string;
  currentRole: string;
  onClose: () => void;
  onForward: (messageId: string) => void;
}

export function ChatThreadPanel({
  parentMessageId,
  currentUserId,
  currentName,
  currentRole,
  onClose,
  onForward,
}: ChatThreadPanelProps) {
  const allMessages = useChatStore((s) => s.messages);
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeConversationId);
  const drafts = useChatStore((s) => s.drafts);
  const entities: ChatEntity[] = useChatStore((s) => s.entities);

  const conv = conversations.find((c) => c.id === activeId);
  const parent = allMessages.find((m) => m.id === parentMessageId);

  // Composer draft for the thread uses a per-thread key
  const draftKey = `${activeId}::thread::${parentMessageId}`;
  const threadDraft = (drafts as Record<string, { text: string; replyToId?: string } | undefined>)[draftKey];
  const [text, setText] = React.useState(threadDraft?.text || "");
  const [sending, setSending] = React.useState(false);

  const replies = React.useMemo(
    () => selectThreadReplies(allMessages, parentMessageId),
    [allMessages, parentMessageId]
  );

  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [replies.length]);

  if (!conv || !parent) {
    return null;
  }

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    useChatStore.getState().sendMessage({
      conversationId: activeId,
      text: trimmed,
      senderId: currentUserId,
      senderName: currentName,
      senderRole: currentRole,
      parentId: parentMessageId,
    });
    setText("");
    setSending(false);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <Reply className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[12px] font-semibold">Thread</span>
        <span className="text-[11px] text-muted-foreground">
          · <span className="font-mono tabular-nums">{replies.length}</span> replies
        </span>
        <button
          onClick={onClose}
          className="ml-auto flex h-6 w-6 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Close thread"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Parent message + replies */}
      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto py-2">
        {/* Parent */}
        <div className="border-b border-border pb-2">
          <ChatMessageRow
            message={parent}
            conversation={conv}
            entities={entities}
            currentUserId={currentUserId}
            currentRole={currentRole}
            isMe={parent.senderId === currentUserId}
            showHeader
          />
        </div>

        {/* Replies */}
        {replies.length === 0 ? (
          <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
            No replies yet. Be the first to reply.
          </div>
        ) : (
          replies.map((m, idx) => {
            const prev = replies[idx - 1];
            const showHeader =
              !prev ||
              prev.sender !== m.sender ||
              new Date(prev.timestamp).getTime() + 5 * 60_000 <
                new Date(m.timestamp).getTime();
            return (
              <ChatMessageRow
                key={m.id}
                message={m}
                conversation={conv}
                entities={entities}
                currentUserId={currentUserId}
                currentRole={currentRole}
                isMe={m.senderId === currentUserId}
                showHeader={showHeader}
                onForward={onForward}
              />
            );
          })
        )}
      </div>

      {/* Composer (simplified - uses thread-local state, no slash/mentions picker here for brevity) */}
      <div className="shrink-0 border-t border-border bg-background p-2">
        <div className="rounded-[6px] border border-border bg-card focus-within:border-foreground/40">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={`Reply in thread…`}
            rows={1}
            className="w-full resize-none bg-transparent px-2.5 pt-2 text-[12px] outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between px-1.5 pb-1.5">
            <span className="text-[10px] text-muted-foreground">
              Replying to <span className="font-medium text-foreground">{parent.sender}</span>
            </span>
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="flex h-6 items-center gap-1 rounded-[3px] bg-foreground px-2 text-[11px] font-medium text-background hover:bg-foreground/90 disabled:opacity-40"
            >
              Reply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

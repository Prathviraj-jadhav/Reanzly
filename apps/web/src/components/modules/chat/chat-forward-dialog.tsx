"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/lib/store/chat-store";
import type { ChatEntity } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Hash,
  Users,
  Search,
  Send,
} from "lucide-react";

interface ChatForwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: string | null;
  currentUserId: string;
  currentName: string;
  currentRole: string;
}

export function ChatForwardDialog({
  open,
  onOpenChange,
  messageId,
  currentUserId,
  currentName,
  currentRole,
}: ChatForwardDialogProps) {
  const conversations = useChatStore((s) => s.conversations);
  const forwardMessage = useChatStore((s) => s.forwardMessage);
  const setActive = useChatStore((s) => s.setActiveConversation);
  const [search, setSearch] = React.useState("");

  const entities: ChatEntity[] = useChatStore((s) => s.entities);

  const filtered = conversations.filter((c) => {
    const name =
      c.type === "channel"
        ? c.name
        : (() => {
            const otherId = c.participants.find((p) => p !== currentUserId);
            if (otherId === "rean") return "Rean";
            return entities.find((e) => e.id === otherId)?.name || c.name;
          })();
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const handleForward = (targetId: string) => {
    if (!messageId) return;
    forwardMessage(messageId, targetId, currentUserId, currentName, currentRole);
    onOpenChange(false);
    setSearch("");
    setActive(targetId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <div className="flex h-12 items-center gap-2 border-b border-border px-4">
          <Send className="h-4 w-4 text-muted-foreground" />
          <DialogTitle className="text-[14px] font-semibold">Forward message</DialogTitle>
        </div>
        <DialogDescription className="sr-only">
          Pick a conversation to forward the message to
        </DialogDescription>

        <div className="border-b border-border px-4 py-2">
          <div className="relative flex h-8 items-center">
            <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations"
              className="h-8 w-full rounded-[5px] border border-border bg-muted/30 pl-7 pr-2 text-[12px] outline-none focus:border-foreground/30"
            />
          </div>
        </div>

        <div className="scrollbar-thin max-h-[50vh] overflow-y-auto">
          {filtered.map((c) => {
            const isChannel = c.type === "channel";
            const otherId = c.participants.find((p) => p !== currentUserId);
            const otherEntity = otherId
              ? entities.find((e) => e.id === otherId)
              : undefined;
            const displayName =
              c.type === "channel"
                ? c.name.replace(/^#/, "")
                : otherId === "rean"
                  ? "Rean"
                  : otherEntity?.name || c.name;
            return (
              <button
                key={c.id}
                onClick={() => handleForward(c.id)}
                className={cn(
                  "flex w-full items-center gap-2 border-b border-border px-4 py-2.5 text-left last:border-b-0 hover:bg-accent"
                )}
              >
                {isChannel ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-[3px] border border-border bg-muted text-[10px] font-medium">
                    #
                  </span>
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-[3px] border border-border bg-muted text-[10px] font-medium">
                    {displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium">{displayName}</div>
                  {!isChannel && c.type === "group" && (
                    <div className="truncate text-[10px] text-muted-foreground">
                      {c.participants.length} members
                    </div>
                  )}
                  {isChannel && c.topic && (
                    <div className="truncate text-[10px] text-muted-foreground">{c.topic}</div>
                  )}
                </div>
                {isChannel && (
                  <Users className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

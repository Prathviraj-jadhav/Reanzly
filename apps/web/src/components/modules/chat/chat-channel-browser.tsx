"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/lib/store/chat-store";
import type { Conversation } from "@/lib/types";
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
  Check,
  LogOut,
  LogIn,
} from "lucide-react";

interface ChatChannelBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
}

export function ChatChannelBrowser({
  open,
  onOpenChange,
  currentUserId,
}: ChatChannelBrowserProps) {
  const conversations = useChatStore((s) => s.conversations);
  const joinChannel = useChatStore((s) => s.joinChannel);
  const leaveChannel = useChatStore((s) => s.leaveChannel);
  const setActive = useChatStore((s) => s.setActiveConversation);

  const [search, setSearch] = React.useState("");

  const channels = conversations.filter((c) => c.type === "channel");
  const filtered = channels.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (c: Conversation) => {
    if (c.participants.includes(currentUserId)) {
      leaveChannel(c.id, currentUserId);
    } else {
      joinChannel(c.id, currentUserId);
    }
  };

  const handleOpen = (c: Conversation) => {
    if (!c.participants.includes(currentUserId)) {
      joinChannel(c.id, currentUserId);
    }
    setActive(c.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <div className="flex h-12 items-center gap-2 border-b border-border px-4">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <DialogTitle className="text-[14px] font-semibold">Browse channels</DialogTitle>
        </div>
        <DialogDescription className="sr-only">
          Browse and join team channels
        </DialogDescription>

        {/* Search */}
        <div className="border-b border-border px-4 py-2">
          <div className="relative flex h-8 items-center">
            <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or description"
              className="h-8 w-full rounded-[5px] border border-border bg-muted/30 pl-7 pr-2 text-[12px] outline-none focus:border-foreground/30"
            />
          </div>
        </div>

        {/* List */}
        <div className="scrollbar-thin max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
              No channels match.
            </div>
          )}
          {filtered.map((c) => {
            const isMember = c.participants.includes(currentUserId);
            return (
              <div
                key={c.id}
                className="group flex items-start gap-3 border-b border-border px-4 py-2.5 last:border-b-0 hover:bg-accent/30"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border border-border bg-muted text-[12px] font-medium">
                  #
                </span>
                <button
                  onClick={() => handleOpen(c)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold">{c.name.replace(/^#/, "")}</span>
                    {isMember && (
                      <span className="flex items-center gap-0.5 rounded-[3px] border border-foreground px-1 py-px text-[9px] font-medium uppercase tracking-wider">
                        <Check className="h-2 w-2" /> Joined
                      </span>
                    )}
                  </div>
                  {c.description && (
                    <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                      {c.description}
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Users className="h-2.5 w-2.5" />
                    <span className="font-mono tabular-nums">{c.participants.length}</span>
                    members
                    {c.topic && <span>· {c.topic}</span>}
                  </div>
                </button>
                <button
                  onClick={() => handleToggle(c)}
                  className={cn(
                    "inline-flex h-7 shrink-0 items-center gap-1 rounded-[5px] border px-2 text-[11px] font-medium transition-colors",
                    isMember
                      ? "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                      : "border-foreground bg-foreground text-background hover:bg-foreground/90"
                  )}
                >
                  {isMember ? (
                    <>
                      <LogOut className="h-3 w-3" /> Leave
                    </>
                  ) : (
                    <>
                      <LogIn className="h-3 w-3" /> Join
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

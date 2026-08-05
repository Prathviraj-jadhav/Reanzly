"use client";

// ============================================================
// ChatGlobalSearch - self-contained header control.
//
// Today, search only works within the currently-open conversation
// (ChatConversation's own header search). This adds a global search: a
// button that opens a command-palette-style overlay and filters across
// EVERY message currently held in the Zustand store, client-side, grouped
// by which conversation each hit belongs to. Selecting a result switches to
// that conversation.
//
// Deliberately client-side-only (searches only already-loaded messages) and
// deliberately just switches conversations on select rather than reaching
// into ChatConversation's internal jump-to/highlight refs, which aren't
// exposed outside that component.
// ============================================================

import * as React from "react";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useChatStore } from "@/lib/store/chat-store";
import type { ChatMessage } from "@/lib/types";
import { conversationDisplayName, formatRelativeShort, plainTextOf } from "./chat-utils";

interface ChatGlobalSearchProps {
  currentUserId: string;
}

const MAX_RESULTS = 60;

export function ChatGlobalSearch({ currentUserId }: ChatGlobalSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const messages = useChatStore((s) => s.messages);
  const conversations = useChatStore((s) => s.conversations);
  const entities = useChatStore((s) => s.entities);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);

  // Start fresh each time the overlay opens.
  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  // Case-insensitive substring match against each message's text, most
  // recent first, capped so a huge history doesn't render an endless list.
  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return messages
      .filter((m) => !m.parentId && !m.deleted)
      .filter((m) => plainTextOf(m.text || "").toLowerCase().includes(q))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, MAX_RESULTS);
  }, [messages, query]);

  // Group hits by conversation, preserving most-recent-match-first order.
  const grouped = React.useMemo(() => {
    const order: string[] = [];
    const byConv = new Map<string, ChatMessage[]>();
    for (const m of results) {
      if (!byConv.has(m.conversationId)) {
        byConv.set(m.conversationId, []);
        order.push(m.conversationId);
      }
      byConv.get(m.conversationId)!.push(m);
    }
    return order.map((conversationId) => ({
      conversationId,
      matches: byConv.get(conversationId)!,
    }));
  }, [results]);

  const handleSelect = (conversationId: string) => {
    setActiveConversation(conversationId);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-7 items-center gap-1 rounded-[4px] border border-border px-2 text-[11px] font-medium transition-colors hover:bg-accent"
        title="Search all conversations"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search all</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl gap-0 overflow-hidden p-0" showCloseButton>
          <DialogHeader className="sr-only">
            <DialogTitle>Search all conversations</DialogTitle>
            <DialogDescription>
              Search every message currently loaded, across all channels and DMs.
            </DialogDescription>
          </DialogHeader>
          <Command shouldFilter={false} className="rounded-[3px]">
            <CommandInput
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search all messages…"
            />
            <CommandList className="max-h-[60vh]">
              <CommandEmpty className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                {query.trim() === ""
                  ? "Type to search across every channel and DM."
                  : `No messages match "${query.trim()}".`}
              </CommandEmpty>
              {grouped.map(({ conversationId, matches }) => {
                const conv = conversations.find((c) => c.id === conversationId);
                const name = conv
                  ? conversationDisplayName(conv, currentUserId, entities)
                  : "Unknown conversation";
                return (
                  <CommandGroup key={conversationId} heading={name}>
                    {matches.map((m) => (
                      <CommandItem
                        key={m.id}
                        value={m.id}
                        onSelect={() => handleSelect(conversationId)}
                        className="flex flex-col items-start gap-0.5"
                      >
                        <div className="flex w-full items-center gap-2">
                          <span className="truncate text-[12px] font-medium text-foreground">
                            {m.isRean ? "Rean" : m.sender}
                          </span>
                          <span className="ml-auto shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                            {formatRelativeShort(m.timestamp)}
                          </span>
                        </div>
                        <span className="line-clamp-1 w-full text-left text-[12px] text-muted-foreground">
                          {plainTextOf(m.text)}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

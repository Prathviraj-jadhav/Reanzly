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
  Search,
  Plus,
  Users,
  Hash,
} from "lucide-react";

interface ChatNewDmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
}

export function ChatNewDmDialog({
  open,
  onOpenChange,
  currentUserId,
}: ChatNewDmDialogProps) {
  const conversations = useChatStore((s) => s.conversations);
  const setActive = useChatStore((s) => s.setActiveConversation);
  const startDm = useChatStore((s) => s.startDm);
  const startGroup = useChatStore((s) => s.startGroup);
  const entities = useChatStore((s) => s.entities);

  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [groupName, setGroupName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const visibleEntities = React.useMemo<ChatEntity[]>(
    () => entities.filter((e) => e.id !== currentUserId),
    [entities, currentUserId]
  );

  const filtered = visibleEntities.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase())
  );

  const reset = () => {
    setSelected([]);
    setSearch("");
    setGroupName("");
  };

  const handleToggle = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const handleCreate = async () => {
    if (selected.length === 0 || creating) return;
    setCreating(true);
    try {
      if (selected.length === 1) {
        const target = selected[0];
        const existing = conversations.find(
          (c) =>
            c.type === "direct" &&
            c.participants.includes(target) &&
            c.participants.includes(currentUserId)
        );
        if (existing) {
          setActive(existing.id);
        } else {
          const id = await startDm(target);
          if (id) setActive(id);
        }
      } else {
        const names = selected
          .map((id) => visibleEntities.find((e) => e.id === id)?.name.split(" ")[0])
          .filter(Boolean);
        const name =
          groupName.trim() ||
          names.slice(0, 3).join(", ") + (names.length > 3 ? " +" + (names.length - 3) : "");
        const id = await startGroup(name, selected);
        if (id) setActive(id);
      }
      reset();
      onOpenChange(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md p-0">
        <div className="flex h-12 items-center gap-2 border-b border-border px-4">
          <Plus className="h-4 w-4 text-muted-foreground" />
          <DialogTitle className="text-[14px] font-semibold">New conversation</DialogTitle>
        </div>
        <DialogDescription className="sr-only">
          Start a DM or group conversation
        </DialogDescription>

        {selected.length >= 2 && (
          <div className="border-b border-border px-4 py-2">
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name (optional)"
              className="h-8 w-full rounded-[5px] border border-border bg-muted/30 px-2 text-[12px] outline-none focus:border-foreground/30"
            />
          </div>
        )}

        <div className="border-b border-border px-4 py-2">
          <div className="relative flex h-8 items-center">
            <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people"
              className="h-8 w-full rounded-[5px] border border-border bg-muted/30 pl-7 pr-2 text-[12px] outline-none focus:border-foreground/30"
            />
          </div>
        </div>

        <div className="scrollbar-thin max-h-[50vh] overflow-y-auto">
          {filtered.map((e) => {
            const isSel = selected.includes(e.id);
            return (
              <button
                key={e.id}
                onClick={() => handleToggle(e.id)}
                className={cn(
                  "flex w-full items-center gap-2 border-b border-border px-4 py-2 text-left last:border-b-0 hover:bg-accent",
                  isSel && "bg-accent/50"
                )}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-border bg-muted text-[11px] font-medium">
                  {e.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium">{e.name}</div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {e.role} · {e.branch}
                  </div>
                </div>
                {isSel && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background">
                    <Plus className="h-2.5 w-2.5 rotate-45" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <span className="text-[11px] text-muted-foreground">
            {selected.length === 0
              ? "Select at least one person"
              : selected.length === 1
                ? "1:1 DM"
                : `${selected.length + 1}-person group`}
          </span>
          <button
            onClick={handleCreate}
            disabled={selected.length === 0 || creating}
            className="inline-flex h-7 items-center gap-1 rounded-[5px] bg-foreground px-3 text-[12px] font-medium text-background hover:bg-foreground/90 disabled:opacity-40"
          >
            {selected.length >= 2 ? <Users className="h-3 w-3" /> : <Hash className="h-3 w-3" />}
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

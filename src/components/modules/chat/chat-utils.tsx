"use client";

// ============================================================
// chat-utils.tsx - shared helpers for the chat module.
//
// Mention / channel-ref encoding:
//   Mentions are stored inline in message.text as `@[Name](entityId)`.
//   Channel refs are stored as `#[Name](channelId)`.
//   On render we tokenise and emit styled chips so the visual stays
//   distinct from plain text (monochrome - bordered chips).
// ============================================================

import React from "react";
import { cn } from "@/lib/utils";
import type { ChatEntity, Conversation } from "@/lib/types";

const MENTION_RE = /@\[([^\]]+)\]\(([^)]+)\)/g;
const CHANNEL_RE = /#\[([^\]]+)\]\(([^)]+)\)/g;

export function encodeMention(name: string, entityId: string): string {
  // Use a sentinel the user is unlikely to type: `@[Name](id)`
  return `@[${name}](${entityId})`;
}

export function encodeChannelRef(name: string, channelId: string): string {
  return `#[${name}](${channelId})`;
}

export function plainTextOf(text: string): string {
  return text
    .replace(MENTION_RE, "@$1")
    .replace(CHANNEL_RE, "#$1");
}

interface Token {
  type: "text" | "mention" | "channel";
  text: string;
  refId?: string;
}

export function tokeniseMessage(text: string): Token[] {
  const tokens: Token[] = [];
  let lastIdx = 0;
  // Single combined regex matching @name(id) mentions and #name(id) channel refs.
  const re = /@\[([^\]]+)\]\(([^)]+)\)|#\[([^\]]+)\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) {
      tokens.push({ type: "text", text: text.slice(lastIdx, m.index) });
    }
    if (m[1] !== undefined) {
      tokens.push({ type: "mention", text: m[1], refId: m[2] });
    } else if (m[3] !== undefined) {
      tokens.push({ type: "channel", text: m[3], refId: m[4] });
    }
    lastIdx = re.lastIndex;
  }
  if (lastIdx < text.length) {
    tokens.push({ type: "text", text: text.slice(lastIdx) });
  }
  return tokens;
}

export function MessageText({
  text,
  onMentionClick,
  onChannelClick,
  highlight,
  className,
}: {
  text: string;
  onMentionClick?: (entityId: string, name: string) => void;
  onChannelClick?: (channelId: string, name: string) => void;
  highlight?: string;
  className?: string;
}) {
  const tokens = tokeniseMessage(text);
  const hl = highlight?.trim();
  return (
    <span className={cn("whitespace-pre-wrap break-words", className)}>
      {tokens.map((tok, i) => {
        if (tok.type === "mention") {
          return (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMentionClick?.(tok.refId || "", tok.text);
              }}
              className="mx-px inline-flex items-center rounded-[3px] border border-border bg-muted/60 px-1 py-px text-[12px] font-medium align-baseline hover:bg-accent"
            >
              @{tok.text}
            </button>
          );
        }
        if (tok.type === "channel") {
          return (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChannelClick?.(tok.refId || "", tok.text);
              }}
              className="mx-px inline-flex items-center rounded-[3px] border border-border bg-muted/60 px-1 py-px text-[12px] font-medium align-baseline hover:bg-accent"
            >
              #{tok.text}
            </button>
          );
        }
        // Plain text - optionally highlight search match
        if (hl && hl.length >= 1) {
          return <TextWithHighlight key={i} text={tok.text} highlight={hl} />;
        }
        return <React.Fragment key={i}>{tok.text}</React.Fragment>;
      })}
    </span>
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function TextWithHighlight({ text, highlight }: { text: string; highlight: string }) {
  const parts: React.ReactNode[] = [];
  const re = new RegExp(escapeRegex(highlight), "ig");
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <mark key={i++} className="rounded-[2px] bg-foreground px-0.5 text-background">
        {m[0]}
      </mark>
    );
    last = re.lastIndex;
    if (m.index === re.lastIndex) re.lastIndex++; // avoid zero-length loop
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

// ===== Helpers for display =====
export function conversationDisplayName(
  conv: Conversation,
  currentUserId: string,
  entities: ChatEntity[]
): string {
  if (conv.type !== "direct") return conv.name;
  // For direct: show the OTHER participant's name
  const otherId = conv.participants.find((p) => p !== currentUserId);
  if (otherId === "rean") return "Rean";
  const ent = entities.find((e) => e.id === otherId);
  return ent?.name || conv.name;
}

export function initialsFromName(name: string): string {
  return name
    .replace(/^#/, "")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatDayDivider(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" });
}

export function formatRelativeShort(iso: string): string {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = now - d;
  if (diff < 60_000) return "now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h`;
  if (diff < 86400_000 * 7) return `${Math.floor(diff / 86400_000)}d`;
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
}

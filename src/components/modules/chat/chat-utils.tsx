"use client";

// ============================================================
// chat-utils.tsx - shared helpers for the chat module.
//
// Mention / channel-ref encoding:
//   Mentions are stored inline in message.text as `@[Name](entityId)`.
//   Channel refs are stored as `#[Name](channelId)`.
//   On render we tokenise and emit styled chips so the visual stays
//   distinct from plain text (monochrome - bordered chips).
//
// Markdown-lite formatting (deliberately limited, NOT a full markdown spec):
//   **bold**, *italic*, `inline code`, and ```fenced code blocks``` are
//   parsed here as pure functions and composed with the mention/channel
//   tokens above, so e.g. "**bold @[Name](id) text**" renders both the
//   bold styling AND the mention chip. Bullet lists ("- item" lines) and
//   fenced code blocks are block-level constructs, parsed by
//   parseMessageBlocks() - actual code-block rendering (react-syntax-
//   highlighter) lives in chat-message.tsx alongside the rest of the
//   message-body rendering.
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
    .replace(CHANNEL_RE, "#$1")
    .replace(/```[\s\S]*?```/g, "[code]")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\*\*([^*\n]+?)\*\*/g, "$1")
    .replace(/\*([^*\n]+?)\*/g, "$1")
    .replace(/^-\s+/gm, "");
}

// ===== Inline tokeniser =====
// Handles **bold**, *italic*, `inline code`, and the @[..]/#[..] mention /
// channel tokens in a single pass, following the same "one combined regex,
// exec in a loop" approach as the original mention/channel-only tokeniser.
// Bold/italic content is recursively re-tokenised so mentions, channels,
// and inline code compose correctly inside formatted spans.
interface InlineToken {
  type: "text" | "mention" | "channel" | "bold" | "italic" | "code";
  text: string;
  refId?: string;
  children?: InlineToken[];
}

const INLINE_PATTERN =
  "`([^`\\n]+)`" + // 1: inline code
  "|\\*\\*([^*\\n]+?)\\*\\*" + // 2: bold
  "|\\*([^*\\n]+?)\\*" + // 3: italic
  "|@\\[([^\\]]+)\\]\\(([^)]+)\\)" + // 4,5: mention name, id
  "|#\\[([^\\]]+)\\]\\(([^)]+)\\)"; // 6,7: channel name, id

export function tokeniseMessage(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const re = new RegExp(INLINE_PATTERN, "g");
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) {
      tokens.push({ type: "text", text: text.slice(lastIdx, m.index) });
    }
    if (m[1] !== undefined) {
      tokens.push({ type: "code", text: m[1] });
    } else if (m[2] !== undefined) {
      tokens.push({ type: "bold", text: m[2], children: tokeniseMessage(m[2]) });
    } else if (m[3] !== undefined) {
      tokens.push({ type: "italic", text: m[3], children: tokeniseMessage(m[3]) });
    } else if (m[4] !== undefined) {
      tokens.push({ type: "mention", text: m[4], refId: m[5] });
    } else if (m[6] !== undefined) {
      tokens.push({ type: "channel", text: m[6], refId: m[7] });
    }
    lastIdx = re.lastIndex;
    if (m.index === re.lastIndex) re.lastIndex++; // avoid zero-length loop
  }
  if (lastIdx < text.length) {
    tokens.push({ type: "text", text: text.slice(lastIdx) });
  }
  return tokens;
}

// ===== Bare URL auto-linking =====
// Deliberately simple: match http(s):// runs up to whitespace or a likely
// trailing delimiter, then trim trailing sentence punctuation off the match
// so "check https://x.com/foo." doesn't swallow the period into the link.
const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;

function splitTrailingPunctuation(url: string): { url: string; trailing: string } {
  const m = /^(.*?)([.,;:!?]+)$/.exec(url);
  return m ? { url: m[1], trailing: m[2] } : { url, trailing: "" };
}

/** First bare URL found in raw message text, domain-only display data (no network call). */
export function extractFirstUrl(text: string): string | null {
  const re = new RegExp(URL_RE.source, "g");
  const m = re.exec(text);
  if (!m) return null;
  return splitTrailingPunctuation(m[0]).url;
}

function renderLinkedText(
  text: string,
  highlight: string | undefined,
  keyPrefix: string
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = new RegExp(URL_RE.source, "g");
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      const chunk = text.slice(last, m.index);
      nodes.push(
        highlight ? (
          <TextWithHighlight key={`${keyPrefix}-t${i}`} text={chunk} highlight={highlight} />
        ) : (
          chunk
        )
      );
    }
    const { url, trailing } = splitTrailingPunctuation(m[0]);
    nodes.push(
      <a
        key={`${keyPrefix}-a${i}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="break-all underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-current"
      >
        {url}
      </a>
    );
    if (trailing) nodes.push(trailing);
    last = re.lastIndex;
    i++;
  }
  if (last < text.length) {
    const chunk = text.slice(last);
    nodes.push(
      highlight ? (
        <TextWithHighlight key={`${keyPrefix}-tEnd`} text={chunk} highlight={highlight} />
      ) : (
        chunk
      )
    );
  }
  return nodes;
}

function renderInlineTokens(
  tokens: InlineToken[],
  opts: {
    onMentionClick?: (entityId: string, name: string) => void;
    onChannelClick?: (channelId: string, name: string) => void;
    highlight?: string;
  },
  keyPrefix = "n"
): React.ReactNode[] {
  return tokens.map((tok, i) => {
    const key = `${keyPrefix}-${i}`;
    if (tok.type === "mention") {
      return (
        <button
          key={key}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            opts.onMentionClick?.(tok.refId || "", tok.text);
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
          key={key}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            opts.onChannelClick?.(tok.refId || "", tok.text);
          }}
          className="mx-px inline-flex items-center rounded-[3px] border border-border bg-muted/60 px-1 py-px text-[12px] font-medium align-baseline hover:bg-accent"
        >
          #{tok.text}
        </button>
      );
    }
    if (tok.type === "code") {
      return (
        <code
          key={key}
          className="rounded-[3px] border border-border bg-muted/60 px-1 py-px font-mono text-[12px]"
        >
          {tok.text}
        </code>
      );
    }
    if (tok.type === "bold") {
      return (
        <strong key={key} className="font-semibold">
          {renderInlineTokens(tok.children ?? [], opts, key)}
        </strong>
      );
    }
    if (tok.type === "italic") {
      return (
        <em key={key} className="italic">
          {renderInlineTokens(tok.children ?? [], opts, key)}
        </em>
      );
    }
    // Plain text - auto-link bare URLs, optionally highlight a search match.
    return <React.Fragment key={key}>{renderLinkedText(tok.text, opts.highlight, key)}</React.Fragment>;
  });
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
      {renderInlineTokens(tokens, {
        onMentionClick,
        onChannelClick,
        highlight: hl && hl.length >= 1 ? hl : undefined,
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

// ===== Block-level markdown-lite parsing =====
// Splits raw message text into fenced code blocks, "- " bullet lists, and
// plain paragraph text. Paragraph/list item text is still raw and gets
// inline-tokenised (tokeniseMessage/MessageText) separately at render time -
// this only handles the block boundaries.
export type MessageBlock =
  | { type: "code"; lang: string; code: string }
  | { type: "list"; items: string[] }
  | { type: "text"; text: string };

const FENCE_OPEN_RE = /^```\s*([A-Za-z0-9_+-]*)\s*$/;
const FENCE_CLOSE_RE = /^```\s*$/;
const LIST_ITEM_RE = /^-\s+(.*)$/;

export function parseMessageBlocks(text: string): MessageBlock[] {
  const blocks: MessageBlock[] = [];
  const lines = text.split("\n");
  let textBuf: string[] = [];
  let listBuf: string[] = [];

  const flushText = () => {
    if (textBuf.length > 0) {
      blocks.push({ type: "text", text: textBuf.join("\n") });
      textBuf = [];
    }
  };
  const flushList = () => {
    if (listBuf.length > 0) {
      blocks.push({ type: "list", items: listBuf });
      listBuf = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fenceMatch = FENCE_OPEN_RE.exec(line);
    if (fenceMatch) {
      flushList();
      flushText();
      const lang = fenceMatch[1] || "";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !FENCE_CLOSE_RE.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume the closing fence line
      blocks.push({ type: "code", lang, code: codeLines.join("\n") });
      continue;
    }
    const listMatch = LIST_ITEM_RE.exec(line);
    if (listMatch) {
      flushText();
      listBuf.push(listMatch[1]);
      i++;
      continue;
    }
    flushList();
    textBuf.push(line);
    i++;
  }
  flushList();
  flushText();
  return blocks;
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

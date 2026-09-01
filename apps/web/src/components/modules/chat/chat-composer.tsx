"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useChatStore, SLASH_COMMANDS } from "@/lib/store/chat-store";
import type { ChatAttachment, ChatEntity, ChatMessage, Conversation } from "@/lib/types";
import { ChatAvatar } from "./chat-avatar";
import { encodeMention, encodeChannelRef, plainTextOf } from "./chat-utils";
import {
  Paperclip,
  AtSign,
  Hash,
  Send,
  Sparkles,
  Slash,
  X,
  FileText,
  Loader2,
  Bold,
  Italic,
  Code,
  Smile,
} from "lucide-react";
import { toast } from "sonner";

// ===== Emoji picker data =====
// Hardcoded, no external dependency. Grouped into a few simple categories.
// This is for composing emoji inline in message text - separate from the
// message reaction picker (chat-message.tsx / CHAT_QUICK_EMOJIS).
const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Faces",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🙂", "😉",
      "😊", "😍", "😘", "😎", "🤔", "😐", "🙄", "😴",
      "😢", "😭", "😡", "🥳", "😇", "🤯",
    ],
  },
  {
    label: "Gestures",
    emojis: [
      "👍", "👎", "👏", "🙌", "🙏", "👋", "🤝", "💪",
      "✌️", "🤞", "👌", "🤟", "👊", "✋",
    ],
  },
  {
    label: "Objects & symbols",
    emojis: [
      "🔥", "💡", "✅", "❌", "⚠️", "🎉", "🚀", "⭐",
      "❤️", "💯", "📌", "📎", "🕐", "📅", "💬", "🔔",
    ],
  },
];

interface ChatComposerProps {
  conversation: Conversation;
  currentUserId: string;
  currentName: string;
  currentRole: string;
  replyTarget?: ChatMessage | null;
  onClearReply?: () => void;
  onOpenThread?: (messageId: string) => void;
  onMentionClick?: (entityId: string, name: string) => void;
  onChannelClick?: (channelId: string, name: string) => void;
  compact?: boolean;
}

type PickerKind = "mention" | "channel" | "slash" | null;

interface PickerState {
  kind: PickerKind;
  query: string;
  startIndex: number;
  endIndex: number;
  selectedIndex: number;
}

export function ChatComposer({
  conversation,
  currentUserId,
  currentName,
  currentRole,
  replyTarget,
  onClearReply,
  onMentionClick,
  onChannelClick,
  compact = false,
}: ChatComposerProps) {
  const drafts = useChatStore((s) => s.drafts);
  const setDraft = useChatStore((s) => s.setDraft);
  const clearDraft = useChatStore((s) => s.clearDraft);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const notifyTyping = useChatStore((s) => s.notifyTyping);
  const pinMessage = useChatStore((s) => s.pinMessage);
  const conversations = useChatStore((s) => s.conversations);
  const messages = useChatStore((s) => s.messages);
  const chatEntities = useChatStore((s) => s.entities);

  const draft = drafts[conversation.id] || { text: "" };
  const [text, setText] = React.useState(draft.text);
  const [attachment, setAttachment] = React.useState<ChatAttachment | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const [sending, setSending] = React.useState(false);
  const [picker, setPicker] = React.useState<PickerState | null>(null);
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const isUploading = uploadProgress !== null;

  // Hydrate from draft when conversation switches.
  // IMPORTANT: read the draft imperatively via getState() and depend ONLY on
  // conversation.id. If `drafts` were in the deps, this effect would ping-pong
  // with the sync effect below (setDraft creates a new drafts reference each
  // time -> this effect re-runs -> setText -> sync effect re-runs -> setDraft
  // -> infinite loop / "Maximum update depth exceeded").
  React.useEffect(() => {
    setText(useChatStore.getState().drafts[conversation.id]?.text || "");
  }, [conversation.id]);

  // Sync local text to store (debounced by React render)
  React.useEffect(() => {
    setDraft(conversation.id, text, replyTarget?.id);
  }, [text, conversation.id, setDraft, replyTarget?.id]);

  // Auto-resize textarea
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [text]);

  // ===== Mention / channel / slash picker detection =====
  const detectPicker = (value: string, selStart: number): PickerState | null => {
    // Find the token immediately preceding the caret
    const before = value.slice(0, selStart);
    // Match the last `@xxx`, `#xxx`, or `/xxx` that isn't followed by whitespace
    const m = before.match(/(?:^|\s)(@|#|\/)([^\s@#\/]*)$/);
    if (!m) return null;
    const kind: PickerKind = m[1] === "@" ? "mention" : m[1] === "#" ? "channel" : "slash";
    if (kind === null) return null;
    const startIndex = (m.index ?? 0) + m[0].length - m[2].length - 1; // position of the trigger char
    return {
      kind,
      query: m[2],
      startIndex,
      endIndex: selStart,
      selectedIndex: 0,
    };
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setText(v);
    const p = detectPicker(v, e.target.selectionStart);
    setPicker(p);
    // Emit typing:start (throttled) so other participants see the indicator.
    if (v.trim()) notifyTyping(conversation.id);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const p = detectPicker(el.value, el.selectionStart);
    setPicker(p);
  };

  // ===== Insert mention / channel ref / slash command =====
  const insertEntity = (entity: ChatEntity) => {
    if (!picker || !textareaRef.current) return;
    const before = text.slice(0, picker.startIndex);
    const after = text.slice(picker.endIndex);
    const token = `${encodeMention(entity.name, entity.id)} `;
    const next = before + token + after;
    setText(next);
    setPicker(null);
    // Restore focus + caret after token
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      const caret = (before + token).length;
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  const insertChannelRef = (conv: Conversation) => {
    if (!picker || !textareaRef.current) return;
    const before = text.slice(0, picker.startIndex);
    const after = text.slice(picker.endIndex);
    const cleanName = conv.name.replace(/^#/, "");
    const token = `${encodeChannelRef(cleanName, conv.id)} `;
    const next = before + token + after;
    setText(next);
    setPicker(null);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      const caret = (before + token).length;
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  const insertSlashCommand = (cmd: string) => {
    if (!picker || !textareaRef.current) return;
    const before = text.slice(0, picker.startIndex);
    const after = text.slice(picker.endIndex);
    const next = before + cmd + " " + after;
    setText(next);
    setPicker(null);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      const caret = (before + cmd + " ").length;
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  // ===== Formatting toolbar: wrap selection with markdown-lite marker =====
  // Bold -> **text**, Italic -> *text*, Code -> `text`. If nothing is selected,
  // the marker pair is inserted with the caret placed between the markers.
  const wrapSelectionWithMarker = (marker: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const selected = text.slice(start, end);
    const before = text.slice(0, start);
    const after = text.slice(end);
    const next = `${before}${marker}${selected}${marker}${after}`;
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      if (selected) {
        // Keep the wrapped text selected so repeated clicks can be undone visually.
        el.setSelectionRange(start + marker.length, start + marker.length + selected.length);
      } else {
        const caret = start + marker.length;
        el.setSelectionRange(caret, caret);
      }
    });
  };

  // ===== Emoji picker: insert at cursor position =====
  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const caret = start + emoji.length;
      el.setSelectionRange(caret, caret);
    });
  };

  // ===== Filtered lists for the picker =====
  const mentionList: ChatEntity[] = React.useMemo(() => {
    const all = chatEntities.filter((e) => e.id !== currentUserId);
    if (!picker || picker.kind !== "mention") return all.slice(0, 8);
    const q = picker.query.toLowerCase();
    return all
      .filter((e) => e.name.toLowerCase().includes(q) || e.role.toLowerCase().includes(q))
      .slice(0, 8);
  }, [picker, currentUserId, chatEntities]);

  const channelList: Conversation[] = React.useMemo(() => {
    const all = conversations.filter((c) => c.type === "channel");
    if (!picker || picker.kind !== "channel") return all.slice(0, 8);
    const q = picker.query.toLowerCase();
    return all
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [picker, conversations]);

  const slashList = React.useMemo(() => {
    if (!picker || picker.kind !== "slash") return [...SLASH_COMMANDS];
    const q = picker.query.toLowerCase();
    return [...SLASH_COMMANDS].filter((c) => c.cmd.toLowerCase().includes(q));
  }, [picker]);

  // ===== Keyboard navigation in picker =====
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Formatting shortcuts work regardless of picker state.
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        wrapSelectionWithMarker("**");
        return;
      }
      if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        wrapSelectionWithMarker("*");
        return;
      }
    }

    if (picker) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setPicker({
          ...picker,
          selectedIndex:
            (picker.selectedIndex + 1) %
            (picker.kind === "mention"
              ? mentionList.length
              : picker.kind === "channel"
                ? channelList.length
                : slashList.length || 1),
        });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setPicker({
          ...picker,
          selectedIndex:
            (picker.selectedIndex -
              1 +
              (picker.kind === "mention"
                ? mentionList.length
                : picker.kind === "channel"
                  ? channelList.length
                  : slashList.length || 1)) %
            (picker.kind === "mention"
              ? mentionList.length
              : picker.kind === "channel"
                ? channelList.length
                : slashList.length || 1),
        });
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        if (picker.kind === "mention" && mentionList[picker.selectedIndex]) {
          insertEntity(mentionList[picker.selectedIndex]);
        } else if (picker.kind === "channel" && channelList[picker.selectedIndex]) {
          insertChannelRef(channelList[picker.selectedIndex]);
        } else if (picker.kind === "slash" && slashList[picker.selectedIndex]) {
          insertSlashCommand(slashList[picker.selectedIndex].cmd);
        }
        return;
      }
      if (e.key === "Escape") {
        setPicker(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // ===== File upload =====
  // Real upload via multipart/form-data to POST /api/chat/upload. Progress is
  // tracked with XMLHttpRequest (fetch does not expose upload progress). On a
  // non-2xx response we surface whatever error message the API returned and
  // do not populate an attachment.
  const uploadFile = (file: File) => {
    setUploadProgress(0);
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/chat/upload");

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };

    xhr.onload = () => {
      setUploadProgress(null);
      let body: { url?: string; contentType?: string; size?: number; name?: string; error?: string; message?: string } | null = null;
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        body = null;
      }

      if (xhr.status >= 200 && xhr.status < 300 && body?.url) {
        const contentType = body.contentType || file.type;
        setAttachment({
          id: `att-${Date.now()}`,
          type: contentType.startsWith("image/") ? "image" : "file",
          name: body.name || file.name,
          size: body.size ?? file.size,
          mime: contentType,
          url: body.url,
        });
        return;
      }

      const message =
        body?.error ||
        body?.message ||
        (xhr.status === 413
          ? "File is too large to upload."
          : `Upload failed (${xhr.status || "network error"}).`);
      toast.error(message);
    };

    xhr.onerror = () => {
      setUploadProgress(null);
      toast.error("Upload failed. Check your connection and try again.");
    };

    xhr.send(formData);
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so same file can be re-picked
    if (!file) return;
    uploadFile(file);
  };

  // ===== Send =====
  const handleSend = async () => {
    const trimmed = text.trim();
    if ((!trimmed && !attachment) || sending || isUploading) return;
    setSending(true);

    // Handle slash commands
    if (trimmed.startsWith("/")) {
      const [cmd, ...rest] = trimmed.split(/\s+/);
      const argStr = trimmed.slice(cmd.length).trim();
      await handleSlashCommand(cmd, argStr, rest.join(" "));
      setText("");
      clearDraft(conversation.id);
      setAttachment(null);
      setSending(false);
      return;
    }

    // Send through the real-time pipeline. The socket server persists the
    // message and broadcasts it to every participant. If the message mentions
    // @[Rean](rean) OR is sent in the Rean DM, the server automatically calls
    // the Rean AI and posts a reply - no client-side simulation.
    sendMessage({
      conversationId: conversation.id,
      text: trimmed,
      senderId: currentUserId,
      senderName: currentName,
      senderRole: currentRole,
      attachment: attachment || undefined,
      parentId: replyTarget?.id,
    });

    setText("");
    clearDraft(conversation.id);
    setAttachment(null);
    onClearReply?.();
    setSending(false);
  };

  // ===== Slash command handlers =====
  const handleSlashCommand = async (cmd: string, argStr: string, _rest: string) => {
    switch (cmd) {
      case "/summary": {
        const ctx = messages
          .filter((m) => m.conversationId === conversation.id)
          .slice(-20)
          .map((m) => `${m.sender}: ${plainTextOf(m.text)}`)
          .join("\n");
        // Send a message mentioning @[Rean](rean) with the summary prompt.
        // The chat service detects the mention and calls the Rean AI, posting
        // the reply into this same conversation.
        sendMessage({
          conversationId: conversation.id,
          text: `${encodeMention("Rean", "rean")} Summarise this conversation in 4-6 bullet points, focused on decisions and action items:\n${ctx}`,
          senderId: currentUserId,
          senderName: currentName,
          senderRole: currentRole,
        });
        toast.message("Rean is summarising…");
        break;
      }
      case "/assign": {
        if (!argStr) {
          toast.error("Usage: /assign <task> - mention someone with @ to flag it for them");
          return;
        }
        // This posts a formatted action-item message in this conversation only.
        // It is NOT wired to Operations Hub or any task-tracking system - the
        // copy must not claim otherwise.
        sendMessage({
          conversationId: conversation.id,
          text: `📌 **Action item:** ${argStr}\n\nPosted by ${currentName} in this conversation.`,
          senderId: currentUserId,
          senderName: currentName,
          senderRole: currentRole,
          isCommandResult: true,
        });
        toast.success("Action item posted to this conversation.");
        break;
      }
      case "/poll": {
        const parts = argStr.split("|").map((s) => s.trim()).filter(Boolean);
        if (parts.length < 3) {
          toast.error("Usage: /poll <question> | opt1 | opt2 [| opt3…]");
          return;
        }
        const [question, ...opts] = parts;
        sendMessage({
          conversationId: conversation.id,
          text: `${question}`,
          senderId: currentUserId,
          senderName: currentName,
          senderRole: currentRole,
          isPoll: {
            question,
            options: opts.map((text, i) => ({
              id: `opt-${Date.now()}-${i}`,
              text,
              votes: [],
            })),
          },
        });
        break;
      }
      case "/pin": {
        const last = [...messages]
          .reverse()
          .find((m) => m.conversationId === conversation.id && !m.parentId);
        if (last) {
          pinMessage(last.id);
          toast.success("Pinned last message.");
        } else {
          toast.error("No message to pin.");
        }
        break;
      }
      case "/help": {
        sendMessage({
          conversationId: conversation.id,
          text: `Available commands:\n${SLASH_COMMANDS.map(
            (c) => `  ${c.cmd} ${c.args} - ${c.desc}`
          ).join("\n")}`,
          senderId: currentUserId,
          senderName: currentName,
          senderRole: currentRole,
          isCommandResult: true,
        });
        break;
      }
      default: {
        toast.error(`Unknown command: ${cmd}`);
      }
    }
  };

  // ===== Ask Rean (composer button) =====
  const handleAskRean = () => {
    if (sending) return;
    const last5 = messages
      .filter((m) => m.conversationId === conversation.id)
      .slice(-5)
      .map((m) => `${m.sender}: ${plainTextOf(m.text)}`)
      .join("\n");
    const ctx = `Here is the recent conversation context:\n${last5}\n\nGive me a sharp, actionable analysis. Identify the next best action.`;
    sendMessage({
      conversationId: conversation.id,
      text: `${encodeMention("Rean", "rean")} ${ctx}`,
      senderId: currentUserId,
      senderName: currentName,
      senderRole: currentRole,
    });
    toast.message("Asking Rean…");
  };

  const isPickerOpen = !!picker && (picker.kind === "mention" ? mentionList.length > 0 : picker.kind === "channel" ? channelList.length > 0 : slashList.length > 0);

  // Real conversations get DB-generated cuids, never the old mock-data id
  // "c4" this used to check - that condition was permanently dead, so the
  // Rean-specific placeholder never showed. Detect it by real participant
  // membership instead. For a direct DM, `conversation.name` is stored as
  // "Me & Them" (see /api/chat/conversations) so the composer showed both
  // names back at the user instead of just who they're actually messaging -
  // resolve the other participant's display name instead.
  const isReanConversation = conversation.participants.includes("rean");
  const otherParticipantName =
    conversation.type === "direct"
      ? chatEntities.find((e) => e.id === conversation.participants.find((p) => p !== currentUserId))?.name
      : undefined;
  const composerPlaceholder = isReanConversation
    ? "Ask Rean anything about your operations…"
    : `Message ${otherParticipantName ?? conversation.name}`;

  return (
    <div className="shrink-0 border-t border-border bg-background p-2">
      {/* Reply target indicator */}
      {replyTarget && (
        <div className="mb-1 flex items-center gap-2 rounded-[5px] border border-border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">Replying to {replyTarget.sender}:</span>
          <span className="min-w-0 flex-1 truncate">{plainTextOf(replyTarget.text)}</span>
          <button onClick={onClearReply} className="hover:text-foreground" aria-label="Cancel reply">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Attachment preview */}
      {attachment && (
        <div className="mb-1 flex items-center gap-2 rounded-[5px] border border-border bg-muted/40 px-2 py-1">
          {attachment.type === "image" ? (
            <img src={attachment.url ?? attachment.data} alt={attachment.name} className="h-8 w-8 rounded-[3px] object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-border bg-background">
              <FileText className="h-3.5 w-3.5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-medium">{attachment.name}</div>
            <div className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {formatBytesLocal(attachment.size)}
            </div>
          </div>
          <button
            onClick={() => setAttachment(null)}
            className="hover:text-foreground"
            aria-label="Remove attachment"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Upload progress */}
      {uploadProgress !== null && (
        <div className="mb-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Uploading…</span>
            <span className="font-mono tabular-nums">{Math.round(uploadProgress)}%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-foreground transition-[width] duration-100"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Composer shell */}
      <div className="relative">
        {/* Picker popover */}
        {isPickerOpen && (
          <div className="absolute bottom-full left-0 mb-1 w-72 rounded-[6px] border border-border bg-popover p-1">
            <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {picker?.kind === "mention"
                ? "Mention someone"
                : picker?.kind === "channel"
                  ? "Reference a channel"
                  : "Slash commands"}
            </div>
            <div className="max-h-56 overflow-y-auto scrollbar-thin">
              {picker?.kind === "mention" &&
                mentionList.map((e, i) => (
                  <button
                    key={e.id}
                    onClick={() => insertEntity(e)}
                    onMouseEnter={() => setPicker({ ...picker, selectedIndex: i })}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-[4px] px-2 py-1 text-left",
                      i === picker.selectedIndex ? "bg-accent" : "hover:bg-accent"
                    )}
                  >
                    <ChatAvatar initials={e.initials} size="xs" isRean={e.id === "rean"} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium">{e.name}</div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        {e.role} · {e.branch}
                      </div>
                    </div>
                  </button>
                ))}
              {picker?.kind === "channel" &&
                channelList.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => insertChannelRef(c)}
                    onMouseEnter={() => setPicker({ ...picker, selectedIndex: i })}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-[4px] px-2 py-1 text-left",
                      i === picker.selectedIndex ? "bg-accent" : "hover:bg-accent"
                    )}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-[3px] border border-border text-[10px] font-medium">
                      #
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium">{c.name.replace(/^#/, "")}</div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        {c.participants.length} members
                      </div>
                    </div>
                  </button>
                ))}
              {picker?.kind === "slash" &&
                slashList.map((c, i) => (
                  <button
                    key={c.cmd}
                    onClick={() => insertSlashCommand(c.cmd)}
                    onMouseEnter={() => setPicker((p) => (p ? { ...p, selectedIndex: i } : p))}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-[4px] px-2 py-1 text-left",
                      i === picker.selectedIndex ? "bg-accent" : "hover:bg-accent"
                    )}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-[3px] border border-border">
                      <Slash className="h-3 w-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium">
                        {c.cmd}{" "}
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {c.args}
                        </span>
                      </div>
                      <div className="truncate text-[10px] text-muted-foreground">{c.desc}</div>
                    </div>
                  </button>
                ))}
            </div>
            <div className="px-2 py-1 text-[10px] text-muted-foreground">
              <kbd className="font-mono">↑↓</kbd> navigate · <kbd className="font-mono">Tab</kbd> select · <kbd className="font-mono">Esc</kbd> close
            </div>
          </div>
        )}

        <div className="rounded-[6px] border border-border bg-card focus-within:border-foreground/40">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onSelect={handleSelect}
            onKeyDown={handleKeyDown}
            placeholder={composerPlaceholder}
            rows={1}
            className={cn(
              "w-full resize-none bg-transparent px-2.5 pt-2 text-[13px] outline-none placeholder:text-muted-foreground",
              compact ? "pb-1" : "pb-1.5"
            )}
          />
          <div className="flex items-center justify-between px-1.5 pb-1.5">
            <div className="flex items-center gap-0.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.txt,.csv,.doc,.docx,.xls,.xlsx"
                onChange={handleFilePick}
                className="hidden"
              />
              <ComposerBtn
                onClick={() => fileInputRef.current?.click()}
                title="Attach file"
                disabled={isUploading}
              >
                <Paperclip className="h-3.5 w-3.5" />
              </ComposerBtn>

              <span className="mx-0.5 h-4 w-px bg-border" />

              <ComposerBtn onClick={() => wrapSelectionWithMarker("**")} title="Bold (Ctrl/Cmd+B)">
                <Bold className="h-3.5 w-3.5" />
              </ComposerBtn>
              <ComposerBtn onClick={() => wrapSelectionWithMarker("*")} title="Italic (Ctrl/Cmd+I)">
                <Italic className="h-3.5 w-3.5" />
              </ComposerBtn>
              <ComposerBtn onClick={() => wrapSelectionWithMarker("`")} title="Code">
                <Code className="h-3.5 w-3.5" />
              </ComposerBtn>

              <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    title="Insert emoji"
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground",
                      emojiOpen && "bg-accent text-foreground"
                    )}
                  >
                    <Smile className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 p-1">
                  <div className="max-h-64 overflow-y-auto scrollbar-thin">
                    {EMOJI_CATEGORIES.map((cat) => (
                      <div key={cat.label} className="mb-1 last:mb-0">
                        <div className="px-1.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {cat.label}
                        </div>
                        <div className="grid grid-cols-8 gap-0.5 px-1">
                          {cat.emojis.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => insertEmoji(emoji)}
                              className="flex h-6 w-6 items-center justify-center rounded-[3px] text-[14px] hover:bg-accent"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <span className="mx-0.5 h-4 w-px bg-border" />

              <ComposerBtn
                onClick={() => {
                  setText(text + "@");
                  requestAnimationFrame(() => {
                    const el = textareaRef.current;
                    if (!el) return;
                    el.focus();
                    el.setSelectionRange(el.value.length, el.value.length);
                    setPicker(detectPicker(el.value, el.selectionStart));
                  });
                }}
                title="Mention someone"
              >
                <AtSign className="h-3.5 w-3.5" />
              </ComposerBtn>
              <ComposerBtn
                onClick={() => {
                  setText(text + "#");
                  requestAnimationFrame(() => {
                    const el = textareaRef.current;
                    if (!el) return;
                    el.focus();
                    el.setSelectionRange(el.value.length, el.value.length);
                    setPicker(detectPicker(el.value, el.selectionStart));
                  });
                }}
                title="Reference a channel"
              >
                <Hash className="h-3.5 w-3.5" />
              </ComposerBtn>
              <ComposerBtn
                onClick={() => {
                  setText(text + "/");
                  requestAnimationFrame(() => {
                    const el = textareaRef.current;
                    if (!el) return;
                    el.focus();
                    el.setSelectionRange(el.value.length, el.value.length);
                    setPicker(detectPicker(el.value, el.selectionStart));
                  });
                }}
                title="Slash commands"
              >
                <Slash className="h-3.5 w-3.5" />
              </ComposerBtn>
              <span className="ml-1 hidden text-[10px] text-muted-foreground sm:inline">
                @ mention · # channel · / commands
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleAskRean}
                disabled={sending}
                title="Ask Rean (uses last 5 messages as context)"
                className="inline-flex h-6 items-center gap-1 rounded-[3px] border border-border bg-background px-1.5 text-[11px] font-medium hover:bg-accent disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">Ask Rean</span>
              </button>
              <button
                onClick={handleSend}
                disabled={(!text.trim() && !attachment) || sending || isUploading}
                className="flex h-6 w-6 items-center justify-center rounded-[3px] bg-foreground text-background transition-colors hover:bg-foreground/90 disabled:opacity-40"
                aria-label="Send"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComposerBtn({
  children,
  onClick,
  title,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="flex h-6 w-6 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function formatBytesLocal(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

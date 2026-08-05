"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/app-store";
import { useChatStore } from "@/lib/store/chat-store";
import { ChatSidebar } from "./chat-sidebar";
import { ChatConversation } from "./chat-conversation";
import { ChatThreadPanel } from "./chat-thread-panel";
import { ChatChannelBrowser } from "./chat-channel-browser";
import { ChatForwardDialog } from "./chat-forward-dialog";
import { ChatNewDmDialog } from "./chat-new-dm-dialog";
import {
  MessageSquare,
  PanelRightOpen,
  PanelRightClose,
  Menu,
  X,
  Maximize2,
} from "lucide-react";

/**
 * ChatModule - full three-pane team chat:
 *   • Left:   240px channel/DM list (searchable, Channels/DMs tabs)
 *   • Center: flex-1 active conversation
 *   • Right:  320px collapsible thread/context panel
 *
 * Mobile: left list collapses into a drawer; right panel hidden behind a button.
 *
 * Shares the persisted `reanzly-chat` Zustand store with the slide-in
 * ChatPanel so quick replies from the panel show up here too.
 */
export function ChatModule() {
  const { currentRole, chatOpen, setChatOpen, authUser } = useAppStore();
  // Real signup name when available, falling back to the role archetype's
  // demo persona name for quick-login / live-demo sessions.
  const displayName = authUser?.name?.trim() || currentRole.name;
  // The role *title* (e.g. "Owner / Director"), not a name fragment - the
  // `description` field is "{Role Title} - {longer description}".
  const roleTitle = currentRole.description?.split("-")[0]?.trim() || "Staff";
  const displayInitials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || currentRole.initials;
  const activeId = useChatStore((s) => s.activeConversationId);
  const init = useChatStore((s) => s.init);
  const connected = useChatStore((s) => s.connected);
  const loading = useChatStore((s) => s.loading);
  const conversations = useChatStore((s) => s.conversations);

  const [threadOpen, setThreadOpen] = React.useState<string | null>(null);
  const [channelBrowserOpen, setChannelBrowserOpen] = React.useState(false);
  const [newDmOpen, setNewDmOpen] = React.useState(false);
  const [forwardId, setForwardId] = React.useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  // Hydrate + connect on mount (and when the role switches).
  React.useEffect(() => {
    if (!currentRole?.id) return;
    void init(currentRole.id, displayName, roleTitle, displayInitials);
  }, [currentRole?.id, displayName, roleTitle, displayInitials, init]);

  // Close thread when conversation changes
  React.useEffect(() => {
    setThreadOpen(null);
  }, [activeId]);

  // If the slide-in chat is open, close it (we're in the full module now)
  React.useEffect(() => {
    if (chatOpen) setChatOpen(false);
  }, [chatOpen, setChatOpen]);

  const handleForward = (messageId: string) => {
    setForwardId(messageId);
  };

  return (
    <div className="-m-4 sm:-m-5 lg:-m-8">
      {/* Page header strip - compact, single-row */}
      <div className="flex h-12 items-center gap-2 border-b border-border px-4">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
          aria-label="Open conversation list"
        >
          <Menu className="h-4 w-4" />
        </button>
        <MessageSquare className="hidden h-4 w-4 text-muted-foreground sm:block" />
        <span className="text-[14px] font-semibold">Team Chat</span>
        <span
          className={cn(
            "flex h-1.5 w-1.5 rounded-full",
            connected ? "bg-foreground" : loading ? "bg-muted-foreground animate-pulse" : "bg-border"
          )}
          title={connected ? "Connected - real-time" : loading ? "Connecting..." : "Offline"}
        />
        <span className="hidden text-[11px] text-muted-foreground sm:inline">
          {connected ? "Real-time" : loading ? "Connecting..." : "Offline"} · {conversations.length} conversations
        </span>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setThreadOpen(threadOpen ? null : "last")}
            className={cn(
              "flex h-7 items-center gap-1 rounded-[4px] border border-border px-2 text-[11px] font-medium transition-colors hover:bg-accent",
              threadOpen && "bg-accent"
            )}
            title={threadOpen ? "Close thread panel" : "Open thread panel"}
          >
            {threadOpen ? (
              <>
                <PanelRightClose className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Close panel</span>
              </>
            ) : (
              <>
                <PanelRightOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Thread panel</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Three-pane layout - fills available vertical space */}
      <div className="flex h-[calc(100vh-7rem)] overflow-hidden">
        {/* Desktop left sidebar (lg+) */}
        <div className="hidden w-[240px] shrink-0 border-r border-border lg:block">
          <ChatSidebar
            currentUserId={currentRole.id}
            onOpenChannelBrowser={() => setChannelBrowserOpen(true)}
            onOpenNewDm={() => setNewDmOpen(true)}
          />
        </div>

        {/* Mobile sidebar drawer */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-background/70 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
              aria-hidden
            />
            <div className="absolute left-0 top-0 h-full w-[280px] max-w-[85vw] border-r border-border bg-background animate-in slide-in-from-left duration-200">
              <div className="flex h-12 items-center justify-between border-b border-border px-3">
                <span className="text-[13px] font-semibold">Conversations</span>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="h-[calc(100%-3rem)]">
                <ChatSidebar
                  currentUserId={currentRole.id}
                  onOpenChannelBrowser={() => {
                    setMobileSidebarOpen(false);
                    setChannelBrowserOpen(true);
                  }}
                  onOpenNewDm={() => {
                    setMobileSidebarOpen(false);
                    setNewDmOpen(true);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Center conversation */}
        <div className="flex min-w-0 flex-1 flex-col">
          <ChatConversation
            currentUserId={currentRole.id}
            currentName={displayName}
            currentRole={roleTitle}
            onOpenThread={(id) => setThreadOpen(id)}
            onForward={handleForward}
          />
        </div>

        {/* Right thread panel (desktop only) */}
        {threadOpen && (
          <div className="hidden w-[320px] shrink-0 border-l border-border xl:block">
            {threadOpen !== "last" ? (
              <ChatThreadPanel
                parentMessageId={threadOpen}
                currentUserId={currentRole.id}
                currentName={displayName}
                currentRole={roleTitle}
                onClose={() => setThreadOpen(null)}
                onForward={handleForward}
              />
            ) : (
              <ThreadPrompt onClose={() => setThreadOpen(null)} />
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ChatChannelBrowser
        open={channelBrowserOpen}
        onOpenChange={setChannelBrowserOpen}
        currentUserId={currentRole.id}
      />
      <ChatForwardDialog
        open={!!forwardId}
        onOpenChange={(o) => !o && setForwardId(null)}
        messageId={forwardId}
        currentUserId={currentRole.id}
        currentName={displayName}
        currentRole={roleTitle}
      />
      <ChatNewDmDialog
        open={newDmOpen}
        onOpenChange={setNewDmOpen}
        currentUserId={currentRole.id}
      />

      {/* Mobile thread drawer */}
      {threadOpen && threadOpen !== "last" && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setThreadOpen(null)}
            aria-hidden
          />
          <div className="absolute right-0 top-0 h-full w-[320px] max-w-[85vw] border-l border-border bg-background animate-in slide-in-from-right duration-200">
            <ChatThreadPanel
              parentMessageId={threadOpen}
              currentUserId={currentRole.id}
              currentName={displayName}
              currentRole={roleTitle}
              onClose={() => setThreadOpen(null)}
              onForward={handleForward}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ThreadPrompt({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center gap-2 border-b border-border px-3">
        <PanelRightClose className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[12px] font-semibold">Thread</span>
        <button
          onClick={onClose}
          className="ml-auto flex h-6 w-6 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Close thread"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
        <Maximize2 className="h-5 w-5" />
        <div className="text-[12px]">
          Hover any message and pick <span className="font-medium text-foreground">Open thread</span> to view replies here.
        </div>
      </div>
    </div>
  );
}

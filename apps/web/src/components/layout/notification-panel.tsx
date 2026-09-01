"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import {
  X, CheckCheck, Bell, Inbox, AlertTriangle, AlertOctagon,
  Info, Trash2, ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Notification } from "@/lib/types";
import { toastSuccess } from "@/lib/toast";

type FilterTab = "all" | "unread" | "critical" | "warning" | "info";

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "critical", label: "Critical" },
  { id: "warning", label: "Warnings" },
  { id: "info", label: "Info" },
];

export function NotificationPanel() {
  const {
    notifOpen, setNotifOpen, notifications, markNotifRead, markAllNotifRead,
    navigate, dismissNotif, setAnnounceOpen,
  } = useAppStore();
  const [filter, setFilter] = useState<FilterTab>("all");

  // Escape key closes the panel - standard modal/dialog pattern.
  useEffect(() => {
    if (!notifOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNotifOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notifOpen, setNotifOpen]);

  // Compute counts for the filter tabs so the user can see at a glance how
  // many unread / critical / warning / info notifications they have.
  const counts = useMemo(() => {
    const c = { all: notifications.length, unread: 0, critical: 0, warning: 0, info: 0 };
    for (const n of notifications) {
      if (!n.read) c.unread++;
      c[n.severity]++;
    }
    return c;
  }, [notifications]);

  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "unread") return notifications.filter((n) => !n.read);
    return notifications.filter((n) => n.severity === filter);
  }, [notifications, filter]);

  if (!notifOpen) return null;

  return (
    <>
      {/* Backdrop - click anywhere outside to close. */}
      <div
        className="fixed inset-0 z-40 bg-background/50 backdrop-blur-[1px] animate-in fade-in duration-150"
        onClick={() => setNotifOpen(false)}
        aria-hidden
      />
      {/* Slide-in panel - full height on the right. On mobile it takes the
          full width (max-w-full) so the user has the entire viewport to
          interact with their notifications. */}
      <div
        role="dialog"
        aria-label="Notifications"
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-xl animate-slide-in-right"
      >
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Bell className="h-4 w-4 shrink-0" />
            <span className="truncate text-[14px] font-medium">Notifications</span>
            {counts.unread > 0 && (
              <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">
                {counts.unread}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              onClick={() => {
                if (counts.unread > 0) {
                  markAllNotifRead();
                  toastSuccess("All caught up", `${counts.unread} notifications marked as read`);
                }
              }}
              disabled={counts.unread === 0}
              className="tap flex h-8 items-center gap-1 rounded-[5px] px-2 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40 disabled:hover:bg-transparent sm:gap-1.5"
              aria-label="Mark all as read"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
            <button
              onClick={() => {
                setNotifOpen(false);
                setAnnounceOpen(true);
              }}
              className="tap flex h-8 items-center gap-1 rounded-[5px] px-2 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors sm:gap-1.5"
              aria-label="Open announcements center"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">All</span>
            </button>
            <button
              onClick={() => setNotifOpen(false)}
              className="tap flex h-8 w-8 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Close notifications"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter tabs - horizontal scroll on mobile so they never wrap. */}
        <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-2 py-2 scrollbar-thin">
          {FILTER_TABS.map((tab) => {
            const count = counts[tab.id];
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "tap flex h-7 shrink-0 items-center gap-1.5 rounded-[5px] px-2.5 text-[11.5px] font-medium transition-colors",
                  isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[9px] font-semibold tabular",
                      isActive ? "bg-background/20 text-background" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notification list - scrollable. */}
        <div className="scrollbar-thin flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            filtered.map((n) => (
              <NotificationRow
                key={n.id}
                n={n}
                onOpen={() => {
                  markNotifRead(n.id);
                  if (n.link) {
                    navigate(n.link.module as never);
                    setNotifOpen(false);
                  }
                }}
                onMarkRead={() => markNotifRead(n.id)}
                onDismiss={() => dismissNotif(n.id)}
              />
            ))
          )}
        </div>

        {/* Footer summary */}
        <div className="flex shrink-0 items-center justify-between border-t border-border bg-muted/20 px-3 py-2 text-[10.5px] text-muted-foreground sm:px-4">
          <span className="tabular">
            {filtered.length} of {counts.all} shown
          </span>
          <span className="hidden sm:inline">
            Press <kbd className="rounded-[3px] border border-border bg-background px-1 py-0 text-[9px] font-medium">Esc</kbd> to close
          </span>
        </div>
      </div>
    </>
  );
}

function NotificationRow({
  n,
  onOpen,
  onMarkRead,
  onDismiss,
}: {
  n: Notification;
  onOpen: () => void;
  onMarkRead: () => void;
  onDismiss: () => void;
}) {
  const Icon =
    n.severity === "critical" ? AlertOctagon :
    n.severity === "warning" ? AlertTriangle :
    Info;

  return (
    <div
      className={cn(
        "group relative border-b border-border transition-colors",
        !n.read && "bg-accent/30",
        "hover:bg-accent/50",
      )}
    >
      <button
        onClick={onOpen}
        className="flex w-full flex-col gap-1 px-3 py-3 text-left sm:px-4"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" aria-label="Unread" />}
            <span className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {n.category}
            </span>
          </div>
          <span className="shrink-0 text-[10px] text-muted-foreground tabular">
            {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <Icon
            className={cn(
              "mt-0.5 h-3.5 w-3.5 shrink-0",
              n.severity === "critical" ? "text-foreground" : "text-muted-foreground",
            )}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium leading-tight text-foreground">{n.title}</div>
            <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{n.description}</p>
          </div>
        </div>
      </button>
      {/* Row actions - visible on hover (desktop) and always (mobile). */}
      <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
        {!n.read && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead();
            }}
            className="tap flex h-6 w-6 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
            aria-label="Mark as read"
            title="Mark as read"
          >
            <CheckCheck className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="tap flex h-6 w-6 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
          aria-label="Dismiss"
          title="Dismiss"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ filter }: { filter: FilterTab }) {
  const messages: Record<FilterTab, { title: string; description: string }> = {
    all: {
      title: "No notifications",
      description: "You're all caught up. New activity will appear here.",
    },
    unread: {
      title: "Inbox zero",
      description: "Every notification has been read. Nicely done.",
    },
    critical: {
      title: "No critical alerts",
      description: "Nothing requires your immediate attention right now.",
    },
    warning: {
      title: "No warnings",
      description: "No warning-level notifications in the last 30 days.",
    },
    info: {
      title: "No info updates",
      description: "No informational notifications to show.",
    },
  };
  const msg = messages[filter];

  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <span
        className="flex h-10 w-10 items-center justify-center rounded-[5px] border border-border text-muted-foreground"
        aria-hidden
      >
        <Inbox className="h-5 w-5" />
      </span>
      <div className="text-[13px] font-medium text-foreground">{msg.title}</div>
      <p className="max-w-[260px] text-[11.5px] leading-snug text-muted-foreground">
        {msg.description}
      </p>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import {
  X, Megaphone, AlertTriangle, AlertOctagon, Info, Bell,
  CheckCheck, ExternalLink, Calendar, Sparkles,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { Notification } from "@/lib/types";

/**
 * AnnouncementsCenter
 * -------------------
 * A modal dialog that surfaces every system-wide communication in one
 * place: the active systemAlert banner message, scheduled maintenance
 * windows, product changelog highlights, and the full notification feed
 * (categorised). It's the "everything inbox" - opened from the Header
 * overflow menu (mobile), the AlertBanner CTA, or the "All" link in the
 * NotificationPanel.
 *
 * Pattern: full-screen modal on mobile (bottom-sheet feel), centered
 * dialog on desktop. Monochrome Swiss design - hairline borders, 6px
 * radii, no hues, severity conveyed by icon glyph + weight, never color.
 */

type Section = "alerts" | "maintenance" | "changelog" | "all";

interface ProductUpdate {
  id: string;
  version: string;
  date: string;
  title: string;
  highlights: string[];
}

// Mock product changelog - in production this would come from the
// /api/changelog endpoint. Pinned to the top of the "Changelog" tab.
const PRODUCT_UPDATES: ProductUpdate[] = [
  {
    id: "u-3-3",
    version: "v3.3",
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    title: "Smart onboarding + Broker portal",
    highlights: [
      "5-step smart onboarding wizard - pick a business type, modules auto-populate",
      "Dedicated broker portal at broker.reanzly.com with rate card + sub-brokers",
      "Public Logistics Partner Directory (IndiaMART/Zomato-style listings)",
      "Document Studio - customizable offer letters, invoices, SLAs with branding toggle",
    ],
  },
  {
    id: "u-3-2",
    version: "v3.2",
    date: new Date(Date.now() - 9 * 86400000).toISOString(),
    title: "Rean SLM runtime + Neural Core",
    highlights: [
      "Service Level Management wired to real LLM endpoint with simulation fallback",
      "Neural Core: multi-brain orchestration, memory, self-healing loops",
      "Marketplace for agents, skills, and templates",
      "Developer/API: keys, webhooks, SDKs",
    ],
  },
  {
    id: "u-3-1",
    version: "v3.1",
    date: new Date(Date.now() - 21 * 86400000).toISOString(),
    title: "Operations Hub + Fleet Map v2",
    highlights: [
      "Operations Hub: Kanban-style trip pipeline with drag-and-drop stages",
      "Fleet Map v2: live vehicle positions with geofence alerts",
      "Warehouse module with bin-level inventory",
      "Compliance, Payroll, Workshop, Access Matrix modules",
    ],
  },
];

interface MaintenanceWindow {
  id: string;
  title: string;
  start: string;
  end: string;
  impact: "none" | "degraded" | "downtime";
  description: string;
}

const MAINTENANCE_WINDOWS: MaintenanceWindow[] = [
  {
    id: "mw-1",
    title: "Database upgrade",
    start: new Date(Date.now() + 2 * 86400000).toISOString(),
    end: new Date(Date.now() + 2 * 86400000 + 90 * 60000).toISOString(),
    impact: "degraded",
    description:
      "We're upgrading the primary database to a larger instance. Expect slower response times for ~90 minutes. No downtime.",
  },
];

export function AnnouncementsCenter() {
  const open = useAppStore((s) => s.announceOpen);
  const setOpen = useAppStore((s) => s.setAnnounceOpen);
  const systemAlert = useAppStore((s) => s.systemAlert);
  const notifications = useAppStore((s) => s.notifications);
  const markNotifRead = useAppStore((s) => s.markNotifRead);
  const markAllNotifRead = useAppStore((s) => s.markAllNotifRead);
  const navigate = useAppStore((s) => s.navigate);
  const dismissSystemAlert = useAppStore((s) => s.dismissSystemAlert);
  const [section, setSection] = useState<Section>("alerts");

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Escape key closes the modal.
  // (Avoid useEffect + addEventListener boilerplate by using onKeyDown on
  // the dialog wrapper - works for both mouse and keyboard users.)

  const sections: { id: Section; label: string; count?: number }[] = [
    { id: "alerts", label: "Alerts", count: systemAlert ? 1 : 0 },
    { id: "maintenance", label: "Maintenance", count: MAINTENANCE_WINDOWS.length },
    { id: "changelog", label: "Changelog", count: PRODUCT_UPDATES.length },
    { id: "all", label: "All notifications", count: unreadCount },
  ];

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Announcements center"
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* Dialog - bottom sheet on mobile, centered modal on desktop. */}
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[10px] border border-border bg-background shadow-xl animate-in slide-in-from-bottom duration-200 sm:rounded-[8px]">
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Megaphone className="h-4 w-4 shrink-0" />
            <span className="truncate text-[14px] font-medium">Announcements</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="tap flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Section tabs - horizontal scroll on mobile. */}
        <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-2 py-2 scrollbar-thin">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                "tap flex h-7 shrink-0 items-center gap-1.5 rounded-[5px] px-2.5 text-[11.5px] font-medium transition-colors",
                section === s.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <span>{s.label}</span>
              {s.count !== undefined && s.count > 0 && (
                <span
                  className={cn(
                    "flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[9px] font-semibold tabular",
                    section === s.id ? "bg-background/20 text-background" : "bg-muted text-muted-foreground",
                  )}
                >
                  {s.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body - scrollable. */}
        <div className="scrollbar-thin flex-1 overflow-y-auto">
          {section === "alerts" && (
            <AlertsSection
              alert={systemAlert}
              onAction={() => {
                if (systemAlert?.actionModule) {
                  navigate(systemAlert.actionModule);
                  setOpen(false);
                }
              }}
              onDismiss={() => {
                dismissSystemAlert();
              }}
            />
          )}
          {section === "maintenance" && <MaintenanceSection windows={MAINTENANCE_WINDOWS} />}
          {section === "changelog" && <ChangelogSection updates={PRODUCT_UPDATES} />}
          {section === "all" && (
            <AllNotificationsSection
              notifications={notifications}
              onMarkRead={markNotifRead}
              onMarkAllRead={markAllNotifRead}
              onOpen={(n) => {
                markNotifRead(n.id);
                if (n.link) {
                  navigate(n.link.module as never);
                  setOpen(false);
                }
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-border bg-muted/20 px-3 py-2 text-[10.5px] text-muted-foreground sm:px-4">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            <span>Last updated {formatDistanceToNow(new Date(), { addSuffix: true })}</span>
          </span>
          <span className="hidden sm:inline">Reanzly · Internal communications</span>
        </div>
      </div>
    </div>
  );
}

function AlertsSection({
  alert,
  onAction,
  onDismiss,
}: {
  alert: ReturnType<typeof useAppStore.getState>["systemAlert"];
  onAction: () => void;
  onDismiss: () => void;
}) {
  if (!alert) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-[5px] border border-border text-muted-foreground">
          <Bell className="h-5 w-5" />
        </span>
        <div className="text-[13px] font-medium text-foreground">No active alerts</div>
        <p className="max-w-[280px] text-[11.5px] leading-snug text-muted-foreground">
          System-wide alerts (maintenance windows, outages, billing warnings) will appear here.
        </p>
      </div>
    );
  }

  const Icon =
    alert.severity === "critical" ? AlertOctagon :
    alert.severity === "warning" ? AlertTriangle :
    Info;

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      <div
        role="alert"
        className={cn(
          "flex flex-col gap-2 rounded-[6px] border border-border bg-card p-3 sm:p-4",
          alert.severity === "critical" && "bg-foreground/5",
        )}
      >
        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-border",
              alert.severity === "critical" ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {alert.severity}
              </span>
            </div>
            <div className="mt-0.5 text-[14px] font-medium text-foreground">{alert.title}</div>
            <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">{alert.message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onDismiss}
            className="tap flex h-8 items-center rounded-[5px] border border-border px-3 text-[12px] font-medium text-foreground hover:bg-accent transition-colors"
          >
            Dismiss
          </button>
          {alert.actionLabel && (
            <button
              onClick={onAction}
              className="tap flex h-8 items-center gap-1.5 rounded-[5px] bg-foreground px-3 text-[12px] font-medium text-background hover:bg-foreground/90 transition-colors"
            >
              {alert.actionLabel}
              <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MaintenanceSection({ windows }: { windows: MaintenanceWindow[] }) {
  if (windows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-[5px] border border-border text-muted-foreground">
          <Calendar className="h-5 w-5" />
        </span>
        <div className="text-[13px] font-medium text-foreground">No scheduled maintenance</div>
        <p className="max-w-[280px] text-[11.5px] leading-snug text-muted-foreground">
          We'll notify you here at least 72 hours before any planned downtime.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 p-3 sm:p-4">
      {windows.map((w) => (
        <div key={w.id} className="rounded-[6px] border border-border bg-card p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {w.impact === "downtime" ? "Downtime expected" : w.impact === "degraded" ? "Degraded performance" : "No impact"}
              </span>
              <div className="mt-0.5 text-[13.5px] font-medium text-foreground">{w.title}</div>
            </div>
            <span className="shrink-0 rounded-[3px] border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Scheduled
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground tabular">
            <span>Start: {format(new Date(w.start), "dd MMM, HH:mm")}</span>
            <span>End: {format(new Date(w.end), "dd MMM, HH:mm")}</span>
            <span>· {formatDistanceToNow(new Date(w.start), { addSuffix: true })}</span>
          </div>
          <p className="mt-2 text-[12px] leading-snug text-muted-foreground">{w.description}</p>
        </div>
      ))}
    </div>
  );
}

function ChangelogSection({ updates }: { updates: ProductUpdate[] }) {
  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      <div className="flex items-center gap-1.5 pb-1 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        <span>Product updates · shipped this month</span>
      </div>
      {updates.map((u) => (
        <div key={u.id} className="rounded-[6px] border border-border bg-card p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-[3px] bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-background tabular">
                {u.version}
              </span>
              <span className="text-[13.5px] font-medium text-foreground">{u.title}</span>
            </div>
            <span className="shrink-0 text-[10.5px] text-muted-foreground tabular">
              {format(new Date(u.date), "dd MMM yyyy")}
            </span>
          </div>
          <ul className="mt-2 flex flex-col gap-1.5">
            {u.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] leading-snug text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function AllNotificationsSection({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onOpen,
}: {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onOpen: (n: Notification) => void;
}) {
  const unreadCount = notifications.filter((n) => !n.read).length;
  return (
    <div className="flex flex-col gap-1 p-3 sm:p-4">
      <div className="flex items-center justify-between pb-1">
        <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
          {notifications.length} total · {unreadCount} unread
        </span>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="tap flex h-7 items-center gap-1 rounded-[5px] px-2 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <CheckCheck className="h-3 w-3" />
            Mark all read
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-[5px] border border-border text-muted-foreground">
            <Bell className="h-5 w-5" />
          </span>
          <div className="text-[13px] font-medium text-foreground">No notifications</div>
        </div>
      ) : (
        notifications.map((n) => {
          const Icon =
            n.severity === "critical" ? AlertOctagon :
            n.severity === "warning" ? AlertTriangle :
            Info;
          return (
            <button
              key={n.id}
              onClick={() => onOpen(n)}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-[5px] border border-border p-2.5 text-left transition-colors",
                !n.read ? "bg-accent/30" : "bg-background",
                "hover:bg-accent/50",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 h-3.5 w-3.5 shrink-0",
                  n.severity === "critical" ? "text-foreground" : "text-muted-foreground",
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {n.category}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground tabular">
                    {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                  </span>
                </div>
                <div className="mt-0.5 text-[12.5px] font-medium leading-tight text-foreground">{n.title}</div>
                <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-muted-foreground">
                  {n.description}
                </p>
              </div>
              {!n.read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" aria-label="Unread" />}
            </button>
          );
        })
      )}
    </div>
  );
}

"use client";

import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import { X, Info, AlertTriangle, AlertOctagon, ArrowRight } from "lucide-react";
import { toastInfo } from "@/lib/toast";

/**
 * AlertBanner
 * ----------
 * A thin, dismissible banner rendered above the Header when a system-wide
 * alert is set in the store (maintenance, outage, billing warning, security
 * notice). Monochrome Swiss design: hairline border, severity is conveyed
 * by the icon glyph + a subtle background tint, never by hue.
 *
 * Behaviour:
 *   - Hidden when no systemAlert is set, or when the current alert's id is
 *     in `systemAlertDismissed`.
 *   - "Dismiss" adds the alert id to systemAlertDismissed (session-scoped).
 *   - "Action" CTA navigates to the configured module (if actionModule set)
 *     or opens the AnnouncementsCenter (if actionLabel but no module).
 *
 * Mounted once in AppShell (between Header and main content) so the banner
 * spans the full app width and pushes content down naturally.
 */
export function AlertBanner() {
  const alert = useAppStore((s) => s.systemAlert);
  const dismissed = useAppStore((s) => s.systemAlertDismissed);
  const dismiss = useAppStore((s) => s.dismissSystemAlert);
  const navigate = useAppStore((s) => s.navigate);
  const setAnnounceOpen = useAppStore((s) => s.setAnnounceOpen);

  if (!alert) return null;
  if (dismissed.includes(alert.id)) return null;

  const Icon =
    alert.severity === "critical"
      ? AlertOctagon
      : alert.severity === "warning"
        ? AlertTriangle
        : Info;

  return (
    <div
      role="alert"
      className={cn(
        "flex shrink-0 items-center gap-2.5 border-b border-border bg-muted/40 px-3 py-2 sm:px-4 sm:py-2.5",
        alert.severity === "critical" && "bg-foreground/5",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          alert.severity === "critical" ? "text-foreground" : "text-muted-foreground",
        )}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
        <span className="truncate text-[12px] font-medium text-foreground sm:text-[12.5px]">
          {alert.title}
        </span>
        <span className="hidden shrink-0 text-muted-foreground sm:inline">·</span>
        <span className="truncate text-[11.5px] text-muted-foreground sm:text-[12px]">
          {alert.message}
        </span>
      </div>
      {alert.actionLabel && (
        <button
          onClick={() => {
            if (alert.actionModule) {
              navigate(alert.actionModule);
            } else {
              setAnnounceOpen(true);
            }
            dismiss();
          }}
          className="tap hidden shrink-0 items-center gap-1 rounded-[5px] border border-border bg-background px-2.5 py-1 text-[11.5px] font-medium text-foreground hover:bg-accent transition-colors sm:flex"
        >
          {alert.actionLabel}
          <ArrowRight className="h-3 w-3" />
        </button>
      )}
      <button
        onClick={() => setAnnounceOpen(true)}
        className="tap flex shrink-0 items-center justify-center rounded-[5px] px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors sm:hidden"
        aria-label="View all announcements"
      >
        Details
      </button>
      <button
        onClick={() => {
          dismiss();
          toastInfo("Alert dismissed", "You can re-enable it from Announcements");
        }}
        className="tap flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label="Dismiss alert"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

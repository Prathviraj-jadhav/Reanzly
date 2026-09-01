"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/* ============================================================
   StatusBadge - monochrome status signaling.
   UX laws:
   • Law of Similarity - same shape/size across the app; only
     fill/border varies. Users learn the vocabulary fast.
   • Von Restorff Effect - `solid` (filled) is the only
     high-attention variant; reserve for live/critical.
   • Aesthetic-Usability - 3px radius, hairline border, mono.
   • Accessibility - optional tooltip describes status without
     crowding the row; pulse is a redundant (not sole) cue.
   ============================================================ */

type Variant = "solid" | "outline" | "muted" | "dot";

interface StatusBadgeProps {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  pulse?: boolean;
  tooltip?: string;
}

export function StatusBadge({ children, variant = "outline", className, pulse, tooltip }: StatusBadgeProps) {
  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[2px] border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.5px] font-medium leading-none whitespace-nowrap",
        variant === "solid" && "border-foreground bg-foreground text-background",
        variant === "outline" && "border-border bg-background text-foreground",
        variant === "muted" && "border-transparent bg-muted text-muted-foreground",
        className,
      )}
    >
      {variant === "dot" && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full bg-current",
            pulse && "pulse-dot",
          )}
        />
      )}
      {children}
    </span>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    );
  }
  return badge;
}

/* ===== LiveDot - standalone pulse for "online/active" rows ===== */
export function LiveDot({ pulse = true, className }: { pulse?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex h-1.5 w-1.5 rounded-full bg-foreground", pulse && "pulse-dot", className)} />
  );
}

/* ===== STATUS MAPPING HELPERS =====
   Maps domain statuses to visual variants - all greyscale.
   Convention across Reanzly:
     solid  = live / critical / blocked
     outline = neutral / in-progress / valid
     muted  = resolved / planned / done / inactive
*/
export function tripStatusBadge(status: string) {
  const map: Record<string, { variant: Variant; pulse?: boolean }> = {
    Planned: { variant: "muted" },
    Active: { variant: "solid", pulse: true },
    "In Transit": { variant: "solid", pulse: true },
    Delivered: { variant: "outline" },
    Cancelled: { variant: "muted" },
    Breakdown: { variant: "solid", pulse: true },
  };
  return map[status] || { variant: "outline" };
}

export function vehicleStatusBadge(status: string) {
  const map: Record<string, { variant: Variant; pulse?: boolean }> = {
    Active: { variant: "solid", pulse: true },
    Idle: { variant: "outline" },
    "In Maintenance": { variant: "muted" },
    Offline: { variant: "muted" },
  };
  return map[status] || { variant: "outline" };
}

export function paymentStatusBadge(status: string) {
  const map: Record<string, Variant> = {
    Paid: "solid",
    "Partially Paid": "outline",
    Unpaid: "muted",
    Overdue: "solid",
  };
  return map[status] || "outline";
}

export function issueSeverityBadge(severity: string): { variant: Variant; pulse?: boolean } {
  const map: Record<string, { variant: Variant; pulse?: boolean }> = {
    Critical: { variant: "solid", pulse: true },
    High: { variant: "outline" },
    Medium: { variant: "muted" },
    Low: { variant: "muted" },
  };
  return map[severity] || { variant: "muted" };
}

export function inspectionResultBadge(result: string): { variant: Variant; pulse?: boolean } {
  const map: Record<string, { variant: Variant; pulse?: boolean }> = {
    Pass: { variant: "outline" },
    Fail: { variant: "solid", pulse: true },
    Conditional: { variant: "muted" },
  };
  return map[result] || { variant: "outline" };
}

export function docStatusBadge(status: string) {
  const map: Record<string, { variant: Variant; pulse?: boolean }> = {
    Valid: { variant: "outline" },
    "Expiring Soon": { variant: "solid", pulse: true },
    Expired: { variant: "solid" },
  };
  return map[status] || { variant: "outline" };
}

/**
 * License / permit / insurance expiry badge.
 * Accepts an ISO date string (or any Date-parseable value) and returns a
 * `{ variant, pulse, label }` triple based on days-until-expiry, following
 * the 30 / 15 / 7 day escalation convention used across the app.
 */
export function licenseExpiryBadge(expiry: string): {
  variant: Variant;
  pulse?: boolean;
  label: string;
} {
  const days = Math.ceil(
    (new Date(expiry).getTime() - Date.now()) / 86_400_000,
  );
  if (Number.isNaN(days)) return { variant: "outline", label: "-" };
  if (days < 0) return { variant: "solid", label: `Expired ${Math.abs(days)}d ago` };
  if (days <= 7) return { variant: "solid", pulse: true, label: `${days}d left` };
  if (days <= 15) return { variant: "solid", label: `${days}d left` };
  if (days <= 30) return { variant: "muted", label: `${days}d left` };
  return { variant: "outline", label: `${days}d left` };
}

export function reminderStatusBadge(status: string) {
  const map: Record<string, { variant: Variant; pulse?: boolean }> = {
    Upcoming: { variant: "muted" },
    "Due Soon": { variant: "solid", pulse: true },
    Overdue: { variant: "solid" },
  };
  return map[status] || { variant: "outline" };
}

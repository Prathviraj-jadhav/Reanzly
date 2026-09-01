"use client";

import type { ReactNode } from "react";
import type { PODStatus, PODSubmissionStatus, PODType } from "@/lib/store/pod-store";

/* ============================================================
   POD module helpers - shared between list / drawer / detail.
   Strict monochrome: no hues, hairline borders, ≤6px radius,
   tabular mono for numerals.
   ============================================================ */

export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function relativeTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return formatDate(iso);
}

type BadgeVariant = "solid" | "outline" | "muted" | "dot";

export function podStatusBadge(status: PODStatus): { variant: BadgeVariant; pulse?: boolean } {
  const map: Record<PODStatus, { variant: BadgeVariant; pulse?: boolean }> = {
    Delivered: { variant: "solid" },
    Pending: { variant: "outline", pulse: true },
    Rejected: { variant: "muted" },
    Damaged: { variant: "solid", pulse: true },
  };
  return map[status] ?? { variant: "outline" };
}

export function podSubmissionBadge(status: PODSubmissionStatus): { variant: BadgeVariant } {
  const map: Record<PODSubmissionStatus, BadgeVariant> = {
    Draft: "muted",
    Submitted: "outline",
    Approved: "solid",
  };
  return { variant: map[status] };
}

export function podTypeBadge(type: PODType): { variant: BadgeVariant } {
  const map: Record<PODType, BadgeVariant> = {
    Delivery: "outline",
    Pickup: "muted",
    Return: "solid",
  };
  return { variant: map[type] };
}

/* ============================================================
   FieldLabel - matches the rest of the app.
   ============================================================ */
export function FieldLabel({
  children,
  required,
  hint,
}: {
  children: ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-1 flex items-baseline justify-between">
      <label className="text-[12px] font-medium text-foreground">
        {children}
        {required && <span className="ml-0.5 text-foreground">*</span>}
      </label>
      {hint && (
        <span className="text-[11px] text-muted-foreground tabular">{hint}</span>
      )}
    </div>
  );
}

export function toInputDate(iso?: string): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function toInputDateTime(iso?: string): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

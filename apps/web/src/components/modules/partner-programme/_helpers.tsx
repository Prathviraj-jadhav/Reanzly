"use client";

import type { ReactNode } from "react";
import {
  Presentation,
  Palette,
  Code2,
  FileSpreadsheet,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import type {
  PartnerApplicationStatus,
  ReferralStatus,
  CommissionStatus,
} from "@/lib/store/partner-store";
import type { PartnerResource } from "./_data";

/* ============================================================
   Partner Programme module helpers - formatters, FieldLabel,
   and status -> StatusBadge variant mappings.
   ============================================================ */

type BadgeVariant = "solid" | "outline" | "muted" | "dot";

// ===== Formatters (self-contained, mirrors src/lib/store/partner-store.ts) =====
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function formatINRCompact(n: number): string {
  if (n >= 10000000) return "₹" + (n / 10000000).toFixed(2) + " Cr";
  if (n >= 100000) return "₹" + (n / 100000).toFixed(2) + " L";
  if (n >= 1000) return "₹" + (n / 1000).toFixed(1) + "K";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function relativeTime(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const day = Math.round(diff / 86400000);
  if (day < 1) return "today";
  if (day === 1) return "1 day ago";
  if (day < 30) return `${day} days ago`;
  if (day < 365) return `${Math.round(day / 30)} months ago`;
  return `${Math.round(day / 365)} years ago`;
}

// ===== Status -> StatusBadge variant mappings =====
export function applicationStatusMeta(status: PartnerApplicationStatus): {
  variant: BadgeVariant;
  pulse?: boolean;
  label: string;
} {
  switch (status) {
    case "not_applied":
      return { variant: "muted", label: "Not Applied" };
    case "pending":
      return { variant: "outline", pulse: true, label: "Under Review" };
    case "approved":
      return { variant: "solid", label: "Approved Partner" };
    case "rejected":
      return { variant: "muted", label: "Rejected" };
  }
}

export function referralStatusVariant(status: ReferralStatus): BadgeVariant {
  switch (status) {
    case "Active":
      return "solid";
    case "Trial":
      return "outline";
    case "Churned":
      return "muted";
  }
}

export function commissionStatusVariant(status: CommissionStatus): BadgeVariant {
  return status === "paid" ? "muted" : "outline";
}

// ===== Resource icon mapping =====
export const RESOURCE_ICONS: Record<PartnerResource["icon"], LucideIcon> = {
  deck: Presentation,
  brand: Palette,
  api: Code2,
  pricing: FileSpreadsheet,
  playbook: BookOpen,
};

// ===== Field label (form drawers) =====
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
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

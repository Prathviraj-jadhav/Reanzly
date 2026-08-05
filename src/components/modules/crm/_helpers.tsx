"use client";

import type { ReactNode } from "react";
import {
  Phone,
  Mail,
  CalendarClock,
  MapPin,
  FileText,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  type DealStage,
  type LeadStatus,
  type ActivityType,
  type ContractStatus,
} from "./_data";

// ===== Formatters =====
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
export function formatINRCompact(n: number): string {
  if (n >= 10000000) return "₹" + (n / 10000000).toFixed(2) + " Cr";
  if (n >= 100000) return "₹" + (n / 100000).toFixed(2) + " L";
  if (n >= 1000) return "₹" + (n / 1000).toFixed(1) + "K";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
export function formatNumber(n: number): string {
  return n.toLocaleString("en-IN");
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
export function daysBetween(start: string, end?: string): number {
  const e = end ? new Date(end) : new Date();
  return Math.floor((e.getTime() - new Date(start).getTime()) / 86400000);
}

// ===== Badge helpers (monochrome variants only) =====
type Variant = "solid" | "outline" | "muted" | "dot";

export function dealStageBadge(stage: DealStage): {
  variant: Variant;
  pulse?: boolean;
} {
  const map: Record<DealStage, { variant: Variant; pulse?: boolean }> = {
    "New Lead": { variant: "muted" },
    Qualified: { variant: "outline" },
    "Quotation Sent": { variant: "outline" },
    Negotiation: { variant: "solid", pulse: true },
    Won: { variant: "solid" },
    Lost: { variant: "muted" },
  };
  return map[stage];
}

export function leadStatusBadge(status: LeadStatus): {
  variant: Variant;
  pulse?: boolean;
} {
  const map: Record<LeadStatus, { variant: Variant; pulse?: boolean }> = {
    New: { variant: "muted" },
    Working: { variant: "outline", pulse: true },
    Nurturing: { variant: "muted" },
    Qualified: { variant: "outline" },
    Converted: { variant: "solid" },
    Lost: { variant: "muted" },
  };
  return map[status];
}

export function contractStatusBadge(status: ContractStatus): {
  variant: Variant;
  pulse?: boolean;
} {
  const map: Record<ContractStatus, { variant: Variant; pulse?: boolean }> = {
    Active: { variant: "solid" },
    "Under Renewal": { variant: "outline", pulse: true },
    Expired: { variant: "muted" },
    None: { variant: "muted" },
  };
  return map[status];
}

export function scoreTone(score: number): { variant: Variant; label: string } {
  if (score >= 80) return { variant: "solid", label: "Hot" };
  if (score >= 60) return { variant: "outline", label: "Warm" };
  if (score >= 40) return { variant: "muted", label: "Cool" };
  return { variant: "muted", label: "Cold" };
}

export function activityTypeMeta(type: ActivityType): {
  icon: LucideIcon;
  label: string;
  short: string;
} {
  const map: Record<ActivityType, { icon: LucideIcon; label: string; short: string }> = {
    Call: { icon: Phone, label: "Call", short: "CL" },
    Email: { icon: Mail, label: "Email", short: "EM" },
    Meeting: { icon: Users, label: "Meeting", short: "MT" },
    "Site Visit": { icon: MapPin, label: "Site Visit", short: "SV" },
    "Follow-up": { icon: CalendarClock, label: "Follow-up", short: "FU" },
    "Quotation Sent": { icon: FileText, label: "Quotation Sent", short: "QT" },
    Note: { icon: FileText, label: "Note", short: "NT" },
  };
  return map[type];
}

// ===== Reusable bits =====
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

export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

// Sub-nav tabs config
export const CRM_TABS = [
  { id: "pipeline", label: "Pipeline" },
  { id: "leads", label: "Leads" },
  { id: "accounts", label: "Accounts" },
  { id: "contacts", label: "Contacts" },
  { id: "activities", label: "Activities" },
  { id: "reports", label: "Reports" },
] as const;

export type CrmTab = (typeof CRM_TABS)[number]["id"];

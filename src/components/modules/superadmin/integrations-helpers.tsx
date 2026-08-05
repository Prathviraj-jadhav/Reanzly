"use client";

/* ============================================================
   Integrations shared helpers - variant mappers + tiny
   presentational primitives used across all Integrations tabs.
   Strict monochrome Swiss design system.
   ============================================================ */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type {
  IntegrationAuthKind,
  IntegrationCategory,
  APIKeyStatus,
  MCPConnection,
} from "./_data";

// ── Variant type (mirrors StatusBadge) ─────────────────────
export type BadgeVariant = "solid" | "outline" | "muted";

// ── Auth kind ──────────────────────────────────────────────
export const AUTH_KIND_LABEL: Record<IntegrationAuthKind, string> = {
  "api-key": "API key",
  oauth: "OAuth",
  mcp: "MCP",
  basic: "Basic",
};

export function authKindVariant(kind: IntegrationAuthKind): BadgeVariant {
  switch (kind) {
    case "api-key": return "muted";
    case "oauth":   return "outline";
    case "mcp":     return "solid";
    case "basic":   return "outline";
  }
}

// ── Category ───────────────────────────────────────────────
export const CATEGORY_LABEL: Record<IntegrationCategory, string> = {
  accounting: "Accounting",
  crm: "CRM",
  erp: "ERP",
  hrms: "HRMS",
  "ai-provider": "AI Providers",
  mcp: "MCP",
  communication: "Communication",
  maps: "Maps",
  payments: "Payments",
};

export function categoryVariant(cat: IntegrationCategory): BadgeVariant {
  switch (cat) {
    case "ai-provider":    return "solid";
    case "accounting":     return "outline";
    case "payments":       return "outline";
    case "communication":  return "outline";
    case "crm":            return "muted";
    case "erp":            return "muted";
    case "hrms":           return "muted";
    case "maps":           return "muted";
    case "mcp":            return "solid";
  }
}

// ── MCP health ─────────────────────────────────────────────
export function mcpHealthVariant(
  h: MCPConnection["healthStatus"],
): { variant: BadgeVariant; pulse?: boolean } {
  switch (h) {
    case "healthy":  return { variant: "outline" };
    case "degraded": return { variant: "muted", pulse: true };
    case "down":     return { variant: "solid", pulse: true };
    case "unknown":  return { variant: "muted" };
  }
}

// ── API key status ─────────────────────────────────────────
export function apiKeyStatusVariant(
  s: APIKeyStatus,
): { variant: BadgeVariant; pulse?: boolean } {
  switch (s) {
    case "active":  return { variant: "outline", pulse: true };
    case "revoked": return { variant: "muted" };
    case "expired": return { variant: "muted" };
  }
}

// ── Presentational primitives ──────────────────────────────

/** 2-letter monogram badge for an integration provider. */
export function ProviderMonogram({ name }: { name: string }) {
  const letters = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-border bg-card text-[11px] font-medium tracking-tight text-foreground tabular">
      {letters}
    </span>
  );
}

export function SectionHeader({
  icon, title, subtitle, action,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      {icon && <span className="text-foreground">{icon}</span>}
      <h3 className="text-[13px] font-medium text-foreground">{title}</h3>
      {subtitle && (
        <span className="text-[11px] text-muted-foreground tabular">{subtitle}</span>
      )}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

export function KpiTile({
  icon, label, value, hint,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-3.5 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">
        {value}
      </span>
      {hint && (
        <span className="text-[10px] text-muted-foreground tabular">{hint}</span>
      )}
    </div>
  );
}

export function EmptyPanel({
  icon, title, description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[6px] border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-[6px] border border-border text-muted-foreground">
        {icon}
      </div>
      <p className="mt-2 text-[13px] font-medium text-foreground">{title}</p>
      <p className="mt-1 text-[12px] text-muted-foreground">{description}</p>
    </div>
  );
}

/** Tiny capability / scope chip used in cards + table. */
export function TinyChip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

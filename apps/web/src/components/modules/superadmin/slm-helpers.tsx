"use client";

/* ============================================================
   SLM shared helpers - status variant mappers + tiny
   presentational primitives used across all SLM tabs.
   Strict monochrome Swiss design system.
   ============================================================ */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type {
  Agent, AgentMemory, ApprovalRequest, RunStatus, ToolImpact,
} from "@/lib/slm/types";

// Re-export impactVariant so all SLM tabs import from one place.
export { impactVariant } from "./slm-trace-timeline";

// ── Variant mappers (monochrome) ───────────────────────────
export function agentStatusVariant(status: Agent["status"]): "solid" | "outline" | "muted" {
  switch (status) {
    case "active":   return "solid";
    case "paused":   return "muted";
    case "draft":    return "outline";
    case "archived": return "muted";
  }
}

export function runStatusVariant(status: RunStatus): "solid" | "outline" | "muted" {
  switch (status) {
    case "running":
    case "awaiting-approval":
    case "failed":
      return "solid";
    case "succeeded":
    case "queued":
      return "outline";
    case "cancelled":
    case "timeout":
      return "muted";
  }
}

export function outcomeVariant(o: AgentMemory["outcome"]): "solid" | "outline" | "muted" {
  switch (o) {
    case "success": return "outline";
    case "failure": return "solid";
    case "neutral": return "muted";
  }
}

export function approvalStatusVariant(
  status: ApprovalRequest["status"],
): "solid" | "outline" | "muted" {
  switch (status) {
    case "pending":  return "solid";
    case "approved": return "outline";
    case "denied":   return "muted";
    case "expired":  return "muted";
  }
}

export function impactChipVariant(
  impact: ToolImpact,
): "solid" | "outline" | "muted" {
  if (impact === "irreversible") return "solid";
  if (impact === "destructive")  return "outline";
  return "muted";
}

// ── Presentational primitives ──────────────────────────────
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

/** Mini vertical bar "sparkline" - one bar per iteration count of a run. */
export function IterationSpark({ runs }: { runs: number[] }) {
  const max = Math.max(1, ...runs);
  return (
    <div className="flex h-7 items-end gap-0.5" aria-hidden>
      {runs.length === 0 ? (
        <span className="text-[10px] text-muted-foreground tabular">no runs</span>
      ) : (
        runs.map((n, i) => {
          const h = Math.max(4, Math.round((n / max) * 28));
          return (
            <span
              key={i}
              className={cn(
                "w-1 rounded-[2px]",
                i === runs.length - 1 ? "bg-foreground" : "bg-foreground/30",
              )}
              style={{ height: `${h}px` }}
            />
          );
        })
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

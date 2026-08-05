"use client";

/* ============================================================
   Automations helpers - shared constants, type maps, and
   presentational primitives for the loop-engineering enhanced
   Automations view. Strict monochrome Swiss design.
   ============================================================ */

import type { ReactNode } from "react";
import {
  Zap, GitBranch, Play, Cpu, Plug, Clock, ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type {
  AutomationStep, AutomationStepKind, ConditionOperator, LoopConfig, LoopRunSummary,
} from "./_data";
import { DEFAULT_LOOP_CONFIG } from "./_data";
import type { BadgeVariant } from "./_helpers";

// ── Step kind metadata ─────────────────────────────────────
export const STEP_KIND_META: Record<
  AutomationStepKind,
  { label: string; icon: LucideIcon; description: string }
> = {
  trigger:        { label: "Trigger",       icon: Zap,         description: "Event that fires the automation" },
  condition:      { label: "Condition",     icon: GitBranch,   description: "If / else branch on a field" },
  action:         { label: "Action",        icon: Play,        description: "Built-in tool call (ticket, broadcast)" },
  "ai-step":      { label: "AI step",       icon: Cpu,         description: "Ask an SLM agent to reason / decide" },
  integration:    { label: "Integration",   icon: Plug,        description: "Call an integration / MCP tool" },
  delay:          { label: "Delay",         icon: Clock,       description: "Wait N minutes / hours" },
  "approval-gate":{ label: "Approval gate", icon: ShieldCheck, description: "Pause for human approval" },
};

export const STEP_KIND_ORDER: AutomationStepKind[] = [
  "trigger", "condition", "action", "ai-step", "integration", "delay", "approval-gate",
];

export const CONDITION_OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "equals" },
  { value: "not-equals", label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "gt", label: "greater than" },
  { value: "lt", label: "less than" },
  { value: "in", label: "in" },
];

export const TRIGGER_MODULES = [
  "Billing", "Offline Sync", "Organizations", "Issues", "Fleet",
  "Drivers", "POD", "Ledger", "Trips", "Maintenance",
] as const;

export const DELAY_UNITS = [
  { value: "minutes", label: "minutes" },
  { value: "hours", label: "hours" },
  { value: "days", label: "days" },
] as const;

export const RETRY_BACKOFFS = [
  { value: "fixed", label: "Fixed" },
  { value: "exponential", label: "Exponential" },
] as const;

// ── Status variants ─────────────────────────────────────────
export function loopRunStatusVariant(status: LoopRunSummary["status"]): {
  variant: BadgeVariant; pulse?: boolean;
} {
  switch (status) {
    case "succeeded":          return { variant: "outline" };
    case "awaiting-approval":  return { variant: "solid", pulse: true };
    case "failed":             return { variant: "solid", pulse: true };
    case "cancelled":          return { variant: "muted" };
  }
}

// ── Step helpers ────────────────────────────────────────────
/** Derives a usable AutomationStep[] from a legacy recipe that has
 *  only `trigger` + `actions`. Used for recipes created before the
 *  loop-engineering enhancement. */
export function deriveStepsFromLegacy(au: {
  trigger: { label: string; module: string };
  actions: { label: string; channel: string }[];
}): AutomationStep[] {
  const steps: AutomationStep[] = [
    {
      id: `st-${au.trigger.module}-trig`,
      kind: "trigger",
      label: au.trigger.label,
      config: { module: au.trigger.module, event: au.trigger.label.toLowerCase().replace(/\s+/g, "_") },
    },
  ];
  au.actions.forEach((a, i) => {
    steps.push({
      id: `st-${au.trigger.module}-act-${i}`,
      kind: "action",
      label: a.label,
      config: { toolFn: "send_broadcast", channel: a.channel },
    });
  });
  return steps;
}

/** Returns the AutomationStep[] for a recipe, deriving from legacy
 *  `trigger` + `actions` when `steps` is undefined. */
export function resolveSteps(au: {
  trigger: { label: string; module: string };
  actions: { label: string; channel: string }[];
  steps?: AutomationStep[];
}): AutomationStep[] {
  return au.steps ?? deriveStepsFromLegacy(au);
}

export function resolveLoopConfig(au: { loopConfig?: LoopConfig }): LoopConfig {
  return au.loopConfig ?? { ...DEFAULT_LOOP_CONFIG };
}

export function defaultLoopConfig(): LoopConfig {
  return { ...DEFAULT_LOOP_CONFIG };
}

/** Build a fresh empty step of the given kind. */
export function emptyStep(kind: AutomationStepKind, idx: number): AutomationStep {
  const id = `st-new-${idx}-${Math.random().toString(36).slice(2, 7)}`;
  switch (kind) {
    case "trigger":
      return { id, kind, label: "New trigger", config: { module: "Billing", event: "" } };
    case "condition":
      return { id, kind, label: "New condition", config: { field: "", operator: "equals", value: "" } };
    case "action":
      return { id, kind, label: "New action", config: { toolFn: "create_ticket" } };
    case "ai-step":
      return { id, kind, label: "New AI step", config: { agentId: "", goal: "" } };
    case "integration":
      return { id, kind, label: "New integration step", config: { integrationId: "", toolFn: "" } };
    case "delay":
      return { id, kind, label: "Wait", config: { duration: 5, unit: "minutes" } };
    case "approval-gate":
      return { id, kind, label: "Approval gate", config: { impactThreshold: 60, reason: "" } };
  }
}

// ── Format helpers ──────────────────────────────────────────
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)} s`;
  const min = sec / 60;
  return `${min.toFixed(1)} m`;
}

export function formatTokens(n: number): string {
  if (n === 0) return "0 tok";
  if (n < 1000) return `${n} tok`;
  return `${(n / 1000).toFixed(1)}k tok`;
}

// ── StepKindChip - tiny chip with icon + label ──────────────
export function StepKindChip({
  kind, label, onClick, active, compact,
}: {
  kind: AutomationStepKind;
  label?: string;
  onClick?: () => void;
  active?: boolean;
  compact?: boolean;
}) {
  const meta = STEP_KIND_META[kind];
  const Icon = meta.icon;
  const content = (
    <>
      <Icon className="h-3 w-3 shrink-0" />
      {!compact && (
        <span className="truncate max-w-[140px]">{label ?? meta.label}</span>
      )}
    </>
  );
  const cls = `inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-0.5 text-[10px] font-medium leading-none transition-colors ${
    active
      ? "border-foreground bg-foreground text-background"
      : "border-border bg-background text-foreground hover:bg-accent"
  }`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${cls} tap`}>
        {content}
      </button>
    );
  }
  return <span className={cls}>{content}</span>;
}

// ── LoopConfigSummary - inline summary string ───────────────
export function loopConfigSummary(cfg: LoopConfig): ReactNode {
  return (
    <span className="tabular">
      Max {cfg.maxIterations} iter · {formatTokens(cfg.tokenBudget)} · Auto-execute:{" "}
      {cfg.autoExecute ? "On" : "Off"} · Threshold {cfg.approvalThreshold}
    </span>
  );
}

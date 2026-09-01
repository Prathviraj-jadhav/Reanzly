"use client";

/* ============================================================
   AgentDetailDrawer - right-side Sheet showing full config for
   a single SLM agent + its recent runs + learned memory.

   Opened from the Overview "Active agents" grid card "View"
   action, or the Agents DataTable row action "View detail".
   ============================================================ */

import { useMemo } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible";
import { StatusBadge } from "@/components/shared/status-badge";
import { Btn } from "@/components/shared/btn";
import {
  Cpu, Play, Pause, Power, Wrench, Clock, Hash, Coins,
  ToggleLeft, ShieldAlert, Brain, BookOpen, ChevronDown,
  TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import type {
  Agent, AgentRun, AgentMemory, Brain as BrainT, RunStatus,
} from "@/lib/slm/types";
import {
  AGENT_CATEGORY_LABEL, AGENT_STATUS_LABEL, RUN_STATUS_LABEL,
} from "@/lib/slm/types";
import { toolById } from "@/lib/slm/tools";
import { useSuperadminStore } from "./_store";
import { relativeTime, formatDateTime } from "./_helpers";
import { impactVariant } from "./slm-trace-timeline";
import { cn } from "@/lib/utils";

// ── Variant mappers ────────────────────────────────────────
function agentStatusVariant(status: Agent["status"]): "solid" | "outline" | "muted" {
  switch (status) {
    case "active":   return "solid";
    case "paused":   return "muted";
    case "draft":    return "outline";
    case "archived": return "muted";
  }
}

function runStatusVariant(status: RunStatus): "solid" | "outline" | "muted" {
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

function outcomeVariant(o: AgentMemory["outcome"]): "solid" | "outline" | "muted" {
  switch (o) {
    case "success": return "outline";
    case "failure": return "solid";
    case "neutral": return "muted";
  }
}

function OutcomeIcon({ o }: { o: AgentMemory["outcome"] }) {
  if (o === "success") return <TrendingUp className="h-3 w-3" />;
  if (o === "failure") return <TrendingDown className="h-3 w-3" />;
  return <Minus className="h-3 w-3" />;
}

// ── Threshold gauge (0-100) ────────────────────────────────
function ThresholdGauge({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 w-32 overflow-hidden rounded-[3px] border border-border bg-muted">
        <div
          className="absolute inset-y-0 left-0 bg-foreground"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>
      <span className="text-[12px] font-medium text-foreground tabular">{value}</span>
    </div>
  );
}

// ── Stat tile ──────────────────────────────────────────────
function StatTile({
  icon, label, value, hint,
}: { icon: React.ReactNode; label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-3 py-2">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
      </div>
      <span className="text-[15px] font-medium leading-none text-foreground tabular">{value}</span>
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

// ── Run row (clickable) ────────────────────────────────────
function RunRow({ run, onClick }: { run: AgentRun; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[5px] border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-accent tap"
    >
      <StatusBadge variant={runStatusVariant(run.status)} pulse={run.status === "running" || run.status === "awaiting-approval"}>
        {RUN_STATUS_LABEL[run.status]}
      </StatusBadge>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[12px] text-foreground">
          <span className="truncate">{run.trigger}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground tabular">{run.iterations} iter</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground tabular">{run.tokensUsed} tok</span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{run.input}</p>
      </div>
      <span className="shrink-0 text-[11px] text-muted-foreground tabular">
        {relativeTime(run.startedAt)}
      </span>
    </button>
  );
}

// ── Memory row ─────────────────────────────────────────────
function MemoryRow({ mem }: { mem: AgentMemory }) {
  return (
    <div className="rounded-[5px] border border-border bg-background px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <StatusBadge variant={outcomeVariant(mem.outcome)}>
          <OutcomeIcon o={mem.outcome} />
          {mem.outcome}
        </StatusBadge>
        <span className="text-[11px] text-muted-foreground tabular">
          {mem.occurrences} occurrence{mem.occurrences === 1 ? "" : "s"}
        </span>
      </div>
      <p className="mt-1.5 text-[12px] leading-relaxed text-foreground">{mem.pattern}</p>
      {mem.refinement && (
        <div className="mt-1.5 rounded-[3px] border border-border bg-muted/30 px-2 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Refinement</span>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-foreground">{mem.refinement}</p>
        </div>
      )}
      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground tabular">
        <span>First seen {formatDateTime(mem.firstSeenAt)}</span>
        <span>·</span>
        <span>Last seen {relativeTime(mem.lastSeenAt)}</span>
      </div>
    </div>
  );
}

// ── Main drawer ────────────────────────────────────────────
export interface AgentDetailDrawerProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onOpenRun: (run: AgentRun) => void;
  onRunAgent: (agent: Agent) => void;
  onToggleStatus: (agent: Agent) => void;
  readOnly?: boolean;
}

export function AgentDetailDrawer({
  agent, open, onOpenChange, onOpenRun, onRunAgent, onToggleStatus, readOnly,
}: AgentDetailDrawerProps) {
  const brains = useSuperadminStore((s) => s.brains);
  const agentRuns = useSuperadminStore((s) => s.agentRuns);
  const agentMemory = useSuperadminStore((s) => s.agentMemory);

  const brain = useMemo<BrainT | undefined>(
    () => (agent ? brains.find((b) => b.id === agent.brainId) : undefined),
    [brains, agent],
  );
  const runs = useMemo(
    () => (agent ? agentRuns.filter((r) => r.agentId === agent.id).slice(0, 8) : []),
    [agentRuns, agent],
  );
  const memory = useMemo(
    () => (agent ? agentMemory.filter((m) => m.agentId === agent.id) : []),
    [agentMemory, agent],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full flex-col gap-0 p-0 sm:max-w-2xl"
      >
        <SheetHeader className="gap-2 border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <SheetTitle className="truncate text-[16px] tracking-tight">
                  {agent?.name ?? "Agent detail"}
                </SheetTitle>
                {agent && (
                  <StatusBadge variant={agentStatusVariant(agent.status)} pulse={agent.status === "active"}>
                    {AGENT_STATUS_LABEL[agent.status]}
                  </StatusBadge>
                )}
              </div>
              <SheetDescription className="mt-0.5 text-[12px]">
                {agent ? `${AGENT_CATEGORY_LABEL[agent.category]} agent - ${brain?.name ?? "Unknown brain"}` : "Inspect agent configuration."}
              </SheetDescription>
            </div>
          </div>

          {agent && !readOnly && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Btn
                variant="primary"
                size="sm"
                icon={<Play className="h-3 w-3" />}
                onClick={() => onRunAgent(agent)}
              >
                Run agent
              </Btn>
              <Btn
                variant="outline"
                size="sm"
                icon={agent.status === "active" ? <Pause className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                onClick={() => onToggleStatus(agent)}
              >
                {agent.status === "active" ? "Pause" : agent.status === "paused" ? "Activate" : "Activate"}
              </Btn>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
          {!agent ? (
            <div className="rounded-[6px] border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-[12px] text-muted-foreground">
              No agent selected.
            </div>
          ) : (
            <div className="space-y-5">
              {/* Description */}
              <p className="text-[13px] leading-relaxed text-foreground">{agent.description}</p>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatTile icon={<Hash className="h-3 w-3" />} label="Total runs" value={agent.stats.totalRuns.toLocaleString("en-IN")} />
                <StatTile icon={<TrendingUp className="h-3 w-3" />} label="Success rate" value={`${agent.stats.successRate}%`} />
                <StatTile icon={<Clock className="h-3 w-3" />} label="Avg duration" value={`${Math.round(agent.stats.avgDurationMs)} ms`} />
                <StatTile icon={<Wrench className="h-3 w-3" />} label="Tool calls" value={agent.stats.totalToolCalls.toLocaleString("en-IN")} />
              </div>

              {/* System prompt */}
              <section>
                <SectionHeader icon={<Brain className="h-3.5 w-3.5" />} title="System prompt" />
                <Collapsible>
                  <CollapsibleTrigger
                    className="flex w-full items-center justify-between rounded-[5px] border border-border bg-card px-3 py-2 text-left text-[12px] font-medium text-foreground hover:bg-accent tap"
                  >
                    <span className="truncate">Persona & rules ({agent.systemPrompt.length} chars)</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="mt-1.5 max-h-72 overflow-y-auto scrollbar-thin whitespace-pre-wrap rounded-[5px] border border-border bg-background px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-foreground">
                      {agent.systemPrompt}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              </section>

              {/* Tool whitelist */}
              <section>
                <SectionHeader icon={<Wrench className="h-3.5 w-3.5" />} title="Tool whitelist" subtitle={`${agent.toolIds.length} tool${agent.toolIds.length === 1 ? "" : "s"}`} />
                <div className="flex flex-wrap gap-1.5">
                  {agent.toolIds.length === 0 ? (
                    <span className="text-[12px] text-muted-foreground">No tools whitelisted.</span>
                  ) : (
                    agent.toolIds.map((tid) => {
                      const t = toolById(tid);
                      return (
                        <span
                          key={tid}
                          className="inline-flex items-center gap-1.5 rounded-[3px] border border-border bg-background px-2 py-1 text-[11px]"
                        >
                          <span className="font-mono text-foreground">{t?.fn ?? tid}</span>
                          {t && (
                            <StatusBadge variant={impactVariant(t.impact)}>
                              {t.impact}
                            </StatusBadge>
                          )}
                        </span>
                      );
                    })
                  )}
                </div>
              </section>

              {/* Loop config */}
              <section>
                <SectionHeader icon={<ToggleLeft className="h-3.5 w-3.5" />} title="Loop configuration" />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <ConfigRow icon={<Hash className="h-3 w-3" />} label="Max iterations" value={`${agent.maxIterations}`} />
                  <ConfigRow icon={<Coins className="h-3 w-3" />} label="Token budget" value={agent.tokenBudget.toLocaleString("en-IN")} />
                  <ConfigRow icon={<Power className="h-3 w-3" />} label="Auto execute" value={agent.autoExecute ? "On" : "Off"} />
                  <ConfigRow
                    icon={<ShieldAlert className="h-3 w-3" />}
                    label="Approval threshold"
                    value={<ThresholdGauge value={agent.approvalThreshold} />}
                  />
                </div>
                <div className="mt-2 rounded-[5px] border border-border bg-muted/30 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                  {agent.autoExecute
                    ? "Agent executes autonomously. High-impact tools may still request approval per threshold."
                    : `Agent pauses for human approval when a tool's impact rank crosses ${agent.approvalThreshold}/100.`}
                </div>
              </section>

              {/* Scopes + suggested roles */}
              <section>
                <SectionHeader icon={<Cpu className="h-3.5 w-3.5" />} title="Scope & roles" />
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Scopes</span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {agent.scopes.length === 0 ? (
                        <span className="text-[12px] text-muted-foreground">No scopes assigned.</span>
                      ) : (
                        agent.scopes.map((sc, i) => (
                          <StatusBadge key={i} variant="outline">
                            {sc.kind}{sc.target ? ` - ${sc.target}` : ""}
                          </StatusBadge>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Suggested for roles</span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {agent.suggestedForRoles.length === 0 ? (
                        <span className="text-[12px] text-muted-foreground">No role suggestions.</span>
                      ) : (
                        agent.suggestedForRoles.map((r) => (
                          <StatusBadge key={r} variant="muted">{r}</StatusBadge>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Recent runs */}
              <section>
                <SectionHeader icon={<Clock className="h-3.5 w-3.5" />} title="Recent runs" subtitle={`${runs.length} of ${agent.stats.totalRuns}`} />
                <div className="space-y-1.5">
                  {runs.length === 0 ? (
                    <div className="rounded-[5px] border border-dashed border-border bg-muted/20 px-3 py-6 text-center text-[12px] text-muted-foreground">
                      No runs yet. Click "Run agent" above to start one.
                    </div>
                  ) : (
                    runs.map((r) => (
                      <RunRow key={r.id} run={r} onClick={() => onOpenRun(r)} />
                    ))
                  )}
                </div>
              </section>

              {/* Memory */}
              <section>
                <SectionHeader icon={<BookOpen className="h-3.5 w-3.5" />} title="Learned patterns (memory)" subtitle={`${memory.length} entr${memory.length === 1 ? "y" : "ies"}`} />
                <div className="space-y-1.5">
                  {memory.length === 0 ? (
                    <div className="rounded-[5px] border border-dashed border-border bg-muted/20 px-3 py-6 text-center text-[12px] text-muted-foreground">
                      No learned patterns yet. The agent records a memory entry after each run.
                    </div>
                  ) : (
                    memory.map((m) => <MemoryRow key={m.id} mem={m} />)
                  )}
                </div>
              </section>

              {/* Footer meta */}
              <div className="border-t border-border pt-3 text-[10px] text-muted-foreground tabular">
                Created by {agent.createdBy} on {formatDateTime(agent.createdAt)} - last updated {relativeTime(agent.updatedAt)}.
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionHeader({
  icon, title, subtitle,
}: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="text-foreground">{icon}</span>
      <h3 className="text-[12.5px] font-medium text-foreground">{title}</h3>
      {subtitle && (
        <span className="text-[11px] text-muted-foreground tabular">{subtitle}</span>
      )}
    </div>
  );
}

function ConfigRow({
  icon, label, value,
}: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-[5px] border border-border bg-card px-3 py-2">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[11.5px] text-muted-foreground">{label}</span>
      </div>
      <span className={cn("text-[12px] font-medium text-foreground")}>{value}</span>
    </div>
  );
}

export default AgentDetailDrawer;

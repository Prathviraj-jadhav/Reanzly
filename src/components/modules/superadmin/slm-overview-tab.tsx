"use client";

/* ============================================================
   SLMOverviewTab - Tab 1 (default).
   KPI strip + active agents grid + pending approvals queue +
   recent runs list.
   ============================================================ */

import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { toast } from "sonner";
import { useSuperadminStore, selectSLMKPIs } from "./_store";
import { relativeTime, formatNum } from "./_helpers";
import {
  AGENT_CATEGORY_LABEL, AGENT_STATUS_LABEL, RUN_STATUS_LABEL,
} from "@/lib/slm/types";
import { toolById } from "@/lib/slm/tools";
import type { Agent, AgentRun } from "@/lib/slm/types";
import { StatusBadge } from "@/components/shared/status-badge";
import { Btn } from "@/components/shared/btn";
import {
  Bot, Activity, CheckCircle2, ShieldAlert, Coins, Cpu,
  Play, ChevronRight, Clock, Zap, Hash, Loader2,
} from "lucide-react";
import {
  KpiTile, SectionHeader, IterationSpark, EmptyPanel,
  agentStatusVariant, runStatusVariant, impactChipVariant,
} from "./slm-helpers";
import { runAgentRealLLM, runAgentSimulated } from "./slm-run-helpers";

interface Props {
  readOnly: boolean;
  onOpenAgent: (a: Agent) => void;
  onOpenRun: (r: AgentRun) => void;
  onJumpToApprovals: () => void;
}

export function SLMOverviewTab({
  readOnly, onOpenAgent, onOpenRun, onJumpToApprovals,
}: Props) {
  const kpis = useSuperadminStore(useShallow(selectSLMKPIs));
  const agents = useSuperadminStore((s) => s.agents);
  const brains = useSuperadminStore((s) => s.brains);
  const agentRuns = useSuperadminStore((s) => s.agentRuns);
  const pendingApprovals = useSuperadminStore((s) => s.pendingApprovals);
  const decideApproval = useSuperadminStore((s) => s.decideApproval);
  const [runningAgentId, setRunningAgentId] = useState<string | null>(null);

  const succeededRuns = useMemo(
    () => agentRuns.filter((r) => r.status === "succeeded").length,
    [agentRuns],
  );

  const activeAgents = useMemo(
    () => agents.filter((a) => a.status === "active"),
    [agents],
  );
  const pending = useMemo(
    () => pendingApprovals.filter((a) => a.status === "pending"),
    [pendingApprovals],
  );
  const recentRuns = useMemo(
    () => agentRuns.slice(0, 8),
    [agentRuns],
  );

  function brainName(id: string): string {
    return brains.find((b) => b.id === id)?.name ?? id;
  }
  function lastRunsForAgent(agent: Agent): AgentRun[] {
    return agentRuns
      .filter((r) => r.agentId === agent.id)
      .slice(0, 5)
      .reverse();
  }
  function handleRun(a: Agent) {
    if (readOnly) return;
    if (runningAgentId) return; // Prevent double-clicks while another run is in flight.
    setRunningAgentId(a.id);
    const brainLabel = brains.find((b) => b.id === a.brainId)?.name ?? "Reanzly SLM";
    const input = "Manual run from overview";
    runAgentRealLLM(a, input, brainLabel, "manual")
      .then((realRun) => {
        if (realRun) {
          toast.success(`${a.name} started — real LLM`, {
            description: "Single-turn loop completed.",
          });
          onOpenRun(realRun);
          return;
        }
        // Fall back to the simulation.
        const simRunId = runAgentSimulated(a, input, "manual");
        if (simRunId) {
          toast.warning(`${a.name} started — simulation`, {
            description: "Real LLM unavailable.",
          });
          const r = useSuperadminStore
            .getState()
            .agentRuns.find((x) => x.id === simRunId);
          if (r) onOpenRun(r);
        } else {
          toast.error("Run failed to start.");
        }
      })
      .catch((err) => {
        console.error("SLM overview run error:", err);
        toast.error("Run failed unexpectedly.");
      })
      .finally(() => setRunningAgentId(null));
  }
  function handleDecision(id: string, decision: "approved" | "denied") {
    decideApproval(id, decision);
    toast.success(`Approval ${decision}`, {
      description: `Request ${id} ${decision}.`,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip - 6 tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile
          icon={<Bot className="h-3.5 w-3.5" />}
          label="Active agents"
          value={kpis.activeAgents}
          hint={`${agents.length} total`}
        />
        <KpiTile
          icon={<Activity className="h-3.5 w-3.5" />}
          label="Runs (7d)"
          value={formatNum(kpis.totalRuns)}
          hint={`${kpis.totalToolCalls} tool calls`}
        />
        <KpiTile
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Success rate"
          value={`${kpis.successRate}%`}
          hint={`${succeededRuns} succeeded`}
        />
        <KpiTile
          icon={<ShieldAlert className="h-3.5 w-3.5" />}
          label="Pending approvals"
          value={kpis.pendingApprovals}
          hint={pending.length > 0 ? `${pending.length} awaiting review` : "queue clear"}
        />
        <KpiTile
          icon={<Coins className="h-3.5 w-3.5" />}
          label="Tokens (7d)"
          value={formatNum(kpis.totalTokens)}
          hint="across all runs"
        />
        <KpiTile
          icon={<Cpu className="h-3.5 w-3.5" />}
          label="Connected brains"
          value={`${kpis.connectedBrains}/${brains.length}`}
          hint="LLM providers"
        />
      </div>

      {/* Main split: active agents grid + pending approvals */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        {/* Active agents grid */}
        <section className="rounded-[6px] border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <SectionHeader
              icon={<Bot className="h-3.5 w-3.5" />}
              title="Active agents"
              subtitle={`${activeAgents.length} running`}
            />
          </div>
          <div className="p-3">
            {activeAgents.length === 0 ? (
              <EmptyPanel
                icon={<Bot className="h-4 w-4" />}
                title="No active agents"
                description="Activate an agent from the Agents tab to see it here."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {activeAgents.map((a) => {
                  const runs = lastRunsForAgent(a);
                  const iterCounts = runs.map((r) => r.iterations);
                  return (
                    <div
                      key={a.id}
                      className="flex flex-col gap-2 rounded-[6px] border border-border bg-background p-3 transition-colors hover:border-foreground/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => onOpenAgent(a)}
                          className="min-w-0 text-left tap"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[13px] font-medium text-foreground">
                              {a.name}
                            </span>
                            <StatusBadge variant={agentStatusVariant(a.status)} pulse>
                              {AGENT_STATUS_LABEL[a.status]}
                            </StatusBadge>
                          </div>
                          <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                            {AGENT_CATEGORY_LABEL[a.category]}
                          </span>
                        </button>
                        <IterationSpark runs={iterCounts} />
                      </div>

                      <p className="line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">
                        {a.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded-[3px] border border-border bg-card px-1.5 py-0.5">
                          <Cpu className="h-3 w-3" />
                          <span className="text-foreground">{brainName(a.brainId)}</span>
                        </span>
                        <span className="inline-flex items-center gap-0.5 tabular">
                          <Hash className="h-3 w-3" />
                          {formatNum(a.stats.totalRuns)} runs
                        </span>
                        <span className="tabular">{a.stats.successRate}% ok</span>
                      </div>

                      <div className="flex items-center justify-between border-t border-border pt-2 text-[10px] text-muted-foreground tabular">
                        <span>Last run: {relativeTime(a.stats.lastRunAt)}</span>
                        <div className="flex items-center gap-1">
                          <Btn
                            variant="ghost"
                            size="xs"
                            onClick={() => onOpenAgent(a)}
                          >
                            View
                          </Btn>
                          {!readOnly && (
                            <Btn
                              variant="outline"
                              size="xs"
                              loading={runningAgentId === a.id}
                              icon={
                                runningAgentId === a.id
                                  ? undefined
                                  : <Play className="h-3 w-3" />
                              }
                              onClick={() => handleRun(a)}
                              disabled={!!runningAgentId}
                            >
                              {runningAgentId === a.id ? (
                                <span className="inline-flex items-center gap-1">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Calling…
                                </span>
                              ) : (
                                "Run"
                              )}
                            </Btn>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Pending approvals queue */}
        <section className="rounded-[6px] border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <SectionHeader
              icon={<ShieldAlert className="h-3.5 w-3.5" />}
              title="Pending approvals"
              subtitle={`${pending.length} queued`}
            />
            {pending.length > 0 && (
              <button
                onClick={onJumpToApprovals}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground tap"
              >
                View all
              </button>
            )}
          </div>
          <div className="max-h-[520px] overflow-y-auto scrollbar-thin p-2.5">
            {pending.length === 0 ? (
              <EmptyPanel
                icon={<CheckCircle2 className="h-4 w-4" />}
                title="No pending approvals"
                description="Agents running autonomously. New requests will queue here."
              />
            ) : (
              <div className="space-y-2">
                {pending.map((ap) => {
                  const tool = toolById(ap.toolId);
                  const agent = agents.find((a) => a.id === ap.agentId);
                  return (
                    <div
                      key={ap.id}
                      className="rounded-[5px] border border-border bg-background p-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-[12px] font-medium text-foreground">
                            {agent?.name ?? ap.agentId}
                          </div>
                          <div className="font-mono text-[10.5px] text-muted-foreground">
                            {ap.toolName}
                          </div>
                        </div>
                        <StatusBadge variant={impactChipVariant(ap.impact)}>
                          {ap.impact}
                        </StatusBadge>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                        {ap.reason}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground tabular">
                          <Clock className="mr-0.5 inline h-3 w-3" />
                          {relativeTime(ap.requestedAt)}
                        </span>
                        {!readOnly ? (
                          <div className="flex items-center gap-1">
                            <Btn
                              variant="primary"
                              size="xs"
                              onClick={() => handleDecision(ap.id, "approved")}
                            >
                              Approve
                            </Btn>
                            <Btn
                              variant="outline"
                              size="xs"
                              onClick={() => handleDecision(ap.id, "denied")}
                            >
                              Deny
                            </Btn>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">read-only</span>
                        )}
                      </div>
                      {tool && (
                        <div className="mt-1.5 text-[10px] text-muted-foreground">
                          {tool.module} module
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Recent runs */}
      <section className="rounded-[6px] border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <SectionHeader
            icon={<Activity className="h-3.5 w-3.5" />}
            title="Recent runs"
            subtitle={`${recentRuns.length} latest`}
          />
        </div>
        <div className="divide-y divide-border">
          {recentRuns.length === 0 ? (
            <div className="p-3">
              <EmptyPanel
                icon={<Activity className="h-4 w-4" />}
                title="No runs yet"
                description="Trigger a run from the Playground or an active agent card."
              />
            </div>
          ) : (
            recentRuns.map((r) => (
              <button
                key={r.id}
                onClick={() => onOpenRun(r)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/40 tap"
              >
                <StatusBadge
                  variant={runStatusVariant(r.status)}
                  pulse={r.status === "running" || r.status === "awaiting-approval"}
                >
                  {RUN_STATUS_LABEL[r.status]}
                </StatusBadge>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[12px] text-foreground">
                    <span className="truncate font-medium">{r.agentName}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="truncate text-muted-foreground">{r.trigger}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{r.input}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-[11px] text-muted-foreground tabular">
                  <span className="inline-flex items-center gap-0.5">
                    <Hash className="h-3 w-3" />
                    {r.iterations}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <Coins className="h-3 w-3" />
                    {formatNum(r.tokensUsed)}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <Zap className="h-3 w-3" />
                    {r.toolCalls}
                  </span>
                  <span className="hidden sm:inline">{r.durationMs} ms</span>
                  <span>{relativeTime(r.startedAt)}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                </div>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default SLMOverviewTab;

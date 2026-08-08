"use client";

/* ============================================================
   Playground tab - lets operators test an agent end-to-end.

   Pick an agent, enter a goal/input, click "Run agent". The
   resulting AgentRun's loop trace is rendered inline via the
   shared LoopTraceTimeline.
   ============================================================ */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSuperadminStore } from "./_store";
import type { Agent, AgentRun } from "@/lib/slm/types";
import { AGENT_CATEGORY_LABEL, RUN_STATUS_LABEL } from "@/lib/slm/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Play, FlaskConical, RotateCcw, Cpu, ChevronDown, Sparkles, ThumbsUp, ThumbsDown,
} from "lucide-react";
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible";
import { LoopTraceTimeline } from "./slm-trace-timeline";
import { runAgentRealLLM, runAgentSimulated } from "./slm-run-helpers";

function runStatusVariant(status: AgentRun["status"]): "solid" | "outline" | "muted" {
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

const SAMPLE_PROMPTS = [
  "Invoice inv-2048 payment retry failed for org Shree Balaji Transport.",
  "Trip TRP-991 ETA slipped by 4 hours. Customer SLA at risk.",
  "Trial org org-007 crossed the Starter vehicle cap (10/8). Suggest upgrade.",
  "Anomalous login pattern detected on org-011 from 4 new geos in 1h.",
];

export function SLMPlayground({
  onOpenRunInDrawer,
}: {
  /** Optional: open the run in the full-width Run Trace drawer. */
  onOpenRunInDrawer?: (run: AgentRun) => void;
}) {
  const agents = useSuperadminStore((s) => s.agents);
  const brains = useSuperadminStore((s) => s.brains);
  const agentRuns = useSuperadminStore((s) => s.agentRuns);
  const access = useSuperadminStore((s) => s.canAccess("slm"));
  const readOnly = access === "read";

  const [agentId, setAgentId] = useState<string>(agents[0]?.id ?? "");
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === agentId) ?? null,
    [agents, agentId],
  );

  const selectedBrain = useMemo(() => {
    if (!selectedAgent) return null;
    return (
      brains.find((b) => b.id === selectedAgent.brainId) ??
      brains[0] ??
      null
    );
  }, [brains, selectedAgent]);

  const brainName = selectedBrain?.name ?? "Reanzly SLM";

  const lastRun = useMemo(
    () => (lastRunId ? agentRuns.find((r) => r.id === lastRunId) ?? null : null),
    [agentRuns, lastRunId],
  );

  const sessionHistory = useMemo(
    () => agentRuns.filter((r) => r.trigger === "manual").slice(0, 6),
    [agentRuns],
  );

  async function handleRun() {
    if (!selectedAgent) {
      toast.error("Select an agent first.");
      return;
    }
    if (!input.trim()) {
      toast.error("Enter a goal or input text.");
      return;
    }
    setRunning(true);
    try {
      // 1) Try the real LLM endpoint first.
      const realRun = await runAgentRealLLM(
        selectedAgent,
        input.trim(),
        brainName,
        "manual",
      );
      if (realRun) {
        setLastRunId(realRun.id);
        toast.success(`${selectedAgent.name} run completed (real LLM)`, {
          description: "Loop completed - see the trace below.",
        });
        return;
      }

      // 2) Fall back to the deterministic simulation.
      const simRunId = runAgentSimulated(
        selectedAgent,
        input.trim(),
        "manual",
      );
      if (simRunId) {
        setLastRunId(simRunId);
        toast.warning("Real LLM unavailable - ran simulation instead.", {
          description: "The live SLM endpoint did not respond.",
        });
      } else {
        toast.error("Run failed to start.");
      }
    } catch (err) {
      console.error("SLM playground run error:", err);
      toast.error("Run failed unexpectedly.");
    } finally {
      setRunning(false);
    }
  }

  function handleReset() {
    setInput("");
    setLastRunId(null);
  }

  async function handleFeedback(feedbackId: string, rating: number) {
    try {
      const res = await fetch("/api/slm/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId, rating }),
      });
      if (res.ok) {
        toast.success("Feedback recorded for self-learning reinforcement.");
      } else {
        toast.error("Failed to submit feedback.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Feedback error.");
    }
  }

  if (readOnly) {
    return (
      <div className="rounded-[6px] border border-dashed border-border bg-muted/20 p-8 text-center">
        <FlaskConical className="mx-auto h-5 w-5 text-muted-foreground" />
        <p className="mt-2 text-[12px] text-muted-foreground">
          Read-only access. You can browse agent runs but cannot launch new ones from the playground.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
      {/* Left: composer */}
      <section className="rounded-[6px] border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-3.5 w-3.5 text-foreground" />
            <h3 className="text-[13px] font-medium text-foreground">Playground</h3>
          </div>
          {lastRun && (
            <span className="text-[11px] text-muted-foreground tabular">
              Last run: {lastRun.id}
            </span>
          )}
        </div>

        <div className="space-y-3 p-3.5">
          {/* Agent picker */}
          <div>
            <Label className="text-[12px] font-medium text-foreground">Agent</Label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger className="mt-1 h-9 w-full rounded-[5px] border-border bg-background text-[13px]">
                <SelectValue placeholder="Pick an agent" />
              </SelectTrigger>
              <SelectContent className="rounded-[5px]">
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-[13px]">
                    <span className="font-medium">{a.name}</span>
                    <span className="ml-2 text-[11px] text-muted-foreground">
                      {AGENT_CATEGORY_LABEL[a.category]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected agent summary */}
          {selectedAgent && (
            <div className="rounded-[5px] border border-border bg-muted/30 px-2.5 py-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  {AGENT_CATEGORY_LABEL[selectedAgent.category]}
                </span>
                <span className="text-[11px] text-muted-foreground tabular">
                  {selectedAgent.stats.totalRuns.toLocaleString("en-IN")} prior runs
                </span>
              </div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground line-clamp-2">
                {selectedAgent.description}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <Cpu className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">
                  Brain: <span className="text-foreground">{selectedAgent.brainId}</span>
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-[11px] text-muted-foreground tabular">
                  {selectedAgent.toolIds.length} tools
                </span>
              </div>
            </div>
          )}

          {/* Input */}
          <div>
            <Label className="text-[12px] font-medium text-foreground">Goal / input</Label>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe what the agent should do. e.g. Invoice inv-2048 payment retry failed for org Shree Balaji Transport."
              className="mt-1 min-h-[120px] resize-y rounded-[5px] border-border bg-background font-mono text-[12px]"
            />
          </div>

          {/* Sample prompts */}
          <div>
            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Sample inputs
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {SAMPLE_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setInput(p)}
                  className="rounded-[3px] border border-border bg-background px-2 py-1 text-left text-[11px] text-muted-foreground hover:border-foreground/30 hover:text-foreground tap"
                >
                  {p.length > 38 ? p.slice(0, 38) + "..." : p}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Btn
              variant="primary"
              size="md"
              loading={running}
              icon={!running ? <Play className="h-3.5 w-3.5" /> : undefined}
              onClick={handleRun}
              disabled={running || !selectedAgent || !input.trim()}
            >
              {running ? `Calling ${brainName}…` : "Run agent"}
            </Btn>
            <Btn
              variant="outline"
              size="md"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={handleReset}
              disabled={running}
            >
              Reset
            </Btn>
          </div>

          {/* Real-LLM hint line */}
          <p className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            Calls the live SLM brain · falls back to simulation if offline.
          </p>
        </div>

        {/* Session history */}
        {sessionHistory.length > 0 && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen} className="border-t border-border">
            <CollapsibleTrigger
              className="flex w-full items-center justify-between px-3.5 py-2 text-[11.5px] font-medium text-muted-foreground hover:text-foreground tap"
            >
              <span>Session history ({sessionHistory.length})</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", historyOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-1 px-3.5 pb-3">
                {sessionHistory.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setLastRunId(r.id)}
                    className="flex w-full items-center gap-2 rounded-[5px] border border-border bg-background px-2 py-1.5 text-left text-[11px] hover:bg-accent tap"
                  >
                    <StatusBadge variant={runStatusVariant(r.status)}>
                      {RUN_STATUS_LABEL[r.status]}
                    </StatusBadge>
                    <span className="truncate text-foreground">{r.input}</span>
                    <span className="ml-auto shrink-0 text-muted-foreground tabular">
                      {r.iterations} iter
                    </span>
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </section>

      {/* Right: result */}
      <section className="rounded-[6px] border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 text-foreground" />
            <h3 className="text-[13px] font-medium text-foreground">Loop trace</h3>
            {lastRun && (
              <StatusBadge variant={runStatusVariant(lastRun.status)} pulse={lastRun.status === "running"}>
                {RUN_STATUS_LABEL[lastRun.status]}
              </StatusBadge>
            )}
          </div>
          {lastRun && onOpenRunInDrawer && (
            <Btn variant="ghost" size="xs" onClick={() => onOpenRunInDrawer(lastRun)}>
              Open in drawer
            </Btn>
          )}
        </div>

        <div className="max-h-[calc(100vh-260px)] overflow-y-auto scrollbar-thin p-3.5">
          {!lastRun ? (
            <div className="rounded-[6px] border border-dashed border-border bg-muted/20 px-4 py-12 text-center">
              <FlaskConical className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-[12px] text-muted-foreground">
                Pick an agent, enter a goal, then click <span className="font-medium text-foreground">Run agent</span>.
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                The loop trace will render here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Run summary */}
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <SummaryTile label="Iterations" value={lastRun.iterations} />
                <SummaryTile label="Tokens" value={lastRun.tokensUsed.toLocaleString("en-IN")} />
                <SummaryTile label="Tool calls" value={lastRun.toolCalls} />
                <SummaryTile label="Duration" value={`${lastRun.durationMs} ms`} />
              </div>

              {lastRun.output && (
                <div className="rounded-[5px] border border-foreground bg-foreground/5 px-2.5 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-foreground">Output</span>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-foreground">{lastRun.output}</p>
                </div>
              )}

              {lastRun.error && (
                <div className="rounded-[5px] border border-foreground bg-foreground/5 px-2.5 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-foreground">Error</span>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-foreground">{lastRun.error}</p>
                </div>
              )}

              {lastRun.feedbackId && (
                <div className="flex items-center justify-between rounded-[5px] border border-border bg-muted/20 px-3 py-2 text-[12px]">
                  <span className="text-muted-foreground">Was this response helpful?</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleFeedback(lastRun.feedbackId!, 1)}
                      className="rounded-[4px] border border-border bg-background p-1.5 text-muted-foreground hover:border-foreground/30 hover:text-foreground tap"
                      title="Thumbs Up"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleFeedback(lastRun.feedbackId!, -1)}
                      className="rounded-[4px] border border-border bg-background p-1.5 text-muted-foreground hover:border-foreground/30 hover:text-foreground tap"
                      title="Thumbs Down"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <LoopTraceTimeline run={lastRun} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[5px] border border-border bg-background px-2.5 py-1.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{label}</span>
      <span className="text-[14px] font-medium text-foreground tabular">{value}</span>
    </div>
  );
}

export default SLMPlayground;

// Re-export for parent types
export type { Agent };

"use client";

/* ============================================================
   LoopTraceTimeline - vertical timeline of an agent run's loop.
   Shared by the Run Trace drawer (Tab 4) and the Playground
   inline result view (Tab 5).

   Loop engineering model: observe -> think -> act -> reflect
   Every iteration produces 3-4 entries (one per phase).
   ============================================================ */

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Eye, Brain, Zap, CheckCircle2, ChevronDown, ChevronRight, Clock, Sparkles,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible";
import type {
  AgentRun, LoopPhase, LoopTraceEntry, ToolImpact,
} from "@/lib/slm/types";
import {
  LOOP_PHASE_LABEL, TOOL_IMPACT_LABEL,
} from "@/lib/slm/types";
import { toolById } from "@/lib/slm/tools";

// ── Variant mappers (monochrome) ───────────────────────────
function phaseIcon(phase: LoopPhase) {
  switch (phase) {
    case "observe": return Eye;
    case "think":   return Brain;
    case "act":     return Zap;
    case "reflect": return CheckCircle2;
  }
}

// PhaseGlyph - renders the icon for a loop phase. Extracted as a
// stable component so the react-hooks/static-components lint rule
// doesn't flag "creating a component during render" (which happens
// when you store a component reference in a variable inside render).
function PhaseGlyph({ phase }: { phase: LoopPhase }) {
  switch (phase) {
    case "observe": return <Eye className="h-3 w-3 text-foreground" />;
    case "think":   return <Brain className="h-3 w-3 text-foreground" />;
    case "act":     return <Zap className="h-3 w-3 text-foreground" />;
    case "reflect": return <CheckCircle2 className="h-3 w-3 text-foreground" />;
  }
}

function impactVariant(impact: ToolImpact) {
  // read/write = outline (low attention), destructive/irreversible = solid
  if (impact === "destructive" || impact === "irreversible") {
    return impact === "irreversible" ? "solid" : "outline";
  }
  return "muted";
}
export { impactVariant };

function decisionVariant(decision: NonNullable<LoopTraceEntry["decision"]>) {
  switch (decision) {
    case "continue":          return "outline";
    case "stop":              return "muted";
    case "request-approval":  return "solid";
    case "escalate":          return "solid";
  }
}

function toolStatusVariant(status: "success" | "error" | "pending-approval") {
  switch (status) {
    case "success":           return "outline";
    case "error":             return "solid";
    case "pending-approval":  return "solid";
  }
}

// ── Group trace by iteration ───────────────────────────────
// Filters out any act-phase entry that has no toolCall detail so we
// never render an empty act block (e.g. a real-LLM run that returned
// toolCall=null from the API).
function groupByIteration(trace: LoopTraceEntry[]) {
  const filtered = trace.filter(
    (e) => !(e.phase === "act" && !e.toolCall),
  );
  const groups: { iteration: number; entries: LoopTraceEntry[] }[] = [];
  for (const e of filtered) {
    let g = groups.find((x) => x.iteration === e.iteration);
    if (!g) {
      g = { iteration: e.iteration, entries: [] };
      groups.push(g);
    }
    g.entries.push(e);
  }
  return groups.sort((a, b) => a.iteration - b.iteration);
}

// ── Single timeline node ───────────────────────────────────
function TraceNode({ entry, idx }: { entry: LoopTraceEntry; idx: number }) {
  const [argsOpen, setArgsOpen] = useState(false);
  const [llmOpen, setLlmOpen] = useState(false);
  const isPendingApproval =
    entry.phase === "act" && entry.toolCall?.status === "pending-approval";

  return (
    <div className="relative pl-7">
      {/* Vertical line + node dot */}
      <span
        className="absolute left-[9px] top-1 bottom-0 w-px bg-border"
        aria-hidden
      />
      <span
        className={cn(
          "absolute left-0 top-1 flex h-[18px] w-[18px] items-center justify-center rounded-[3px] border bg-background",
          isPendingApproval ? "border-foreground" : "border-border",
        )}
      >
        <PhaseGlyph phase={entry.phase} />
      </span>

      <div
        className={cn(
          "rounded-[6px] border bg-card px-3 py-2.5",
          isPendingApproval ? "border-foreground" : "border-border",
        )}
      >
        {/* Phase label + timestamp */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {LOOP_PHASE_LABEL[entry.phase]}
            </span>
            {entry.phase === "reflect" && entry.decision && (
              <StatusBadge variant={decisionVariant(entry.decision)}>
                {entry.decision.replace("-", " ")}
              </StatusBadge>
            )}
            {entry.phase === "act" && entry.toolCall && (
              <StatusBadge variant={toolStatusVariant(entry.toolCall.status)}>
                {entry.toolCall.status.replace("-", " ")}
              </StatusBadge>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground tabular">
            {new Date(entry.timestamp).toLocaleTimeString("en-IN", {
              hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
            })}
          </span>
        </div>

        {/* Content */}
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-foreground">
          {entry.content}
        </p>

        {/* THINK phase - LLM call detail */}
        {entry.phase === "think" && entry.llmCall && (
          <Collapsible open={llmOpen} onOpenChange={setLlmOpen} className="mt-2">
            <CollapsibleTrigger
              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground tap"
            >
              {llmOpen
                ? <ChevronDown className="h-3 w-3" />
                : <ChevronRight className="h-3 w-3" />}
              LLM call detail - {entry.llmCall.brainName}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1.5">
              <div className="grid grid-cols-2 gap-1.5 rounded-[5px] border border-border bg-background px-2.5 py-2 text-[11px] sm:grid-cols-4">
                <Detail k="Brain" v={entry.llmCall.brainName} />
                <Detail k="Prompt" v={`${entry.llmCall.promptTokens} tok`} mono />
                <Detail k="Completion" v={`${entry.llmCall.completionTokens} tok`} mono />
                <Detail k="Duration" v={`${entry.llmCall.durationMs} ms`} mono />
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* ACT phase - tool call detail */}
        {entry.phase === "act" && entry.toolCall && (
          <div className="mt-2 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                {entry.toolCall.toolName}
              </span>
              <StatusBadge variant={impactVariant(lookupImpact(entry.toolCall.toolId))}>
                {TOOL_IMPACT_LABEL[lookupImpact(entry.toolCall.toolId)]}
              </StatusBadge>
              {entry.toolCall.durationMs !== undefined && (
                <span className="text-[10px] text-muted-foreground tabular">
                  <Clock className="mr-0.5 inline h-3 w-3" />
                  {entry.toolCall.durationMs} ms
                </span>
              )}
            </div>

            <Collapsible open={argsOpen} onOpenChange={setArgsOpen}>
              <CollapsibleTrigger
                className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground tap"
              >
                {argsOpen
                  ? <ChevronDown className="h-3 w-3" />
                  : <ChevronRight className="h-3 w-3" />}
                Args ({Object.keys(entry.toolCall.args).length})
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1.5">
                <pre className="overflow-x-auto rounded-[5px] border border-border bg-background px-2.5 py-2 font-mono text-[11px] leading-relaxed text-foreground">
                  {JSON.stringify(entry.toolCall.args, null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>

            {entry.toolCall.result && (
              <div className="rounded-[5px] border border-border bg-background px-2.5 py-1.5">
                <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  Result
                </span>
                <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-foreground">
                  {entry.toolCall.result}
                </p>
              </div>
            )}

            {isPendingApproval && (
              <div className="rounded-[5px] border border-foreground bg-foreground/5 px-2.5 py-1.5 text-[11px] text-foreground">
                Paused for human approval. See pending approvals queue.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Spacing between nodes (last in iteration handled by parent) */}
      {idx >= 0 && <div className="h-2" aria-hidden />}
    </div>
  );
}

function Detail({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">{k}</span>
      <span className={cn("text-foreground", mono && "tabular")}>{v}</span>
    </div>
  );
}

// Quick lookup of impact from tool id using the registry. Falls back to
// "read" if the tool isn't found (e.g. legacy / custom tool).
function lookupImpact(toolId: string): ToolImpact {
  return toolById(toolId)?.impact ?? "read";
}

// ── Main component ─────────────────────────────────────────
export function LoopTraceTimeline({ run }: { run: AgentRun }) {
  const groups = groupByIteration(run.trace);
  const isRealLLM = run.source === "real-llm";

  if (groups.length === 0) {
    return (
      <div className="rounded-[6px] border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
        <Brain className="mx-auto h-5 w-5 text-muted-foreground" />
        <p className="mt-2 text-[12px] text-muted-foreground">
          No loop trace recorded for this run.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Source badge row - shows where the reasoning came from. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge variant={isRealLLM ? "solid" : "muted"}>
          {isRealLLM ? (
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Real LLM
            </span>
          ) : (
            "Simulation"
          )}
        </StatusBadge>
        <span className="text-[10.5px] text-muted-foreground tabular">
          {groups.length} iteration{groups.length === 1 ? "" : "s"} · {run.trace.length} phase{run.trace.length === 1 ? "" : "s"}
        </span>
      </div>

      {groups.map((g, gi) => (
        <div key={g.iteration} className="relative">
          {/* Iteration divider */}
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-[3px] bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-background">
              Iteration {g.iteration}
            </span>
            <span className="h-px flex-1 bg-border" />
            <span className="text-[10px] text-muted-foreground tabular">
              {g.entries.length} phase{g.entries.length === 1 ? "" : "s"}
            </span>
          </div>

          {/* Nodes - last node in last iteration has no connecting line */}
          <div className="space-y-0">
            {g.entries.map((e, ei) => {
              const isLast = gi === groups.length - 1 && ei === g.entries.length - 1;
              return (
                <div key={`${gi}-${ei}`} className="relative">
                  <TraceNode entry={e} idx={isLast ? -1 : ei} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default LoopTraceTimeline;

"use client";

/* ============================================================
   RunTraceDrawer - right-side Sheet that opens when an operator
   clicks a run from the Overview "Recent runs" list, the Agents
   table "View detail" action, or the Agent Detail drawer's
   recent-runs list. Renders the full LoopTraceTimeline.

   This is the "loop engineering visualization" surface.
   ============================================================ */

import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/shared/status-badge";
import { Btn } from "@/components/shared/btn";
import {
  Activity, Clock, Hash, Cpu, Zap, Calendar, Play, X,
} from "lucide-react";
import type { AgentRun, RunStatus, RunTrigger } from "@/lib/slm/types";
import { RUN_STATUS_LABEL } from "@/lib/slm/types";
import { LoopTraceTimeline } from "./slm-trace-timeline";
import { relativeTime, formatDateTime } from "./_helpers";

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

function triggerLabel(t: RunTrigger): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function HeaderStat({
  icon, label, value,
}: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 rounded-[5px] border border-border bg-background px-2 py-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">{label}</span>
      <span className="ml-auto text-[12px] font-medium text-foreground tabular">{value}</span>
    </div>
  );
}

export interface RunTraceDrawerProps {
  run: AgentRun | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Called when the user clicks "Re-run agent" - the parent re-invokes
   *  the same agent with the same input. */
  onRerun?: (run: AgentRun) => void;
  /** When true, the re-run button is hidden (read-only mode). */
  readOnly?: boolean;
}

export function RunTraceDrawer({
  run, open, onOpenChange, onRerun, readOnly,
}: RunTraceDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full flex-col gap-0 p-0 sm:max-w-3xl"
       showCloseButton={false}>
        <SheetHeader className="gap-2 border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="min-w-0">
              <SheetTitle className="truncate text-[16px] tracking-tight">
                {run?.agentName ?? "Run trace"}
              </SheetTitle>
              <SheetDescription className="mt-0.5 truncate text-[12px]">
                {run ? `Run ${run.id} - ${triggerLabel(run.trigger)} trigger` : "Inspect the loop trace."}
              </SheetDescription>
            </div>
            {run && (
              <StatusBadge variant={runStatusVariant(run.status)} pulse={run.status === "running" || run.status === "awaiting-approval"}>
                {RUN_STATUS_LABEL[run.status]}
              </StatusBadge>
            )}
          </div>

          {run && (
            <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              <HeaderStat icon={<Hash className="h-3 w-3" />} label="Iter" value={run.iterations} />
              <HeaderStat icon={<Cpu className="h-3 w-3" />} label="Tokens" value={run.tokensUsed.toLocaleString("en-IN")} />
              <HeaderStat icon={<Zap className="h-3 w-3" />} label="Tool calls" value={run.toolCalls} />
              <HeaderStat icon={<Clock className="h-3 w-3" />} label="Duration" value={`${run.durationMs} ms`} />
            </div>
          )}

          {run && (
            <div className="mt-1 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              <HeaderStat icon={<Calendar className="h-3 w-3" />} label="Started" value={formatDateTime(run.startedAt)} />
              <HeaderStat icon={<Activity className="h-3 w-3" />} label="Finished" value={run.finishedAt ? formatDateTime(run.finishedAt) : "-"} />
            </div>
          )}

          {run && (
            <div className="mt-1 flex items-start gap-2 rounded-[5px] border border-border bg-muted/30 px-2.5 py-2">
              <span className="mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Input
              </span>
              <p className="text-[12px] leading-relaxed text-foreground">{run.input}</p>
            </div>
          )}

          {run?.output && (
            <div className="mt-1 flex items-start gap-2 rounded-[5px] border border-foreground bg-foreground/5 px-2.5 py-2">
              <span className="mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground">
                Output
              </span>
              <p className="text-[12px] leading-relaxed text-foreground">{run.output}</p>
            </div>
          )}

          {run?.error && (
            <div className="mt-1 flex items-start gap-2 rounded-[5px] border border-foreground bg-foreground/5 px-2.5 py-2">
              <span className="mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground">
                Error
              </span>
              <p className="text-[12px] leading-relaxed text-foreground">{run.error}</p>
            </div>
          )}

          {run && onRerun && !readOnly && (
            <div className="mt-2 flex items-center gap-2">
              <Btn
                variant="outline"
                size="sm"
                icon={<Play className="h-3 w-3" />}
                onClick={() => onRerun(run)}
              >
                Re-run agent
              </Btn>
              <span className="text-[11px] text-muted-foreground">
                Last activity {relativeTime(run.finishedAt ?? run.startedAt)}
              </span>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
          {run ? (
            <>
              <div className="mb-3 flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-foreground" />
                <h3 className="text-[13px] font-medium text-foreground">Loop trace</h3>
                <span className="text-[11px] text-muted-foreground tabular">
                  {run.trace.length} entr{run.trace.length === 1 ? "y" : "ies"}
                </span>
              </div>
              <LoopTraceTimeline run={run} />
            </>
          ) : (
            <div className="rounded-[6px] border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
              <X className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-[12px] text-muted-foreground">No run selected.</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default RunTraceDrawer;

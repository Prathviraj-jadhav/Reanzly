"use client";

/* ============================================================
   AutomationsRunTraceDrawer - thin wrapper around the SLM
   RunTraceDrawer that resolves an AgentRun from the store by
   runId. Used by RecipeCard's "Test run" action and by the
   Loop runs tab's "View trace" button.

   Strict monochrome Swiss design.
   ============================================================ */

import { useMemo } from "react";
import { useSuperadminStore } from "./_store";
import { RunTraceDrawer } from "./slm-run-trace-drawer";
import type { AgentRun } from "@/lib/slm/types";

export interface AutomationsRunTraceDrawerProps {
  /** The AgentRun id to resolve from the store. */
  runId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** When true, the re-run button is hidden. */
  readOnly?: boolean;
}

export function AutomationsRunTraceDrawer({
  runId, open, onOpenChange, readOnly,
}: AutomationsRunTraceDrawerProps) {
  const agentRuns = useSuperadminStore((s) => s.agentRuns);

  const run = useMemo<AgentRun | null>(() => {
    if (!runId) return null;
    return agentRuns.find((r) => r.id === runId) ?? null;
  }, [runId, agentRuns]);

  return (
    <RunTraceDrawer
      run={run}
      open={open}
      onOpenChange={onOpenChange}
      // No re-run for automations - they re-fire on trigger, not on demand.
      onRerun={undefined}
      readOnly={readOnly}
    />
  );
}

export default AutomationsRunTraceDrawer;

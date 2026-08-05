"use client";

/* ============================================================
   SLM run helpers - shared between the Playground tab and the
   Overview tab's per-agent "Run" button.

   Two entry points:
   • runAgentRealLLM(agent, input, brainName) — POSTs to the live
     /api/slm/chat endpoint, builds a single-iteration AgentRun
     from the structured response, and writes it to the store via
     addAgentRun. Returns the run, or null on failure (caller
     falls back to the simulation).
   • runAgentSimulated(agent, input, trigger) — thin wrapper around
     the store's runAgent so the fallback path is consistent.

   Both helpers keep the playground and overview tab in lock-step
   so the only difference is the entry surface, not the loop model.
   ============================================================ */

import { useSuperadminStore } from "./_store";
import type {
  Agent,
  AgentRun,
  LoopTraceEntry,
  RunStatus,
  RunTrigger,
} from "@/lib/slm/types";

// ── Types matching the /api/slm/chat response contract ──────
interface SlmChatResponse {
  reasoning: string;
  decision: "continue" | "stop" | "request-approval" | "escalate";
  toolCall: { toolName: string | null; args: Record<string, unknown> } | null;
  nextAction: string | null;
  promptTokens: number;
  completionTokens: number;
  durationMs?: number;
  feedbackId?: string;
}

// ── Status mapping ─────────────────────────────────────────
function statusForDecision(
  decision: SlmChatResponse["decision"],
): RunStatus {
  switch (decision) {
    case "stop":
      return "succeeded";
    case "request-approval":
      return "awaiting-approval";
    case "escalate":
      return "failed";
    case "continue":
    default:
      // Treat the single-turn playground call as terminal-succeeded.
      return "succeeded";
  }
}

function makeRunId(): string {
  return (
    "run-" +
    Math.random().toString(36).slice(2, 8) +
    Date.now().toString(36).slice(-4)
  );
}

// ── Build a single-iteration AgentRun from a real LLM response ─
function buildRealLLMRun(params: {
  agent: Agent;
  input: string;
  trigger: RunTrigger;
  brainName: string;
  resp: SlmChatResponse;
}): AgentRun {
  const { agent, input, trigger, brainName, resp } = params;
  const startedAt = Date.now();
  const durationMs = resp.durationMs && resp.durationMs > 0
    ? resp.durationMs
    : 1; // Avoid 0ms - the trace timeline shows duration; 0 looks broken.

  const iterTs = new Date(startedAt).toISOString();
  const trace: LoopTraceEntry[] = [];

  // 1. OBSERVE - what triggered the run + the input we fed in.
  const trimmedInput =
    input.length > 220 ? input.slice(0, 220) + "…" : input;
  trace.push({
    iteration: 1,
    phase: "observe",
    timestamp: iterTs,
    content: `Trigger: ${trigger}. Input: "${trimmedInput}". Brain: ${brainName}.`,
  });

  // 2. THINK - the model's reasoning + the LLM call detail.
  const promptTokens = resp.promptTokens ?? 0;
  const completionTokens = resp.completionTokens ?? 0;
  trace.push({
    iteration: 1,
    phase: "think",
    timestamp: new Date(startedAt + 10).toISOString(),
    content: resp.reasoning || "(no reasoning returned)",
    llmCall: {
      brainId: agent.brainId,
      brainName,
      promptTokens,
      completionTokens,
      durationMs,
    },
  });

  // 3. ACT - only if the model returned a real tool call.
  const hasToolCall =
    resp.toolCall &&
    typeof resp.toolCall.toolName === "string" &&
    resp.toolCall.toolName.length > 0;

  if (hasToolCall && resp.toolCall) {
    const toolName = resp.toolCall.toolName as string;
    const args = resp.toolCall.args ?? {};
    trace.push({
      iteration: 1,
      phase: "act",
      timestamp: new Date(startedAt + 20).toISOString(),
      content: `Proposed tool call: ${toolName}(${Object.keys(args).length} arg${Object.keys(args).length === 1 ? "" : "s"}).`,
      toolCall: {
        toolId: `llm-${toolName}`, // No tool registry entry for free-form LLM calls.
        toolName,
        args,
        status: "success",
        durationMs: 0,
      },
    });
  }

  // 4. REFLECT - the next action + the decision.
  const reflectText =
    resp.nextAction && resp.nextAction.trim().length > 0
      ? resp.nextAction
      : resp.decision === "stop"
        ? "Goal satisfied. Halting loop."
        : resp.decision === "escalate"
          ? "Cannot proceed autonomously. Escalating to human operator."
          : resp.decision === "request-approval"
            ? "Pausing for human approval before high-impact action."
            : "Single-turn playground call — treating as terminal.";
  trace.push({
    iteration: 1,
    phase: "reflect",
    timestamp: new Date(startedAt + 30).toISOString(),
    content: reflectText,
    decision: resp.decision,
  });

  const status = statusForDecision(resp.decision);
  const tokensUsed = promptTokens + completionTokens;
  const toolCalls = hasToolCall ? 1 : 0;

  const output =
    status === "succeeded"
      ? `Real LLM (${brainName}) completed in 1 iteration · ${tokensUsed} tokens.`
      : undefined;
  const error =
    status === "failed"
      ? "Agent escalated to human operator."
      : undefined;

  return {
    id: makeRunId(),
    agentId: agent.id,
    agentName: agent.name,
    status,
    trigger,
    input,
    output,
    error,
    startedAt: new Date(startedAt - durationMs).toISOString(),
    finishedAt: new Date(startedAt).toISOString(),
    durationMs,
    iterations: 1,
    tokensUsed,
    toolCalls,
    trace,
    approvals: [],
    scope: agent.scopes[0] ?? { kind: "platform" },
    source: "real-llm",
    feedbackId: resp.feedbackId,
  };
}

// ── Public: real LLM run ───────────────────────────────────
/**
 * POST to /api/slm/chat, build an AgentRun, and prepend it to the
 * store via addAgentRun. Returns the run on success, or null if
 * the fetch failed (non-2xx or network error) so the caller can
 * fall back to the simulation.
 */
export async function runAgentRealLLM(
  agent: Agent,
  input: string,
  brainName: string,
  trigger: RunTrigger = "manual",
): Promise<AgentRun | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let resp: Response;
  try {
    resp = await fetch("/api/slm/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentName: agent.name,
        agentCategory: agent.category,
        systemPrompt: agent.systemPrompt,
        input: trimmed,
        brainName,
      }),
    });
  } catch {
    // Network error (server down, dev server not ready, etc.)
    return null;
  }

  if (!resp.ok) return null;

  let body: SlmChatResponse;
  try {
    body = (await resp.json()) as SlmChatResponse;
  } catch {
    return null;
  }

  // Validate the minimum shape we need.
  if (!body || typeof body.reasoning !== "string" || !body.decision) {
    return null;
  }

  const run = buildRealLLMRun({
    agent,
    input: trimmed,
    trigger,
    brainName,
    resp: body,
  });

  useSuperadminStore.getState().addAgentRun(run);
  return run;
}

// ── Public: simulated run (store action wrapper) ───────────
/**
 * Run the deterministic in-store simulation and return the new
 * run id (empty string if the agent id wasn't found).
 */
export function runAgentSimulated(
  agent: Agent,
  input: string,
  trigger: RunTrigger = "manual",
): string {
  return useSuperadminStore.getState().runAgent(agent.id, input, trigger);
}

/**
 * Reanzly SLM Loop Engine
 * ========================
 *
 * The loop engine executes an agent run as a bounded cycle:
 *
 *     observe -> think -> act -> reflect -> (repeat or stop)
 *
 * This is "loop engineering" - a disciplined, observable, bounded
 * agentic loop with:
 *   - per-iteration tracing (every phase recorded)
 *   - token/iteration budgets
 *   - human-in-the-loop approval gating for high-impact actions
 *   - reflection-driven memory learning
 *
 * In production this would call the real LLM provider via an API route.
 * Here we provide a deterministic simulation so the admin UI can
 * demonstrate the loop trace end-to-end without burning tokens.
 *
 * The real LLM call site is `callBrain()` - in production this hits
 * /api/slm/chat which proxies to the configured provider (Anthropic /
 * OpenAI / Google) using the vaulted API key.
 */

import type {
  Agent,
  AgentRun,
  ApprovalRequest,
  Brain,
  LoopTraceEntry,
  RunStatus,
  RunTrigger,
} from "./types";
import { IMPACT_RANK } from "./tools";

// ── Run context ─────────────────────────────────────────────

export interface RunContext {
  agent: Agent;
  brain: Brain;
  input: string;
  trigger: RunTrigger;
  scope: Agent["scopes"][number];
  triggeredBy?: string;
  /** Optional seed for deterministic simulation. */
  seed?: number;
}

// ── Loop result ─────────────────────────────────────────────

export interface LoopResult {
  status: RunStatus;
  output?: string;
  error?: string;
  iterations: number;
  tokensUsed: number;
  toolCalls: number;
  trace: LoopTraceEntry[];
  approvals: ApprovalRequest[];
  durationMs: number;
}

// ── Deterministic PRNG (so simulated runs are reproducible) ─

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Simulated brain call ────────────────────────────────────
// In production this would POST to /api/slm/chat with the brainId,
// system prompt, messages, and tool definitions. The route would
// resolve the API key from the vault, call the provider, and return
// the assistant message + any tool calls.

export interface BrainResponse {
  reasoning: string;
  toolCalls: Array<{
    toolId: string;
    toolName: string;
    args: Record<string, unknown>;
  }>;
  decision: "continue" | "stop" | "request-approval" | "escalate";
  promptTokens: number;
  completionTokens: number;
}

function simulateBrainCall(
  ctx: RunContext,
  iteration: number,
  rng: () => number,
  previousResult?: string,
): BrainResponse {
  const isLocal = ctx.brain.kind === "local-rules";

  // Deterministic canned reasoning per category. In production the LLM
  // produces this freely; here we sketch what each agent type would say.
  const reasoningByCategory: Record<string, string> = {
    triage: `Iteration ${iteration}: Classified the incoming request. Department routing decision based on keywords and SLA policy.`,
    billing: `Iteration ${iteration}: Reviewed invoice state and payment history. Dunning step recommended.`,
    ops: `Iteration ${iteration}: Cross-referenced trip telemetry against ETA. Anomaly confidence high.`,
    fleet: `Iteration ${iteration}: Compared odometer against service program. Maintenance window identified.`,
    sales: `Iteration ${iteration}: Trial usage signals suggest readiness for upgrade outreach.`,
    security: `Iteration ${iteration}: Login pattern deviates from baseline. Escalation warranted.`,
    compliance: `Iteration ${iteration}: GST eWay validity check returned expiring within 6h.`,
    custom: `Iteration ${iteration}: Reasoning about the goal against available tools.`,
  };

  const reasoning = reasoningByCategory[ctx.agent.category] ?? reasoningByCategory.custom;

  // First iteration: plan a tool call. Later iterations: reflect and decide.
  if (iteration === 1) {
    return {
      reasoning,
      toolCalls: [
        {
          toolId: ctx.agent.toolIds[0] ?? "tool-list-tickets",
          toolName: "list_tickets",
          args: { department: "billing", limit: 5 },
        },
      ],
      decision: "continue",
      promptTokens: isLocal ? 0 : 180 + Math.floor(rng() * 120),
      completionTokens: isLocal ? 0 : 80 + Math.floor(rng() * 60),
    };
  }

  // After acting, reflect on the result.
  if (iteration < ctx.agent.maxIterations) {
    // 70% continue, 20% stop (goal met), 10% request approval
    const roll = rng();
    if (roll < 0.1) {
      return {
        reasoning: `Reflection: the next action has high impact. Pausing for human approval per policy (threshold ${ctx.agent.approvalThreshold}).`,
        toolCalls: [
          {
            toolId: ctx.agent.toolIds[1] ?? ctx.agent.toolIds[0] ?? "tool-retry-invoice",
            toolName: "retry_invoice",
            args: { invoiceId: "inv-" + Math.floor(rng() * 9000 + 1000), reason: "Auto-retry by agent" },
          },
        ],
        decision: "request-approval",
        promptTokens: isLocal ? 0 : 220,
        completionTokens: isLocal ? 0 : 90,
      };
    }
    if (roll < 0.3) {
      return {
        reasoning: `Reflection: goal achieved. ${previousResult ? "Tool result confirms success." : "No further action needed."} Stopping loop.`,
        toolCalls: [],
        decision: "stop",
        promptTokens: isLocal ? 0 : 150,
        completionTokens: isLocal ? 0 : 60,
      };
    }
    return {
      reasoning: `Reflection: partial progress. Continuing loop to verify outcome.`,
      toolCalls: [
        {
          toolId: ctx.agent.toolIds[0] ?? "tool-list-tickets",
          toolName: "list_tickets",
          args: { status: "open" },
        },
      ],
      decision: "continue",
      promptTokens: isLocal ? 0 : 200,
      completionTokens: isLocal ? 0 : 70,
    };
  }

  // Hit max iterations - stop.
  return {
    reasoning: `Reflection: reached max iterations (${ctx.agent.maxIterations}). Stopping to avoid runaway loop.`,
    toolCalls: [],
    decision: "stop",
    promptTokens: isLocal ? 0 : 120,
    completionTokens: isLocal ? 0 : 40,
  };
}

// ── Simulated tool execution ────────────────────────────────

function simulateToolExec(
  toolId: string,
  toolName: string,
  args: Record<string, unknown>,
  rng: () => number,
): { result: string; status: "success" | "error"; durationMs: number } {
  const durationMs = 80 + Math.floor(rng() * 320);
  // 90% success rate
  if (rng() < 0.1) {
    return {
      result: `Error: ${toolName} returned 503 (service unavailable). Will retry on next iteration if budget allows.`,
      status: "error",
      durationMs,
    };
  }
  return {
    result: `OK: ${toolName} executed with ${Object.keys(args).length} arg(s). Affected record: rec-${Math.floor(rng() * 9000 + 1000)}.`,
    status: "success",
    durationMs,
  };
}

// ── Main loop ───────────────────────────────────────────────

export function runAgentLoop(ctx: RunContext): LoopResult {
  const startedAt = Date.now();
  const rng = mulberry32(ctx.seed ?? 42);
  const trace: LoopTraceEntry[] = [];
  const approvals: ApprovalRequest[] = [];
  let iterations = 0;
  let tokensUsed = 0;
  let toolCalls = 0;
  let status: RunStatus = "running";
  let output: string | undefined;
  let error: string | undefined;
  let lastToolResult: string | undefined;

  // Bounded loop.
  while (iterations < ctx.agent.maxIterations && status === "running") {
    iterations++;
    const iterTs = new Date().toISOString();

    // 1. OBSERVE
    trace.push({
      iteration: iterations,
      phase: "observe",
      timestamp: iterTs,
      content:
        iterations === 1
          ? `Trigger: ${ctx.trigger}. Input: "${ctx.input.slice(0, 160)}${ctx.input.length > 160 ? "..." : ""}". Scope: ${ctx.scope.kind}${ctx.scope.target ? " -> " + ctx.scope.target : ""}.`
          : `Observed tool result from prior iteration: ${lastToolResult ?? "none"}.`,
    });

    // 2. THINK (call the brain)
    const brainResp = simulateBrainCall(ctx, iterations, rng, lastToolResult);
    tokensUsed += brainResp.promptTokens + brainResp.completionTokens;
    trace.push({
      iteration: iterations,
      phase: "think",
      timestamp: new Date().toISOString(),
      content: brainResp.reasoning,
      llmCall: {
        brainId: ctx.brain.id,
        brainName: ctx.brain.name,
        promptTokens: brainResp.promptTokens,
        completionTokens: brainResp.completionTokens,
        durationMs: 120 + Math.floor(rng() * 280),
      },
    });

    // 3. ACT (execute planned tool calls, gated by approval)
    for (const tc of brainResp.toolCalls) {
      toolCalls++;
      // Approval gating: if the tool impact >= threshold and autoExecute
      // is off, we pause and emit an approval request.
      const needsApproval =
        !ctx.agent.autoExecute &&
        // Approximate: tools after the first are typically higher impact.
        iterations > 1 &&
        brainResp.decision === "request-approval";

      if (needsApproval) {
        const approval: ApprovalRequest = {
          id: "apr-" + Math.random().toString(36).slice(2, 8),
          runId: "run-pending",
          agentId: ctx.agent.id,
          toolId: tc.toolId,
          toolName: tc.toolName,
          args: tc.args,
          reason: `Tool ${tc.toolName} impact exceeds approval threshold (${ctx.agent.approvalThreshold}).`,
          impact: "destructive",
          status: "pending",
          requestedAt: new Date().toISOString(),
        };
        approvals.push(approval);
        trace.push({
          iteration: iterations,
          phase: "act",
          timestamp: new Date().toISOString(),
          content: `Paused for human approval on ${tc.toolName}.`,
          toolCall: {
            toolId: tc.toolId,
            toolName: tc.toolName,
            args: tc.args,
            status: "pending-approval",
          },
          decision: "request-approval",
        });
        status = "awaiting-approval";
        break;
      }

      const exec = simulateToolExec(tc.toolId, tc.toolName, tc.args, rng);
      lastToolResult = exec.result;
      trace.push({
        iteration: iterations,
        phase: "act",
        timestamp: new Date().toISOString(),
        content: `Called ${tc.toolName} with args: ${JSON.stringify(tc.args).slice(0, 120)}.`,
        toolCall: {
          toolId: tc.toolId,
          toolName: tc.toolName,
          args: tc.args,
          result: exec.result,
          status: exec.status,
          durationMs: exec.durationMs,
        },
      });
    }

    if (status === "awaiting-approval") break;

    // 4. REFLECT
    trace.push({
      iteration: iterations,
      phase: "reflect",
      timestamp: new Date().toISOString(),
      content:
        brainResp.decision === "stop"
          ? "Goal satisfied. Halting loop."
          : brainResp.decision === "escalate"
            ? "Cannot proceed autonomously. Escalating to human operator."
            : "Outcome partial. Will continue to next iteration.",
      decision: brainResp.decision,
    });

    if (brainResp.decision === "stop") {
      status = "succeeded";
      output = `Agent completed in ${iterations} iteration(s) with ${toolCalls} tool call(s). Final state: goal achieved.`;
      break;
    }
    if (brainResp.decision === "escalate") {
      status = "failed";
      error = "Agent escalated to human operator.";
      break;
    }

    // Token budget check.
    if (tokensUsed >= ctx.agent.tokenBudget) {
      status = "timeout";
      error = `Token budget (${ctx.agent.tokenBudget}) exhausted after ${iterations} iterations.`;
      break;
    }
  }

  // If we exited via the loop bound, mark as timeout.
  if (status === "running") {
    status = "timeout";
    error = `Max iterations (${ctx.agent.maxIterations}) reached.`;
  }

  const durationMs = Date.now() - startedAt;

  return {
    status,
    output,
    error,
    iterations,
    tokensUsed,
    toolCalls,
    trace,
    approvals,
    durationMs,
  };
}

// ── Helper: build an AgentRun from a loop result ────────────

export function buildRun(ctx: RunContext, result: LoopResult): AgentRun {
  return {
    id: "run-" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4),
    agentId: ctx.agent.id,
    agentName: ctx.agent.name,
    status: result.status,
    trigger: ctx.trigger,
    input: ctx.input,
    output: result.output,
    error: result.error,
    startedAt: new Date(Date.now() - result.durationMs).toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: result.durationMs,
    iterations: result.iterations,
    tokensUsed: result.tokensUsed,
    toolCalls: result.toolCalls,
    trace: result.trace,
    approvals: result.approvals.map((a) => ({ ...a, runId: "run-pending" })),
    scope: ctx.scope,
    triggeredBy: ctx.triggeredBy,
  };
}

// ── Impact gating helper ────────────────────────────────────

export function shouldRequireApproval(
  impact: keyof typeof IMPACT_RANK,
  threshold: number,
): boolean {
  // Map impact rank to a 0-100 scale and compare against threshold.
  const scaled = (IMPACT_RANK[impact] / 3) * 100;
  return scaled >= threshold;
}

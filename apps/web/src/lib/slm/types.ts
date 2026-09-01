/**
 * Reanzly SLM - Small Language Model Agent Runtime
 * ================================================
 *
 * The SLM is Reanzly's in-house agent runtime. It powers the Automation
 * engine, the Rean AI assistant, and the Integrations layer.
 *
 * Loop Engineering
 * ----------------
 * Every agent run is a loop:
 *   observe -> think -> act -> reflect -> (repeat or stop)
 *
 *   1. OBSERVE  - ingest an event (trigger fired, user message, webhook,
 *                 schedule tick, MCP notification, or a step result).
 *   2. THINK    - ask the configured brain (local rules engine OR a
 *                 remote LLM provider like Claude / ChatGPT / Gemini) to
 *                 decide the next tool call(s). Returns a structured
 *                 Plan with reasoning.
 *   3. ACT      - execute the planned tool calls (built-in tools,
 *                 MCP tools, or integration actions via API keys).
 *   4. REFLECT  - evaluate the tool results against the goal. Decide
 *                 whether to loop again, pause for human approval, or
 *                 finish. Reflection also writes a memory entry so the
 *                 agent learns for next time.
 *
 * The loop is bounded by maxIterations and a token/credit budget so an
 * agent can never run away. Every iteration is recorded as a LoopTrace
 * so operators can inspect the reasoning in the admin panel.
 *
 * This file defines the pure types. The runtime engine lives in
 * runtime.ts, the tool registry in tools.ts, and provider configs in
 * providers.ts.
 */

// ── Agents ──────────────────────────────────────────────────

export type AgentCategory =
  | "triage" // routes tickets / issues to departments
  | "billing" // invoice retries, dunning, refunds
  | "ops" // trip anomalies, POD chasing, vehicle health
  | "fleet" // maintenance, fuel, reminders
  | "sales" // trial conversion, churn rescue
  | "security" // anomaly detection, access reviews
  | "compliance" // GST, eWay, DPDP checks
  | "custom"; // org-defined

export type AgentStatus = "active" | "paused" | "draft" | "archived";

export interface Agent {
  id: string;
  name: string;
  description: string;
  category: AgentCategory;
  status: AgentStatus;
  /** The brain this agent uses to think. */
  brainId: string;
  /** System prompt - the persona & rules. */
  systemPrompt: string;
  /** Tools this agent is allowed to call (whitelist). */
  toolIds: string[];
  /** Max loop iterations per run. Caps runaway loops. */
  maxIterations: number;
  /** Max tokens per run across all LLM calls. */
  tokenBudget: number;
  /** When true, the agent can act autonomously. When false, it pauses
   *  for human approval before any tool call with impact >= the
   *  approvalThreshold. */
  autoExecute: boolean;
  /** 0-100. Tool calls with impact >= this require human approval when
   *  autoExecute is false. */
  approvalThreshold: number;
  /** Scopes this agent operates in. */
  scopes: AgentScope[];
  /** Suggested for these org-level roles. */
  suggestedForRoles: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  stats: AgentStats;
}

export interface AgentScope {
  kind: "platform" | "org" | "role";
  target?: string; // orgId or role label
}

export interface AgentStats {
  totalRuns: number;
  successRate: number; // 0-100
  avgIterations: number;
  avgTokens: number;
  avgDurationMs: number;
  lastRunAt?: string;
  totalToolCalls: number;
  totalApprovalsRequested: number;
  totalApprovalsGranted: number;
}

// ── Brains (LLM providers + local rules engine) ────────────

export type BrainKind = "local-rules" | "remote-llm";

export interface Brain {
  id: string;
  name: string;
  kind: BrainKind;
  /** For remote-llm: which provider + model. */
  providerId?: string;
  model?: string;
  /** Temperature 0-1. Lower = more deterministic. */
  temperature: number;
  /** Max tokens per single LLM call. */
  maxTokens: number;
  /** For remote-llm: which API key vault entry to use. */
  apiKeyRef?: string;
  status: "connected" | "disconnected" | "error";
  lastCheckedAt?: string;
  /** Rolling 7-day cost in INR (for remote brains). */
  cost7d?: number;
  /** Rolling 7-day token usage. */
  tokens7d?: number;
}

// ── Tools (built-in, MCP, integration) ─────────────────────

export type ToolKind = "builtin" | "mcp" | "integration";
export type ToolImpact = "read" | "write" | "destructive" | "irreversible";

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  kind: ToolKind;
  /** The function name in snake_case. */
  fn: string;
  /** JSON schema for the arguments. */
  inputSchema: Record<string, unknown>;
  /** Impact level - controls approval gating. */
  impact: ToolImpact;
  /** For MCP: which MCP server connection. */
  mcpConnectionId?: string;
  /** For integration: which integration provider. */
  integrationId?: string;
  /** For builtin: which module this touches. */
  module?: string;
  /** Whether this tool is currently enabled. */
  enabled: boolean;
}

// ── Runs & Loop Trace ───────────────────────────────────────

export type RunStatus =
  | "queued"
  | "running"
  | "awaiting-approval"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "timeout";

export type RunTrigger =
  | "automation" // fired by an automation recipe
  | "manual" // operator clicked Run in the playground
  | "schedule" // cron tick
  | "webhook" // external system called in
  | "event" // domain event (invoice.failed, issue.created, etc.)
  | "chat"; // Rean AI assistant invocation

export interface AgentRun {
  id: string;
  agentId: string;
  agentName: string;
  status: RunStatus;
  trigger: RunTrigger;
  /** The initial input / goal. */
  input: string;
  /** Final output when succeeded. */
  output?: string;
  /** Error message when failed. */
  error?: string;
  startedAt: string;
  finishedAt?: string;
  durationMs: number;
  iterations: number;
  tokensUsed: number;
  toolCalls: number;
  /** Full loop trace - one entry per iteration. */
  trace: LoopTraceEntry[];
  /** Scopes this run operated in. */
  scope: AgentScope;
  /** Approval requests generated during the run. */
  approvals: ApprovalRequest[];
  /** Triggering entity (automation id, chat session, webhook id). */
  triggeredBy?: string;
  /** Where the reasoning came from. "real-llm" = the live /api/slm/chat
   *  endpoint; "simulation" = the deterministic in-store mock. Defaults
   *  to "simulation" for backward compatibility with seeded runs. */
  source?: "real-llm" | "simulation";
  /** Feedback ID to link to the SlmFeedback record for self-learning reinforcement. */
  feedbackId?: string;
}

export type LoopPhase = "observe" | "think" | "act" | "reflect";

export interface LoopTraceEntry {
  iteration: number;
  phase: LoopPhase;
  timestamp: string;
  /** What the agent observed / thought / did / reflected. */
  content: string;
  /** Tool call details (act phase only). */
  toolCall?: {
    toolId: string;
    toolName: string;
    args: Record<string, unknown>;
    result?: string;
    status: "success" | "error" | "pending-approval";
    durationMs?: number;
  };
  /** LLM call details (think phase only). */
  llmCall?: {
    brainId: string;
    brainName: string;
    promptTokens: number;
    completionTokens: number;
    durationMs: number;
  };
  /** Reflection decision. */
  decision?: "continue" | "stop" | "request-approval" | "escalate";
}

// ── Approval flow (human-in-the-loop) ──────────────────────

export type ApprovalStatus = "pending" | "approved" | "denied" | "expired";

export interface ApprovalRequest {
  id: string;
  runId: string;
  agentId: string;
  toolId: string;
  toolName: string;
  args: Record<string, unknown>;
  reason: string;
  impact: ToolImpact;
  status: ApprovalStatus;
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionNote?: string;
}

// ── Agent Memory (learning) ────────────────────────────────

export interface AgentMemory {
  id: string;
  agentId: string;
  /** The pattern the agent learned. */
  pattern: string;
  /** What worked or didn't. */
  outcome: "success" | "failure" | "neutral";
  /** How many times this pattern has been seen. */
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  /** Optional refinement the agent should apply next time. */
  refinement?: string;
}

// ── Convenience ─────────────────────────────────────────────

export const AGENT_CATEGORY_LABEL: Record<AgentCategory, string> = {
  triage: "Triage",
  billing: "Billing",
  ops: "Operations",
  fleet: "Fleet",
  sales: "Sales & Success",
  security: "Security",
  compliance: "Compliance",
  custom: "Custom",
};

export const AGENT_STATUS_LABEL: Record<AgentStatus, string> = {
  active: "Active",
  paused: "Paused",
  draft: "Draft",
  archived: "Archived",
};

export const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  queued: "Queued",
  running: "Running",
  "awaiting-approval": "Awaiting approval",
  succeeded: "Succeeded",
  failed: "Failed",
  cancelled: "Cancelled",
  timeout: "Timeout",
};

export const TOOL_IMPACT_LABEL: Record<ToolImpact, string> = {
  read: "Read",
  write: "Write",
  destructive: "Destructive",
  irreversible: "Irreversible",
};

export const LOOP_PHASE_LABEL: Record<LoopPhase, string> = {
  observe: "Observe",
  think: "Think",
  act: "Act",
  reflect: "Reflect",
};

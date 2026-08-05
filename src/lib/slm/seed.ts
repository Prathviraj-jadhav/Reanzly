/**
 * Seed data for the Reanzly SLM.
 *
 * Agents, brains, runs, approvals, and memory entries that pre-populate
 * the admin panel so operators can inspect the loop trace without
 * having to configure everything from scratch.
 */

import type { Agent, AgentMemory, AgentRun, ApprovalRequest, Brain } from "./types";

// ── Brains ──────────────────────────────────────────────────

export const SEED_BRAINS: Brain[] = [
  {
    id: "brain-local",
    name: "Reanzly Local Rules",
    kind: "local-rules",
    temperature: 0,
    maxTokens: 0,
    status: "connected",
    lastCheckedAt: new Date().toISOString(),
  },
  {
    id: "brain-claude",
    name: "Claude 3.5 Sonnet",
    kind: "remote-llm",
    providerId: "anthropic",
    model: "claude-3-5-sonnet",
    temperature: 0.2,
    maxTokens: 4096,
    apiKeyRef: "key-anthropic",
    status: "disconnected",
    cost7d: 0,
    tokens7d: 0,
  },
  {
    id: "brain-gpt4o",
    name: "GPT-4o",
    kind: "remote-llm",
    providerId: "openai",
    model: "gpt-4o",
    temperature: 0.3,
    maxTokens: 4096,
    apiKeyRef: "key-openai",
    status: "disconnected",
    cost7d: 0,
    tokens7d: 0,
  },
  {
    id: "brain-gemini",
    name: "Gemini 2.0 Flash",
    kind: "remote-llm",
    providerId: "google",
    model: "gemini-2-0-flash",
    temperature: 0.4,
    maxTokens: 8192,
    apiKeyRef: "key-google",
    status: "disconnected",
    cost7d: 0,
    tokens7d: 0,
  },
];

// ── Agents ──────────────────────────────────────────────────

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}
function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 3600000).toISOString();
}

export const SEED_AGENTS: Agent[] = [
  {
    id: "agent-triage",
    name: "Rean Triage Bot",
    description: "Reads every new ticket and issue, classifies it, routes to the right department, and sets priority based on keywords and SLA policy.",
    category: "triage",
    status: "active",
    brainId: "brain-local",
    systemPrompt:
      "You are Rean Triage, the Reanzly internal triage agent. For every incoming ticket or issue: (1) classify the category, (2) pick the right department, (3) set priority based on SLA, (4) assign to the on-call staff for that department. Never close a ticket without a human review.",
    toolIds: ["tool-create-ticket", "tool-route-ticket", "tool-assign-ticket", "tool-list-tickets"],
    maxIterations: 5,
    tokenBudget: 8000,
    autoExecute: true,
    approvalThreshold: 60,
    scopes: [{ kind: "platform" }],
    suggestedForRoles: ["Support Lead", "Support Agent"],
    createdBy: "anand.kumar@reanzly.com",
    createdAt: daysAgo(120),
    updatedAt: hoursAgo(6),
    stats: {
      totalRuns: 482,
      successRate: 94,
      avgIterations: 2.4,
      avgTokens: 0,
      avgDurationMs: 420,
      lastRunAt: hoursAgo(1),
      totalToolCalls: 1156,
      totalApprovalsRequested: 0,
      totalApprovalsGranted: 0,
    },
  },
  {
    id: "agent-billing",
    name: "Rean Billing Bot",
    description: "Handles dunning: retries failed invoice payments, notifies the billing department and account manager, and escalates chronic failures.",
    category: "billing",
    status: "active",
    brainId: "brain-claude",
    systemPrompt:
      "You are Rean Billing. When an invoice payment fails: (1) retry up to 3 times across 3 days, (2) notify the billing department, (3) email the account manager, (4) after 3 failures, suspend the org and page the account manager. Refunds require human approval.",
    toolIds: ["tool-retry-invoice", "tool-refund-invoice", "tool-send-broadcast", "tool-suspend-org", "tool-get-org"],
    maxIterations: 7,
    tokenBudget: 12000,
    autoExecute: false,
    approvalThreshold: 70,
    scopes: [{ kind: "platform" }],
    suggestedForRoles: ["Billing Specialist", "Account Manager"],
    createdBy: "neha.gupta@reanzly.com",
    createdAt: daysAgo(90),
    updatedAt: hoursAgo(12),
    stats: {
      totalRuns: 156,
      successRate: 88,
      avgIterations: 3.1,
      avgTokens: 2400,
      avgDurationMs: 3200,
      lastRunAt: hoursAgo(3),
      totalToolCalls: 412,
      totalApprovalsRequested: 38,
      totalApprovalsGranted: 31,
    },
  },
  {
    id: "agent-ops",
    name: "Rean Ops Sentinel",
    description: "Watches trip telemetry for ETA slips, route deviations, and POD delays. Auto-creates issues and nudges dispatchers.",
    category: "ops",
    status: "active",
    brainId: "brain-gpt4o",
    systemPrompt:
      "You are Rean Ops Sentinel. Monitor active trips for anomalies. When detected: (1) create an issue, (2) notify the dispatcher in-app, (3) if ETA slip > 4h, email the customer. Never cancel a trip without human approval.",
    toolIds: ["tool-create-ticket", "tool-send-broadcast", "tool-list-tickets", "tool-search-audit"],
    maxIterations: 6,
    tokenBudget: 10000,
    autoExecute: true,
    approvalThreshold: 80,
    scopes: [{ kind: "platform" }],
    suggestedForRoles: ["Dispatcher", "Operations Manager"],
    createdBy: "rohit.mehra@reanzly.com",
    createdAt: daysAgo(60),
    updatedAt: hoursAgo(2),
    stats: {
      totalRuns: 298,
      successRate: 91,
      avgIterations: 2.8,
      avgTokens: 1800,
      avgDurationMs: 2100,
      lastRunAt: hoursAgo(2),
      totalToolCalls: 684,
      totalApprovalsRequested: 12,
      totalApprovalsGranted: 12,
    },
  },
  {
    id: "agent-fleet",
    name: "Rean Fleet Keeper",
    description: "Tracks vehicle service programs, insurance expiries, and fuel anomalies. Schedules reminders and creates work orders.",
    category: "fleet",
    status: "active",
    brainId: "brain-local",
    systemPrompt:
      "You are Rean Fleet Keeper. For every vehicle: (1) check service program odometer trigger, (2) check insurance/permit expiry, (3) flag fuel anomalies. Create a work order or reminder when due.",
    toolIds: ["tool-create-ticket", "tool-send-broadcast", "tool-list-tickets"],
    maxIterations: 4,
    tokenBudget: 6000,
    autoExecute: true,
    approvalThreshold: 50,
    scopes: [{ kind: "platform" }],
    suggestedForRoles: ["Fleet Manager"],
    createdBy: "anand.kumar@reanzly.com",
    createdAt: daysAgo(45),
    updatedAt: hoursAgo(8),
    stats: {
      totalRuns: 612,
      successRate: 97,
      avgIterations: 1.9,
      avgTokens: 0,
      avgDurationMs: 280,
      lastRunAt: hoursAgo(1),
      totalToolCalls: 1158,
      totalApprovalsRequested: 0,
      totalApprovalsGranted: 0,
    },
  },
  {
    id: "agent-sales",
    name: "Rean Success Bot",
    description: "Watches trial orgs for conversion signals. Triggers account-manager outreach and recommends plan upgrades.",
    category: "sales",
    status: "active",
    brainId: "brain-claude",
    systemPrompt:
      "You are Rean Success. For trial orgs: (1) watch for usage milestones (first trip, first invoice, first POD), (2) when trial is 3 days from expiry, email the account manager, (3) suggest a plan upgrade when usage crosses the Starter cap. Never upgrade without human approval.",
    toolIds: ["tool-send-broadcast", "tool-upgrade-plan", "tool-get-org"],
    maxIterations: 5,
    tokenBudget: 9000,
    autoExecute: false,
    approvalThreshold: 65,
    scopes: [{ kind: "platform" }],
    suggestedForRoles: ["Account Manager"],
    createdBy: "priya.sharma@reanzly.com",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
    stats: {
      totalRuns: 84,
      successRate: 86,
      avgIterations: 2.2,
      avgTokens: 1900,
      avgDurationMs: 2600,
      lastRunAt: hoursAgo(18),
      totalToolCalls: 168,
      totalApprovalsRequested: 22,
      totalApprovalsGranted: 18,
    },
  },
  {
    id: "agent-security",
    name: "Rean Security Watch",
    description: "Monitors login anomalies, failed sync patterns, and permission changes. Pages the security officer on critical signals.",
    category: "security",
    status: "paused",
    brainId: "brain-local",
    systemPrompt:
      "You are Rean Security Watch. Monitor: (1) login patterns for anomalies, (2) failed sync storms, (3) permission escalations. Page the security officer on critical signals. Suspend user accounts only with human approval.",
    toolIds: ["tool-create-ticket", "tool-send-broadcast", "tool-search-audit", "tool-suspend-org"],
    maxIterations: 6,
    tokenBudget: 8000,
    autoExecute: false,
    approvalThreshold: 80,
    scopes: [{ kind: "platform" }],
    suggestedForRoles: ["Security Officer"],
    createdBy: "sanjay.rao@reanzly.com",
    createdAt: daysAgo(75),
    updatedAt: daysAgo(3),
    stats: {
      totalRuns: 42,
      successRate: 93,
      avgIterations: 3.0,
      avgTokens: 0,
      avgDurationMs: 520,
      lastRunAt: daysAgo(2),
      totalToolCalls: 96,
      totalApprovalsRequested: 14,
      totalApprovalsGranted: 11,
    },
  },
  {
    id: "agent-compliance",
    name: "Rean Compliance Bot",
    description: "Checks GST eWay validity, DPDP consent, and document expiries. Creates compliance tickets and reminders.",
    category: "compliance",
    status: "draft",
    brainId: "brain-gemini",
    systemPrompt:
      "You are Rean Compliance. Check: (1) GST eWay bill validity per active trip, (2) DPDP consent records per org, (3) document expiries. Create a compliance ticket when a check fails.",
    toolIds: ["tool-create-ticket", "tool-list-tickets", "tool-send-broadcast"],
    maxIterations: 4,
    tokenBudget: 7000,
    autoExecute: true,
    approvalThreshold: 50,
    scopes: [{ kind: "platform" }],
    suggestedForRoles: ["Compliance Officer"],
    createdBy: "sanjay.rao@reanzly.com",
    createdAt: daysAgo(14),
    updatedAt: daysAgo(2),
    stats: {
      totalRuns: 0,
      successRate: 0,
      avgIterations: 0,
      avgTokens: 0,
      avgDurationMs: 0,
      totalToolCalls: 0,
      totalApprovalsRequested: 0,
      totalApprovalsGranted: 0,
    },
  },
];

// ── Recent runs (sample traces) ─────────────────────────────

function buildSampleRun(
  agent: Agent,
  status: AgentRun["status"],
  hoursAgoStarted: number,
  iterations: number,
): AgentRun {
  const started = new Date(Date.now() - hoursAgoStarted * 3600000);
  const durationMs = Math.floor(agent.stats.avgDurationMs) || 500;
  const finished = new Date(started.getTime() + durationMs);
  const trace: import("./types").LoopTraceEntry[] = [];
  for (let i = 1; i <= iterations; i++) {
    trace.push({
      iteration: i,
      phase: "observe" as const,
      timestamp: new Date(started.getTime() + (i - 1) * (durationMs / iterations)).toISOString(),
      content:
        i === 1
          ? `Trigger: event. Input: "Invoice inv-2048 payment retry failed for org Shree Balaji Transport."`
          : `Observed tool result from prior iteration: OK: retry_invoice executed with 2 arg(s).`,
    });
    trace.push({
      iteration: i,
      phase: "think" as const,
      timestamp: new Date(started.getTime() + (i - 1) * (durationMs / iterations) + 50).toISOString(),
      content: `Iteration ${i}: Reviewed invoice state and payment history. Dunning step recommended.`,
      llmCall: {
        brainId: agent.brainId,
        brainName: agent.brainId === "brain-local" ? "Reanzly Local Rules" : agent.brainId,
        promptTokens: agent.stats.avgTokens > 0 ? 180 : 0,
        completionTokens: agent.stats.avgTokens > 0 ? 80 : 0,
        durationMs: 150,
      },
    });
    if (i < iterations) {
      trace.push({
        iteration: i,
        phase: "act" as const,
        timestamp: new Date(started.getTime() + (i - 1) * (durationMs / iterations) + 200).toISOString(),
        content: `Called retry_invoice with args: {"invoiceId":"inv-2048","reason":"Auto-retry by agent"}.`,
        toolCall: {
          toolId: "tool-retry-invoice",
          toolName: "retry_invoice",
          args: { invoiceId: "inv-2048", reason: "Auto-retry by agent" },
          result: "OK: retry_invoice executed with 2 arg(s). Affected record: rec-4821.",
          status: "success" as const,
          durationMs: 220,
        },
      });
    }
    trace.push({
      iteration: i,
      phase: "reflect" as const,
      timestamp: new Date(started.getTime() + (i - 1) * (durationMs / iterations) + 400).toISOString(),
      content: i === iterations ? "Goal satisfied. Halting loop." : "Outcome partial. Will continue to next iteration.",
      decision: i === iterations ? ("stop" as const) : ("continue" as const),
    });
  }
  return {
    id: "run-" + agent.id + "-" + hoursAgoStarted,
    agentId: agent.id,
    agentName: agent.name,
    status,
    trigger: "automation",
    input: "Invoice inv-2048 payment retry failed for org Shree Balaji Transport.",
    output: status === "succeeded" ? `Agent completed in ${iterations} iteration(s) with ${iterations - 1} tool call(s). Final state: goal achieved.` : undefined,
    error: status === "failed" ? "Payment retry exhausted all attempts." : undefined,
    startedAt: started.toISOString(),
    finishedAt: finished.toISOString(),
    durationMs,
    iterations,
    tokensUsed: Math.floor(agent.stats.avgTokens * iterations) || 0,
    toolCalls: iterations - 1,
    trace,
    approvals: [],
    scope: { kind: "platform" },
    triggeredBy: "au-001",
  };
}

export const SEED_RUNS: AgentRun[] = [
  buildSampleRun(SEED_AGENTS[0], "succeeded", 1, 2),
  buildSampleRun(SEED_AGENTS[1], "succeeded", 3, 3),
  buildSampleRun(SEED_AGENTS[2], "succeeded", 2, 2),
  buildSampleRun(SEED_AGENTS[3], "succeeded", 1, 2),
  buildSampleRun(SEED_AGENTS[4], "awaiting-approval", 5, 3),
  buildSampleRun(SEED_AGENTS[1], "failed", 8, 4),
  buildSampleRun(SEED_AGENTS[2], "succeeded", 6, 3),
  buildSampleRun(SEED_AGENTS[0], "succeeded", 4, 2),
];

// ── Pending approvals ──────────────────────────────────────

export const SEED_APPROVALS: ApprovalRequest[] = [
  {
    id: "apr-001",
    runId: "run-agent-billing-5",
    agentId: "agent-billing",
    toolId: "tool-refund-invoice",
    toolName: "refund_invoice",
    args: { invoiceId: "inv-2048", amount: 12400, reason: "Customer disputed duplicate charge" },
    reason: "Tool refund_invoice impact exceeds approval threshold (70). Refund of Rs 12,400 requested by Rean Billing Bot.",
    impact: "destructive",
    status: "pending",
    requestedAt: hoursAgo(5),
  },
  {
    id: "apr-002",
    runId: "run-agent-sales-5",
    agentId: "agent-sales",
    toolId: "tool-upgrade-plan",
    toolName: "upgrade_plan",
    args: { orgId: "org-007", plan: "growth", cycle: "annual" },
    reason: "Tool upgrade_plan impact exceeds approval threshold (65). Trial org Shree Balaji Transport crossed Starter vehicle cap (10/8).",
    impact: "destructive",
    status: "pending",
    requestedAt: hoursAgo(2),
  },
  {
    id: "apr-003",
    runId: "run-agent-security-12",
    agentId: "agent-security",
    toolId: "tool-suspend-org",
    toolName: "suspend_org",
    args: { orgId: "org-011", reason: "Anomalous login pattern from 4 new geos in 1h" },
    reason: "Tool suspend_org is irreversible. Suspends org Patel Freight LLP. Requested by Rean Security Watch.",
    impact: "irreversible",
    status: "pending",
    requestedAt: hoursAgo(1),
  },
];

// ── Agent memory (learned patterns) ────────────────────────

export const SEED_MEMORY: AgentMemory[] = [
  {
    id: "mem-001",
    agentId: "agent-billing",
    pattern: "Invoice retries on Friday evenings have 32% lower success rate. Suggest retrying Monday morning instead.",
    outcome: "success",
    occurrences: 18,
    firstSeenAt: daysAgo(60),
    lastSeenAt: hoursAgo(20),
    refinement: "Delay Friday-evening retries to Monday 09:00 IST.",
  },
  {
    id: "mem-002",
    agentId: "agent-triage",
    pattern: "Tickets with 'GST' in subject route 94% correctly to Billing, not Technical.",
    outcome: "success",
    occurrences: 142,
    firstSeenAt: daysAgo(90),
    lastSeenAt: hoursAgo(1),
  },
  {
    id: "mem-003",
    agentId: "agent-ops",
    pattern: "ETA slips on NH-48 corridor correlate with Tuesday afternoon traffic. Auto-extend ETA by 90 min.",
    outcome: "success",
    occurrences: 38,
    firstSeenAt: daysAgo(45),
    lastSeenAt: hoursAgo(6),
    refinement: "Apply +90min ETA buffer for NH-48 trips on Tuesdays 14:00-18:00 IST.",
  },
  {
    id: "mem-004",
    agentId: "agent-billing",
    pattern: "Refunds above Rs 10,000 are denied 60% of the time. Suggest partial refund instead.",
    outcome: "failure",
    occurrences: 12,
    firstSeenAt: daysAgo(30),
    lastSeenAt: hoursAgo(48),
    refinement: "For refunds > Rs 10,000, propose partial refund of 50% first.",
  },
];

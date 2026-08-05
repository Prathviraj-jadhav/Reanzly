/**
 * Tool registry for the Reanzly SLM.
 *
 * Tools are the actions an agent can take during the ACT phase of its
 * loop. They fall into three kinds:
 *
 *   - builtin       -> native Reanzly actions (create ticket, send
 *                      broadcast, retry invoice, update org, etc.)
 *   - mcp           -> calls to a connected MCP (Model Context
 *                      Protocol) server. MCP is the open standard for
 *                      giving LLMs access to external capabilities.
 *   - integration   -> calls to a connected third-party integration
 *                      (Tally, Zoho CRM, Salesforce, Workday, etc.)
 *                      via the integration's REST API, authenticated
 *                      with an API key from the vault.
 *
 * Each tool declares an impact level so the runtime can gate dangerous
 * actions behind human approval.
 */

import type { AgentTool, ToolImpact } from "./types";

// ── Built-in Reanzly tools ──────────────────────────────────

export const BUILTIN_TOOLS: AgentTool[] = [
  // Triage
  {
    id: "tool-create-ticket",
    name: "Create support ticket",
    description: "Create a support ticket in a Reanzly department with priority and SLA.",
    kind: "builtin",
    fn: "create_ticket",
    inputSchema: {
      type: "object",
      properties: {
        subject: { type: "string" },
        description: { type: "string" },
        department: { type: "string", enum: ["billing", "technical", "onboarding", "account-management", "security", "product"] },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        orgId: { type: "string" },
      },
      required: ["subject", "description", "department", "priority"],
    },
    impact: "write",
    module: "Tickets",
    enabled: true,
  },
  {
    id: "tool-route-ticket",
    name: "Route ticket to department",
    description: "Re-route an existing ticket to a different department.",
    kind: "builtin",
    fn: "route_ticket",
    inputSchema: {
      type: "object",
      properties: {
        ticketId: { type: "string" },
        department: { type: "string" },
        reason: { type: "string" },
      },
      required: ["ticketId", "department"],
    },
    impact: "write",
    module: "Tickets",
    enabled: true,
  },
  {
    id: "tool-assign-ticket",
    name: "Assign ticket to staff",
    description: "Assign a ticket to a specific staff member by email.",
    kind: "builtin",
    fn: "assign_ticket",
    inputSchema: {
      type: "object",
      properties: { ticketId: { type: "string" }, staffEmail: { type: "string" } },
      required: ["ticketId", "staffEmail"],
    },
    impact: "write",
    module: "Tickets",
    enabled: true,
  },

  // Broadcasts
  {
    id: "tool-send-broadcast",
    name: "Send broadcast",
    description: "Send an in-app or email broadcast to an audience segment.",
    kind: "builtin",
    fn: "send_broadcast",
    inputSchema: {
      type: "object",
      properties: {
        subject: { type: "string" },
        body: { type: "string" },
        audience: { type: "string", enum: ["all-orgs", "by-plan", "by-org", "by-role"] },
        channels: { type: "array", items: { type: "string", enum: ["email", "sms", "in-app"] } },
      },
      required: ["subject", "body", "audience", "channels"],
    },
    impact: "write",
    module: "Broadcasts",
    enabled: true,
  },

  // Billing
  {
    id: "tool-retry-invoice",
    name: "Retry invoice payment",
    description: "Trigger a retry on a failed invoice payment.",
    kind: "builtin",
    fn: "retry_invoice",
    inputSchema: {
      type: "object",
      properties: { invoiceId: { type: "string" }, reason: { type: "string" } },
      required: ["invoiceId"],
    },
    impact: "write",
    module: "Billing",
    enabled: true,
  },
  {
    id: "tool-refund-invoice",
    name: "Refund invoice",
    description: "Issue a full or partial refund on an invoice.",
    kind: "builtin",
    fn: "refund_invoice",
    inputSchema: {
      type: "object",
      properties: { invoiceId: { type: "string" }, amount: { type: "number" }, reason: { type: "string" } },
      required: ["invoiceId", "amount"],
    },
    impact: "destructive",
    module: "Billing",
    enabled: true,
  },
  {
    id: "tool-upgrade-plan",
    name: "Upgrade org plan",
    description: "Upgrade an org to a higher plan. Requires high-impact approval.",
    kind: "builtin",
    fn: "upgrade_plan",
    inputSchema: {
      type: "object",
      properties: {
        orgId: { type: "string" },
        plan: { type: "string", enum: ["starter", "growth", "scale", "enterprise"] },
        cycle: { type: "string", enum: ["monthly", "annual"] },
      },
      required: ["orgId", "plan"],
    },
    impact: "destructive",
    module: "Billing",
    enabled: true,
  },

  // Orgs
  {
    id: "tool-suspend-org",
    name: "Suspend organization",
    description: "Suspend an org tenant. Blocks all logins. Irreversible without admin action.",
    kind: "builtin",
    fn: "suspend_org",
    inputSchema: {
      type: "object",
      properties: { orgId: { type: "string" }, reason: { type: "string" } },
      required: ["orgId", "reason"],
    },
    impact: "irreversible",
    module: "Organizations",
    enabled: true,
  },
  {
    id: "tool-approve-org",
    name: "Approve org onboarding",
    description: "Approve a pending org onboarding request and provision their tenant.",
    kind: "builtin",
    fn: "approve_org",
    inputSchema: {
      type: "object",
      properties: { orgId: { type: "string" } },
      required: ["orgId"],
    },
    impact: "write",
    module: "Organizations",
    enabled: true,
  },

  // Sync & Backups
  {
    id: "tool-flush-sync",
    name: "Flush sync queue",
    description: "Force-flush pending offline sync records for an org.",
    kind: "builtin",
    fn: "flush_sync",
    inputSchema: {
      type: "object",
      properties: { orgId: { type: "string" } },
      required: ["orgId"],
    },
    impact: "write",
    module: "Sync",
    enabled: true,
  },
  {
    id: "tool-run-backup",
    name: "Run backup",
    description: "Trigger a full or incremental tenant backup.",
    kind: "builtin",
    fn: "run_backup",
    inputSchema: {
      type: "object",
      properties: { type: { type: "string", enum: ["Full", "Incremental"] }, orgId: { type: "string" } },
      required: ["type"],
    },
    impact: "write",
    module: "Backups",
    enabled: true,
  },

  // Read-only
  {
    id: "tool-get-org",
    name: "Get org details",
    description: "Fetch full details for an org tenant.",
    kind: "builtin",
    fn: "get_org",
    inputSchema: {
      type: "object",
      properties: { orgId: { type: "string" } },
      required: ["orgId"],
    },
    impact: "read",
    module: "Organizations",
    enabled: true,
  },
  {
    id: "tool-list-tickets",
    name: "List tickets",
    description: "List support tickets filtered by department, status, or priority.",
    kind: "builtin",
    fn: "list_tickets",
    inputSchema: {
      type: "object",
      properties: {
        department: { type: "string" },
        status: { type: "string" },
        priority: { type: "string" },
        limit: { type: "number" },
      },
    },
    impact: "read",
    module: "Tickets",
    enabled: true,
  },
  {
    id: "tool-search-audit",
    name: "Search audit log",
    description: "Search the immutable audit trail by actor, module, or date range.",
    kind: "builtin",
    fn: "search_audit",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        module: { type: "string" },
        from: { type: "string" },
        to: { type: "string" },
      },
    },
    impact: "read",
    module: "Audit",
    enabled: true,
  },
];

// ── MCP tool templates (one per common MCP server) ─────────
// These are placeholders that get materialised when an admin connects
// an MCP server. The connection's discovered tools replace the template.

export const MCP_TOOL_TEMPLATES: AgentTool[] = [
  {
    id: "mcp-tool-generic-fetch",
    name: "MCP: fetch URL",
    description: "Fetch a URL via a connected MCP fetch server.",
    kind: "mcp",
    fn: "mcp_fetch",
    inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    impact: "read",
    enabled: false,
  },
  {
    id: "mcp-tool-generic-search",
    name: "MCP: web search",
    description: "Run a web search via a connected MCP search server.",
    kind: "mcp",
    fn: "mcp_search",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" }, limit: { type: "number" } },
      required: ["query"],
    },
    impact: "read",
    enabled: false,
  },
];

// ── Integration tool templates ─────────────────────────────
// One generic "call integration" tool per integration category. The
// actual endpoint + auth are resolved at runtime from the connection.

export const INTEGRATION_TOOL_TEMPLATES: AgentTool[] = [
  {
    id: "int-tool-tally-post-voucher",
    name: "Tally: post voucher",
    description: "Post a sales/purchase/payment/receipt voucher to Tally via the Tally integration.",
    kind: "integration",
    fn: "tally_post_voucher",
    inputSchema: {
      type: "object",
      properties: {
        voucherType: { type: "string", enum: ["Sales", "Purchase", "Payment", "Receipt", "Journal"] },
        ledger: { type: "string" },
        amount: { type: "number" },
        date: { type: "string" },
        narration: { type: "string" },
      },
      required: ["voucherType", "ledger", "amount"],
    },
    impact: "write",
    integrationId: "tally",
    enabled: false,
  },
  {
    id: "int-tool-crm-create-lead",
    name: "CRM: create lead",
    description: "Create a lead in the connected CRM (Zoho, Salesforce, or HubSpot).",
    kind: "integration",
    fn: "crm_create_lead",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        company: { type: "string" },
        source: { type: "string" },
      },
      required: ["name", "company"],
    },
    impact: "write",
    integrationId: "crm",
    enabled: false,
  },
  {
    id: "int-tool-erp-sync-trip",
    name: "ERP: sync trip",
    description: "Sync a completed trip to the ERP for cost accounting (SAP, Oracle, or Ramco).",
    kind: "integration",
    fn: "erp_sync_trip",
    inputSchema: {
      type: "object",
      properties: { tripId: { type: "string" }, costCenter: { type: "string" } },
      required: ["tripId"],
    },
    impact: "write",
    integrationId: "erp",
    enabled: false,
  },
  {
    id: "int-tool-hrms-sync-employee",
    name: "HRMS: sync employee",
    description: "Sync a driver/staff record to the HRMS (Workday, BambooHR, or Keka).",
    kind: "integration",
    fn: "hrms_sync_employee",
    inputSchema: {
      type: "object",
      properties: { employeeId: { type: "string" }, action: { type: "string", enum: ["create", "update", "deactivate"] } },
      required: ["employeeId", "action"],
    },
    impact: "write",
    integrationId: "hrms",
    enabled: false,
  },
];

// ── Aggregate ───────────────────────────────────────────────

export const ALL_TOOL_TEMPLATES: AgentTool[] = [
  ...BUILTIN_TOOLS,
  ...MCP_TOOL_TEMPLATES,
  ...INTEGRATION_TOOL_TEMPLATES,
];

export function toolById(id: string): AgentTool | undefined {
  return ALL_TOOL_TEMPLATES.find((t) => t.id === id);
}

export function toolsForAgent(toolIds: string[]): AgentTool[] {
  return ALL_TOOL_TEMPLATES.filter((t) => toolIds.includes(t.id));
}

export const IMPACT_RANK: Record<ToolImpact, number> = {
  read: 0,
  write: 1,
  destructive: 2,
  irreversible: 3,
};

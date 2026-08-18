"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  SEED_ORGS,
  SEED_USERS,
  SEED_INVOICES,
  SEED_BACKUPS,
  SEED_SYNC_TENANTS,
  SEED_SYNC_QUEUE,
  SEED_SYNC_CONFLICTS,
  SEED_AUDIT,
  SEED_GATEWAYS,
  SEED_FEATURE_FLAGS,
  SEED_BACKUP_SCHEDULE,
  SEED_INTERNAL_STAFF,
  SEED_TICKETS,
  SEED_TICKET_COMMENTS,
  SEED_BROADCASTS,
  SEED_AUTOMATIONS,
  MODULES,
  PLANS,
  planById,
  INTERNAL_ROLES,
  internalRoleById,
  type Org,
  type User,
  type Invoice,
  type Backup,
  type SyncTenant,
  type SyncQueueItem,
  type SyncConflict,
  type AuditEntry,
  type Gateway,
  type PlanId,
  type BillingCycle,
  type OrgStatus,
  type UserStatus,
  type ModuleAccessLevel,
  type BackupSchedule,
  type InternalStaff,
  type InternalRoleId,
  type InternalRole,
  type DepartmentId,
  type AdminSubView,
  type SupportTicket,
  type TicketComment,
  type TicketStatus,
  type TicketPriority,
  type TicketSource,
  type Broadcast,
  type BroadcastAudience,
  type BroadcastChannel,
  type BroadcastStatus,
  type AutomationRecipe,
  type AutomationScope,
  type AutomationStep,
  type LoopConfig,
  type LoopRunSummary,
  type StaffStatus,
  type IntegrationProvider,
  type MCPConnection,
  type APIKeyEntry,
  type APIKeyStatus,
} from "./_data";
import { NOW } from "./_helpers";
import { DEFAULT_LOOP_CONFIG, SEED_LOOP_RUNS } from "./_data";
import type { Agent, AgentRun, AgentMemory, Brain, ApprovalRequest, ApprovalStatus } from "@/lib/slm/types";
import { SEED_BRAINS, SEED_AGENTS, SEED_RUNS, SEED_APPROVALS, SEED_MEMORY } from "@/lib/slm/seed";
import { SEED_INTEGRATIONS, SEED_MCP_CONNECTIONS, SEED_API_KEYS } from "./_data";
import type {
  BusinessType,
  SubscriptionModel,
  BrokerProfile,
} from "@/lib/store/app-store";
import { subscriptionModelById } from "@/lib/onboarding/module-catalog";

/* ============================================================
   Superadmin store - Zustand + persist (localStorage).
   Key: "reanzly-superadmin".

   Owns all tenant-wide superadmin state:
   • orgs          - onboarded organizations (tenants)
   • users         - users across all tenants
   • invoices      - billing invoices
   • backups       - backup history + schedule
   • syncTenants   - per-tenant offline-sync summary
   • syncQueue     - pending record-type queue items
   • conflicts     - sync conflicts needing review
   • auditLog      - superadmin audit trail
   • gateways      - email/SMS gateway config
   • featureFlags  - global module feature flags
   • backupSchedule - schedule config + storage usage

   All mutations flow through actions so we can stamp audit
   entries consistently.
   ============================================================ */

interface OnboardingForm {
  legalName: string;
  brandName: string;
  gstin: string;
  industry: string;
  hqCity: string;
  timezone: string;
  currency: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  plan: PlanId;
  billingCycle: BillingCycle;
  paymentMethod: string;
  enabledModules: string[];
  vehicleCap: number;
  userCap: number;
  // === Smart onboarding fields ===
  businessType: BusinessType;
  selectedModules: string[];
  subscriptionModel: SubscriptionModel;
  directoryOptIn: boolean;
  brokerProfile?: BrokerProfile;
}

interface SuperadminState {
  orgs: Org[];
  users: User[];
  invoices: Invoice[];
  backups: Backup[];
  syncTenants: SyncTenant[];
  syncQueue: SyncQueueItem[];
  conflicts: SyncConflict[];
  auditLog: AuditEntry[];
  gateways: Gateway[];
  featureFlags: Record<string, boolean>;
  backupSchedule: BackupSchedule;
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  // ── Internal staff (Reanzly employees with RBAC) ──
  internalStaff: InternalStaff[];
  /** Currently logged-in staff member (null = on admin-login screen). */
  currentStaff: InternalStaff | null;
  adminLogin: (email: string, roleId: InternalRoleId) => void;
  adminLogout: () => void;
  /**
   * Switch the current staff member into a different internal role without
   * forcing a sign-out + sign-in cycle. Used by the role switcher in the
   * SuperAdmin shell top bar so reviewers can preview how each role sees
   * the panel. Audited as "Switched role" so the trail stays honest.
   */
  switchRole: (roleId: InternalRoleId) => void;
  inviteStaff: (input: {
    name: string;
    email: string;
    phone: string;
    roleId: InternalRoleId;
    departments: DepartmentId[];
    portfolioOrgIds?: string[];
  }) => string;
  setStaffStatus: (id: string, status: StaffStatus) => void;
  setStaffRole: (id: string, roleId: InternalRoleId, departments: DepartmentId[]) => void;
  deleteStaff: (id: string) => void;

  // ── Permission helper ──
  /** Returns "write" | "read" | "none" for the current staff member on a sub-view. */
  canAccess: (view: AdminSubView) => "write" | "read" | "none";

  // ── Support tickets ──
  tickets: SupportTicket[];
  ticketComments: TicketComment[];
  createTicket: (input: {
    subject: string;
    description: string;
    category: string;
    department: DepartmentId;
    priority: TicketPriority;
    orgId: string;
    orgName: string;
    raisedBy: string;
    raisedByEmail: string;
    raisedByPhone?: string;
    raisedByRole?: string;
    source: TicketSource;
    tags?: string[];
  }) => string;
  assignTicket: (ticketId: string, staffEmail: string) => void;
  setTicketStatus: (ticketId: string, status: TicketStatus) => void;
  setTicketPriority: (ticketId: string, priority: TicketPriority) => void;
  routeTicket: (ticketId: string, department: DepartmentId) => void;
  addTicketComment: (input: {
    ticketId: string;
    author: string;
    authorEmail: string;
    authorRole: "staff" | "customer";
    body: string;
    isInternal: boolean;
  }) => void;

  // ── Broadcasts ──
  broadcasts: Broadcast[];
  createBroadcast: (input: {
    subject: string;
    body: string;
    audience: BroadcastAudience;
    targets: string[];
    channels: BroadcastChannel[];
    scheduledFor?: string;
  }) => string;
  sendBroadcast: (id: string) => void;
  deleteBroadcast: (id: string) => void;

  // ── Automation recipes ──
  automations: AutomationRecipe[];
  loopRuns: LoopRunSummary[];
  toggleAutomation: (id: string) => void;
  createAutomation: (input: {
    name: string;
    description: string;
    trigger: { label: string; module: string };
    actions: { label: string; channel: "email" | "sms" | "in-app" | "webhook" }[];
    scope: AutomationScope;
    appliesTo?: string;
    suggestedForRoles?: string[];
    steps?: AutomationStep[];
    loopConfig?: LoopConfig;
  }) => string;
  updateAutomationSteps: (automationId: string, steps: AutomationStep[]) => void;
  updateLoopConfig: (automationId: string, config: Partial<LoopConfig>) => void;
  updateAutomationMeta: (automationId: string, patch: {
    name?: string;
    description?: string;
    scope?: AutomationScope;
    appliesTo?: string;
    suggestedForRoles?: string[];
    trigger?: { label: string; module: string };
    actions?: { label: string; channel: "email" | "sms" | "in-app" | "webhook" }[];
  }) => void;
  testRunAutomation: (automationId: string) => string;
  deleteAutomation: (id: string) => void;

  // ── Organization actions ──
  createOrg: (form: OnboardingForm) => string;
  updateOrg: (id: string, patch: Partial<Org>) => void;
  setOrgStatus: (id: string, status: OrgStatus) => void;
  suspendOrg: (id: string, reason?: string) => void;
  activateOrg: (id: string) => void;
  approveOrg: (id: string) => void;
  deleteOrg: (id: string) => void;
  toggleOrgModule: (orgId: string, moduleId: string) => void;
  upgradeOrgPlan: (id: string, plan: PlanId, cycle: BillingCycle) => void;
  // Smart-onboarding trial lifecycle:
  extendTrial: (orgId: string, days: number) => void;
  convertToPaid: (orgId: string) => void;

  // ── User actions ──
  inviteUser: (input: {
    name: string;
    email: string;
    phone: string;
    orgId: string;
    role: string;
    access: Record<string, ModuleAccessLevel>;
  }) => string;
  setUserStatus: (id: string, status: UserStatus) => void;
  suspendUser: (id: string) => void;
  activateUser: (id: string) => void;
  resendInvite: (id: string) => void;
  setModuleAccess: (userId: string, moduleId: string, level: ModuleAccessLevel) => void;
  deleteUser: (id: string) => void;

  // ── Billing actions ──
  retryInvoice: (id: string) => void;
  refundInvoice: (id: string) => void;
  recordInvoicePayment: (id: string) => void;

  // ── Backup actions ──
  runBackup: (type: "Full" | "Incremental", triggeredBy: string) => string;
  finishBackup: (id: string, status: "Completed" | "Failed") => void;
  restoreBackup: (id: string) => void;
  setBackupSchedule: (patch: Partial<BackupSchedule>) => void;
  exportTenant: (orgId: string) => void;

  // ── Sync actions ──
  flushSyncQueue: (orgId?: string) => void;
  resolveConflict: (id: string, resolution: "Resolved-A" | "Resolved-B" | "Merged") => void;
  recomputeSyncHealth: () => void;

  // ── Settings actions ──
  setFeatureFlag: (moduleId: string, enabled: boolean) => void;
  updateGateway: (id: "email" | "sms", patch: Partial<Gateway>) => void;
  testGateway: (id: "email" | "sms") => void;

  // ── Audit ──
  addAudit: (entry: Omit<AuditEntry, "id" | "timestamp">) => void;

  // ── SLM (Small Language Model agent runtime) ──
  agents: Agent[];
  brains: Brain[];
  agentRuns: AgentRun[];
  agentMemory: AgentMemory[];
  pendingApprovals: ApprovalRequest[];
  createAgent: (input: Omit<Agent, "id" | "createdAt" | "updatedAt" | "stats">) => string;
  updateAgent: (id: string, patch: Partial<Agent>) => void;
  setAgentStatus: (id: string, status: Agent["status"]) => void;
  deleteAgent: (id: string) => void;
  runAgent: (agentId: string, input: string, trigger: AgentRun["trigger"]) => string;
  /** Prepend a fully-built AgentRun (e.g. one produced by the real LLM
   *  endpoint) to the store, bump the agent's run stats, and emit an
   *  audit entry. Returns nothing - the caller already has the run. */
  addAgentRun: (run: AgentRun) => void;
  decideApproval: (approvalId: string, decision: "approved" | "denied", note?: string) => void;
  createApiKey: (input: { label: string; providerId: string; key: string; scopes: string[] }) => string;
  revokeApiKey: (id: string) => void;
  connectIntegration: (id: string, apiKeyRef?: string, account?: string) => void;
  disconnectIntegration: (id: string) => void;
  setIntegrationAgentEnabled: (id: string, enabled: boolean) => void;
  connectMCP: (id: string) => void;
  disconnectMCP: (id: string) => void;
  addMCPConnection: (input: Omit<MCPConnection, "id" | "createdAt" | "connected" | "tools" | "resourcesCount" | "healthStatus">) => string;
  removeMCPConnection: (id: string) => void;

  // ── Integrations, MCP, API key vault (state) ──
  integrations: IntegrationProvider[];
  mcpConnections: MCPConnection[];
  apiKeys: APIKeyEntry[];
}

function uid(prefix: string): string {
  return prefix + "-" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

function auditEntry(
  state: SuperadminState,
  actor: string,
  action: string,
  target: string,
  module: string,
): AuditEntry {
  return {
    id: uid("a"),
    actor,
    action,
    target,
    module,
    timestamp: NOW(),
    ip: actor === "system" ? "127.0.0.1" : "103.21.58.42",
  };
}

function recomputeOrgMrr(org: Org): number {
  if (org.status !== "Active" && org.status !== "Trial") return 0;
  // Smart-onboarding: MRR derives from the subscription model, not the
  // legacy plan. SaaS / Master pay a flat monthly fee; Commission-only
  // orgs have zero flat MRR (they pay per booked trip, tracked
  // separately). Trials always count as zero MRR until conversion.
  if (org.status === "Trial") return 0;
  const sm = subscriptionModelById(org.subscriptionModel);
  return sm ? sm.flatMonthly : 0;
}

function recomputeSyncHealthFor(t: SyncTenant): SyncTenant["health"] {
  if (t.devicesOffline === 0 && t.pendingRecords < 100) return "Healthy";
  if (t.pendingRecords > 300 || t.devicesOffline >= 4) return "Critical";
  return "Degraded";
}

export const useSuperadminStore = create<SuperadminState>()(
  persist(
    (set, get) => ({
      orgs: SEED_ORGS,
      users: SEED_USERS,
      invoices: SEED_INVOICES,
      backups: SEED_BACKUPS,
      syncTenants: SEED_SYNC_TENANTS,
      syncQueue: SEED_SYNC_QUEUE,
      conflicts: SEED_SYNC_CONFLICTS,
      auditLog: SEED_AUDIT,
      gateways: SEED_GATEWAYS,
      featureFlags: SEED_FEATURE_FLAGS,
      backupSchedule: SEED_BACKUP_SCHEDULE,

      // ── SLM (Small Language Model agent runtime) ──
      agents: SEED_AGENTS,
      brains: SEED_BRAINS,
      agentRuns: SEED_RUNS,
      agentMemory: SEED_MEMORY,
      pendingApprovals: SEED_APPROVALS,

      // ── Integrations, MCP, API key vault ──
      integrations: SEED_INTEGRATIONS,
      mcpConnections: SEED_MCP_CONNECTIONS,
      apiKeys: SEED_API_KEYS,

      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      // ── Internal staff + RBAC ──
      internalStaff: SEED_INTERNAL_STAFF,
      currentStaff: null,
      adminLogin: (email, roleId) => {
        const role = internalRoleById(roleId) ?? INTERNAL_ROLES[0];
        // Find by email; if not found, create an ad-hoc staff record on the fly
        // (so the demo login still works for any role chip).
        const existing = get().internalStaff.find(
          (s) => s.email.toLowerCase() === email.toLowerCase(),
        );
        const staff: InternalStaff =
          existing ?? {
            id: uid("stf"),
            name: email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            email,
            phone: "",
            roleId,
            departments: role.departments,
            status: "Active",
            twoFactor: true,
            invitedAt: NOW(),
            lastActive: NOW(),
          };
        set((s) => ({
          currentStaff: staff,
          internalStaff: existing ? s.internalStaff : [staff, ...s.internalStaff],
        }));
        const audit = auditEntry(get() as SuperadminState, email, "Admin sign-in", `${role.label} · admin.reanzly.com`, "Internal Team");
        set((s) => ({ auditLog: [audit, ...s.auditLog] }));
      },
      adminLogout: () => {
        const cur = get().currentStaff;
        if (cur) {
          const audit = auditEntry(get() as SuperadminState, cur.email, "Admin sign-out", `${cur.email} · admin.reanzly.com`, "Internal Team");
          set((s) => ({ currentStaff: null, auditLog: [audit, ...s.auditLog] }));
        } else {
          set({ currentStaff: null });
        }
      },
      switchRole: (roleId) => {
        const cur = get().currentStaff;
        if (!cur) return;
        // No-op if the role is the same as the current one.
        if (cur.roleId === roleId) return;
        const prevRole = internalRoleById(cur.roleId);
        const nextRole = internalRoleById(roleId) ?? INTERNAL_ROLES[0];
        // Keep the same staff record but swap roleId + departments to match
        // the new role's defaults. The email/name stay so the audit trail
        // still points at the same human.
        const updated: InternalStaff = {
          ...cur,
          roleId,
          departments: nextRole.departments,
          lastActive: NOW(),
        };
        set((s) => ({
          currentStaff: updated,
          internalStaff: s.internalStaff.map((st) => (st.id === cur.id ? updated : st)),
        }));
        const audit = auditEntry(
          get() as SuperadminState,
          cur.email,
          "Switched role",
          `${prevRole?.label ?? cur.roleId} -> ${nextRole.label}`,
          "Internal Team",
        );
        set((s) => ({ auditLog: [audit, ...s.auditLog] }));
      },
      inviteStaff: (input) => {
        const id = uid("stf");
        const role = internalRoleById(input.roleId) ?? INTERNAL_ROLES[0];
        const newStaff: InternalStaff = {
          id,
          name: input.name,
          email: input.email,
          phone: input.phone,
          roleId: input.roleId,
          departments: input.departments.length ? input.departments : role.departments,
          status: "Invited",
          twoFactor: false,
          invitedAt: NOW(),
          portfolioOrgIds: input.portfolioOrgIds,
        };
        const audit = auditEntry(get() as SuperadminState, get().currentStaff?.email ?? "system", `Invited ${role.label}`, `${id} · ${input.email}`, "Internal Team");
        set((s) => ({
          internalStaff: [newStaff, ...s.internalStaff],
          auditLog: [audit, ...s.auditLog],
        }));
        return id;
      },
      setStaffStatus: (id, status) =>
        set((s) => {
          const st = s.internalStaff.find((x) => x.id === id);
          if (!st) return s;
          const audit = auditEntry(s, s.currentStaff?.email ?? "system", `Set staff status -> ${status}`, `${id} · ${st.email}`, "Internal Team");
          return {
            internalStaff: s.internalStaff.map((x) => (x.id === id ? { ...x, status } : x)),
            auditLog: [audit, ...s.auditLog],
          };
        }),
      setStaffRole: (id, roleId, departments) =>
        set((s) => {
          const st = s.internalStaff.find((x) => x.id === id);
          if (!st) return s;
          const role = internalRoleById(roleId) ?? INTERNAL_ROLES[0];
          const audit = auditEntry(s, s.currentStaff?.email ?? "system", `Updated role -> ${role.label}`, `${id} · ${st.email}`, "Internal Team");
          return {
            internalStaff: s.internalStaff.map((x) =>
              x.id === id ? { ...x, roleId, departments: departments.length ? departments : role.departments } : x,
            ),
            auditLog: [audit, ...s.auditLog],
          };
        }),
      deleteStaff: (id) =>
        set((s) => {
          const st = s.internalStaff.find((x) => x.id === id);
          if (!st) return s;
          const audit = auditEntry(s, s.currentStaff?.email ?? "system", "Removed staff", `${id} · ${st.email}`, "Internal Team");
          return {
            internalStaff: s.internalStaff.filter((x) => x.id !== id),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      canAccess: (view) => {
        const cur = get().currentStaff;
        if (!cur) return "none";
        const role = internalRoleById(cur.roleId);
        if (!role) return "none";
        return role.permissions[view] ?? "none";
      },

      // ── Support tickets ──
      tickets: SEED_TICKETS,
      ticketComments: SEED_TICKET_COMMENTS,
      createTicket: (input) => {
        const id = uid("tkt");
        const year = new Date().getFullYear();
        const seq = String(get().tickets.length + 143).padStart(4, "0");
        const ticketId = `TKT-${year}-${seq}`;
        // SLA: Urgent=1h, High=4h, Medium=24h, Low=72h
        const slaHours = input.priority === "Urgent" ? 1 : input.priority === "High" ? 4 : input.priority === "Medium" ? 24 : 72;
        const newTicket: SupportTicket = {
          id,
          ticketId,
          subject: input.subject,
          description: input.description,
          category: input.category,
          department: input.department,
          priority: input.priority,
          status: "New",
          orgId: input.orgId,
          orgName: input.orgName,
          raisedBy: input.raisedBy,
          raisedByEmail: input.raisedByEmail,
          raisedByPhone: input.raisedByPhone,
          raisedByRole: input.raisedByRole,
          source: input.source,
          createdAt: NOW(),
          updatedAt: NOW(),
          slaDueAt: new Date(Date.now() + slaHours * 3_600_000).toISOString(),
          tags: input.tags ?? [],
        };
        const actor = get().currentStaff?.email ?? input.raisedByEmail;
        const audit = auditEntry(get() as SuperadminState, actor, `Created ticket (${input.priority})`, `${ticketId} · ${input.subject} -> ${input.department}`, "Tickets");
        set((s) => ({
          tickets: [newTicket, ...s.tickets],
          auditLog: [audit, ...s.auditLog],
        }));
        return id;
      },
      assignTicket: (ticketId, staffEmail) =>
        set((s) => {
          const t = s.tickets.find((x) => x.id === ticketId);
          if (!t) return s;
          const audit = auditEntry(s, s.currentStaff?.email ?? "system", `Assigned ticket -> ${staffEmail}`, `${t.ticketId}`, "Tickets");
          return {
            tickets: s.tickets.map((x) =>
              x.id === ticketId ? { ...x, assignedTo: staffEmail, status: x.status === "New" ? "Open" : x.status, updatedAt: NOW() } : x,
            ),
            auditLog: [audit, ...s.auditLog],
          };
        }),
      setTicketStatus: (ticketId, status) =>
        set((s) => {
          const t = s.tickets.find((x) => x.id === ticketId);
          if (!t) return s;
          const audit = auditEntry(s, s.currentStaff?.email ?? "system", `Ticket status -> ${status}`, `${t.ticketId}`, "Tickets");
          return {
            tickets: s.tickets.map((x) =>
              x.id === ticketId
                ? {
                    ...x,
                    status,
                    updatedAt: NOW(),
                    resolvedAt: status === "Resolved" || status === "Closed" ? NOW() : x.resolvedAt,
                  }
                : x,
            ),
            auditLog: [audit, ...s.auditLog],
          };
        }),
      setTicketPriority: (ticketId, priority) =>
        set((s) => {
          const t = s.tickets.find((x) => x.id === ticketId);
          if (!t) return s;
          const audit = auditEntry(s, s.currentStaff?.email ?? "system", `Ticket priority -> ${priority}`, `${t.ticketId}`, "Tickets");
          return {
            tickets: s.tickets.map((x) => (x.id === ticketId ? { ...x, priority, updatedAt: NOW() } : x)),
            auditLog: [audit, ...s.auditLog],
          };
        }),
      routeTicket: (ticketId, department) =>
        set((s) => {
          const t = s.tickets.find((x) => x.id === ticketId);
          if (!t) return s;
          const audit = auditEntry(s, s.currentStaff?.email ?? "system", `Routed ticket -> ${department}`, `${t.ticketId}`, "Tickets");
          return {
            tickets: s.tickets.map((x) => (x.id === ticketId ? { ...x, department, updatedAt: NOW() } : x)),
            auditLog: [audit, ...s.auditLog],
          };
        }),
      addTicketComment: (input) => {
        const c: TicketComment = {
          id: uid("tc"),
          ticketId: input.ticketId,
          author: input.author,
          authorEmail: input.authorEmail,
          authorRole: input.authorRole,
          body: input.body,
          isInternal: input.isInternal,
          createdAt: NOW(),
        };
        set((s) => ({
          ticketComments: [...s.ticketComments, c],
          tickets: s.tickets.map((t) =>
            t.id === input.ticketId ? { ...t, updatedAt: NOW() } : t,
          ),
        }));
      },

      // ── Broadcasts ──
      broadcasts: SEED_BROADCASTS,
      createBroadcast: (input) => {
        const id = uid("bc");
        const actor = get().currentStaff?.email ?? "system";
        const newBc: Broadcast = {
          id,
          subject: input.subject,
          body: input.body,
          audience: input.audience,
          targets: input.targets,
          channels: input.channels,
          status: input.scheduledFor ? "Scheduled" : "Draft",
          sentBy: actor,
          scheduledFor: input.scheduledFor,
          delivery: { total: 0, delivered: 0, opened: 0, failed: 0 },
          createdAt: NOW(),
        };
        const audit = auditEntry(get() as SuperadminState, actor, `Created broadcast (${input.audience})`, `${id} · ${input.subject}`, "Broadcasts");
        set((s) => ({
          broadcasts: [newBc, ...s.broadcasts],
          auditLog: [audit, ...s.auditLog],
        }));
        return id;
      },
      sendBroadcast: (id) =>
        set((s) => {
          const bc = s.broadcasts.find((x) => x.id === id);
          if (!bc) return s;
          // Estimate audience size based on targeting.
          let total = 0;
          if (bc.audience === "all-orgs") {
            total = s.users.length;
          } else if (bc.audience === "by-plan") {
            total = s.users.filter((u) => {
              const org = s.orgs.find((o) => o.id === u.orgId);
              return org && bc.targets.includes(org.plan);
            }).length;
          } else if (bc.audience === "by-org") {
            total = s.users.filter((u) => bc.targets.includes(u.orgId)).length;
          } else if (bc.audience === "by-role") {
            total = s.users.filter((u) => bc.targets.includes(u.role)).length;
          }
          if (total === 0) total = 1; // avoid 0/0
          const delivered = Math.max(1, total - Math.floor(total * 0.02));
          const failed = total - delivered;
          const audit = auditEntry(s, s.currentStaff?.email ?? "system", `Sent broadcast (${bc.audience})`, `${id} · ${bc.subject} -> ${delivered}/${total}`, "Broadcasts");
          return {
            broadcasts: s.broadcasts.map((x) =>
              x.id === id
                ? {
                    ...x,
                    status: "Sent" as BroadcastStatus,
                    sentAt: NOW(),
                    delivery: { total, delivered, opened: 0, failed },
                  }
                : x,
            ),
            auditLog: [audit, ...s.auditLog],
          };
        }),
      deleteBroadcast: (id) =>
        set((s) => {
          const bc = s.broadcasts.find((x) => x.id === id);
          if (!bc) return s;
          const audit = auditEntry(s, s.currentStaff?.email ?? "system", "Deleted broadcast", `${id} · ${bc.subject}`, "Broadcasts");
          return {
            broadcasts: s.broadcasts.filter((x) => x.id !== id),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      // ── Automations ──
      automations: SEED_AUTOMATIONS,
      loopRuns: SEED_LOOP_RUNS,
      toggleAutomation: (id) =>
        set((s) => {
          const au = s.automations.find((x) => x.id === id);
          if (!au) return s;
          const audit = auditEntry(s, s.currentStaff?.email ?? "system", `${au.enabled ? "Disabled" : "Enabled"} automation`, `${id} · ${au.name}`, "Automations");
          return {
            automations: s.automations.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)),
            auditLog: [audit, ...s.auditLog],
          };
        }),
      createAutomation: (input) => {
        const id = uid("au");
        const actor = get().currentStaff?.email ?? "system";
        const newAu: AutomationRecipe = {
          id,
          name: input.name,
          description: input.description,
          trigger: input.trigger,
          actions: input.actions,
          scope: input.scope,
          appliesTo: input.appliesTo,
          enabled: true,
          createdBy: actor,
          createdAt: NOW(),
          triggerCount: 0,
          suggestedForRoles: input.suggestedForRoles ?? [],
          steps: input.steps,
          loopConfig: input.loopConfig ?? { ...DEFAULT_LOOP_CONFIG },
        };
        const audit = auditEntry(get() as SuperadminState, actor, `Created automation (${input.scope})`, `${id} · ${input.name}`, "Automations");
        set((s) => ({
          automations: [newAu, ...s.automations],
          auditLog: [audit, ...s.auditLog],
        }));
        return id;
      },
      updateAutomationSteps: (automationId, steps) =>
        set((s) => {
          const au = s.automations.find((x) => x.id === automationId);
          if (!au) return s;
          const audit = auditEntry(s, s.currentStaff?.email ?? "system", `Updated automation steps`, `${automationId} · ${au.name} · ${steps.length} step(s)`, "Automations");
          return {
            automations: s.automations.map((x) => (x.id === automationId ? { ...x, steps } : x)),
            auditLog: [audit, ...s.auditLog],
          };
        }),
      updateLoopConfig: (automationId, config) =>
        set((s) => {
          const au = s.automations.find((x) => x.id === automationId);
          if (!au) return s;
          const merged = { ...(au.loopConfig ?? DEFAULT_LOOP_CONFIG), ...config };
          const audit = auditEntry(s, s.currentStaff?.email ?? "system", `Updated loop config`, `${automationId} · ${au.name} · max ${merged.maxIterations} iter`, "Automations");
          return {
            automations: s.automations.map((x) => (x.id === automationId ? { ...x, loopConfig: merged } : x)),
            auditLog: [audit, ...s.auditLog],
          };
        }),
      updateAutomationMeta: (automationId, patch) =>
        set((s) => {
          const au = s.automations.find((x) => x.id === automationId);
          if (!au) return s;
          const audit = auditEntry(s, s.currentStaff?.email ?? "system", `Updated automation`, `${automationId} · ${au.name}`, "Automations");
          return {
            automations: s.automations.map((x) => (x.id === automationId ? { ...x, ...patch } : x)),
            auditLog: [audit, ...s.auditLog],
          };
        }),
      testRunAutomation: (automationId) => {
        const au = get().automations.find((x) => x.id === automationId);
        if (!au) return "";
        const cfg = au.loopConfig ?? DEFAULT_LOOP_CONFIG;
        const runId = uid("run");
        const startedAt = Date.now();
        // Build a synthetic loop trace by iterating over the steps.
        // Each step contributes an observe/think/act/reflect quad.
        const steps = au.steps ?? [];
        const trace: import("@/lib/slm/types").LoopTraceEntry[] = [];
        let tokensUsed = 0;
        const iterations = Math.min(cfg.maxIterations, Math.max(1, steps.length || 2));
        for (let i = 1; i <= iterations; i++) {
          const step = steps[i - 1] ?? steps[steps.length - 1];
          trace.push({
            iteration: i,
            phase: "observe" as const,
            timestamp: new Date(startedAt + (i - 1) * 300).toISOString(),
            content:
              i === 1
                ? `Trigger: ${au.trigger.label}. Module: ${au.trigger.module}.`
                : `Observed prior step result. Step ${i - 1} (${steps[i - 2]?.label ?? "-"}).`,
          });
          trace.push({
            iteration: i,
            phase: "think" as const,
            timestamp: new Date(startedAt + (i - 1) * 300 + 80).toISOString(),
            content: step
              ? `Reasoning about step "${step.label}" (kind: ${step.kind}). Deciding whether to execute.`
              : `Iteration ${i}. No further steps; wrapping up.`,
            llmCall: {
              brainId: "brain-local",
              brainName: "Reanzly Local Rules",
              promptTokens: 0,
              completionTokens: 0,
              durationMs: 120,
            },
          });
          if (step) {
            const isAi = step.kind === "ai-step";
            const aiTokens = isAi ? 320 : 0;
            tokensUsed += aiTokens;
            const isGate = step.kind === "approval-gate";
            const requiresApproval =
              isGate || (!cfg.autoExecute && (step.kind === "action" || step.kind === "integration"));
            trace.push({
              iteration: i,
              phase: "act" as const,
              timestamp: new Date(startedAt + (i - 1) * 300 + 200).toISOString(),
              content: `Executing ${step.kind} step: ${step.label}.`,
              toolCall: {
                toolId: (step.config.toolFn as string) ?? `step-${step.kind}`,
                toolName: (step.config.toolFn as string) ?? step.kind,
                args: { ...step.config },
                result: requiresApproval
                  ? "Pending human approval (autoExecute off / approval gate)."
                  : `OK: ${step.kind} step executed.`,
                status: requiresApproval ? "pending-approval" as const : "success" as const,
                durationMs: 180,
              },
            });
          }
          trace.push({
            iteration: i,
            phase: "reflect" as const,
            timestamp: new Date(startedAt + (i - 1) * 300 + 280).toISOString(),
            content: i === iterations ? "Goal satisfied. Halting loop." : "Partial progress. Continuing.",
            decision: i === iterations ? ("stop" as const) : ("continue" as const),
          });
        }
        const hasGate = steps.some((s) => s.kind === "approval-gate");
        const runStatus: AgentRun["status"] = hasGate && !cfg.autoExecute
          ? "awaiting-approval"
          : "succeeded";
        const durationMs = iterations * 300 + 120;
        // Find an agent for the run header. Prefer any ai-step's agentId,
        // otherwise fall back to the first agent in the store.
        const aiStep = steps.find((s) => s.kind === "ai-step");
        const fallbackAgent = get().agents[0];
        const agentId = (aiStep?.config.agentId as string) ?? fallbackAgent?.id ?? "agent-triage";
        const agentName = get().agents.find((a) => a.id === agentId)?.name ?? au.name;
        const run: AgentRun = {
          id: runId,
          agentId,
          agentName,
          status: runStatus,
          trigger: "automation",
          input: `${au.name} - ${au.trigger.label}`,
          output: runStatus === "succeeded"
            ? `Automation completed in ${iterations} iteration(s) across ${steps.length || iterations} step(s).`
            : undefined,
          error: undefined,
          startedAt: new Date(startedAt).toISOString(),
          finishedAt: new Date(startedAt + durationMs).toISOString(),
          durationMs,
          iterations,
          tokensUsed,
          toolCalls: steps.length,
          trace,
          approvals: [],
          scope: au.scope === "platform"
            ? { kind: "platform" }
            : au.scope === "org"
              ? { kind: "org", target: au.appliesTo }
              : { kind: "role", target: au.appliesTo },
          triggeredBy: automationId,
        };
        const summary: LoopRunSummary = {
          automationId,
          runId,
          status: runStatus === "awaiting-approval" ? "awaiting-approval" : "succeeded",
          startedAt: new Date(startedAt).toISOString(),
          finishedAt: new Date(startedAt + durationMs).toISOString(),
          iterations,
          tokensUsed,
          stepCount: steps.length,
        };
        const audit = auditEntry(get() as SuperadminState, get().currentStaff?.email ?? "system", `Test-ran automation`, `${automationId} · ${au.name} · ${runId}`, "Automations");
        set((s) => ({
          agentRuns: [run, ...s.agentRuns].slice(0, 100),
          loopRuns: [summary, ...s.loopRuns].slice(0, 100),
          auditLog: [audit, ...s.auditLog],
        }));
        return runId;
      },
      deleteAutomation: (id) =>
        set((s) => {
          const au = s.automations.find((x) => x.id === id);
          if (!au) return s;
          const audit = auditEntry(s, s.currentStaff?.email ?? "system", "Deleted automation", `${id} · ${au.name}`, "Automations");
          return {
            automations: s.automations.filter((x) => x.id !== id),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      // ── Organizations ──
      createOrg: (form) => {
        const id = uid("org");
        const plan = planById(form.plan);
        const cap = plan ?? PLANS[0];
        const now = NOW();
        const trialEndsAt = new Date(
          new Date(now).getTime() + 15 * 86_400_000,
        ).toISOString();
        // Smart-onboarding: every assisted onboarding starts as a Trial.
        // MRR is zero until the trial converts to paid (see convertToPaid).
        const sm = subscriptionModelById(form.subscriptionModel);
        const newOrg: Org = {
          id,
          legalName: form.legalName,
          brandName: form.brandName || form.legalName,
          gstin: form.gstin,
          industry: form.industry,
          hqCity: form.hqCity,
          timezone: form.timezone,
          currency: form.currency,
          plan: form.plan,
          billingCycle: form.billingCycle,
          paymentMethod: form.paymentMethod,
          status: "Trial",
          createdAt: now,
          mrr: 0,
          branchCount: 1,
          userCount: 1,
          branches: [{ id: uid("br"), name: `${form.hqCity} HQ`, city: form.hqCity, code: form.hqCity.slice(0, 3).toUpperCase() + "-HQ" }],
          enabledModules: form.enabledModules,
          usage: {
            vehiclesUsed: 0,
            vehiclesCap: form.vehicleCap || cap.vehicleCap,
            storageUsedGB: 0,
            storageCapGB: cap.storageGB,
            apiCallsMonth: 0,
            apiCallsCap: cap.apiCallsPerMonth,
          },
          onboardedBy: "Reanzly assisted",
          notes: "Created via assisted onboarding wizard. 7-day trial starts now.",
          // Smart-onboarding context (mirrors the self-serve signup payload):
          businessType: form.businessType,
          selectedModules: form.selectedModules,
          subscriptionModel: form.subscriptionModel,
          directoryOptIn: form.directoryOptIn,
          brokerProfile: form.brokerProfile,
          trialStartedAt: now,
          trialEndsAt,
        };
        const admin: User = {
          id: uid("usr"),
          name: form.adminName,
          email: form.adminEmail,
          phone: form.adminPhone,
          orgId: id,
          role: "Org Admin",
          status: "Invited",
          twoFactor: false,
          invitedAt: NOW(),
          access: MODULES.reduce((acc, m) => {
            acc[m.id] = "write";
            return acc;
          }, {} as Record<string, ModuleAccessLevel>),
        };
        const audit = auditEntry(
          get() as SuperadminState,
          "anand.kumar@reanzly.com",
          `Created org via assisted onboarding · ${sm?.label ?? form.subscriptionModel} · 15d trial`,
          `${id} · ${form.legalName}`,
          "Organizations",
        );
        set((s) => ({
          orgs: [newOrg, ...s.orgs],
          users: [admin, ...s.users],
          auditLog: [audit, ...s.auditLog],
        }));
        return id;
      },

      updateOrg: (id, patch) =>
        set((s) => ({
          orgs: s.orgs.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        })),

      setOrgStatus: (id, status) =>
        set((s) => {
          const org = s.orgs.find((o) => o.id === id);
          if (!org) return s;
          const patch: Partial<Org> = { status };
          if (status === "Active") {
            patch.mrr = recomputeOrgMrr({ ...org, status: "Active" });
          } else if (status === "Suspended") {
            patch.mrr = 0;
          }
          const audit = auditEntry(s, "anand.kumar@reanzly.com", `Set org status → ${status}`, `${id} · ${org.legalName}`, "Organizations");
          return {
            orgs: s.orgs.map((o) => (o.id === id ? { ...o, ...patch } : o)),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      suspendOrg: (id, reason) =>
        set((s) => {
          const org = s.orgs.find((o) => o.id === id);
          if (!org) return s;
          const audit = auditEntry(s, "anand.kumar@reanzly.com", "Suspended org", `${id} · ${org.legalName}${reason ? ` · ${reason}` : ""}`, "Organizations");
          return {
            orgs: s.orgs.map((o) => (o.id === id ? { ...o, status: "Suspended", mrr: 0, notes: reason || o.notes } : o)),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      activateOrg: (id) =>
        set((s) => {
          const org = s.orgs.find((o) => o.id === id);
          if (!org) return s;
          const audit = auditEntry(s, "anand.kumar@reanzly.com", "Activated org", `${id} · ${org.legalName}`, "Organizations");
          return {
            orgs: s.orgs.map((o) =>
              o.id === id ? { ...o, status: "Active", mrr: recomputeOrgMrr({ ...o, status: "Active" }) } : o,
            ),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      approveOrg: (id) =>
        set((s) => {
          const org = s.orgs.find((o) => o.id === id);
          if (!org) return s;
          const plan = planById(org.plan);
          // Smart-onboarding: approvals start a 7-day trial (was 14d
          // pre-redesign). The plan tier is preserved from the signup
          // request - reviewers no longer hardcode to Growth.
          const now = Date.now();
          const audit = auditEntry(
            s,
            "anand.kumar@reanzly.com",
            "Approved self-serve signup · 15d trial",
            `${id} · ${org.legalName}`,
            "Organizations",
          );
          return {
            orgs: s.orgs.map((o) =>
              o.id === id
                ? {
                    ...o,
                    status: "Trial" as OrgStatus,
                    mrr: 0,
                    pendingApprovalAt: undefined,
                    trialStartedAt: o.trialStartedAt ?? new Date(now).toISOString(),
                    trialEndsAt: new Date(now + 15 * 86_400_000).toISOString(),
                    usage: o.usage && plan
                      ? { ...o.usage, vehiclesCap: 50, storageCapGB: 25, apiCallsCap: 50_000 }
                      : o.usage,
                  }
                : o,
            ),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      deleteOrg: (id) =>
        set((s) => {
          const org = s.orgs.find((o) => o.id === id);
          if (!org) return s;
          const audit = auditEntry(s, "anand.kumar@reanzly.com", "Deleted org", `${id} · ${org.legalName}`, "Organizations");
          return {
            orgs: s.orgs.filter((o) => o.id !== id),
            users: s.users.filter((u) => u.orgId !== id),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      toggleOrgModule: (orgId, moduleId) =>
        set((s) => {
          const org = s.orgs.find((o) => o.id === orgId);
          if (!org) return s;
          const has = org.enabledModules.includes(moduleId);
          const next = has
            ? org.enabledModules.filter((m) => m !== moduleId)
            : [...org.enabledModules, moduleId];
          const audit = auditEntry(
            s,
            "anand.kumar@reanzly.com",
            `${has ? "Disabled" : "Enabled"} module · ${MODULES.find((m) => m.id === moduleId)?.label ?? moduleId}`,
            `${orgId} · ${org.legalName}`,
            "Organizations",
          );
          return {
            orgs: s.orgs.map((o) => (o.id === orgId ? { ...o, enabledModules: next } : o)),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      upgradeOrgPlan: (id, plan, cycle) =>
        set((s) => {
          const org = s.orgs.find((o) => o.id === id);
          if (!org) return s;
          const p = planById(plan);
          if (!p) return s;
          const audit = auditEntry(
            s,
            "anand.kumar@reanzly.com",
            `Updated plan · ${org.plan} → ${plan} (${cycle})`,
            `${id} · ${org.legalName}`,
            "Billing",
          );
          return {
            orgs: s.orgs.map((o) =>
              o.id === id
                ? {
                    ...o,
                    plan,
                    billingCycle: cycle,
                    // MRR derives from the subscription model, not the plan tier.
                    // Recompute via recomputeOrgMrr so Trial/Active are both handled.
                    mrr: recomputeOrgMrr({ ...o, plan, billingCycle: cycle }),
                    usage: {
                      ...o.usage,
                      vehiclesCap: p.vehicleCap,
                      storageCapGB: p.storageGB,
                      apiCallsCap: p.apiCallsPerMonth,
                    },
                  }
                : o,
            ),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      // ── Smart-onboarding trial lifecycle ──
      extendTrial: (orgId, days) =>
        set((s) => {
          const org = s.orgs.find((o) => o.id === orgId);
          if (!org) return s;
          const base = org.trialEndsAt
            ? new Date(org.trialEndsAt).getTime()
            : Date.now();
          // If the trial already lapsed, extend from now instead of from
          // the past end date so the reviewer doesn't accidentally gift a
          // negative window.
          const anchor = Math.max(base, Date.now());
          const nextEnd = new Date(anchor + days * 86_400_000).toISOString();
          const audit = auditEntry(
            s,
            "anand.kumar@reanzly.com",
            `Extended trial by ${days}d → ${new Date(nextEnd).toLocaleDateString("en-IN")}`,
            `${orgId} · ${org.legalName}`,
            "Organizations",
          );
          return {
            orgs: s.orgs.map((o) =>
              o.id === orgId
                ? {
                    ...o,
                    trialEndsAt: nextEnd,
                    status: "Trial" as OrgStatus,
                  }
                : o,
            ),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      convertToPaid: (orgId) =>
        set((s) => {
          const org = s.orgs.find((o) => o.id === orgId);
          if (!org) return s;
          const sm = subscriptionModelById(org.subscriptionModel);
          const audit = auditEntry(
            s,
            "anand.kumar@reanzly.com",
            `Converted trial → paid · ${sm?.label ?? org.subscriptionModel}`,
            `${orgId} · ${org.legalName}`,
            "Billing",
          );
          return {
            orgs: s.orgs.map((o) =>
              o.id === orgId
                ? {
                    ...o,
                    status: "Active" as OrgStatus,
                    trialEndsAt: undefined,
                    mrr: recomputeOrgMrr({ ...o, status: "Active" as OrgStatus }),
                  }
                : o,
            ),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      // ── Users ──
      inviteUser: (input) => {
        const id = uid("usr");
        const newUser: User = {
          id,
          name: input.name,
          email: input.email,
          phone: input.phone,
          orgId: input.orgId,
          role: input.role,
          status: "Invited",
          twoFactor: false,
          invitedAt: NOW(),
          access: input.access,
        };
        const org = get().orgs.find((o) => o.id === input.orgId);
        const audit = auditEntry(get() as SuperadminState, "anand.kumar@reanzly.com", "Invited user", `${id} · ${input.email}`, "Users");
        set((s) => ({
          users: [newUser, ...s.users],
          orgs: org
            ? s.orgs.map((o) => (o.id === org.id ? { ...o, userCount: o.userCount + 1 } : o))
            : s.orgs,
          auditLog: [audit, ...s.auditLog],
        }));
        return id;
      },

      setUserStatus: (id, status) =>
        set((s) => {
          const u = s.users.find((x) => x.id === id);
          if (!u) return s;
          const audit = auditEntry(s, "anand.kumar@reanzly.com", `Set user status → ${status}`, `${id} · ${u.email}`, "Users");
          return {
            users: s.users.map((x) => (x.id === id ? { ...x, status } : x)),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      suspendUser: (id) =>
        set((s) => {
          const u = s.users.find((x) => x.id === id);
          if (!u) return s;
          const audit = auditEntry(s, "anand.kumar@reanzly.com", "Suspended user", `${id} · ${u.email}`, "Users");
          return {
            users: s.users.map((x) => (x.id === id ? { ...x, status: "Suspended" } : x)),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      activateUser: (id) =>
        set((s) => {
          const u = s.users.find((x) => x.id === id);
          if (!u) return s;
          const audit = auditEntry(s, "anand.kumar@reanzly.com", "Activated user", `${id} · ${u.email}`, "Users");
          return {
            users: s.users.map((x) => (x.id === id ? { ...x, status: "Active" } : x)),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      resendInvite: (id) =>
        set((s) => {
          const u = s.users.find((x) => x.id === id);
          if (!u) return s;
          const audit = auditEntry(s, "anand.kumar@reanzly.com", "Resent invite", `${id} · ${u.email}`, "Users");
          return {
            users: s.users.map((x) => (x.id === id ? { ...x, invitedAt: NOW() } : x)),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      setModuleAccess: (userId, moduleId, level) =>
        set((s) => ({
          users: s.users.map((u) =>
            u.id === userId ? { ...u, access: { ...u.access, [moduleId]: level } } : u,
          ),
        })),

      deleteUser: (id) =>
        set((s) => {
          const u = s.users.find((x) => x.id === id);
          if (!u) return s;
          const audit = auditEntry(s, "anand.kumar@reanzly.com", "Deleted user", `${id} · ${u.email}`, "Users");
          return {
            users: s.users.filter((x) => x.id !== id),
            orgs: s.orgs.map((o) => (o.id === u.orgId ? { ...o, userCount: Math.max(0, o.userCount - 1) } : o)),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      // ── Billing ──
      retryInvoice: (id) =>
        set((s) => {
          const inv = s.invoices.find((i) => i.id === id);
          if (!inv) return s;
          const audit = auditEntry(s, "anand.kumar@reanzly.com", `Retried invoice (${(inv.retryCount ?? 0) + 1}/3)`, `${id} · ${inv.number}`, "Billing");
          return {
            invoices: s.invoices.map((i) =>
              i.id === id ? { ...i, retryCount: (i.retryCount ?? 0) + 1 } : i,
            ),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      refundInvoice: (id) =>
        set((s) => {
          const inv = s.invoices.find((i) => i.id === id);
          if (!inv) return s;
          const audit = auditEntry(s, "anand.kumar@reanzly.com", "Refunded invoice", `${id} · ${inv.number}`, "Billing");
          return {
            invoices: s.invoices.map((i) => (i.id === id ? { ...i, status: "Refunded" } : i)),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      recordInvoicePayment: (id) =>
        set((s) => {
          const inv = s.invoices.find((i) => i.id === id);
          if (!inv) return s;
          const audit = auditEntry(s, "anand.kumar@reanzly.com", "Recorded manual payment", `${id} · ${inv.number}`, "Billing");
          return {
            invoices: s.invoices.map((i) =>
              i.id === id ? { ...i, status: "Paid", paidAt: NOW(), retryCount: 0 } : i,
            ),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      // ── Backups ──
      runBackup: (type, triggeredBy) => {
        const id = uid("bkp");
        const newBackup: Backup = {
          id,
          startedAt: NOW(),
          type,
          sizeMB: 0,
          status: "Running",
          durationSec: 0,
          triggeredBy,
        };
        set((s) => ({
          backups: [newBackup, ...s.backups],
        }));
        return id;
      },

      finishBackup: (id, status) =>
        set((s) => {
          const audit = auditEntry(s, "anand.kumar@reanzly.com", `Backup ${status.toLowerCase()}`, `${id} · ${s.backups.find((b) => b.id === id)?.type ?? "-"} backup`, "Backups");
          const startMs = new Date(s.backups.find((b) => b.id === id)?.startedAt ?? Date.now()).getTime();
          const dur = Math.max(1, Math.round((Date.now() - startMs) / 1000));
          const sizeMB = status === "Completed"
            ? (s.backups.find((b) => b.id === id)?.type === "Full" ? 4_120 + Math.round(Math.random() * 200) : 160 + Math.round(Math.random() * 40))
            : 0;
          return {
            backups: s.backups.map((b) =>
              b.id === id
                ? {
                    ...b,
                    status,
                    completedAt: NOW(),
                    durationSec: dur,
                    sizeMB,
                  }
                : b,
            ),
            backupSchedule: status === "Completed"
              ? { ...s.backupSchedule, storageUsedGB: Math.min(s.backupSchedule.storageCapGB, s.backupSchedule.storageUsedGB + sizeMB / 1024) }
              : s.backupSchedule,
            auditLog: [audit, ...s.auditLog],
          };
        }),

      restoreBackup: (id) =>
        set((s) => {
          const bkp = s.backups.find((b) => b.id === id);
          if (!bkp) return s;
          const audit = auditEntry(s, "anand.kumar@reanzly.com", `Restored from backup`, `${id} · ${bkp.startedAt}`, "Backups");
          return {
            backups: s.backups.map((b) => (b.id === id ? { ...b, status: "Restored", restoredAt: NOW() } : b)),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      setBackupSchedule: (patch) =>
        set((s) => ({
          backupSchedule: { ...s.backupSchedule, ...patch },
        })),

      exportTenant: (orgId) => {
        const org = get().orgs.find((o) => o.id === orgId);
        const audit = auditEntry(get() as SuperadminState, "anand.kumar@reanzly.com", "Exported tenant data (JSON)", `${orgId} · ${org?.legalName ?? ""}`, "Backups");
        set((s) => ({ auditLog: [audit, ...s.auditLog] }));
      },

      // ── Sync ──
      flushSyncQueue: (orgId) =>
        set((s) => {
          const removed = orgId ? s.syncQueue.filter((q) => q.orgId === orgId) : s.syncQueue;
          const audit = auditEntry(s, "anand.kumar@reanzly.com", `Flushed ${removed.length} sync queue item${removed.length === 1 ? "" : "s"}`, orgId ? orgId : "All tenants", "Offline Sync");
          // Re-compute tenant summaries
          const nextQueue = orgId ? s.syncQueue.filter((q) => q.orgId !== orgId) : [];
          const nextTenants = s.syncTenants.map((t) => {
            if (orgId && t.orgId !== orgId) return t;
            const pending = nextQueue
              .filter((q) => q.orgId === t.orgId)
              .reduce((sum, q) => sum + q.count, 0);
            const next: SyncTenant = { ...t, pendingRecords: pending, lastSyncAt: NOW(), devicesOffline: 0, devicesOnline: t.devicesOffline + t.devicesOnline };
            next.health = recomputeSyncHealthFor(next);
            return next;
          });
          return {
            syncQueue: nextQueue,
            syncTenants: nextTenants,
            auditLog: [audit, ...s.auditLog],
          };
        }),

      resolveConflict: (id, resolution) =>
        set((s) => {
          const cf = s.conflicts.find((c) => c.id === id);
          if (!cf) return s;
          const audit = auditEntry(s, "anand.kumar@reanzly.com", `Resolved sync conflict (${resolution})`, `${id} · ${cf.recordId}`, "Offline Sync");
          return {
            conflicts: s.conflicts.map((c) => (c.id === id ? { ...c, status: resolution } : c)),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      recomputeSyncHealth: () =>
        set((s) => ({
          syncTenants: s.syncTenants.map((t) => ({ ...t, health: recomputeSyncHealthFor(t) })),
        })),

      // ── Settings ──
      setFeatureFlag: (moduleId, enabled) =>
        set((s) => {
          const audit = auditEntry(s, "anand.kumar@reanzly.com", `${enabled ? "Enabled" : "Disabled"} module globally · ${MODULES.find((m) => m.id === moduleId)?.label ?? moduleId}`, "Platform-wide", "Settings");
          return {
            featureFlags: { ...s.featureFlags, [moduleId]: enabled },
            auditLog: [audit, ...s.auditLog],
          };
        }),

      updateGateway: (id, patch) =>
        set((s) => ({
          gateways: s.gateways.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),

      testGateway: (id) =>
        set((s) => {
          const g = s.gateways.find((x) => x.id === id);
          if (!g) return s;
          const audit = auditEntry(s, "anand.kumar@reanzly.com", `Tested ${id === "email" ? "email" : "SMS"} gateway`, `${g.provider} · ${g.fromAddress}`, "Settings");
          return {
            gateways: s.gateways.map((x) =>
              x.id === id ? { ...x, lastTestAt: NOW(), lastTestStatus: "ok" } : x,
            ),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      // ── Audit ──
      addAudit: (entry) =>
        set((s) => ({
          auditLog: [{ ...entry, id: uid("a"), timestamp: NOW() }, ...s.auditLog],
        })),

      // ── SLM: agents ──
      createAgent: (input) => {
        const id = uid("agent");
        const now = NOW();
        const agent: Agent = {
          ...input,
          id,
          createdAt: now,
          updatedAt: now,
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
        };
        const audit = auditEntry(get() as SuperadminState, get().currentStaff?.email ?? "system", "Created SLM agent", `${id} · ${input.name}`, "SLM");
        set((s) => ({ agents: [agent, ...s.agents], auditLog: [audit, ...s.auditLog] }));
        return id;
      },
      updateAgent: (id, patch) =>
        set((s) => {
          const audit = auditEntry(s, s.currentStaff?.email ?? "system", "Updated SLM agent", `${id}`, "SLM");
          return {
            agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: NOW() } : a)),
            auditLog: [audit, ...s.auditLog],
          };
        }),
      setAgentStatus: (id, status) =>
        set((s) => {
          const audit = auditEntry(s, s.currentStaff?.email ?? "system", `Set agent status -> ${status}`, `${id}`, "SLM");
          return {
            agents: s.agents.map((a) => (a.id === id ? { ...a, status, updatedAt: NOW() } : a)),
            auditLog: [audit, ...s.auditLog],
          };
        }),
      deleteAgent: (id) =>
        set((s) => {
          const audit = auditEntry(s, s.currentStaff?.email ?? "system", "Deleted SLM agent", `${id}`, "SLM");
          return { agents: s.agents.filter((a) => a.id !== id), auditLog: [audit, ...s.auditLog] };
        }),
      runAgent: (agentId, input, trigger) => {
        const agent = get().agents.find((a) => a.id === agentId);
        if (!agent) return "";
        const brain = get().brains.find((b) => b.id === agent.brainId) ?? get().brains[0];
        // Simulate the loop. In production this would call /api/slm/run.
        const runId = uid("run");
        const startedAt = Date.now();
        const iterations = Math.min(agent.maxIterations, Math.max(2, Math.floor(Math.random() * 4) + 2));
        const tokensUsed = brain.kind === "local-rules" ? 0 : iterations * Math.floor(agent.stats.avgTokens || 1500);
        const durationMs = Math.floor(agent.stats.avgDurationMs) || 800 + Math.floor(Math.random() * 1200);
        const toolCalls = iterations - 1;
        const trace: import("@/lib/slm/types").LoopTraceEntry[] = [];
        for (let i = 1; i <= iterations; i++) {
          trace.push({
            iteration: i,
            phase: "observe" as const,
            timestamp: new Date(startedAt + (i - 1) * (durationMs / iterations)).toISOString(),
            content: i === 1 ? `Trigger: ${trigger}. Input: "${input.slice(0, 140)}".` : `Observed prior tool result.`,
          });
          trace.push({
            iteration: i,
            phase: "think" as const,
            timestamp: new Date(startedAt + (i - 1) * (durationMs / iterations) + 50).toISOString(),
            content: `Iteration ${i}: reasoning via ${brain.name}.`,
            llmCall: { brainId: brain.id, brainName: brain.name, promptTokens: brain.kind === "local-rules" ? 0 : 180, completionTokens: brain.kind === "local-rules" ? 0 : 80, durationMs: 150 },
          });
          if (i < iterations) {
            trace.push({
              iteration: i,
              phase: "act" as const,
              timestamp: new Date(startedAt + (i - 1) * (durationMs / iterations) + 200).toISOString(),
              content: `Called tool ${agent.toolIds[0] ?? "list_tickets"}.`,
              toolCall: { toolId: agent.toolIds[0] ?? "tool-list-tickets", toolName: "execute", args: {}, result: "OK: executed successfully.", status: "success" as const, durationMs: 200 },
            });
          }
          trace.push({
            iteration: i,
            phase: "reflect" as const,
            timestamp: new Date(startedAt + (i - 1) * (durationMs / iterations) + 400).toISOString(),
            content: i === iterations ? "Goal satisfied. Halting loop." : "Partial progress. Continuing.",
            decision: i === iterations ? ("stop" as const) : ("continue" as const),
          });
        }
        const run: AgentRun = {
          id: runId,
          agentId,
          agentName: agent.name,
          status: "succeeded",
          trigger,
          input,
          output: `Agent completed in ${iterations} iteration(s) with ${toolCalls} tool call(s).`,
          startedAt: new Date(startedAt).toISOString(),
          finishedAt: new Date(startedAt + durationMs).toISOString(),
          durationMs,
          iterations,
          tokensUsed,
          toolCalls,
          trace,
          approvals: [],
          scope: agent.scopes[0] ?? { kind: "platform" },
        };
        const audit = auditEntry(get() as SuperadminState, get().currentStaff?.email ?? "system", `Ran agent ${agent.name}`, `${runId} · ${trigger}`, "SLM");
        set((s) => ({
          agentRuns: [run, ...s.agentRuns].slice(0, 100),
          agents: s.agents.map((a) =>
            a.id === agentId
              ? {
                  ...a,
                  stats: {
                    ...a.stats,
                    totalRuns: a.stats.totalRuns + 1,
                    avgIterations: (a.stats.avgIterations * a.stats.totalRuns + iterations) / (a.stats.totalRuns + 1),
                    avgTokens: brain.kind === "local-rules" ? 0 : (a.stats.avgTokens * a.stats.totalRuns + tokensUsed) / (a.stats.totalRuns + 1),
                    avgDurationMs: (a.stats.avgDurationMs * a.stats.totalRuns + durationMs) / (a.stats.totalRuns + 1),
                    totalToolCalls: a.stats.totalToolCalls + toolCalls,
                    lastRunAt: new Date(startedAt).toISOString(),
                  },
                }
              : a,
          ),
          auditLog: [audit, ...s.auditLog],
        }));
        return runId;
      },
      addAgentRun: (run) => {
        const agent = get().agents.find((a) => a.id === run.agentId);
        const audit = auditEntry(
          get() as SuperadminState,
          get().currentStaff?.email ?? "system",
          `Ran agent ${run.agentName} (${run.source === "real-llm" ? "real LLM" : "simulation"})`,
          `${run.id} · ${run.trigger}`,
          "SLM",
        );
        set((s) => ({
          agentRuns: [run, ...s.agentRuns].slice(0, 100),
          agents: agent
            ? s.agents.map((a) =>
                a.id === agent.id
                  ? {
                      ...a,
                      stats: {
                        ...a.stats,
                        totalRuns: a.stats.totalRuns + 1,
                        lastRunAt: new Date().toISOString(),
                      },
                    }
                  : a,
              )
            : s.agents,
          auditLog: [audit, ...s.auditLog],
        }));
      },
      decideApproval: (approvalId, decision, note) =>
        set((s) => {
          const audit = auditEntry(s, s.currentStaff?.email ?? "system", `${decision === "approved" ? "Approved" : "Denied"} agent approval`, approvalId, "SLM");
          return {
            pendingApprovals: s.pendingApprovals.map((a) =>
              a.id === approvalId
                ? { ...a, status: decision as ApprovalStatus, decidedAt: NOW(), decidedBy: s.currentStaff?.email ?? "system", decisionNote: note }
                : a,
            ),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      // ── API key vault ──
      createApiKey: (input) => {
        const id = uid("key");
        const maskedPreview = input.key.length > 12 ? input.key.slice(0, 4) + "••••" + input.key.slice(-4) : "••••";
        const entry: APIKeyEntry = {
          id,
          label: input.label,
          providerId: input.providerId,
          maskedPreview,
          storedEncrypted: true,
          status: "active",
          scopes: input.scopes,
          createdBy: get().currentStaff?.email ?? "system",
          createdAt: NOW(),
          uses7d: 0,
        };
        const audit = auditEntry(get() as SuperadminState, get().currentStaff?.email ?? "system", "Created API key", `${id} · ${input.label}`, "Integrations");
        set((s) => ({ apiKeys: [entry, ...s.apiKeys], auditLog: [audit, ...s.auditLog] }));
        return id;
      },
      revokeApiKey: (id) =>
        set((s) => {
          const audit = auditEntry(s, s.currentStaff?.email ?? "system", "Revoked API key", id, "Integrations");
          return {
            apiKeys: s.apiKeys.map((k) => (k.id === id ? { ...k, status: "revoked" as APIKeyStatus } : k)),
            auditLog: [audit, ...s.auditLog],
          };
        }),

      // ── Integrations ──
      connectIntegration: (id, apiKeyRef, account) =>
        set((s) => {
          const integ = s.integrations.find((i) => i.id === id);
          const audit = auditEntry(s, s.currentStaff?.email ?? "system", `Connected integration ${integ?.name ?? id}`, id, "Integrations");
          return {
            integrations: s.integrations.map((i) =>
              i.id === id
                ? {
                    ...i,
                    connected: true,
                    apiKeyRef: apiKeyRef ?? i.apiKeyRef,
                    connectedAccount: account ?? i.connectedAccount,
                    oauthStatus: i.authKind === "oauth" ? "connected" : i.oauthStatus,
                    lastSyncedAt: NOW(),
                  }
                : i,
            ),
            auditLog: [audit, ...s.auditLog],
          };
        }),
      disconnectIntegration: (id) =>
        set((s) => {
          const integ = s.integrations.find((i) => i.id === id);
          const audit = auditEntry(s, s.currentStaff?.email ?? "system", `Disconnected integration ${integ?.name ?? id}`, id, "Integrations");
          return {
            integrations: s.integrations.map((i) =>
              i.id === id
                ? { ...i, connected: false, oauthStatus: i.authKind === "oauth" ? "disconnected" : i.oauthStatus, agentEnabled: false }
                : i,
            ),
            auditLog: [audit, ...s.auditLog],
          };
        }),
      setIntegrationAgentEnabled: (id, enabled) =>
        set((s) => ({
          integrations: s.integrations.map((i) => (i.id === id ? { ...i, agentEnabled: enabled } : i)),
        })),

      // ── MCP connections ──
      connectMCP: (id) =>
        set((s) => {
          const mcp = s.mcpConnections.find((m) => m.id === id);
          const audit = auditEntry(s, s.currentStaff?.email ?? "system", `Connected MCP server ${mcp?.name ?? id}`, id, "Integrations");
          return {
            mcpConnections: s.mcpConnections.map((m) =>
              m.id === id ? { ...m, connected: true, healthStatus: "healthy" as const, lastCheckedAt: NOW() } : m,
            ),
            auditLog: [audit, ...s.auditLog],
          };
        }),
      disconnectMCP: (id) =>
        set((s) => ({
          mcpConnections: s.mcpConnections.map((m) => (m.id === id ? { ...m, connected: false } : m)),
        })),
      addMCPConnection: (input) => {
        const id = uid("mcp");
        const conn: MCPConnection = {
          ...input,
          id,
          connected: false,
          tools: [],
          resourcesCount: 0,
          healthStatus: "unknown",
          createdAt: NOW(),
        };
        const audit = auditEntry(get() as SuperadminState, get().currentStaff?.email ?? "system", "Added MCP server", `${id} · ${input.name}`, "Integrations");
        set((s) => ({ mcpConnections: [conn, ...s.mcpConnections], auditLog: [audit, ...s.auditLog] }));
        return id;
      },
      removeMCPConnection: (id) =>
        set((s) => {
          const audit = auditEntry(s, s.currentStaff?.email ?? "system", "Removed MCP server", id, "Integrations");
          return { mcpConnections: s.mcpConnections.filter((m) => m.id !== id), auditLog: [audit, ...s.auditLog] };
        }),
    }),
    {
      name: "reanzly-superadmin",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        orgs: s.orgs,
        users: s.users,
        invoices: s.invoices,
        backups: s.backups,
        syncTenants: s.syncTenants,
        syncQueue: s.syncQueue,
        conflicts: s.conflicts,
        auditLog: s.auditLog,
        gateways: s.gateways,
        featureFlags: s.featureFlags,
        backupSchedule: s.backupSchedule,
        internalStaff: s.internalStaff,
        currentStaff: s.currentStaff,
        tickets: s.tickets,
        ticketComments: s.ticketComments,
        broadcasts: s.broadcasts,
        automations: s.automations,
        loopRuns: s.loopRuns,
        agents: s.agents,
        brains: s.brains,
        agentRuns: s.agentRuns,
        agentMemory: s.agentMemory,
        pendingApprovals: s.pendingApprovals,
        integrations: s.integrations,
        mcpConnections: s.mcpConnections,
        apiKeys: s.apiKeys,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SuperadminState>;
        const base = current as SuperadminState;
        // Backfill smart-onboarding fields on orgs that were persisted
        // before the redesign shipped. Older localStorage snapshots don't
        // carry `businessType` / `selectedModules` / `subscriptionModel`
        // / `directoryOptIn` / `trialStartedAt` - we synthesise sensible
        // defaults so the SuperAdmin views keep rendering.
        const backfilledOrgs = (p.orgs ?? base.orgs).map((o) => {
          if (o.businessType && o.selectedModules && o.subscriptionModel) {
            return o;
          }
          return {
            ...o,
            businessType: o.businessType ?? ("Transport" as BusinessType),
            selectedModules: o.selectedModules ?? [
              "dashboard",
              "trips",
              "operations-hub",
              "lorry-receipts",
              "pod",
              "vehicles",
              "drivers-staff",
              "invoice",
              "payments",
              "reports",
              "chat",
              "documents",
            ],
            subscriptionModel: o.subscriptionModel ?? ("saas" as SubscriptionModel),
            directoryOptIn: o.directoryOptIn ?? false,
            trialStartedAt: o.trialStartedAt ?? o.createdAt,
          };
        });
        return {
          ...base,
          ...p,
          orgs: backfilledOrgs,
          hasHydrated: base.hasHydrated,
        };
      },
    },
  ),
);

/* ============================================================
   Selectors / derived helpers
   ============================================================ */
export function selectOrgById(s: SuperadminState, id: string): Org | undefined {
  return s.orgs.find((o) => o.id === id);
}

export function selectUsersByOrg(s: SuperadminState, orgId: string): User[] {
  return s.users.filter((u) => u.orgId === orgId);
}

export function selectActiveOrgs(s: SuperadminState): Org[] {
  return s.orgs.filter((o) => o.status === "Active");
}

export function computeBillingKPIs(s: SuperadminState) {
  const active = s.orgs.filter((o) => o.status === "Active");
  const mrr = active.reduce((sum, o) => sum + o.mrr, 0);
  const arr = mrr * 12;
  const subs = active.length;
  const churned = s.orgs.filter((o) => o.status === "Suspended").length;
  const churnRate = subs > 0 ? (churned / (subs + churned)) * 100 : 0;
  const arpu = subs > 0 ? mrr / subs : 0;
  return { mrr, arr, subs, churned, churnRate, arpu };
}

export function selectPendingApprovals(s: SuperadminState): Org[] {
  return s.orgs.filter((o) => o.status === "Pending Approval");
}

export function selectSyncKPIs(s: SuperadminState) {
  const offline = s.syncTenants.reduce((sum, t) => sum + t.devicesOffline, 0);
  const pending = s.syncQueue.reduce((sum, q) => sum + q.count, 0);
  const oldest = s.syncQueue.reduce((max, q) => Math.max(max, q.oldestHrs), 0);
  const total = s.syncTenants.reduce((sum, t) => sum + t.devicesOffline + t.devicesOnline, 0);
  const online = total - offline;
  const successRate = total > 0 ? (online / total) * 100 : 100;
  return { offline, pending, oldest, successRate };
}

export function selectTicketKPIs(s: SuperadminState) {
  const open = s.tickets.filter(
    (t) => t.status === "New" || t.status === "Open" || t.status === "In Progress" || t.status === "Waiting on Customer",
  ).length;
  const newCount = s.tickets.filter((t) => t.status === "New").length;
  const urgent = s.tickets.filter(
    (t) => t.priority === "Urgent" && t.status !== "Resolved" && t.status !== "Closed",
  ).length;
  const high = s.tickets.filter(
    (t) => t.priority === "High" && t.status !== "Resolved" && t.status !== "Closed",
  ).length;
  const resolved = s.tickets.filter((t) => t.status === "Resolved" || t.status === "Closed").length;
  const slaBreached = s.tickets.filter(
    (t) => t.status !== "Resolved" && t.status !== "Closed" && new Date(t.slaDueAt).getTime() < Date.now(),
  ).length;
  const deptIds = ["billing", "technical", "onboarding", "account", "security", "product"] as const;
  const byDepartment = deptIds.reduce(
    (acc, dept) => {
      acc[dept] = s.tickets.filter((t) => t.department === dept && t.status !== "Resolved" && t.status !== "Closed").length;
      return acc;
    },
    {} as Record<string, number>,
  );
  return { open, newCount, urgent, high, resolved, slaBreached, byDepartment };
}

export function selectBroadcastKPIs(s: SuperadminState) {
  const sent = s.broadcasts.filter((b) => b.status === "Sent").length;
  const scheduled = s.broadcasts.filter((b) => b.status === "Scheduled").length;
  const draft = s.broadcasts.filter((b) => b.status === "Draft").length;
  const totalRecipients = s.broadcasts.reduce((sum, b) => sum + b.delivery.total, 0);
  const totalOpened = s.broadcasts.reduce((sum, b) => sum + b.delivery.opened, 0);
  const openRate = totalRecipients > 0 ? (totalOpened / totalRecipients) * 100 : 0;
  return { sent, scheduled, draft, totalRecipients, openRate };
}

export function selectAutomationKPIs(s: SuperadminState) {
  const enabled = s.automations.filter((a) => a.enabled).length;
  const disabled = s.automations.length - enabled;
  const totalTriggers = s.automations.reduce((sum, a) => sum + a.triggerCount, 0);
  const byScope = {
    platform: s.automations.filter((a) => a.scope === "platform").length,
    org: s.automations.filter((a) => a.scope === "org").length,
    role: s.automations.filter((a) => a.scope === "role").length,
  };
  return { enabled, disabled, totalTriggers, byScope };
}

export function selectSLMKPIs(s: SuperadminState) {
  const activeAgents = s.agents.filter((a) => a.status === "active").length;
  const totalRuns = s.agentRuns.length;
  const succeededRuns = s.agentRuns.filter((r) => r.status === "succeeded").length;
  const successRate = totalRuns > 0 ? Math.round((succeededRuns / totalRuns) * 100) : 0;
  const pendingApprovals = s.pendingApprovals.filter((a) => a.status === "pending").length;
  const totalTokens = s.agentRuns.reduce((sum, r) => sum + r.tokensUsed, 0);
  const totalToolCalls = s.agentRuns.reduce((sum, r) => sum + r.toolCalls, 0);
  const connectedBrains = s.brains.filter((b) => b.status === "connected").length;
  return { activeAgents, totalRuns, successRate, pendingApprovals, totalTokens, totalToolCalls, connectedBrains };
}

export function selectIntegrationKPIs(s: SuperadminState) {
  const connected = s.integrations.filter((i) => i.connected).length;
  const total = s.integrations.length;
  const agentEnabled = s.integrations.filter((i) => i.agentEnabled).length;
  const mcpConnected = s.mcpConnections.filter((m) => m.connected).length;
  const mcpTotal = s.mcpConnections.length;
  const mcpTools = s.mcpConnections.filter((m) => m.connected).reduce((sum, m) => sum + m.tools.length, 0);
  const activeKeys = s.apiKeys.filter((k) => k.status === "active").length;
  const keyUses7d = s.apiKeys.reduce((sum, k) => sum + (k.uses7d ?? 0), 0);
  return { connected, total, agentEnabled, mcpConnected, mcpTotal, mcpTools, activeKeys, keyUses7d };
}

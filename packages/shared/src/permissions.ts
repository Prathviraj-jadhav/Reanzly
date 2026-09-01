/** Role → module permission lists (mirrors apps/web/src/lib/mock-data.ts ROLE_ARCHETYPES). */
const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  superadmin: [
    "dashboard", "superadmin", "reports", "settings", "system-design",
    "access-matrix", "automation", "chat",
  ],
  owner: ["*"],
  "ops-manager": [
    "dashboard", "operations-hub", "trips", "fleet-map", "vehicles",
    "lorry-receipts", "inspection", "issues", "maintenance", "fuel-energy",
    "reminders", "documents", "document-studio", "reports", "chat",
    "pod", "rate-cards", "warehouse", "compliance", "settings",
  ],
  "fleet-manager": [
    "dashboard", "vehicles", "maintenance", "services", "inspection",
    "issues", "fuel-energy", "reminders", "documents", "document-studio", "reports", "chat",
    "workshop", "compliance", "field-service", "operations-hub", "settings",
  ],
  "finance-manager": [
    "dashboard", "invoice", "expenses", "payments", "reports", "documents", "document-studio", "chat",
    "financial-ops", "rate-cards", "payroll", "compliance", "ledger", "settings",
  ],
  dispatcher: [
    "dashboard", "trips", "fleet-map", "vehicles", "lorry-receipts", "issues", "chat", "pod",
  ],
  driver: ["dashboard", "trips", "documents", "document-studio", "chat", "pod"],
  analyst: [
    "dashboard", "reports", "system-design", "chat",
    "pod", "rate-cards", "financial-ops", "warehouse", "compliance",
    "workshop", "access-matrix",
  ],
  "warehouse-manager": [
    "dashboard", "warehouse", "pod", "lorry-receipts", "documents",
    "document-studio", "reports", "chat", "trips", "vehicles",
  ],
  customer: [
    "dashboard", "trips", "fleet-map", "invoice", "pod", "documents", "document-studio", "reports", "chat",
  ],
  broker: [
    "dashboard", "trips", "customers", "vendors", "rate-cards", "reports", "chat",
    "vehicles", "broker-console", "broker-marketplace", "broker-settlements", "crm",
  ],
  "safety-officer": [
    "dashboard", "compliance", "inspection", "issues", "documents",
    "document-studio", "reports", "chat", "drivers-staff", "vehicles",
  ],
  mechanic: [
    "dashboard", "workshop", "maintenance", "issues", "fuel-energy",
    "documents", "document-studio", "chat", "field-service", "operations-hub", "vehicles",
  ],
  "branch-manager": [
    "dashboard", "trips", "vehicles", "drivers-staff", "invoice",
    "expenses", "payments", "customers", "reports", "chat",
    "rate-cards", "compliance", "ledger", "crm",
  ],
  accountant: [
    "dashboard", "financial-ops", "invoice", "expenses", "payments",
    "compliance", "reports", "documents", "document-studio", "chat", "ledger",
  ],
  "hr-manager": [
    "dashboard", "hr", "drivers-staff", "payroll", "documents", "document-studio", "reports", "chat",
  ],
  "warehouse-crew": ["dashboard", "warehouse", "pod", "documents", "chat"],
};

/** Mirrors apps/web/src/lib/permissions.ts MODULE_PARENT. */
export const MODULE_PARENT: Record<string, string> = {
  inspection: "vehicles",
  issues: "vehicles",
  maintenance: "vehicles",
  workshop: "vehicles",
  services: "vehicles",
  "fuel-energy": "vehicles",
  compliance: "vehicles",
  quality: "vehicles",
  "rate-cards": "invoice",
  approvals: "expenses",
  purchase: "vendors",
  subscriptions: "settings",
  "access-matrix": "settings",
  automation: "settings",
  "system-design": "settings",
  customers: "crm",
  vendors: "crm",
  helpdesk: "crm",
  marketing: "crm",
  surveys: "crm",
  "drivers-staff": "hr",
  payroll: "hr",
  knowledge: "documents",
  planning: "operations-hub",
  "field-service": "operations-hub",
};

function rolePermissions(roleId: string): readonly string[] {
  return ROLE_PERMISSIONS[roleId] ?? [];
}

/** True if this role can reach `moduleId`, directly, via cluster parent, or via cluster child. */
export function hasModuleAccess(roleId: string, moduleId: string): boolean {
  const permissions = rolePermissions(roleId);
  if (permissions.includes("*")) return true;
  if (permissions.includes(moduleId)) return true;
  const parent = MODULE_PARENT[moduleId];
  if (parent && permissions.includes(parent)) return true;
  for (const [child, childParent] of Object.entries(MODULE_PARENT)) {
    if (childParent === moduleId && permissions.includes(child)) return true;
  }
  return false;
}

export function moduleAccessDeniedMessage(): string {
  return "Your role does not have access to this module.";
}

import type { ModuleId, SettingsTab, ViewState } from "@/lib/store/app-store";
import { isValidLedgerSlug, ledgerSlugToTab, ledgerTabToSlug } from "./ledger-subviews";

/** All 54 ModuleId union members — source of truth for registry completeness. */
export const ALL_MODULE_IDS: readonly ModuleId[] = [
  "dashboard",
  "operations-hub",
  "trips",
  "fleet-map",
  "vehicles",
  "lorry-receipts",
  "invoice",
  "expenses",
  "payments",
  "customers",
  "vendors",
  "drivers-staff",
  "inspection",
  "issues",
  "maintenance",
  "services",
  "fuel-energy",
  "reminders",
  "documents",
  "reports",
  "settings",
  "automation",
  "system-design",
  "pod",
  "rate-cards",
  "financial-ops",
  "warehouse",
  "compliance",
  "payroll",
  "workshop",
  "access-matrix",
  "chat",
  "superadmin",
  "crm",
  "hr",
  "ledger",
  "broker-console",
  "broker-marketplace",
  "broker-settlements",
  "document-studio",
  "integrations",
  "helpdesk",
  "field-service",
  "approvals",
  "knowledge",
  "planning",
  "purchase",
  "quality",
  "subscriptions",
  "surveys",
  "marketing",
  "app-store",
  "partner-programme",
  "financial-services",
] as const;

export interface ParsedModulePath {
  module: ModuleId;
  view: ViewState["view"];
  id?: string;
  tab?: string;
  settingsTab?: SettingsTab;
}

/** List-level base paths per ModuleId (B0R-0 URL map). */
export const MODULE_BASE_PATH: Record<ModuleId, string> = {
  dashboard: "/app/dashboard",
  "operations-hub": "/app/operations",
  trips: "/app/trips",
  "fleet-map": "/app/fleet-map",
  vehicles: "/app/vehicles",
  "lorry-receipts": "/app/lorry-receipts",
  invoice: "/app/invoice",
  expenses: "/app/expenses",
  payments: "/app/payments",
  customers: "/app/customers",
  vendors: "/app/vendors",
  "drivers-staff": "/app/drivers",
  inspection: "/app/inspection",
  issues: "/app/issues",
  maintenance: "/app/maintenance",
  services: "/app/services",
  "fuel-energy": "/app/fuel",
  reminders: "/app/reminders",
  documents: "/app/documents",
  reports: "/app/reports",
  settings: "/app/settings",
  automation: "/app/automation",
  "system-design": "/app/system-design",
  pod: "/app/pod",
  "rate-cards": "/app/rate-cards",
  "financial-ops": "/app/ledger/treasury",
  warehouse: "/app/warehouse",
  compliance: "/app/compliance",
  payroll: "/app/payroll",
  workshop: "/app/workshop",
  "access-matrix": "/app/settings/access-matrix",
  chat: "/app/chat",
  superadmin: "/app/superadmin",
  crm: "/app/crm",
  hr: "/app/hr",
  ledger: "/app/ledger",
  "broker-console": "/app/broker/console",
  "broker-marketplace": "/app/broker/marketplace",
  "broker-settlements": "/app/broker/settlements",
  "document-studio": "/app/document-studio",
  integrations: "/app/integrations",
  helpdesk: "/app/helpdesk",
  "field-service": "/app/field-service",
  approvals: "/app/approvals",
  knowledge: "/app/knowledge",
  planning: "/app/planning",
  purchase: "/app/purchase",
  quality: "/app/quality",
  subscriptions: "/app/settings/subscriptions",
  surveys: "/app/surveys",
  marketing: "/app/marketing",
  "app-store": "/app/integrations",
  "partner-programme": "/app/partner-programme",
  "financial-services": "/app/financial-services",
};

/** Modules whose list-level `tab` param becomes a nested path segment. */
const MODULE_TAB_ROUTES = new Set<ModuleId>([
  "warehouse",
  "crm",
  "hr",
  "payroll",
  "ledger",
  "compliance",
  "settings",
  "reports",
  "planning",
]);

const SLUG_TO_MODULE: Record<string, ModuleId> = (() => {
  const map: Record<string, ModuleId> = {};
  for (const id of ALL_MODULE_IDS) {
    if (id === "app-store") continue;
    const slug = MODULE_BASE_PATH[id].replace(/^\/app\//, "");
    map[slug] = id;
  }
  return map;
})();

const LIST_PATH_TO_MODULE: Record<string, ModuleId> = (() => {
  const map: Record<string, ModuleId> = {};
  for (const id of ALL_MODULE_IDS) {
    if (id === "app-store" || id === "financial-ops") continue;
    map[MODULE_BASE_PATH[id]] = id;
  }
  return map;
})();

export function resolveModuleAlias(module: ModuleId): ModuleId {
  if (module === "financial-ops") return "ledger";
  if (module === "app-store") return "integrations";
  return module;
}

export function moduleToPath(
  module: ModuleId,
  view: ViewState["view"] = "list",
  id?: string,
  tab?: string,
): string {
  if (module === "financial-ops") {
    return MODULE_BASE_PATH["financial-ops"];
  }

  const resolved = resolveModuleAlias(module);
  const base = MODULE_BASE_PATH[resolved];

  if (view === "create") {
    return `${base}/new`;
  }

  if (view === "detail" && id) {
    if (resolved === "operations-hub") {
      const taskBase = `${base}/tasks/${encodeURIComponent(id)}`;
      return tab ? `${taskBase}/${tab}` : taskBase;
    }
    const detailBase = `${base}/${encodeURIComponent(id)}`;
    if ((resolved === "vehicles" || resolved === "inspection") && tab) {
      return `${detailBase}?tab=${encodeURIComponent(tab)}`;
    }
    if (resolved === "approvals" && tab) {
      return `${detailBase}?tab=${encodeURIComponent(tab)}`;
    }
    return tab ? `${detailBase}/${tab}` : detailBase;
  }

  if (resolved === "fleet-map" && view === "list" && id) {
    return `${base}?vehicle=${encodeURIComponent(id)}`;
  }

  if (resolved === "ledger" && tab) {
    const slug = ledgerTabToSlug(tab);
    if (!slug) return base;
    return `${base}/${slug}`;
  }

  if (tab && MODULE_TAB_ROUTES.has(resolved)) {
    if (resolved === "compliance" && tab === "calendar") {
      return base;
    }
    return `${base}/${tab}`;
  }

  if (tab && resolved === "approvals") {
    return id ? `${base}/${encodeURIComponent(id)}?tab=${encodeURIComponent(tab)}` : `${base}?tab=${encodeURIComponent(tab)}`;
  }

  return base;
}

function normalizePathname(pathname: string): string {
  const withoutQuery = pathname.split("?")[0] ?? pathname;
  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery || "/";
}

function parseSettingsTab(value: string): SettingsTab | undefined {
  const allowed: SettingsTab[] = [
    "profile",
    "notifications",
    "login",
    "appearance",
    "access-security",
    "organization",
    "data-management",
    "companies",
    "access-matrix",
    "integrations",
    "billing",
  ];
  return allowed.includes(value as SettingsTab) ? (value as SettingsTab) : undefined;
}

/**
 * Reverse mapping from an `/app/*` pathname to module navigation state.
 * Returns `null` for paths outside `/app` or unknown module URLs.
 */
export function pathToModule(pathname: string, searchParams?: URLSearchParams): ParsedModulePath | null {
  const path = normalizePathname(pathname);
  if (!path.startsWith("/app")) return null;

  if (path === "/app") {
    return { module: "dashboard", view: "list" };
  }

  if (path === MODULE_BASE_PATH["financial-ops"]) {
    return { module: "ledger", view: "list", tab: "treasury-ops" };
  }

  const exact = LIST_PATH_TO_MODULE[path];
  if (exact) {
    if (exact === "fleet-map") {
      const vehicle = searchParams?.get("vehicle") ?? undefined;
      return { module: exact, view: "list", id: vehicle || undefined };
    }
    return { module: exact, view: "list" };
  }

  const segments = path.replace(/^\/app\/?/, "").split("/").filter(Boolean);
  if (segments.length === 0) {
    return { module: "dashboard", view: "list" };
  }

  const slug = segments.join("/");

  if (segments[segments.length - 1] === "new") {
    const listSlug = segments.slice(0, -1).join("/");
    const mod = SLUG_TO_MODULE[listSlug];
    if (mod) return { module: mod, view: "create" };
  }

  if (segments[0] === "operations" && segments[1] === "tasks" && segments[2]) {
    return {
      module: "operations-hub",
      view: "detail",
      id: decodeURIComponent(segments[2]),
      tab: segments[3] ? decodeURIComponent(segments[3]) : undefined,
    };
  }

  if (segments[0] === "settings" && segments.length === 2) {
    const section = segments[1]!;
    if (section === "access-matrix") {
      return { module: "access-matrix", view: "list" };
    }
    if (section === "subscriptions") {
      return { module: "subscriptions", view: "list" };
    }
    const settingsTab = parseSettingsTab(section);
    if (settingsTab) {
      return { module: "settings", view: "list", tab: section, settingsTab };
    }
  }

  if (segments[0] === "settings" && segments[1] === "subscriptions" && segments[2]) {
    return {
      module: "subscriptions",
      view: "detail",
      id: decodeURIComponent(segments[2]),
    };
  }

  if (segments[0] === "broker" && segments.length === 2) {
    const brokerMap: Record<string, ModuleId> = {
      console: "broker-console",
      marketplace: "broker-marketplace",
      settlements: "broker-settlements",
    };
    const mod = brokerMap[segments[1]!];
    if (mod) return { module: mod, view: "list" };
  }

  if (segments[0] === "ledger" && segments.length === 2) {
    const slug = segments[1]!;
    if (!isValidLedgerSlug(slug)) return null;
    return { module: "ledger", view: "list", tab: ledgerSlugToTab(slug) };
  }

  const twoSegmentSlug = segments.slice(0, 2).join("/");
  const twoSegmentModule = SLUG_TO_MODULE[twoSegmentSlug];
  if (twoSegmentModule && segments.length >= 3) {
    const tail = segments[2]!;
    if (MODULE_TAB_ROUTES.has(twoSegmentModule) && segments.length === 3) {
      return { module: twoSegmentModule, view: "list", tab: tail };
    }
    return {
      module: twoSegmentModule,
      view: "detail",
      id: decodeURIComponent(tail),
      tab: segments[3] ? decodeURIComponent(segments[3]) : undefined,
    };
  }

  const oneSegmentModule = SLUG_TO_MODULE[segments[0]!];
  if (oneSegmentModule && segments.length === 2) {
    const tail = segments[1]!;
    if (MODULE_TAB_ROUTES.has(oneSegmentModule)) {
      return { module: oneSegmentModule, view: "list", tab: tail };
    }
    if (oneSegmentModule === "vehicles" || oneSegmentModule === "inspection") {
      const tab = searchParams?.get("tab") ?? undefined;
      return {
        module: oneSegmentModule,
        view: "detail",
        id: decodeURIComponent(tail),
        tab: tab || undefined,
      };
    }
    if (oneSegmentModule === "approvals") {
      const tab = searchParams?.get("tab") ?? undefined;
      return {
        module: oneSegmentModule,
        view: "detail",
        id: decodeURIComponent(tail),
        tab: tab || undefined,
      };
    }
    return {
      module: oneSegmentModule,
      view: "detail",
      id: decodeURIComponent(tail),
    };
  }

  if (oneSegmentModule && segments.length === 3) {
    return {
      module: oneSegmentModule,
      view: "detail",
      id: decodeURIComponent(segments[1]!),
      tab: decodeURIComponent(segments[2]!),
    };
  }

  if (oneSegmentModule && segments.length === 1) {
    return { module: oneSegmentModule, view: "list" };
  }

  if (SLUG_TO_MODULE[slug]) {
    return { module: SLUG_TO_MODULE[slug]!, view: "list" };
  }

  if (searchParams?.get("tab") && oneSegmentModule === "approvals") {
    return {
      module: "approvals",
      view: segments[1] ? "detail" : "list",
      id: segments[1] ? decodeURIComponent(segments[1]) : undefined,
      tab: searchParams.get("tab") ?? undefined,
    };
  }

  return null;
}

import type { AdminSubView } from "@/components/modules/superadmin/_data";
import type { VendorSubView } from "@/components/modules/vendor-portal/_helpers";
import type { Tab as DriverFieldTab } from "@/components/modules/driver-field";
import type { Tab as WarehouseFieldTab } from "@/components/modules/warehouse-field";

/** Reanzly internal admin portal sub-views (SuperAdminShell). */
export type AdminView = AdminSubView;

/** Freight broker portal sub-views (BrokerShell — not desktop /app/broker/*). */
export type BrokerView =
  | "overview"
  | "enquiries"
  | "marketplace"
  | "quotes"
  | "analytics"
  | "sub-brokers"
  | "lane-coverage"
  | "rate-card"
  | "settlements"
  | "ledger"
  | "payouts"
  | "tax-tds"
  | "compliance"
  | "directory-listing"
  | "bank-details"
  | "documents"
  | "support"
  | "settings";

/** Vendor portal sub-views (VendorShell). */
export type VendorView = VendorSubView;

export type { DriverFieldTab, WarehouseFieldTab };

export const ADMIN_BASE_PATH = "/admin";
export const BROKER_PORTAL_BASE_PATH = "/broker";
export const VENDOR_BASE_PATH = "/vendor";
export const DRIVER_FIELD_BASE_PATH = "/field/driver";
export const WAREHOUSE_FIELD_BASE_PATH = "/field/warehouse";

export const ADMIN_DEFAULT_VIEW: AdminView = "overview";
export const BROKER_DEFAULT_VIEW: BrokerView = "overview";
export const VENDOR_DEFAULT_VIEW: VendorView = "overview";
export const DRIVER_DEFAULT_TAB: DriverFieldTab = "home";
export const WAREHOUSE_DEFAULT_TAB: WarehouseFieldTab = "home";

export const ADMIN_VIEWS: readonly AdminView[] = [
  "overview",
  "tickets",
  "broadcasts",
  "field-service",
  "internal-team",
  "organizations",
  "users",
  "billing",
  "automations",
  "slm",
  "integrations",
  "neural-core",
  "marketplace",
  "knowledge",
  "developer-api",
  "sync",
  "backups",
  "audit",
  "compliance",
  "settings",
] as const;

export const BROKER_VIEWS: readonly BrokerView[] = [
  "overview",
  "enquiries",
  "marketplace",
  "quotes",
  "analytics",
  "sub-brokers",
  "lane-coverage",
  "rate-card",
  "settlements",
  "ledger",
  "payouts",
  "tax-tds",
  "compliance",
  "directory-listing",
  "bank-details",
  "documents",
  "support",
  "settings",
] as const;

export const VENDOR_VIEWS: readonly VendorView[] = [
  "overview",
  "shipments",
  "tracking",
  "pods",
  "analytics",
  "rfq",
  "marketplace",
  "invoices",
  "ledger",
  "documents",
  "profile",
  "support",
] as const;

export const DRIVER_FIELD_TABS: readonly DriverFieldTab[] = [
  "home",
  "trips",
  "capture",
  "records",
  "earnings",
  "profile",
] as const;

export const WAREHOUSE_FIELD_TABS: readonly WarehouseFieldTab[] = [
  "home",
  "tasks",
  "capture",
  "records",
  "profile",
] as const;

const ADMIN_VIEW_SET = new Set<string>(ADMIN_VIEWS);
const BROKER_VIEW_SET = new Set<string>(BROKER_VIEWS);
const VENDOR_VIEW_SET = new Set<string>(VENDOR_VIEWS);
const DRIVER_TAB_SET = new Set<string>(DRIVER_FIELD_TABS);
const WAREHOUSE_TAB_SET = new Set<string>(WAREHOUSE_FIELD_TABS);

function normalizePathname(pathname: string): string {
  const withoutQuery = pathname.split("?")[0] ?? pathname;
  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery || "/";
}

export function isValidAdminView(view: string): view is AdminView {
  return ADMIN_VIEW_SET.has(view);
}

export function isValidBrokerView(view: string): view is BrokerView {
  return BROKER_VIEW_SET.has(view);
}

export function isValidVendorView(view: string): view is VendorView {
  return VENDOR_VIEW_SET.has(view);
}

export function isValidDriverFieldTab(tab: string): tab is DriverFieldTab {
  return DRIVER_TAB_SET.has(tab);
}

export function isValidWarehouseFieldTab(tab: string): tab is WarehouseFieldTab {
  return WAREHOUSE_TAB_SET.has(tab);
}

export function adminViewToPath(view: AdminView = ADMIN_DEFAULT_VIEW): string {
  return view === ADMIN_DEFAULT_VIEW ? ADMIN_BASE_PATH : `${ADMIN_BASE_PATH}/${view}`;
}

export function brokerViewToPath(view: BrokerView = BROKER_DEFAULT_VIEW): string {
  return view === BROKER_DEFAULT_VIEW ? BROKER_PORTAL_BASE_PATH : `${BROKER_PORTAL_BASE_PATH}/${view}`;
}

export function vendorViewToPath(view: VendorView = VENDOR_DEFAULT_VIEW): string {
  return view === VENDOR_DEFAULT_VIEW ? VENDOR_BASE_PATH : `${VENDOR_BASE_PATH}/${view}`;
}

export function driverTabToPath(tab: DriverFieldTab = DRIVER_DEFAULT_TAB): string {
  return tab === DRIVER_DEFAULT_TAB ? DRIVER_FIELD_BASE_PATH : `${DRIVER_FIELD_BASE_PATH}/${tab}`;
}

export function warehouseTabToPath(tab: WarehouseFieldTab = WAREHOUSE_DEFAULT_TAB): string {
  return tab === WAREHOUSE_DEFAULT_TAB
    ? WAREHOUSE_FIELD_BASE_PATH
    : `${WAREHOUSE_FIELD_BASE_PATH}/${tab}`;
}

export function pathToAdminView(pathname: string): AdminView | null {
  const path = normalizePathname(pathname);
  if (path === ADMIN_BASE_PATH) return ADMIN_DEFAULT_VIEW;
  if (!path.startsWith(`${ADMIN_BASE_PATH}/`)) return null;
  const view = path.slice(ADMIN_BASE_PATH.length + 1);
  return isValidAdminView(view) ? view : null;
}

export function pathToBrokerView(pathname: string): BrokerView | null {
  const path = normalizePathname(pathname);
  if (path === BROKER_PORTAL_BASE_PATH) return BROKER_DEFAULT_VIEW;
  if (!path.startsWith(`${BROKER_PORTAL_BASE_PATH}/`)) return null;
  const view = path.slice(BROKER_PORTAL_BASE_PATH.length + 1);
  return isValidBrokerView(view) ? view : null;
}

export function pathToVendorView(pathname: string): VendorView | null {
  const path = normalizePathname(pathname);
  if (path === VENDOR_BASE_PATH) return VENDOR_DEFAULT_VIEW;
  if (!path.startsWith(`${VENDOR_BASE_PATH}/`)) return null;
  const view = path.slice(VENDOR_BASE_PATH.length + 1);
  return isValidVendorView(view) ? view : null;
}

export function pathToDriverFieldTab(pathname: string): DriverFieldTab | null {
  const path = normalizePathname(pathname);
  if (path === DRIVER_FIELD_BASE_PATH) return DRIVER_DEFAULT_TAB;
  if (!path.startsWith(`${DRIVER_FIELD_BASE_PATH}/`)) return null;
  const tab = path.slice(DRIVER_FIELD_BASE_PATH.length + 1);
  return isValidDriverFieldTab(tab) ? tab : null;
}

export function pathToWarehouseFieldTab(pathname: string): WarehouseFieldTab | null {
  const path = normalizePathname(pathname);
  if (path === WAREHOUSE_FIELD_BASE_PATH) return WAREHOUSE_DEFAULT_TAB;
  if (!path.startsWith(`${WAREHOUSE_FIELD_BASE_PATH}/`)) return null;
  const tab = path.slice(WAREHOUSE_FIELD_BASE_PATH.length + 1);
  return isValidWarehouseFieldTab(tab) ? tab : null;
}

/** Portal route prefixes guarded by middleware (B0R-7). */
export const PORTAL_ROUTE_PREFIXES = [
  ADMIN_BASE_PATH,
  BROKER_PORTAL_BASE_PATH,
  VENDOR_BASE_PATH,
  DRIVER_FIELD_BASE_PATH,
  WAREHOUSE_FIELD_BASE_PATH,
] as const;

export function isPortalPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return PORTAL_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

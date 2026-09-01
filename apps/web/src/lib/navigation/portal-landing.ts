import type { PortalType } from "@/lib/store/app-store";
import {
  ADMIN_BASE_PATH,
  BROKER_PORTAL_BASE_PATH,
  DRIVER_FIELD_BASE_PATH,
  VENDOR_BASE_PATH,
  WAREHOUSE_FIELD_BASE_PATH,
} from "./portal-paths";
import { DASHBOARD_ROUTE } from "./routing-config";

/**
 * Canonical post-login landing route per portal / role (B0R-7).
 * Tenant desktop users land on `/app/dashboard`.
 */
export function getPortalLandingRoute(portal: PortalType, roleId: string): string {
  if (roleId === "superadmin" || portal === "superadmin") return ADMIN_BASE_PATH;
  if (portal === "broker" || roleId === "broker") return BROKER_PORTAL_BASE_PATH;
  if (portal === "vendor" || roleId === "customer") return VENDOR_BASE_PATH;
  if (roleId === "warehouse-crew") return WAREHOUSE_FIELD_BASE_PATH;
  if (portal === "driver" || roleId === "driver") return DRIVER_FIELD_BASE_PATH;
  return DASHBOARD_ROUTE;
}

export type PortalRouteKind = "admin" | "broker" | "vendor" | "driver" | "warehouse";

export function portalKindForPath(pathname: string): PortalRouteKind | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (pathname === "/broker" || pathname.startsWith("/broker/")) return "broker";
  if (pathname === "/vendor" || pathname.startsWith("/vendor/")) return "vendor";
  if (pathname === "/field/driver" || pathname.startsWith("/field/driver/")) return "driver";
  if (pathname === "/field/warehouse" || pathname.startsWith("/field/warehouse/")) {
    return "warehouse";
  }
  return null;
}

export function canAccessPortalKind(
  kind: PortalRouteKind,
  portal: PortalType,
  roleId: string,
): boolean {
  switch (kind) {
    case "admin":
      return roleId === "superadmin" || portal === "superadmin";
    case "broker":
      return portal === "broker" || roleId === "broker";
    case "vendor":
      return portal === "vendor" || roleId === "customer";
    case "driver":
      return portal === "driver" || roleId === "driver";
    case "warehouse":
      return roleId === "warehouse-crew";
    default:
      return false;
  }
}

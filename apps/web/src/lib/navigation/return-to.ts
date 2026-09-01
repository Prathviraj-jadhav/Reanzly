import type { PortalType } from "@/lib/store/app-store";
import { DASHBOARD_ROUTE } from "./routing-config";
import {
  canAccessPortalKind,
  getPortalLandingRoute,
  portalKindForPath,
} from "./portal-landing";
import { isPortalPath } from "./portal-paths";

/**
 * Validates a post-login return URL. Rejects open redirects, external targets,
 * and cross-portal paths that do not match the signed-in portal/role.
 */
export function validateReturnTo(
  value: string | null | undefined,
  fallback: string = DASHBOARD_ROUTE,
  portal: PortalType = "app",
  roleId: string = "owner",
): string {
  if (!value || typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://") || trimmed.includes("\\") || trimmed.includes("@")) {
    return fallback;
  }

  if (!/^\/[\w\-./?=&%]*$/.test(trimmed)) return fallback;

  const pathOnly = trimmed.split("?")[0] ?? trimmed;

  if (isPortalPath(pathOnly)) {
    const kind = portalKindForPath(pathOnly);
    if (!kind || !canAccessPortalKind(kind, portal, roleId)) {
      return getPortalLandingRoute(portal, roleId);
    }
  }

  if (pathOnly.startsWith("/app") && !pathOnly.startsWith("/app/")) {
    return fallback;
  }

  if (pathOnly.startsWith("/app")) {
    const nonAppPortal =
      portal === "superadmin" ||
      portal === "broker" ||
      portal === "vendor" ||
      portal === "driver" ||
      roleId === "driver" ||
      roleId === "warehouse-crew" ||
      roleId === "customer" ||
      roleId === "broker" ||
      roleId === "superadmin";
    if (nonAppPortal) {
      return getPortalLandingRoute(portal, roleId);
    }
  }

  return trimmed;
}

export function buildLoginUrl(returnTo?: string): string {
  const safe = validateReturnTo(returnTo, DASHBOARD_ROUTE);
  const params = new URLSearchParams({ returnTo: safe });
  return `/login?${params.toString()}`;
}

/**
 * Resolves the route to navigate to immediately after a successful login.
 * Honors an explicit, portal-authorized `returnTo`; otherwise uses the
 * canonical portal landing URL.
 */
export function resolvePostLoginRoute(
  portal: PortalType,
  roleId: string,
  returnTo?: string | null,
): string {
  const landing = getPortalLandingRoute(portal, roleId);
  const fallback = landing;
  if (!returnTo) return landing;

  const validated = validateReturnTo(returnTo, fallback, portal, roleId);
  if (validated === DASHBOARD_ROUTE && landing !== DASHBOARD_ROUTE) {
    return landing;
  }
  if (validated === "/dashboard" && landing !== DASHBOARD_ROUTE) {
    return landing;
  }
  return validated;
}

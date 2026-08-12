import { NextResponse } from "next/server";
import { ROLE_ARCHETYPES } from "@/lib/mock-data";
import type { SessionUser } from "@/lib/auth";

// Server-side counterpart to the sidebar's client-only `canAccess()`
// (src/components/layout/sidebar.tsx). That check only gates which
// top-level nav entries render - cluster-tab children (e.g. "quality" and
// "services" inside the Vehicles cluster, "purchase" inside Vendors) are
// reachable in the UI via the cluster's parent permission alone, since
// ModuleClusterTabs renders every tab unconditionally once you're on the
// parent. MODULE_PARENT mirrors that so a server check doesn't block
// access the UI already grants, or vice versa.
const MODULE_PARENT: Record<string, string> = {
  inspection: "vehicles",
  issues: "vehicles",
  maintenance: "vehicles",
  workshop: "vehicles",
  services: "vehicles",
  "fuel-energy": "vehicles",
  compliance: "vehicles",
  quality: "vehicles",
  "rate-cards": "invoice",
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
};

function rolePermissions(roleId: string): string[] {
  return ROLE_ARCHETYPES.find((r) => r.id === roleId)?.permissions ?? [];
}

/** True if this role can reach `moduleId`, directly, via its cluster parent, or via a cluster child. */
export function hasModuleAccess(roleId: string, moduleId: string): boolean {
  const permissions = rolePermissions(roleId);
  if (permissions.includes("*")) return true;
  if (permissions.includes(moduleId)) return true;
  const parent = MODULE_PARENT[moduleId];
  if (parent && permissions.includes(parent)) return true;
  // moduleId may itself be a cluster parent (e.g. "hr") that's only ever
  // granted through a child permission (e.g. "drivers-staff", "payroll").
  for (const [child, childParent] of Object.entries(MODULE_PARENT)) {
    if (childParent === moduleId && permissions.includes(child)) return true;
  }
  return false;
}

/** Returns a 403 NextResponse if `sessionUser`'s role can't reach `moduleId`, else null. */
export function requireModuleAccess(sessionUser: SessionUser, moduleId: string): NextResponse | null {
  if (hasModuleAccess(sessionUser.role, moduleId)) return null;
  return NextResponse.json({ error: "Your role does not have access to this module." }, { status: 403 });
}

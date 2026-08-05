"use client";

/**
 * App Store module helpers — icon-name resolution for the
 * ONBOARDING_MODULES catalog (src/lib/onboarding/module-catalog.ts),
 * INR formatting, and a small "is this id actually routable" guard so
 * the Open button never crashes on a catalog id that doesn't map to a
 * real ModuleId.
 *
 * Mirrors the resolver pattern in src/components/marketing/_icons.tsx
 * (ModuleIcon by name, module-scope ICON_MAP so the
 * react-hooks/static-components lint rule stays happy) but covers the
 * full icon set used by ONBOARDING_MODULES rather than just the
 * marketing subset.
 */

import {
  Route,
  LayoutGrid,
  FileText,
  FileCheck,
  Warehouse,
  Users,
  Truck,
  MapPin,
  Fuel,
  Wrench,
  ClipboardCheck,
  ReceiptText,
  Wallet,
  Receipt,
  BookOpen,
  Banknote,
  Tags,
  ShieldCheck,
  FolderLock,
  AlertTriangle,
  IdCard,
  UserCog,
  BarChart3,
  Workflow,
  LayoutDashboard,
  MessageSquare,
  Handshake,
  Store,
  Calculator,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import type { AuthUser, ModuleId } from "@/lib/store/app-store";
import type { OnboardingModule } from "@/lib/onboarding/module-catalog";

const ICON_MAP: Record<string, LucideIcon> = {
  Route,
  LayoutGrid,
  FileText,
  FileCheck,
  Warehouse,
  Users,
  Truck,
  MapPin,
  Fuel,
  Wrench,
  ClipboardCheck,
  ReceiptText,
  Wallet,
  Receipt,
  BookOpen,
  Banknote,
  Tags,
  ShieldCheck,
  FolderLock,
  AlertTriangle,
  IdCard,
  UserCog,
  BarChart3,
  Workflow,
  LayoutDashboard,
  MessageSquare,
  Handshake,
  Store,
  Calculator,
};

/** Render a catalog icon by name (falls back to a generic package glyph). */
export function AppIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICON_MAP[name] ?? LayoutGrid;
  return <Icon {...props} />;
}

// ===== Formatters (module-local convention, matches other modules) =====
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function formatPrice(pricePerMonth: number): string {
  return pricePerMonth === 0 ? "Included" : `${formatINR(pricePerMonth)}/mo`;
}

// ===== Category list (derived from the catalog, stable order) =====
export const APP_STORE_CATEGORIES: OnboardingModule["category"][] = [
  "Operations",
  "Fleet",
  "Finance",
  "Compliance",
  "People",
  "Intelligence",
  "Broker",
];

// ===== Install-state resolver =====
// A module is "installed" if selectedModules is undefined (demo/quick-login
// sessions = everything unlocked), or the id (or the "*" wildcard) is
// present in selectedModules. Mirrors toggleModuleProvisioned's own notion
// of "current" in src/lib/store/app-store.ts — read-only here, no new
// store state.
export function isModuleInstalled(authUser: AuthUser | null, moduleId: string): boolean {
  if (!authUser) return false;
  const sel = authUser.selectedModules;
  if (sel === undefined) return true;
  return sel.includes(moduleId) || sel.includes("*");
}

// ===== Routable-id guard =====
// OnboardingModule.id is a plain string; only a subset are guaranteed to
// match the app shell's ModuleId union. This whitelist mirrors that union
// (see src/lib/store/app-store.ts) so the "Open" button can safely cast
// and navigate without risking a runtime crash on an unrecognised id.
const ROUTABLE_MODULE_IDS = new Set<string>([
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
]);

export function asRoutableModuleId(id: string): ModuleId | null {
  return ROUTABLE_MODULE_IDS.has(id) ? (id as ModuleId) : null;
}

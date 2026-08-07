"use client";

import type { ModuleId } from "@/lib/store/app-store";
import {
  LayoutDashboard,
  KanbanSquare,
  Truck,
  Map,
  Car,
  FileText,
  Receipt,
  Wallet,
  Banknote,
  Users,
  Building2,
  UserCog,
  ClipboardCheck,
  AlertCircle,
  Wrench,
  Settings2,
  Fuel,
  Bell,
  FolderArchive,
  BarChart3,
  MessageSquare,
  FileCheck,
  Calculator,
  Route,
  Camera,
  CalendarClock,
  Plus,
  ClipboardList,
  IndianRupee,
  Gauge,
  Boxes,
  Network,
  ShieldCheck,
  BookText,
  Handshake,
  Store,
  Gavel,
  type LucideIcon,
} from "lucide-react";

/**
 * role-features.ts
 *
 * Per-role context shown in the sidebar:
 *   • quickActions  - 3-5 buttons that jump the user into the most-used module
 *                      for their role. Each is `{ label, icon, module, view? }`
 *                      so the sidebar can `navigate(module, view)` directly.
 *   • featuredModules - 4-6 module ids shown in a "For Your Role" section at
 *                      the top of the sidebar so the role's primary tools are
 *                      always one click away.
 *   • description   - one-line focus statement shown in the role context card.
 *
 * Strict monochrome - icons are Lucide outlines only.
 */

export interface RoleQuickAction {
  label: string;
  icon: LucideIcon;
  module: ModuleId;
  view?: "list" | "create";
}

export interface RoleFeature {
  description: string;
  quickActions: RoleQuickAction[];
  featuredModules: ModuleId[];
}

export const ROLE_FEATURES: Record<string, RoleFeature> = {
  owner: {
    description: "Full access across every module, branch and financial record.",
    quickActions: [
      { label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
      { label: "Financial Ops", icon: Banknote, module: "financial-ops" },
      { label: "Reports", icon: BarChart3, module: "reports" },
      { label: "Invoices", icon: Receipt, module: "invoice" },
      { label: "Access Matrix", icon: Network, module: "access-matrix" },
    ],
    // "financial-ops" has no standalone sidebar entry (navigate() reroutes
    // it to "ledger", where its Treasury Ops content actually lives) - was
    // silently dropping from "For Your Role" since NAV_ITEM_BY_ID can't
    // resolve it.
    featuredModules: ["dashboard", "reports", "invoice", "operations-hub", "ledger"],
  },
  "ops-manager": {
    description: "Runs trips, dispatch, fleet map and exceptions end-to-end.",
    quickActions: [
      { label: "Plan Trip", icon: Plus, module: "trips", view: "create" },
      { label: "Track Fleet", icon: Map, module: "fleet-map" },
      { label: "Create Job Order", icon: ClipboardList, module: "operations-hub" },
      { label: "View Exceptions", icon: AlertCircle, module: "issues" },
    ],
    // "issues" is now a Vehicles-cluster tab, not its own sidebar entry -
    // point the featured chip at Vehicles instead of silently dropping it.
    featuredModules: ["dashboard", "operations-hub", "trips", "fleet-map", "vehicles", "pod"],
  },
  "fleet-manager": {
    description: "Owns vehicle lifecycle, maintenance, tyres and compliance.",
    quickActions: [
      { label: "Vehicles", icon: Car, module: "vehicles" },
      { label: "Work Orders", icon: Wrench, module: "maintenance" },
      { label: "Inspection Queue", icon: ClipboardCheck, module: "inspection" },
      { label: "Service Programs", icon: Settings2, module: "services" },
    ],
    // Maintenance/Services/Inspection/Issues are now Vehicles-cluster tabs,
    // not separate sidebar entries - "vehicles" covers all of them.
    featuredModules: ["dashboard", "vehicles", "reports", "documents"],
  },
  "finance-manager": {
    description: "Invoicing, payments, expenses, settlements and GST.",
    quickActions: [
      { label: "Create Invoice", icon: Receipt, module: "invoice", view: "create" },
      { label: "Record Payment", icon: IndianRupee, module: "payments" },
      { label: "Receivables", icon: Wallet, module: "invoice" },
      { label: "Rate Cards", icon: Calculator, module: "rate-cards" },
      { label: "Ledger", icon: BookText, module: "ledger" },
    ],
    // "rate-cards" is now an Invoice-cluster tab, not a separate entry.
    featuredModules: ["dashboard", "invoice", "payments", "expenses", "ledger"],
  },
  dispatcher: {
    description: "Assigns vehicles & drivers, tracks live trips, handles POD.",
    quickActions: [
      { label: "Plan Trip", icon: Truck, module: "trips", view: "create" },
      { label: "Fleet Map", icon: Map, module: "fleet-map" },
      { label: "Lorry Receipts", icon: FileText, module: "lorry-receipts" },
      { label: "POD", icon: FileCheck, module: "pod" },
    ],
    featuredModules: ["dashboard", "trips", "fleet-map", "lorry-receipts", "vehicles", "pod"],
  },
  driver: {
    description: "Mobile-first: assigned trips, POD capture, fuel logs.",
    quickActions: [
      { label: "My Trips", icon: Truck, module: "trips" },
      { label: "Capture POD", icon: Camera, module: "pod", view: "create" },
      { label: "Log Fuel", icon: Fuel, module: "fuel-energy" },
      { label: "Report Issue", icon: AlertCircle, module: "issues", view: "create" },
    ],
    featuredModules: ["dashboard", "trips", "pod", "documents"],
  },
  analyst: {
    description: "Read-only: dashboards, reports and analytics.",
    quickActions: [
      { label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
      { label: "Reports", icon: BarChart3, module: "reports" },
      { label: "System Design", icon: Network, module: "system-design" },
    ],
    // "system-design" is now a Settings-cluster tab, not a separate entry.
    featuredModules: ["dashboard", "reports", "settings"],
  },
  "warehouse-manager": {
    description: "Godown in-charge: inbound/outbound, inventory, POD receive.",
    quickActions: [
      { label: "Inbound LRs", icon: FileText, module: "lorry-receipts" },
      { label: "Receive POD", icon: FileCheck, module: "pod" },
      { label: "Documents", icon: FolderArchive, module: "documents" },
    ],
    featuredModules: ["dashboard", "lorry-receipts", "pod", "documents"],
  },
  customer: {
    description: "Read-only portal: your trips, invoices, PODs and ledger.",
    quickActions: [
      { label: "My Trips", icon: Truck, module: "trips" },
      { label: "My Invoices", icon: Receipt, module: "invoice" },
      { label: "My PODs", icon: FileCheck, module: "pod" },
    ],
    featuredModules: ["dashboard", "trips", "invoice", "pod", "documents"],
  },
  broker: {
    description: "Market loads, posted trucks, matching and commission.",
    quickActions: [
      { label: "Broker Console", icon: Handshake, module: "broker-console" },
      { label: "Marketplace", icon: Store, module: "broker-marketplace" },
      { label: "Settlements", icon: Gavel, module: "broker-settlements" },
      { label: "Find Loads", icon: Truck, module: "trips" },
      { label: "Rate Cards", icon: Calculator, module: "rate-cards" },
    ],
    // "rate-cards" is now an Invoice-cluster tab, not a separate entry.
    featuredModules: ["dashboard", "broker-console", "broker-marketplace", "broker-settlements", "invoice", "reports"],
  },
  "safety-officer": {
    description: "Compliance, inspections, incidents, EHS, driver hours.",
    quickActions: [
      { label: "Inspections", icon: ClipboardCheck, module: "inspection" },
      { label: "Safety Issues", icon: AlertCircle, module: "issues" },
      { label: "Documents", icon: FolderArchive, module: "documents" },
      { label: "Compliance", icon: ShieldCheck, module: "settings" },
    ],
    // Inspection/Issues are now Vehicles-cluster tabs, not separate entries.
    featuredModules: ["dashboard", "vehicles", "documents", "reports"],
  },
  mechanic: {
    description: "Workshop: work orders, parts, issues, fuel logs.",
    quickActions: [
      { label: "Open Work Orders", icon: Wrench, module: "maintenance" },
      { label: "Log Parts", icon: Boxes, module: "maintenance" },
      { label: "Inspection Queue", icon: ClipboardCheck, module: "inspection" },
      { label: "Issues", icon: AlertCircle, module: "issues" },
    ],
    // Maintenance/Issues/Fuel & Energy are now Vehicles-cluster tabs.
    featuredModules: ["dashboard", "vehicles", "documents"],
  },
  "branch-manager": {
    description: "Single-branch P&L, branch trips, branch staff and fleet.",
    quickActions: [
      { label: "Branch Trips", icon: Truck, module: "trips" },
      { label: "Branch Fleet", icon: Car, module: "vehicles" },
      { label: "Staff", icon: UserCog, module: "drivers-staff" },
      { label: "Invoices", icon: Receipt, module: "invoice" },
    ],
    // "drivers-staff" is now an HR-cluster tab, not a separate entry.
    featuredModules: ["dashboard", "trips", "vehicles", "hr", "invoice", "reports", "ledger"],
  },
  accountant: {
    description: "Vouchers, TDS, GST filing, reconciliation, journal entries.",
    quickActions: [
      { label: "Vouchers", icon: Banknote, module: "financial-ops" },
      { label: "Payments", icon: IndianRupee, module: "payments" },
      { label: "Invoices", icon: Receipt, module: "invoice" },
      { label: "Expenses", icon: Wallet, module: "expenses" },
      { label: "Ledger", icon: BookText, module: "ledger" },
    ],
    // "financial-ops" has no standalone sidebar entry - see owner role note above.
    featuredModules: ["dashboard", "invoice", "expenses", "payments", "reports", "ledger"],
  },
  "hr-manager": {
    description: "Drivers & staff, payroll, attendance, leaves, onboarding.",
    quickActions: [
      { label: "Drivers & Staff", icon: UserCog, module: "drivers-staff" },
      { label: "Reminders", icon: Bell, module: "reminders" },
      { label: "Documents", icon: FolderArchive, module: "documents" },
    ],
    // "reminders" is now a Documents-cluster tab; "drivers-staff" is now
    // an HR-cluster tab - neither is a separate entry anymore.
    featuredModules: ["dashboard", "hr", "documents", "reports"],
  },
};

// NOTE: lucide-react only exports ShieldCheck (no ShieldCheck2 in this version).

/**
 * Helper for the sidebar - returns a feature set or a safe default
 * (no quick actions, no featured modules) when the role isn't found.
 */
export function getRoleFeatures(roleId: string | undefined): RoleFeature | null {
  if (!roleId) return null;
  return ROLE_FEATURES[roleId] ?? null;
}

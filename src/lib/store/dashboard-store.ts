"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/* ============================================================
   Dashboard Store - modular, customizable widget workspaces.
   Persisted to localStorage ("reanzly-dashboard") so each user's
   layouts survive reloads. Each DashboardInstance carries its own
   filter (branch / group / location) so scoping is remembered
   per-board, not globally.
   ============================================================ */

export type WidgetSize = "square" | "rect-wide" | "rect-tall" | "full";

export interface DashboardFilter {
  branch?: string;
  group?: string;
  location?: string;
}

export interface LayoutItem {
  /** widget id from the registry */
  widgetId: string;
  size: WidgetSize;
  /** random instance id so the same widget can be added twice */
  iid: string;
}

export interface DashboardInstance {
  id: string;
  name: string;
  /** role id of the owner */
  owner: string;
  /** role ids this dashboard is shared with */
  sharedWith: string[];
  filter: DashboardFilter;
  layout: LayoutItem[];
  /** ISO timestamp of last mutation (for "Modified" column) */
  updatedAt: string;
  /** ISO timestamp of creation */
  createdAt: string;
}

export type DashboardView = "my" | "shared" | "manage";

export interface FilterOptions {
  branches: string[];
  groups: string[];
  locations: string[];
}

interface DashboardState {
  dashboards: DashboardInstance[];
  activeDashboardId: string;
  view: DashboardView;
  editMode: boolean;
  filterOptions: FilterOptions;
  /** Set to true after rehydration from localStorage finishes. */
  hasHydrated: boolean;
  /** Role ids we've already auto-seeded a default dashboard for, so we
   *  don't re-seed if the user deletes their personal boards. */
  seededRoles: string[];
  setHasHydrated: (v: boolean) => void;

  createDashboard: (name: string, ownerRoleId: string) => string;
  deleteDashboard: (id: string) => void;
  renameDashboard: (id: string, name: string) => void;
  shareDashboard: (id: string, roleIds: string[]) => void;
  duplicateDashboard: (id: string, ownerRoleId: string) => string | undefined;
  setActiveDashboard: (id: string) => void;
  setView: (view: DashboardView) => void;
  setEditMode: (on: boolean) => void;

  addWidget: (widgetId: string, size: WidgetSize) => void;
  removeWidget: (iid: string) => void;
  moveWidget: (fromIid: string, toIid: string) => void;
  reorderWidget: (iid: string, fromIdx: number, toIdx: number) => void;
  resizeWidget: (iid: string, size: WidgetSize) => void;
  setFilter: (filter: Partial<DashboardFilter>) => void;

  /** Auto-create a role-default dashboard for `roleId` if that role has
   *  zero personal dashboards. Returns the id of the active dashboard
   *  after the call (existing or newly seeded). Safe to call repeatedly. */
  ensureRoleDefault: (roleId: string) => string | undefined;
  /** Wipe all personal dashboards for `roleId` and re-seed the role
   *  default. The new default becomes the active dashboard. */
  resetToRoleDefault: (roleId: string) => string | undefined;

  /** Reset everything back to the 3 seeded defaults (debug escape hatch). */
  resetToDefaults: (ownerRoleId: string) => void;
}

/* ============================================================
   Seeded dashboards - the default "My Dashboard" mirrors the
   old operational cockpit (KPI strip + Priorities + Rean +
   charts) so existing users see familiar content immediately.
   ============================================================ */

function nowISO() {
  return new Date().toISOString();
}

function genId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function seedDashboards(ownerRoleId: string): DashboardInstance[] {
  const created = nowISO();
  return [
    {
      id: "dash-my",
      name: "My Dashboard",
      owner: ownerRoleId,
      sharedWith: [],
      filter: {},
      layout: [
        { widgetId: "kpi-active-trips", size: "square", iid: genId("w") },
        { widgetId: "kpi-on-time", size: "square", iid: genId("w") },
        { widgetId: "kpi-revenue-today", size: "square", iid: genId("w") },
        { widgetId: "kpi-open-issues", size: "square", iid: genId("w") },
        { widgetId: "list-today-priorities", size: "rect-wide", iid: genId("w") },
        { widgetId: "rean-recommendations", size: "rect-tall", iid: genId("w") },
        { widgetId: "chart-fleet-utilization", size: "rect-wide", iid: genId("w") },
        { widgetId: "rean-anomalies", size: "rect-tall", iid: genId("w") },
        { widgetId: "chart-fuel-cost-trend", size: "full", iid: genId("w") },
      ],
      updatedAt: created,
      createdAt: created,
    },
    {
      id: "dash-ops",
      name: "Operations Cockpit",
      owner: "ops-manager",
      sharedWith: ["owner", "dispatcher", "analyst"],
      filter: {},
      layout: [
        { widgetId: "kpi-active-trips", size: "square", iid: genId("w") },
        { widgetId: "kpi-eta-variance", size: "square", iid: genId("w") },
        { widgetId: "kpi-idle-vehicles", size: "square", iid: genId("w") },
        { widgetId: "kpi-overdue-invoices", size: "square", iid: genId("w") },
        { widgetId: "chart-route-profitability", size: "full", iid: genId("w") },
        { widgetId: "list-work-order-updates", size: "rect-tall", iid: genId("w") },
        { widgetId: "list-critical-faults", size: "rect-tall", iid: genId("w") },
        { widgetId: "rean-anomalies", size: "rect-wide", iid: genId("w") },
      ],
      updatedAt: created,
      createdAt: created,
    },
    {
      id: "dash-fleet",
      name: "Fleet Health",
      owner: "fleet-manager",
      sharedWith: ["owner", "ops-manager", "analyst"],
      filter: {},
      layout: [
        { widgetId: "kpi-idle-vehicles", size: "square", iid: genId("w") },
        { widgetId: "kpi-inspection-fail-rate", size: "square", iid: genId("w") },
        { widgetId: "kpi-compliance-score", size: "square", iid: genId("w") },
        { widgetId: "kpi-fuel-cost-km", size: "square", iid: genId("w") },
        { widgetId: "chart-fleet-utilization", size: "rect-wide", iid: genId("w") },
        { widgetId: "chart-cost-per-km-trend", size: "rect-wide", iid: genId("w") },
        { widgetId: "list-overdue-inspections", size: "rect-tall", iid: genId("w") },
        { widgetId: "list-service-reminders", size: "rect-tall", iid: genId("w") },
        { widgetId: "compliance-expiry-calendar", size: "full", iid: genId("w") },
      ],
      updatedAt: created,
      createdAt: created,
    },
  ];
}

const FILTER_OPTIONS: FilterOptions = {
  branches: ["All Branches", "Mumbai HQ", "Pune Branch", "Delhi Branch", "Bengaluru Branch", "Field"],
  groups: ["All Groups", "Line Haul", "City Delivery", "Long Haul", "Specialized", "Attached Fleet"],
  locations: ["All Locations", "Mumbai", "Pune", "Delhi", "Bengaluru", "Chennai", "Kolkata", "Ahmedabad", "Hyderabad"],
};

/* ============================================================
   Per-role default dashboards.
   When a role logs in for the first time and has zero personal
   dashboards, `ensureRoleDefault(roleId)` builds one from this map
   and sets it active. Sizes are picked to make the default layout
   read as a sensible cockpit, not a uniform grid.
   ============================================================ */

export interface RoleDefaultLayoutItem {
  widgetId: string;
  size: WidgetSize;
}
export interface RoleDefaultDashboard {
  name: string;
  layout: RoleDefaultLayoutItem[];
}

export const ROLE_DEFAULT_DASHBOARDS: Record<string, RoleDefaultDashboard> = {
  owner: {
    name: "Executive Overview",
    layout: [
      { widgetId: "kpi-revenue-today", size: "square" },
      { widgetId: "kpi-active-trips", size: "square" },
      { widgetId: "kpi-overdue-invoices", size: "square" },
      { widgetId: "kpi-compliance-score", size: "square" },
      { widgetId: "smart-insights", size: "rect-tall" },
      { widgetId: "chart-route-profitability", size: "full" },
      { widgetId: "customer-pnl-snapshot", size: "rect-wide" },
      { widgetId: "chart-monthly-revenue", size: "rect-wide" },
      { widgetId: "rean-recommendations", size: "rect-tall" },
      { widgetId: "list-top-delinquent-customers", size: "rect-tall" },
    ],
  },
  "ops-manager": {
    name: "Operations Cockpit",
    layout: [
      { widgetId: "kpi-active-trips", size: "square" },
      { widgetId: "kpi-eta-variance", size: "square" },
      { widgetId: "kpi-idle-vehicles", size: "square" },
      { widgetId: "kpi-open-issues", size: "square" },
      { widgetId: "smart-insights", size: "rect-tall" },
      { widgetId: "list-today-priorities", size: "rect-wide" },
      { widgetId: "chart-route-profitability", size: "full" },
      { widgetId: "kpi-on-time-delivery", size: "square" },
      { widgetId: "list-delayed-shipments", size: "rect-tall" },
      { widgetId: "chart-trip-status-mix", size: "rect-wide" },
      { widgetId: "rean-anomalies", size: "rect-wide" },
    ],
  },
  "fleet-manager": {
    name: "Fleet Health",
    layout: [
      { widgetId: "kpi-idle-vehicles", size: "square" },
      { widgetId: "kpi-inspection-fail-rate", size: "square" },
      { widgetId: "kpi-fuel-cost-km", size: "square" },
      { widgetId: "kpi-compliance-score", size: "square" },
      { widgetId: "kpi-vehicle-utilization", size: "square" },
      { widgetId: "smart-insights", size: "rect-tall" },
      { widgetId: "chart-fleet-utilization", size: "rect-wide" },
      { widgetId: "list-overdue-inspections", size: "rect-tall" },
      { widgetId: "list-service-reminders", size: "rect-tall" },
      { widgetId: "list-fuel-efficiency-leaders", size: "rect-tall" },
      { widgetId: "compliance-expiry-calendar", size: "full" },
    ],
  },
  "finance-manager": {
    name: "Finance Cockpit",
    layout: [
      { widgetId: "kpi-revenue-today", size: "square" },
      { widgetId: "kpi-overdue-invoices", size: "square" },
      { widgetId: "kpi-avg-days-to-pay", size: "square" },
      { widgetId: "kpi-outstanding-amount", size: "square" },
      { widgetId: "smart-insights", size: "rect-tall" },
      { widgetId: "chart-receivables-aging", size: "rect-wide" },
      { widgetId: "chart-monthly-revenue", size: "rect-wide" },
      { widgetId: "customer-pnl-snapshot", size: "rect-wide" },
      { widgetId: "list-top-delinquent-customers", size: "rect-tall" },
      { widgetId: "chart-fuel-cost-trend", size: "full" },
    ],
  },
  dispatcher: {
    name: "Dispatch Board",
    layout: [
      { widgetId: "kpi-active-trips", size: "square" },
      { widgetId: "kpi-eta-variance", size: "square" },
      { widgetId: "kpi-idle-vehicles", size: "square" },
      { widgetId: "kpi-on-time-delivery", size: "square" },
      { widgetId: "list-recent-activities", size: "rect-tall" },
      { widgetId: "list-today-priorities", size: "rect-wide" },
      { widgetId: "chart-trip-status-mix", size: "rect-wide" },
      { widgetId: "list-delayed-shipments", size: "rect-tall" },
      { widgetId: "rean-anomalies", size: "rect-wide" },
    ],
  },
  driver: {
    name: "My Day",
    layout: [
      { widgetId: "kpi-active-trips", size: "square" },
      { widgetId: "kpi-on-time-delivery", size: "square" },
      { widgetId: "widget-clock", size: "square" },
      { widgetId: "widget-weather", size: "square" },
      { widgetId: "list-recent-activities", size: "rect-tall" },
      { widgetId: "list-today-priorities", size: "rect-wide" },
      { widgetId: "list-service-reminders", size: "rect-tall" },
    ],
  },
  customer: {
    name: "My Shipments",
    layout: [
      { widgetId: "kpi-active-trips", size: "square" },
      { widgetId: "kpi-on-time-delivery", size: "square" },
      { widgetId: "kpi-overdue-invoices", size: "square" },
      { widgetId: "kpi-open-tickets", size: "square" },
      { widgetId: "list-recent-activities", size: "rect-tall" },
      { widgetId: "customer-pnl-snapshot", size: "rect-wide" },
      { widgetId: "list-recent-tickets", size: "rect-tall" },
    ],
  },
  accountant: {
    name: "Books & Receivables",
    layout: [
      { widgetId: "kpi-gst-payable", size: "square" },
      { widgetId: "kpi-tds-deducted", size: "square" },
      { widgetId: "kpi-filings-due", size: "square" },
      { widgetId: "kpi-bank-balance", size: "square" },
      { widgetId: "kpi-avg-days-to-pay", size: "square" },
      { widgetId: "kpi-outstanding-amount", size: "square" },
      { widgetId: "chart-receivables-aging", size: "rect-wide" },
      { widgetId: "chart-payables-aging", size: "rect-wide" },
      { widgetId: "customer-pnl-snapshot", size: "rect-wide" },
      { widgetId: "list-top-delinquent-customers", size: "rect-tall" },
      { widgetId: "compliance-expiry-calendar", size: "full" },
    ],
  },
  "hr-manager": {
    name: "HR Command",
    layout: [
      { widgetId: "kpi-headcount", size: "square" },
      { widgetId: "kpi-attendance-today", size: "square" },
      { widgetId: "kpi-pending-leaves", size: "square" },
      { widgetId: "kpi-pending-offers", size: "square" },
      { widgetId: "smart-insights", size: "rect-tall" },
      { widgetId: "list-pending-leaves", size: "rect-tall" },
      { widgetId: "list-pending-onboarding", size: "rect-tall" },
      { widgetId: "chart-attrition-trend", size: "rect-wide" },
      { widgetId: "composite-team-availability", size: "rect-wide" },
    ],
  },
  "warehouse-manager": {
    name: "Warehouse Ops",
    layout: [
      { widgetId: "kpi-inventory-value", size: "square" },
      { widgetId: "kpi-active-trips", size: "square" },
      { widgetId: "kpi-eta-variance", size: "square" },
      { widgetId: "kpi-open-issues", size: "square" },
      { widgetId: "smart-insights", size: "rect-tall" },
      { widgetId: "list-low-stock-skus", size: "rect-tall" },
      { widgetId: "list-today-priorities", size: "rect-wide" },
      { widgetId: "list-recent-activities", size: "rect-tall" },
      { widgetId: "rean-anomalies", size: "rect-wide" },
    ],
  },
  "safety-officer": {
    name: "Safety Dashboard",
    layout: [
      { widgetId: "kpi-open-issues", size: "square" },
      { widgetId: "kpi-pending-audits", size: "square" },
      { widgetId: "kpi-inspection-fail-rate", size: "square" },
      { widgetId: "kpi-compliance-score", size: "square" },
      { widgetId: "kpi-inspections-due", size: "square" },
      { widgetId: "smart-insights", size: "rect-tall" },
      { widgetId: "list-expiring-licenses", size: "rect-tall" },
      { widgetId: "list-overdue-inspections", size: "rect-tall" },
      { widgetId: "list-open-issues-by-severity", size: "rect-wide" },
      { widgetId: "chart-incident-trend", size: "rect-wide" },
      { widgetId: "compliance-expiry-calendar", size: "full" },
    ],
  },
  "branch-manager": {
    name: "Branch Overview",
    layout: [
      { widgetId: "kpi-branch-revenue", size: "square" },
      { widgetId: "kpi-branch-trips", size: "square" },
      { widgetId: "kpi-branch-staff", size: "square" },
      { widgetId: "kpi-branch-on-time", size: "square" },
      { widgetId: "kpi-branch-issues", size: "square" },
      { widgetId: "composite-branch-pnl", size: "rect-wide" },
      { widgetId: "list-today-priorities", size: "rect-wide" },
      { widgetId: "chart-route-profitability", size: "full" },
      { widgetId: "composite-team-availability", size: "rect-wide" },
    ],
  },
  broker: {
    name: "Broker Hub",
    layout: [
      { widgetId: "kpi-broker-win-rate", size: "square" },
      { widgetId: "kpi-active-trips", size: "square" },
      { widgetId: "kpi-overdue-invoices", size: "square" },
      { widgetId: "kpi-revenue-today", size: "square" },
      { widgetId: "smart-insights", size: "rect-tall" },
      { widgetId: "list-open-loads", size: "rect-tall" },
      { widgetId: "customer-pnl-snapshot", size: "rect-wide" },
      { widgetId: "chart-route-profitability", size: "full" },
      { widgetId: "list-recent-activities", size: "rect-tall" },
    ],
  },
  analyst: {
    name: "Analytics Workspace",
    layout: [
      { widgetId: "chart-route-profitability", size: "full" },
      { widgetId: "chart-fleet-utilization", size: "rect-wide" },
      { widgetId: "chart-receivables-aging", size: "rect-wide" },
      { widgetId: "chart-monthly-revenue", size: "rect-wide" },
      { widgetId: "chart-fuel-cost-trend", size: "full" },
      { widgetId: "chart-issues-by-category", size: "rect-wide" },
      { widgetId: "chart-trip-status-mix", size: "rect-wide" },
      { widgetId: "customer-pnl-snapshot", size: "rect-wide" },
      { widgetId: "list-top-delinquent-customers", size: "rect-tall" },
    ],
  },
  superadmin: {
    name: "Platform Admin",
    layout: [
      { widgetId: "kpi-total-orgs", size: "square" },
      { widgetId: "kpi-active-users", size: "square" },
      { widgetId: "kpi-pending-approvals", size: "square" },
      { widgetId: "kpi-open-tickets", size: "square" },
      { widgetId: "smart-insights", size: "rect-tall" },
      { widgetId: "chart-platform-health", size: "rect-wide" },
      { widgetId: "list-recent-tickets", size: "rect-tall" },
      { widgetId: "rean-anomalies", size: "rect-wide" },
      { widgetId: "compliance-expiry-calendar", size: "full" },
    ],
  },
  mechanic: {
    name: "Workshop Board",
    layout: [
      { widgetId: "kpi-open-work-orders", size: "square" },
      { widgetId: "kpi-parts-low-alert", size: "square" },
      { widgetId: "kpi-bays-occupied", size: "square" },
      { widgetId: "kpi-avg-turnaround", size: "square" },
      { widgetId: "kpi-idle-vehicles", size: "square" },
      { widgetId: "kpi-inspection-fail-rate", size: "square" },
      { widgetId: "list-work-order-updates", size: "rect-tall" },
      { widgetId: "list-low-stock-skus", size: "rect-tall" },
      { widgetId: "list-service-reminders", size: "rect-tall" },
      { widgetId: "list-critical-faults", size: "rect-tall" },
      { widgetId: "list-recurring-defects", size: "rect-wide" },
    ],
  },
};

/** Friendly, human-readable label per role id - used by the Widget
 *  Library dialog's "Suggested for your role" header. Mirrors the
 *  role title prefix in ROLE_ARCHETYPES[].description. */
export const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  "ops-manager": "Operations Manager",
  "fleet-manager": "Fleet Manager",
  "finance-manager": "Finance Manager",
  dispatcher: "Dispatcher",
  driver: "Driver",
  analyst: "Analyst",
  "warehouse-manager": "Warehouse Manager",
  customer: "Customer",
  broker: "Broker",
  "safety-officer": "Safety Officer",
  mechanic: "Mechanic",
  "branch-manager": "Branch Manager",
  accountant: "Accountant",
  "hr-manager": "HR Manager",
  superadmin: "Superadmin",
};

/** Build a DashboardInstance from a RoleDefaultDashboard entry. */
function buildRoleDefault(roleId: string, def: RoleDefaultDashboard): DashboardInstance {
  const ts = nowISO();
  return {
    id: genId("dash"),
    name: def.name,
    owner: roleId,
    sharedWith: [],
    filter: {},
    layout: def.layout.map((l) => ({ widgetId: l.widgetId, size: l.size, iid: genId("w") })),
    updatedAt: ts,
    createdAt: ts,
  };
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      dashboards: seedDashboards("owner"),
      activeDashboardId: "dash-my",
      view: "my",
      editMode: false,
      filterOptions: FILTER_OPTIONS,
      hasHydrated: false,
      seededRoles: [],
      setHasHydrated: (v) => set({ hasHydrated: v }),

      createDashboard: (name, ownerRoleId) => {
        const id = genId("dash");
        const ts = nowISO();
        const dash: DashboardInstance = {
          id,
          name: name || "Untitled Dashboard",
          owner: ownerRoleId,
          sharedWith: [],
          filter: {},
          layout: [],
          updatedAt: ts,
          createdAt: ts,
        };
        set((s) => ({
          dashboards: [...s.dashboards, dash],
          activeDashboardId: id,
          view: "my",
        }));
        return id;
      },

      deleteDashboard: (id) =>
        set((s) => {
          const remaining = s.dashboards.filter((d) => d.id !== id);
          let nextActive = s.activeDashboardId;
          if (s.activeDashboardId === id) {
            nextActive = remaining[0]?.id ?? "";
          }
          return { dashboards: remaining, activeDashboardId: nextActive };
        }),

      renameDashboard: (id, name) =>
        set((s) => ({
          dashboards: s.dashboards.map((d) =>
            d.id === id ? { ...d, name, updatedAt: nowISO() } : d,
          ),
        })),

      shareDashboard: (id, roleIds) =>
        set((s) => ({
          dashboards: s.dashboards.map((d) =>
            d.id === id ? { ...d, sharedWith: roleIds, updatedAt: nowISO() } : d,
          ),
        })),

      duplicateDashboard: (id, ownerRoleId) => {
        const src = get().dashboards.find((d) => d.id === id);
        if (!src) return undefined;
        const newId = genId("dash");
        const ts = nowISO();
        const copy: DashboardInstance = {
          ...src,
          id: newId,
          name: `${src.name} (Copy)`,
          owner: ownerRoleId,
          sharedWith: [],
          layout: src.layout.map((l) => ({ ...l, iid: genId("w") })),
          updatedAt: ts,
          createdAt: ts,
        };
        set((s) => ({
          dashboards: [...s.dashboards, copy],
          activeDashboardId: newId,
          view: "my",
        }));
        return newId;
      },

      setActiveDashboard: (id) => set({ activeDashboardId: id, editMode: false }),

      setView: (view) => {
        set({ view });
        // Auto-pick a sensible active dashboard for the new view
        const currentRole = "owner"; // fallback; UI overrides via currentRole
        const list = get().dashboards;
        let pick: string | undefined;
        if (view === "my") {
          pick = list.find((d) => d.owner === currentRole)?.id;
        } else if (view === "shared") {
          pick = list.find((d) => d.owner !== currentRole && d.sharedWith.includes(currentRole))?.id;
        }
        if (pick && pick !== get().activeDashboardId) {
          set({ activeDashboardId: pick, editMode: false });
        }
      },

      setEditMode: (on) => set({ editMode: on }),

      addWidget: (widgetId, size) =>
        set((s) => ({
          dashboards: s.dashboards.map((d) =>
            d.id === s.activeDashboardId
              ? {
                  ...d,
                  layout: [...d.layout, { widgetId, size, iid: genId("w") }],
                  updatedAt: nowISO(),
                }
              : d,
          ),
        })),

      removeWidget: (iid) =>
        set((s) => ({
          dashboards: s.dashboards.map((d) =>
            d.id === s.activeDashboardId
              ? { ...d, layout: d.layout.filter((l) => l.iid !== iid), updatedAt: nowISO() }
              : d,
          ),
        })),

      /** Swap two widgets by their instance ids (used by drag-and-drop). */
      moveWidget: (fromIid, toIid) =>
        set((s) => ({
          dashboards: s.dashboards.map((d) => {
            if (d.id !== s.activeDashboardId) return d;
            const layout = [...d.layout];
            const fromIdx = layout.findIndex((l) => l.iid === fromIid);
            const toIdx = layout.findIndex((l) => l.iid === toIid);
            if (fromIdx === -1 || toIdx === -1) return d;
            const [moved] = layout.splice(fromIdx, 1);
            layout.splice(toIdx, 0, moved);
            return { ...d, layout, updatedAt: nowISO() };
          }),
        })),

      /** Reorder by indices (used by sortable). */
      reorderWidget: (iid, fromIdx, toIdx) =>
        set((s) => ({
          dashboards: s.dashboards.map((d) => {
            if (d.id !== s.activeDashboardId) return d;
            const layout = [...d.layout];
            if (fromIdx < 0 || fromIdx >= layout.length) return d;
            if (toIdx < 0 || toIdx >= layout.length) return d;
            const [moved] = layout.splice(fromIdx, 1);
            layout.splice(toIdx, 0, moved);
            return { ...d, layout, updatedAt: nowISO() };
          }),
        })),

      resizeWidget: (iid, size) =>
        set((s) => ({
          dashboards: s.dashboards.map((d) =>
            d.id === s.activeDashboardId
              ? {
                  ...d,
                  layout: d.layout.map((l) => (l.iid === iid ? { ...l, size } : l)),
                  updatedAt: nowISO(),
                }
              : d,
          ),
        })),

      setFilter: (filter) =>
        set((s) => ({
          dashboards: s.dashboards.map((d) =>
            d.id === s.activeDashboardId
              ? { ...d, filter: { ...d.filter, ...filter }, updatedAt: nowISO() }
              : d,
          ),
        })),

      ensureRoleDefault: (roleId) => {
        const st = get();
        const personal = st.dashboards.filter((d) => d.owner === roleId);
        if (personal.length > 0) {
          // Role already has at least one personal dashboard - just make
          // sure the active one is theirs (if we're in "my" view).
          return st.activeDashboardId;
        }
        const def = ROLE_DEFAULT_DASHBOARDS[roleId];
        if (!def) return undefined;
        const dash = buildRoleDefault(roleId, def);
        set((s) => ({
          dashboards: [...s.dashboards, dash],
          activeDashboardId: dash.id,
          view: "my",
          editMode: false,
          seededRoles: s.seededRoles.includes(roleId)
            ? s.seededRoles
            : [...s.seededRoles, roleId],
        }));
        return dash.id;
      },

      resetToRoleDefault: (roleId) => {
        const def = ROLE_DEFAULT_DASHBOARDS[roleId];
        if (!def) return undefined;
        const dash = buildRoleDefault(roleId, def);
        set((s) => {
          const kept = s.dashboards.filter((d) => d.owner !== roleId);
          return {
            dashboards: [...kept, dash],
            activeDashboardId: dash.id,
            view: "my",
            editMode: false,
          };
        });
        return dash.id;
      },

      resetToDefaults: (ownerRoleId) =>
        set({ dashboards: seedDashboards(ownerRoleId), activeDashboardId: "dash-my", view: "my", editMode: false }),
    }),
    {
      name: "reanzly-dashboard",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        dashboards: s.dashboards,
        activeDashboardId: s.activeDashboardId,
        view: s.view,
        seededRoles: s.seededRoles,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      // If the persisted state is from an older shape, merge defaults in.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<DashboardState>;
        const base = current as DashboardState;
        return {
          ...base,
          ...p,
          filterOptions: base.filterOptions,
          editMode: false,
          hasHydrated: base.hasHydrated,
          seededRoles: Array.isArray(p.seededRoles) ? p.seededRoles : [],
        };
      },
    },
  ),
);

/* ============================================================
   Selector helpers - keep component code lean.
   ============================================================ */

export function selectActiveDashboard(s: DashboardState): DashboardInstance | undefined {
  return s.dashboards.find((d) => d.id === s.activeDashboardId);
}

export function selectDashboardsForView(s: DashboardState, currentRoleId: string): DashboardInstance[] {
  if (s.view === "my") return s.dashboards.filter((d) => d.owner === currentRoleId);
  if (s.view === "shared")
    return s.dashboards.filter((d) => d.owner !== currentRoleId && d.sharedWith.includes(currentRoleId));
  return s.dashboards;
}

export function canEditDashboard(d: DashboardInstance | undefined, currentRoleId: string): boolean {
  if (!d) return false;
  if (d.owner === currentRoleId) return true;
  return false;
}

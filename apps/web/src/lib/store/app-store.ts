"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RoleArchetype, Notification } from "@/lib/types";
import { ROLE_ARCHETYPES } from "@/lib/mock-data";
// Type-only import of BusinessType/SubscriptionModel flows the other way
// (module-catalog.ts imports those types from this file), so this value
// import does not create a runtime circular dependency - it's only used
// inside the toggleModuleProvisioned() closure below.
import { ONBOARDING_MODULES } from "@/lib/onboarding/module-catalog";
import { ApiError } from "@reanzly/shared";
import {
  authLogin,
  authLogout,
  authMe,
  authSignup,
  authErrorMessage,
} from "@/lib/auth-api";

// ===== NAVIGATION TYPES =====
// New module ids introduced for in-parallel module builds:
// pod, rate-cards, financial-ops, warehouse, compliance, payroll,
// workshop, access-matrix. Other agents are scaffolding the nav entries;
// roles already declare permissions for them so the sidebar filter
// gates correctly once those entries land.
// PortalType - multi-tenant product surface. Each subdomain maps to a portal:
//   admin.reanzly.com   → "superadmin"  (Reanzly internal team)
//   app.reanzly.com     → "app"         (organisation users - full desktop shell + drivers)
//   freight.reanzly.com → "freight"     (shippers + brokers)
export type PortalType = "superadmin" | "app" | "driver" | "vendor" | "broker" | "freight";

export type ModuleId =
  | "dashboard"
  | "operations-hub"
  | "trips"
  | "fleet-map"
  | "vehicles"
  | "lorry-receipts"
  | "invoice"
  | "expenses"
  | "payments"
  | "customers"
  | "vendors"
  | "drivers-staff"
  | "inspection"
  | "issues"
  | "maintenance"
  | "services"
  | "fuel-energy"
  | "reminders"
  | "documents"
  | "reports"
  | "settings"
  | "automation"
  | "system-design"
  | "pod"
  | "rate-cards"
  | "financial-ops"
  | "warehouse"
  | "compliance"
  | "payroll"
  | "workshop"
  | "access-matrix"
  | "chat"
  | "superadmin"
  | "crm"
  | "hr"
  | "ledger"
  | "broker-console"
  | "broker-marketplace"
  | "broker-settlements"
  | "document-studio"
  | "integrations"
  // New Odoo-style modules added this revision:
  | "helpdesk"
  | "field-service"
  | "approvals"
  | "knowledge"
  | "planning"
  | "purchase"
  | "quality"
  | "subscriptions"
  | "surveys"
  | "marketing"
  // Phase 10 - Ecosystem (app store, partner programme, financial services):
  | "app-store"
  | "partner-programme"
  | "financial-services";

export type SettingsTab =
  | "profile"
  | "notifications"
  | "login"
  | "appearance"
  | "access-security"
  | "organization"
  | "data-management"
  | "companies"
  | "access-matrix"
  | "integrations"
  | "billing";

export interface ViewState {
  module: ModuleId;
  view: "list" | "detail" | "create" | "edit";
  id?: string;
  tab?: string;
  settingsTab?: SettingsTab;
  breadcrumb: { label: string; module?: ModuleId; id?: string }[];
}

const MODULE_LABELS: Record<ModuleId, string> = {
  dashboard: "Dashboard",
  "operations-hub": "Operations Hub",
  trips: "Trips",
  "fleet-map": "Fleet Map",
  vehicles: "Vehicles",
  "lorry-receipts": "Lorry Receipts",
  invoice: "Invoice",
  expenses: "Expenses",
  payments: "Payments",
  customers: "Customers",
  vendors: "Vendors",
  "drivers-staff": "Drivers & Staff",
  inspection: "Inspection",
  issues: "Issues",
  maintenance: "Maintenance",
  services: "Services",
  "fuel-energy": "Fuel & Energy",
  reminders: "Reminders",
  documents: "Documents",
  reports: "Reports",
  settings: "Settings",
  automation: "Automation",
  "system-design": "System Design",
  pod: "POD",
  "rate-cards": "Rate Cards",
  "financial-ops": "Financial Ops",
  warehouse: "Warehouse",
  compliance: "Compliance",
  payroll: "Payroll",
  workshop: "Workshop",
  "access-matrix": "Access Matrix",
  chat: "Chat",
  superadmin: "Superadmin",
  crm: "CRM",
  hr: "HR",
  ledger: "Ledger",
  "broker-console": "Broker Console",
  "broker-marketplace": "Broker Marketplace",
  "broker-settlements": "Broker Settlements",
  "document-studio": "Document Studio",
  integrations: "Integrations",
  // New Odoo-style modules:
  helpdesk: "Helpdesk",
  "field-service": "Field Service",
  approvals: "Approvals",
  knowledge: "Knowledge Base",
  planning: "Planning",
  purchase: "Purchase",
  quality: "Quality",
  subscriptions: "Subscriptions",
  surveys: "Surveys",
  marketing: "Marketing",
  "app-store": "App Store",
  "partner-programme": "Partner Programme",
  "financial-services": "Financial Services",
};

export interface AuthUser {
  email: string;
  name: string;
  roleId: string;
  loggedInAt: string;
  portal: PortalType;
  orgId?: string;
  orgName?: string;
  // Phone captured during self-serve signup so the SuperAdmin reviewer
  // can call the onboarding contact if needed.
  phone?: string;
  // === Smart onboarding context (mirrors the signup request) ===
  // Provisioned modules drive the sidebar + feature gates in the app.
  selectedModules?: string[];
  // Subscription model controls billing surface + marketplace access.
  subscriptionModel?: SubscriptionModel;
  // Trial window for the header countdown + billing conversion flow.
  trialEndsAt?: string;
  trialStartedAt?: string;
  // Business type drives the dashboard variant + recommended modules.
  businessType?: BusinessType;
  // Broker context (when applicable).
  brokerProfile?: BrokerProfile;
  // Public directory listing flag (controls profile editor access).
  directoryListed?: boolean;
}

// ===== SIGNUP =====
// Self-serve organisation onboarding payload. Submitted from the App portal
// signup wizard. The SuperAdmin portal reviews each request before granting
// production billing tiers (the org can still use the trial immediately).
export type LegalEntityType =
  | "Proprietorship"
  | "Partnership"
  | "Pvt Ltd"
  | "LLP"
  | "Public Ltd";

export type BusinessType =
  | "Transport"
  | "Freight Broker"
  | "Warehouse"
  | "3PL"
  | "Fleet Owner"
  | "Reanzly Broker";

// === Subscription model ===
// Drives how the org pays Reanzly AND which surface they get:
//   - "saas"        → flat monthly/annual SaaS subscription. Full app portal.
//   - "commission"  → logistics partner on revenue-share per booked trip.
//                     Gets the marketplace + operations stack, no flat fee.
//   - "master"      → Master Subscription: SaaS + commission + broker tools
//                     bundled. The all-in-one tier for network operators.
export type SubscriptionModel = "saas" | "commission" | "master" | "freemium" | "starter" | "standard" | "enterprise" | "partner";

export type SignupRoleChoice =
  | "owner"
  | "ops-manager"
  | "fleet-manager"
  | "finance-manager"
  | "dispatcher"
  | "broker";

// === Broker profile (only when businessType === "Reanzly Broker" | "Freight Broker") ===
// Brokers resell Reanzly capacity. They set their own markup over the
// Reanzly rate card and manage their own sub-broker network.
export interface BrokerProfile {
  brokerCode: string;
  parentBrokerId?: string; // if this broker was onboarded by another broker
  markupPct: number; // % markup over Reanzly rate card they resell at
  settlementCycle: "Weekly" | "Fortnightly" | "Monthly";
  gstTreatment: "Forward Charge" | "Reverse Charge";
  coverageLanes: string[]; // e.g. ["Mumbai-Delhi", "Pune-Bengaluru"]
}

// === Public directory profile (IndiaMART / Zomato-style listing) ===
// When the org opts in, a public profile is generated and listed on the
// Reanzly marketplace directory. SEO-optimised so it ranks on Google for
// "logistics company in <city>" / "<lane> transport".
export interface DirectoryProfile {
  listed: boolean;
  slug: string; // URL slug: /directory/<slug>
  tagline: string;
  about: string;
  services: string[]; // e.g. ["FTL", "LTL", "Cold Chain"]
  lanes: string[]; // served lanes
  cities: string[]; // operational cities
  rating: number; // 0-5, seeded 4.x
  reviewCount: number;
  verified: boolean;
  badges: string[]; // e.g. ["GST Verified", "ePOD Enabled", "Reanzly Certified"]
  yearEstablished?: number;
  fleetSizeRange?: string; // "11-25 vehicles"
}

/** Payload submitted by the signup wizard. */
export interface SignupPayload {
  // Organisation
  companyName: string;
  legalEntity: LegalEntityType;
  gstin: string;
  registeredState: string;
  businessType: BusinessType;
  vehicleCount: number;
  employeeCount: number;
  // Smart onboarding: modules chosen drive the features provisioned.
  // The wizard auto-recommends a starter pack based on businessType, then
  // the user confirms/adds/removes. Stored so the SuperAdmin reviewer can
  // see exactly what was provisioned.
  selectedModules: string[];
  // How this org pays Reanzly. See SubscriptionModel above.
  subscriptionModel: SubscriptionModel;
  // Broker-specific data (only when businessType is a broker variant).
  brokerProfile?: BrokerProfile;
  // Public directory opt-in + listing data.
  directoryOptIn: boolean;
  // Primary contact (the person completing the wizard)
  contactName: string;
  workEmail: string;
  phone: string;
  password: string;
  roleChoice: SignupRoleChoice;
  // T&C consent
  agreedToTerms: boolean;
}

/** Persisted record of every signup request - reviewed in the SuperAdmin panel. */
export interface SignupRequest extends SignupPayload {
  id: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  // 7-day free trial window. Set on signup; the SuperAdmin reviewer can
  // extend it. Drives the "Trial" badge + countdown in the app header and
  // the billing panel's trial-to-paid conversion flow.
  trialEndsAt: string;
  trialStartedAt: string;
}

interface AppState {
  // ===== Auth =====
  isAuthenticated: boolean;
  authUser: AuthUser | null;
  portal: PortalType;
  login: (email: string, roleId: string, portal?: PortalType, orgName?: string) => void;
  // Real, server-verified sign-in: POSTs to /api/auth/login, which checks the
  // password against the User table's hashed credential and issues a real
  // session cookie. Resolves the matching role archetype from the verified
  // response (never from client input) before calling the internal login()
  // state-setter. Returns an error string on failure instead of throwing.
  loginWithPassword: (email: string, password: string, portal?: PortalType, orgName?: string) => Promise<{ ok: boolean; error?: string }>;
  // Re-validates against the real session cookie on app boot, so a stale
  // "isAuthenticated: true" left in persisted localStorage from a previous
  // session can't grant access without an actual live server session.
  restoreSession: () => Promise<void>;
  logout: () => void;
  setPortal: (p: PortalType) => void;

  // ===== Auth mode (sign-in vs sign-up wizard) =====
  // Drives which screen AppShell renders when not authenticated.
  // Set to "signup" by the "Create one" link on the login screen; reset to
  // "signin" by the "Back to sign in" link on the signup screen.
  authMode: "signin" | "signup";
  setAuthMode: (m: "signin" | "signup") => void;

  // ===== Signup requests (self-serve org onboarding) =====
  // Each signup() call pushes a pending request here. The SuperAdmin portal
  // can list/approve/reject them. Persisted via partialize so they survive
  // reloads - the SuperAdmin reviewer may open the panel hours later.
  signupRequests: SignupRequest[];
  signup: (payload: SignupPayload) => Promise<{ ok: boolean; error?: string }>;
  setSignupRequestStatus: (id: string, status: SignupRequest["status"]) => void;

  activeView: ViewState;
  navigate: (module: ModuleId, view?: ViewState["view"], id?: string, tab?: string) => void;
  navigateDetail: (module: ModuleId, id: string, tab?: string) => void;
  navigateBack: () => void;
  /** Sync activeView from App Router URL without pushing legacy history stack. */
  syncActiveView: (module: ModuleId, view?: ViewState["view"], id?: string, tab?: string) => void;
  setSettingsTab: (tab: SettingsTab) => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;

  // User-customized item order within a sidebar group, keyed by group
  // label (e.g. "Fleet" -> ["vehicles","trips","fleet-map","lorry-receipts"]).
  // A group with no entry here just renders in its default order.
  sidebarOrder: Record<string, ModuleId[]>;
  setSidebarGroupOrder: (groupLabel: string, order: ModuleId[]) => void;

  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (v: boolean) => void;
  toggleMobileSidebar: () => void;

  hrExpanded: boolean;
  toggleHr: () => void;

  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;

  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  activeConversationId: string;
  setActiveConversation: (id: string) => void;

  notifOpen: boolean;
  setNotifOpen: (v: boolean) => void;
  notifications: Notification[];
  /** Real fetch from GET /api/notifications - called after restoreSession()
   *  succeeds, since notifications only exist for a signed-in user. */
  fetchNotifications: () => Promise<void>;
  markNotifRead: (id: string) => void;
  markAllNotifRead: () => void;
  /** Dismisses (deletes) a notification for real via DELETE /api/notifications/[id]. */
  dismissNotif: (id: string) => void;

  /** Global system alert banner - shown above the header when set. Used for
   *  maintenance windows, outage notices, billing warnings. Dismissed state
   *  persists for the session. */
  systemAlert: {
    id: string;
    severity: "info" | "warning" | "critical";
    title: string;
    message: string;
    actionLabel?: string;
    actionModule?: ModuleId;
    actionSettingsTab?: SettingsTab;
  } | null;
  systemAlertDismissed: string[];
  dismissSystemAlert: () => void;
  clearSystemAlertDismissals: () => void;

  /** Announcements center modal - lists all system alerts + product updates
   *  in one place. Triggered from the header bell + the alert banner. */
  announceOpen: boolean;
  setAnnounceOpen: (v: boolean) => void;

  dateRange: { label: string; start: string; end: string };
  setDateRange: (label: string, start: string, end: string) => void;

  activeCompany: string;
  setActiveCompany: (c: string) => void;
  companySwitchOpen: boolean;
  setCompanySwitchOpen: (v: boolean) => void;

  currentRole: RoleArchetype;

  tourOpen: boolean;
  setTourOpen: (v: boolean) => void;

  history: ViewState[];

  /** Transient - when set, the fleet-map module should focus this vehicle on mount. */
  selectedMapVehicleId?: string;
  setSelectedMapVehicleId: (id?: string) => void;

  // ===== Marketing site routing (not persisted) =====
  // When not authenticated, the user lands on the marketing site by default.
  // Clicking "Sign in" / "Start free trial" sets marketingView to "auth" so
  // AppShell renders the login/signup screen. authMode (signin/signup) then
  // decides which auth screen shows. Both flags reset on reload so a fresh
  // visit always lands on the marketing site, never mid-flow.
  //
  // "marketplace" renders the public Marketplace site (50+ integrations
  // browseable without signing in). Deep-linking to a provider detail view
  // within the marketplace uses `selectedMarketplaceProvider` (provider id).
  marketingView: "landing" | "auth" | "marketplace";
  setMarketingView: (v: "landing" | "auth" | "marketplace") => void;
  selectedMarketplaceProvider: string | null;
  setSelectedMarketplaceProvider: (id: string | null) => void;

  // When the user clicks "Buy this module" on the marketplace we preselect
  // it so the signup wizard's review step can highlight it. Not persisted.
  selectedModuleForPurchase?: string;
  setSelectedModuleForPurchase: (id?: string) => void;

  // === One-tap live demo entry from the marketing site ===
  //demoEnter(moduleId) signs the visitor in as the demo Owner (full
  // permissions, "*") on the App portal and routes them straight to the
  // requested module. No signup, no card, no email. Used by every
  // "Open live demo" CTA on the marketing site so visitors can explore
  // real, working modules before committing.
  demoEnter: (moduleId: ModuleId) => void;

  // === App Store - module provisioning toggle ===
  // Installs/uninstalls a module for the current org by adding/removing it
  // from authUser.selectedModules. Demo/quick-login sessions have
  // selectedModules === undefined (== "everything unlocked"); toggling there
  // materialises the full catalog first so a single "uninstall" only removes
  // the one module instead of wiping provisioning back to nothing.
  toggleModuleProvisioned: (moduleId: ModuleId) => void;
}

const DEFAULT_VIEW: ViewState = {
  module: "dashboard",
  view: "list",
  breadcrumb: [{ label: "Dashboard", module: "dashboard" }],
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      authUser: null,
      portal: "app" as PortalType,
      login: (email, roleId, portal = "app", orgName) => {
        const role = ROLE_ARCHETYPES.find((r) => r.id === roleId) || ROLE_ARCHETYPES[0];
        // The default landing view depends on the portal: drivers land on the
        // driver field app (handled in app-shell), superadmins land on the
        // superadmin module, vendors land on fleet-map tracking, everyone
        // else lands on the dashboard.
        const landingModule: ModuleId =
          portal === "superadmin"
          ? "superadmin"
          : portal === "broker"
          ? "broker-console"
          : portal === "vendor"
          ? "fleet-map"
          : "dashboard";
        const landingView: ViewState = {
          module: landingModule,
          view: "list",
          breadcrumb: [{ label: MODULE_LABELS[landingModule], module: landingModule }],
        };
        set({
          isAuthenticated: true,
          portal,
          authUser: {
            email: email.trim() || `${role.name.toLowerCase().replace(/\s+/g, ".")}@reanzly.in`,
            name: role.name,
            roleId: role.id,
            loggedInAt: new Date().toISOString(),
            portal,
            orgName: orgName,
          },
          currentRole: role,
          activeView: landingView,
          history: [],
        });
      },
      loginWithPassword: async (email, password, portal = "app", orgName) => {
        try {
          const data = await authLogin(email, password);
          const resolvedPortal =
            data.user.role === "superadmin"
              ? "superadmin"
              : portal === "superadmin"
                ? "app"
                : (portal as any) === "freight"
                  ? (data.user.role === "broker" ? "broker" : "vendor")
                  : portal;
          get().login(data.user.email, data.user.role, resolvedPortal, orgName);
          return { ok: true };
        } catch (error) {
          return { ok: false, error: authErrorMessage(error, "Sign in failed.") };
        }
      },
      restoreSession: async () => {
        try {
          const { user } = await authMe();
          if (!user) {
            if (get().isAuthenticated) set({ isAuthenticated: false, authUser: null });
            return;
          }
          const role = ROLE_ARCHETYPES.find((r) => r.id === user.role) || ROLE_ARCHETYPES[0];
          const portal =
            user.role === "superadmin"
              ? "superadmin"
              : get().portal === "superadmin"
                ? "app"
                : get().portal;
          set({
            isAuthenticated: true,
            portal,
            authUser: {
              email: user.email,
              name: user.name,
              roleId: role.id,
              loggedInAt: new Date().toISOString(),
              portal,
            },
            currentRole: role,
          });
          void get().fetchNotifications();
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            if (get().isAuthenticated) set({ isAuthenticated: false, authUser: null });
          }
        }
      },
      logout: () => {
        authLogout().catch(() => {});
        set({
          isAuthenticated: false,
          authUser: null,
          activeView: DEFAULT_VIEW,
          history: [],
        });
      },
      setPortal: (p) => set({ portal: p }),

      // Auth mode + signup. `signup` creates a pending SignupRequest,
      // pushes it to the persisted list (SuperAdmin reviews later), then
      // auto-logs the user in as their chosen role on the App portal so
      // they land on the dashboard immediately.
      authMode: "signin",
      setAuthMode: (m) => set({ authMode: m }),
      signupRequests: [],
      signup: async (payload) => {
        const now = new Date();
        const trialEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
        const req: SignupRequest = {
          id: `sgr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
          createdAt: now.toISOString(),
          status: "pending",
          trialStartedAt: now.toISOString(),
          trialEndsAt: trialEnd.toISOString(),
          ...payload,
        };
        try {
          const data = await authSignup({ ...req });
          // Auto-login on the App portal so the user can start their trial
          // immediately - the request remains pending for SuperAdmin review.
          get().login(payload.workEmail, payload.roleChoice, "app", payload.companyName);
          // Patch authUser to carry the contact phone + the real contact name
          // (the login() helper defaults name to the role archetype's display
          // name - we want the user's typed name on the auth record instead).
          // Also propagate smart-onboarding context (modules, subscription
          // model, trial window, broker profile, directory opt-in) so the app
          // shell + sidebar + billing surface can gate features accordingly.
          set((s) => ({
            signupRequests: [req, ...s.signupRequests],
            authUser: s.authUser
              ? {
                  ...s.authUser,
                  name: payload.contactName,
                  phone: payload.phone,
                  selectedModules: payload.selectedModules,
                  subscriptionModel: payload.subscriptionModel,
                  trialEndsAt: req.trialEndsAt,
                  trialStartedAt: req.trialStartedAt,
                  businessType: payload.businessType,
                  brokerProfile: payload.brokerProfile,
                  directoryListed: payload.directoryOptIn,
                }
              : null,
          }));
          return { ok: true };
        } catch (err: unknown) {
          console.error("Signup error:", err);
          return { ok: false, error: authErrorMessage(err, "Could not reach the server. Try again.") };
        }
      },
      setSignupRequestStatus: (id, status) =>
        set((s) => ({
          signupRequests: s.signupRequests.map((r) =>
            r.id === id ? { ...r, status } : r,
          ),
        })),

      activeView: DEFAULT_VIEW,
      navigate: (module, view = "list", id, tab) => {
        // Financial Ops was merged into the Ledger module as the
        // "Treasury Ops" sub-view. Reroute "financial-ops" → "ledger"
        // so existing deep-links, role permissions, sidebar aliases,
        // header quick-add actions, and breadcrumbs still land users
        // in the right place. The "financial-ops" id stays in the
        // ModuleId union for back-compat.
        const resolved: ModuleId =
          module === "financial-ops" ? "ledger" : module;
        const newView: ViewState = {
          module: resolved,
          view,
          id,
          tab,
          breadcrumb: [{ label: MODULE_LABELS[resolved] ?? resolved, module: resolved }],
        };
        set((s) => ({
          activeView: newView,
          history: [...s.history, s.activeView].slice(-20),
        }));
      },
      navigateDetail: (module, id, tab) => {
        const newView: ViewState = {
          module,
          view: "detail",
          id,
          tab,
          breadcrumb: [
            { label: MODULE_LABELS[module], module },
            { label: id },
          ],
        };
        set((s) => ({
          activeView: newView,
          history: [...s.history, s.activeView].slice(-20),
        }));
      },
      navigateBack: () => {
        const hist = get().history;
        if (hist.length > 0) {
          set({ activeView: hist[hist.length - 1], history: hist.slice(0, -1) });
        } else {
          set({ activeView: DEFAULT_VIEW });
        }
      },
      syncActiveView: (module, view = "list", id, tab) => {
        const resolved: ModuleId =
          module === "financial-ops" ? "ledger" : module;
        const newView: ViewState = {
          module: resolved,
          view,
          id,
          tab,
          breadcrumb: [{ label: MODULE_LABELS[resolved] ?? resolved, module: resolved }],
        };
        set({ activeView: newView });
      },
      setSettingsTab: (tab) =>
        set((s) => ({
          activeView: {
            ...s.activeView,
            module: "settings",
            settingsTab: tab,
            view: "list",
            breadcrumb: [{ label: "Settings", module: "settings" as ModuleId }, { label: tab }],
          },
        })),

      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      sidebarOrder: {},
      setSidebarGroupOrder: (groupLabel, order) =>
        set((s) => ({ sidebarOrder: { ...s.sidebarOrder, [groupLabel]: order } })),
      mobileSidebarOpen: false,
      setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),
      toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
      hrExpanded: true,
      toggleHr: () => set((s) => ({ hrExpanded: !s.hrExpanded })),

      commandOpen: false,
      setCommandOpen: (v) => set({ commandOpen: v }),

      chatOpen: false,
      setChatOpen: (v) => set({ chatOpen: v }),
      activeConversationId: "c1",
      setActiveConversation: (id) => set({ activeConversationId: id }),

      notifOpen: false,
      setNotifOpen: (v) => set({ notifOpen: v }),
      notifications: [],
      fetchNotifications: async () => {
        try {
          const res = await fetch("/api/notifications", { cache: "no-store" });
          if (!res.ok) return;
          const data = await res.json();
          set({ notifications: data.notifications ?? [] });
        } catch {
          // Network hiccup - leave whatever was last fetched.
        }
      },
      markNotifRead: (id) => {
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
        void fetch(`/api/notifications/${id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ read: true }),
        });
      },
      markAllNotifRead: () => {
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        }));
        void fetch("/api/notifications/read-all", { method: "POST" });
      },
      dismissNotif: (id) => {
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id),
        }));
        void fetch(`/api/notifications/${id}`, { method: "DELETE" });
      },

      // Default banner: a billing-soft-warning that showcases the new
      // banner pattern. Users can dismiss it; it stays dismissed for the
      // session. The SuperAdmin can push a new alert from the Broadcasts
      // view (TODO: wire broadcasts -> setSystemAlert).
      systemAlert: {
        id: "trial-expiring",
        severity: "warning",
        title: "Free trial expires in 4 days",
        message:
          "Your Reanzly trial ends Aug 14. Add a payment method to keep your data and avoid service interruption.",
        actionLabel: "Add payment method",
        actionModule: "settings" as ModuleId,
        actionSettingsTab: "billing",
      },
      systemAlertDismissed: [],
      dismissSystemAlert: () =>
        set((s) =>
          s.systemAlert
            ? { systemAlertDismissed: [...s.systemAlertDismissed, s.systemAlert.id] }
            : {},
        ),
      clearSystemAlertDismissals: () => set({ systemAlertDismissed: [] }),

      announceOpen: false,
      setAnnounceOpen: (v) => set({ announceOpen: v }),

      dateRange: {
        label: "This Month",
        start: new Date(Date.now() - 30 * 86400000).toISOString(),
        end: new Date().toISOString(),
      },
      setDateRange: (label, start, end) => set({ dateRange: { label, start, end } }),

      activeCompany: "Reanzly Logistics Pvt Ltd",
      setActiveCompany: (c) => set({ activeCompany: c }),
      companySwitchOpen: false,
      setCompanySwitchOpen: (v) => set({ companySwitchOpen: v }),

      currentRole: ROLE_ARCHETYPES[0],

      tourOpen: false,
      setTourOpen: (v) => set({ tourOpen: v }),

      history: [],

      selectedMapVehicleId: undefined,
      setSelectedMapVehicleId: (id) => set({ selectedMapVehicleId: id }),

      marketingView: "landing",
      setMarketingView: (v) => set({ marketingView: v }),
      selectedMarketplaceProvider: null,
      setSelectedMarketplaceProvider: (id) => set({ selectedMarketplaceProvider: id }),
      selectedModuleForPurchase: undefined,
      setSelectedModuleForPurchase: (id) => set({ selectedModuleForPurchase: id }),

      // One-tap demo entry from the marketing site. Signs the visitor in
      // as the demo Owner (full "*") permissions and lands them directly
      // in the requested module. Used by every "Open live demo" CTA so
      // visitors can explore real modules without signing up.
      demoEnter: (moduleId) => {
        get().login("", "owner", "app", "Reanzly Logistics Pvt Ltd");
        // login() sets activeView to the dashboard; override to the
        // requested module immediately afterwards.
        get().navigate(moduleId, "list");
      },

      toggleModuleProvisioned: (moduleId) => {
        const s = get();
        if (!s.authUser) return;
        const current =
          s.authUser.selectedModules ?? ONBOARDING_MODULES.map((m) => m.id);
        const installed = current.includes(moduleId);
        const next = installed
          ? current.filter((id) => id !== moduleId)
          : [...current, moduleId];
        set({ authUser: { ...s.authUser, selectedModules: next } });
      },
    }),
    {
      name: "reanzly-app",
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        sidebarOrder: s.sidebarOrder,
        activeCompany: s.activeCompany,
        currentRole: s.currentRole,
        isAuthenticated: s.isAuthenticated,
        authUser: s.authUser,
        portal: s.portal,
        // Persist signup requests so the SuperAdmin reviewer can see them
        // across reloads. Auth mode (signin/signup) is intentionally NOT
        // persisted - on a fresh load we always want to land on the sign-in
        // screen, never the in-progress signup wizard.
        signupRequests: s.signupRequests,
      }),
    }
  )
);

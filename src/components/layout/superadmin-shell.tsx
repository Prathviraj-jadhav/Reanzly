"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/app-store";
import { useSuperadminStore } from "@/components/modules/superadmin/_store";
import {
  INTERNAL_ROLES,
  internalRoleById,
  type AdminSubView,
  type InternalRoleId,
} from "@/components/modules/superadmin/_data";
import { AdminLogin } from "@/components/modules/superadmin/admin-login";
import { OverviewView } from "@/components/modules/superadmin/overview";
import { OrganizationsView } from "@/components/modules/superadmin/organizations";
import { UsersView } from "@/components/modules/superadmin/users";
import { BillingView } from "@/components/modules/superadmin/billing";
import { OfflineSyncView } from "@/components/modules/superadmin/offline-sync";
import { BackupsView } from "@/components/modules/superadmin/backups";
import { SettingsView } from "@/components/modules/superadmin/settings";
import { TicketsView } from "@/components/modules/superadmin/tickets";
import { BroadcastsView } from "@/components/modules/superadmin/broadcasts";
import { AutomationsView } from "@/components/modules/superadmin/automations";
import { InternalTeamView } from "@/components/modules/superadmin/internal-team";
import { AuditView } from "@/components/modules/superadmin/audit";
import { SLMView } from "@/components/modules/superadmin/slm";
import { IntegrationsView } from "@/components/modules/superadmin/integrations";
import { NeuralCoreView } from "@/components/modules/superadmin/neural-core";
import { MarketplaceView } from "@/components/modules/superadmin/marketplace";
import { DeveloperApiView } from "@/components/modules/superadmin/developer-api";
import { ComplianceView } from "@/components/modules/superadmin/compliance";
import { KnowledgeView } from "@/components/modules/superadmin/knowledge";
import { FieldServiceView } from "@/components/modules/superadmin/field-service";
import { RoleSwitcher, RoleContextStrip } from "@/components/modules/superadmin/role-switcher";
import { AlertBanner } from "@/components/layout/alert-banner";
import { AnnouncementsCenter } from "@/components/layout/announcements-center";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import {
  LayoutDashboard,
  Building2,
  Users as UsersIcon,
  CreditCard,
  RefreshCcw,
  DatabaseBackup,
  Settings,
  Ticket as TicketIcon,
  Megaphone,
  Zap,
  ShieldCheck,
  ScrollText,
  LogOut,
  Search,
  Bell,
  Command,
  ChevronRight,
  Cpu,
  Plug,
  Brain,
  Store,
  Code2,
  Menu,
  X,
  Scale,
  BookOpen,
  MapPin,
  type LucideIcon,
} from "lucide-react";

/* ============================================================
   SuperAdminShell
   ------------------------------------------------------------
   A completely separate, full-screen shell for the Reanzly
   internal-team portal (admin.reanzly.com). It does NOT share
   the desktop Sidebar / Header / Footer used by the app portal.
   This fixes the "stuck login inside the desktop shell" and
   the "double sidebar" issues.

   State machine:
     1. currentStaff === null  -> <AdminLogin /> (full screen)
     2. currentStaff set       -> workspace with its own chrome:
        - slim top bar (brand + search + notifications + staff + sign out)
        - left rail of sub-views filtered by RBAC
        - main content area renders the active sub-view
   ============================================================ */

interface SubNavItem {
  id: AdminSubView;
  label: string;
  description: string;
  icon: LucideIcon;
  group: "Operations" | "Revenue" | "Platform" | "Intelligence";
}

const SUB_NAV: SubNavItem[] = [
  { id: "overview", label: "Overview", description: "Platform health & alerts", icon: LayoutDashboard, group: "Operations" },
  { id: "tickets", label: "Support Tickets", description: "Department-routed queue", icon: TicketIcon, group: "Operations" },
  { id: "broadcasts", label: "Broadcasts", description: "Messages to orgs & staff", icon: Megaphone, group: "Operations" },
  { id: "field-service", label: "Field Service", description: "On-site visits & deployments", icon: MapPin, group: "Operations" },
  { id: "internal-team", label: "Internal Team", description: "Reanzly staff & RBAC", icon: ShieldCheck, group: "Operations" },
  { id: "organizations", label: "Organizations", description: "Tenants & onboarding", icon: Building2, group: "Revenue" },
  { id: "users", label: "Users & Access", description: "Cross-tenant users", icon: UsersIcon, group: "Revenue" },
  { id: "billing", label: "Billing & Plans", description: "MRR, invoices, retries", icon: CreditCard, group: "Revenue" },
  { id: "automations", label: "Automations", description: "Loop engineering & recipes", icon: Zap, group: "Intelligence" },
  { id: "slm", label: "Rean SLM", description: "Agent runtime & loop traces", icon: Cpu, group: "Intelligence" },
  { id: "integrations", label: "Integrations", description: "MCP, API keys, Tally, CRM, ERP", icon: Plug, group: "Intelligence" },
  { id: "neural-core", label: "Neural Core", description: "Multi-brain, memory & self-healing", icon: Brain, group: "Intelligence" },
  { id: "marketplace", label: "Marketplace", description: "Agents, skills & templates", icon: Store, group: "Intelligence" },
  { id: "knowledge", label: "Knowledge Base", description: "Internal SOPs & runbooks", icon: BookOpen, group: "Intelligence" },
  { id: "developer-api", label: "Developer/API", description: "Keys, webhooks & SDKs", icon: Code2, group: "Intelligence" },
  { id: "sync", label: "Offline Sync", description: "Queue, conflicts, devices", icon: RefreshCcw, group: "Platform" },
  { id: "backups", label: "Backups", description: "Schedule & restore", icon: DatabaseBackup, group: "Platform" },
  { id: "audit", label: "Audit Log", description: "Immutable action trail", icon: ScrollText, group: "Platform" },
  { id: "compliance", label: "Compliance Center", description: "DPDP, GDPR, GST, privacy", icon: Scale, group: "Platform" },
  { id: "settings", label: "Settings", description: "Flags, gateways, integrations", icon: Settings, group: "Platform" },
];

const GROUPS: SubNavItem["group"][] = ["Operations", "Revenue", "Intelligence", "Platform"];

export function SuperAdminShell() {
  const currentStaff = useSuperadminStore((s) => s.currentStaff);
  const adminLogout = useSuperadminStore((s) => s.adminLogout);
  const canAccess = useSuperadminStore((s) => s.canAccess);
  const logout = useAppStore((s) => s.logout);
  const setAnnounceOpen = useAppStore((s) => s.setAnnounceOpen);
  const [active, setActive] = useState<AdminSubView>("overview");
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Gate 1: no staff signed in -> full-screen admin login.
  if (!currentStaff) {
    return <AdminLogin />;
  }

  // Selecting a nav item from the mobile drawer should also close the
  // drawer so the user lands directly on the chosen view.
  function selectSubView(id: AdminSubView) {
    setActive(id);
    setMobileNavOpen(false);
  }

  const visibleNav = SUB_NAV.filter((item) => canAccess(item.id) !== "none");
  const access = canAccess(active);
  const safeActive = access === "none" ? (visibleNav[0]?.id ?? "overview") : active;
  const activeAccess = canAccess(safeActive);
  const role = internalRoleById(currentStaff.roleId) ?? INTERNAL_ROLES[0];

  const writeCount = Object.values(role.permissions).filter((v) => v === "write").length;
  const readCount = Object.values(role.permissions).filter((v) => v === "read").length;

  function handleSignOut() {
    adminLogout();
    // Also clear the app-store auth so we return to the org-level login.
    logout();
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      {/* ── Top bar ── */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-3 sm:gap-2 sm:px-4">
        <div className="flex items-center gap-2 min-w-0 sm:gap-2">
          {/* Mobile hamburger - opens the drawer */}
          <button
            onClick={() => setMobileNavOpen(true)}
            className="tap flex h-9 w-9 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-[18px] w-[18px]" />
          </button>
          {/* Desktop collapse toggle */}
          <button
            onClick={() => setNavCollapsed((c) => !c)}
            className="tap hidden h-9 w-9 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors lg:flex"
            aria-label="Toggle navigation"
          >
            <Command className="h-[18px] w-[18px]" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-foreground text-[12px] font-bold text-background">
              RZ
            </span>
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="truncate text-[14px] font-medium tracking-tight">Reanzly</span>
              <span className="hidden sm:inline shrink-0 rounded-[3px] border border-border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                Internal
              </span>
              <span className="hidden md:inline shrink-0 text-[11px] text-muted-foreground tabular">admin.reanzly.com</span>
            </div>
          </div>
        </div>

        {/* Center search - desktop only, mobile uses the drawer's search */}
        <div className="hidden md:flex flex-1 max-w-[420px] items-center relative">
          <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orgs, tickets, staff, automations..."
            className="h-9 w-full rounded-[6px] border border-border bg-muted/40 pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/15"
          />
          <kbd className="pointer-events-none absolute right-2 hidden lg:flex h-5 items-center gap-0.5 rounded-[3px] border border-border bg-background px-1 text-[9px] font-medium text-muted-foreground">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setAnnounceOpen(true)}
            className="tap relative flex h-9 w-9 items-center justify-center rounded-[6px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Announcements"
          >
            <Bell className="h-[17px] w-[17px]" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-foreground" />
          </button>

          {/* Role Switcher - swap role without sign-out */}
          <RoleSwitcher />

          <div className="hidden sm:flex items-center gap-2 rounded-[6px] border border-border bg-card px-2.5 py-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[10px] font-medium text-background">
              {currentStaff.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[11px] font-medium text-foreground truncate max-w-[120px]">
                {currentStaff.name}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {role.label}
              </span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="tap flex h-9 items-center justify-center rounded-[6px] border border-border bg-background text-foreground hover:bg-accent transition-colors sm:gap-1.5 sm:px-2.5"
            aria-label="Sign out"
          >
            <LogOut className="h-[17px] w-[17px]" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* ── Body: left rail + content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop left rail (lg+) - collapses to 56px when navCollapsed */}
        <nav
          aria-label="Superadmin sections"
          className={cn(
            "hidden lg:flex shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200",
            navCollapsed ? "w-[56px]" : "w-[224px]",
          )}
        >
          <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
            {GROUPS.map((group) => {
              const items = visibleNav.filter((i) => i.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group} className="mb-1.5">
                  {!navCollapsed && (
                    <div className="px-3 py-1.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                      {group}
                    </div>
                  )}
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = safeActive === item.id;
                    const itemAccess = canAccess(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActive(item.id)}
                        aria-current={isActive ? "page" : undefined}
                        title={navCollapsed ? item.label : undefined}
                        className={cn(
                          "tap group flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors",
                          isActive
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground",
                          navCollapsed && "justify-center",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isActive ? "text-background" : "text-muted-foreground group-hover:text-foreground",
                          )}
                        />
                        {!navCollapsed && (
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "text-[12.5px] font-medium leading-tight truncate",
                                  isActive ? "text-background" : "text-foreground",
                                )}
                              >
                                {item.label}
                              </span>
                              {itemAccess === "read" && (
                                <span
                                  className={cn(
                                    "rounded-[2px] px-1 py-0 text-[8px] font-medium uppercase tracking-wider",
                                    isActive ? "bg-background/20 text-background" : "bg-muted text-muted-foreground",
                                  )}
                                >
                                  R
                                </span>
                              )}
                            </div>
                            <div
                              className={cn(
                                "text-[10px] mt-0.5 leading-tight truncate",
                                isActive ? "text-background/70" : "text-muted-foreground",
                              )}
                            >
                              {item.description}
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })})
                </div>
              );
            })}
          </div>

          {/* Staff footer */}
          {!navCollapsed && (
            <div className="border-t border-border p-2.5">
              <div className="rounded-[6px] border border-border bg-background p-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <ShieldCheck className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Access
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground tabular">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                    {writeCount} write
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full border border-foreground" />
                    {readCount} read
                  </span>
                </div>
                {role.canApproveHighImpact && (
                  <div className="mt-1.5 rounded-[3px] bg-foreground/5 px-1.5 py-1 text-[9px] font-medium text-foreground">
                    High-impact approvals enabled
                  </div>
                )}
              </div>
            </div>
          )}
        </nav>

        {/* Mobile drawer (< lg) - slide-in-from-left with backdrop */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-background/70 backdrop-blur-sm"
              onClick={() => setMobileNavOpen(false)}
              aria-hidden
            />
            {/* Drawer */}
            <div className="absolute left-0 top-0 flex h-full w-[280px] max-w-[85vw] flex-col border-r border-border bg-card shadow-xl animate-in slide-in-from-left duration-200">
              {/* Drawer header */}
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-foreground text-[12px] font-bold text-background">
                    RZ
                  </span>
                  <span className="truncate text-[14px] font-medium tracking-tight">Reanzly Internal</span>
                </div>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="tap flex h-9 w-9 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label="Close navigation"
                >
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>
              {/* Mobile search */}
              <div className="shrink-0 border-b border-border p-2.5">
                <div className="relative flex h-9 items-center">
                  <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search sections..."
                    className="h-9 w-full rounded-[6px] border border-border bg-muted/40 pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/15"
                  />
                </div>
              </div>
              {/* Nav list */}
              <div className="scrollbar-thin flex-1 overflow-y-auto py-2">
                {GROUPS.map((group) => {
                  const items = visibleNav.filter((i) => i.group === group);
                  if (items.length === 0) return null;
                  return (
                    <div key={group} className="mb-1.5">
                      <div className="px-3 py-1.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                        {group}
                      </div>
                      {items.map((item) => {
                        const Icon = item.icon;
                        const isActive = safeActive === item.id;
                        const itemAccess = canAccess(item.id);
                        return (
                          <button
                            key={item.id}
                            onClick={() => selectSubView(item.id)}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                              "tap group flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors",
                              isActive
                                ? "bg-foreground text-background"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground",
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-4 w-4 shrink-0",
                                isActive ? "text-background" : "text-muted-foreground group-hover:text-foreground",
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "text-[12.5px] font-medium leading-tight truncate",
                                    isActive ? "text-background" : "text-foreground",
                                  )}
                                >
                                  {item.label}
                                </span>
                                {itemAccess === "read" && (
                                  <span
                                    className={cn(
                                      "rounded-[2px] px-1 py-0 text-[8px] font-medium uppercase tracking-wider",
                                      isActive ? "bg-background/20 text-background" : "bg-muted text-muted-foreground",
                                    )}
                                  >
                                    R
                                  </span>
                                )}
                              </div>
                              <div
                                className={cn(
                                  "text-[10px] mt-0.5 leading-tight truncate",
                                  isActive ? "text-background/70" : "text-muted-foreground",
                                )}
                              >
                                {item.description}
                              </div>
                            </div>
                          </button>
                        );
                      })})
                    </div>
                  );
                })}
              </div>
              {/* Drawer footer - staff + sign out */}
              <div className="shrink-0 border-t border-border p-2.5">
                <div className="rounded-[6px] border border-border bg-background p-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-medium text-background">
                      {currentStaff.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium text-foreground">{currentStaff.name}</div>
                      <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">{role.label}</div>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="tap flex h-9 w-9 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      aria-label="Sign out"
                    >
                      <LogOut className="h-[18px] w-[18px]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Alert banner - surfaces system-wide alerts above the content */}
          <AlertBanner />

          {/* Role context strip - surfaces the active role + access on this view */}
          <RoleContextStrip activeView={safeActive} />

          {/* Breadcrumb + read-only banner */}
          <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="hidden sm:inline">Reanzly</span>
              <ChevronRight className="hidden h-3 w-3 sm:inline" />
              <span className="hidden sm:inline">Admin</span>
              <ChevronRight className="h-3 w-3 shrink-0" />
              <span className="truncate font-medium text-foreground">
                {SUB_NAV.find((i) => i.id === safeActive)?.label ?? safeActive}
              </span>
            </div>
            {activeAccess === "read" && (
              <span className="rounded-[3px] border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Read-only view
              </span>
            )}
          </div>

          {/* Scrollable content */}
          <div className="flex flex-1 flex-col overflow-y-auto scrollbar-thin">
            <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
              <ErrorBoundary label={SUB_NAV.find((i) => i.id === safeActive)?.label ?? safeActive}>
                {safeActive === "overview" && <OverviewView onNavigate={(v) => setActive(v as AdminSubView)} />}
                {safeActive === "organizations" && <OrganizationsView />}
                {safeActive === "users" && <UsersView />}
                {safeActive === "billing" && <BillingView />}
                {safeActive === "tickets" && <TicketsView />}
                {safeActive === "broadcasts" && <BroadcastsView />}
                {safeActive === "automations" && <AutomationsView />}
                {safeActive === "slm" && <SLMView />}
                {safeActive === "integrations" && <IntegrationsView />}
                {safeActive === "sync" && <OfflineSyncView />}
                {safeActive === "backups" && <BackupsView />}
                {safeActive === "internal-team" && <InternalTeamView />}
                {safeActive === "audit" && <AuditView />}
                {safeActive === "settings" && <SettingsView />}
                {safeActive === "neural-core" && <NeuralCoreView />}
                {safeActive === "marketplace" && <MarketplaceView />}
                {safeActive === "developer-api" && <DeveloperApiView />}
                {safeActive === "compliance" && <ComplianceView />}
                {safeActive === "knowledge" && <KnowledgeView />}
                {safeActive === "field-service" && <FieldServiceView />}
              </ErrorBoundary>
            </div>
            <SuperAdminFooter />
          </div>
        </main>
      </div>

      {/* Overlays */}
      <AnnouncementsCenter />
    </div>
  );
}

function SuperAdminFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-2 text-[11px] text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-3">
          <span className="font-medium text-foreground">Reanzly</span>
          <span>·</span>
          <span>Internal team portal</span>
        </div>
        <div className="flex items-center gap-3">
          <span>DPDP + GDPR compliant</span>
          <span>·</span>
          <span>Row-level tenant isolation</span>
          <span>·</span>
          <span className="tabular">v3.2 · Production</span>
        </div>
      </div>
    </footer>
  );
}

export default SuperAdminShell;

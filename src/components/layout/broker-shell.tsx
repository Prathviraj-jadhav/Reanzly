"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/app-store";
import { AlertBanner } from "@/components/layout/alert-banner";
import { AnnouncementsCenter } from "@/components/layout/announcements-center";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { BrokerConsoleModule } from "@/components/modules/broker-network/broker-console";
import { BrokerMarketplaceModule } from "@/components/modules/broker-network/broker-marketplace";
import { BrokerSettlementsModule } from "@/components/modules/broker-network/broker-settlements";
import { BrokerOverview } from "@/components/modules/broker-network/broker-overview";
import { BrokerRateCard } from "@/components/modules/broker-network/broker-rate-card";
import { BrokerDirectoryListing } from "@/components/modules/broker-network/broker-directory-listing";
import { BrokerBankDetails } from "@/components/modules/broker-network/broker-bank-details";
import { BrokerSettings } from "@/components/modules/broker-network/broker-settings";
import { BrokerQuotes } from "@/components/modules/broker-network/broker-quotes";
import { BrokerSubBrokers } from "@/components/modules/broker-network/broker-sub-brokers-list";
import { BrokerLaneCoverage } from "@/components/modules/broker-network/broker-lane-coverage";
import { BrokerLedger } from "@/components/modules/broker-network/broker-ledger";
import { BrokerPayouts } from "@/components/modules/broker-network/broker-payouts";
import { BrokerTaxTDS } from "@/components/modules/broker-network/broker-tax-tds";
import { BrokerAnalytics } from "@/components/modules/broker-network/broker-analytics";
import { BrokerDocuments } from "@/components/modules/broker-network/broker-documents";
import { BrokerCompliance } from "@/components/modules/broker-network/broker-compliance";
import { BrokerSupport } from "@/components/modules/broker-network/broker-support";
import {
  LayoutDashboard,
  Inbox,
  Store,
  Send,
  Users,
  MapPin,
  Tags,
  Gavel,
  BookText,
  Banknote,
  Receipt,
  Building2,
  Landmark,
  Settings as SettingsIcon,
  LogOut,
  Search,
  Bell,
  ChevronRight,
  Menu,
  X,
  Handshake,
  Command,
  BarChart3,
  FolderArchive,
  ShieldCheck,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";

/* ============================================================
   BrokerShell
   ------------------------------------------------------------
   A separate full-screen shell for the Reanzly Broker portal
   (broker.reanzly.com). Brokers get their own panel - separate
   from the App portal that logistics companies use - where they
   manage their freight brokerage end-to-end: resell Reanzly
   capacity with their own markup, manage sub-brokers, quote on
   marketplace loads, run settlement cycles, and edit their
   public directory listing + bank details + commercial settings.

   Pattern mirrors SuperAdminShell:
     - slim top bar (brand + broker badge + search + notifications
       + signed-in user + sign out)
     - left rail of sub-views grouped (Operations / Network /
       Finance / Profile)
     - main content area renders the active sub-view
     - mobile: hamburger opens a drawer

   State machine:BrokerShell renders only when portal === "broker"
   (gated in AppShell). The authUser is guaranteed to be set.
   Local `active` state controls which sub-view shows - no
   global Zustand navigation needed.
   ============================================================ */

type BrokerSubView =
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

interface SubNavItem {
  id: BrokerSubView;
  label: string;
  description: string;
  icon: LucideIcon;
  group: "Operations" | "Network" | "Finance" | "Profile";
}

const SUB_NAV: SubNavItem[] = [
  // Operations
  { id: "overview", label: "Overview", description: "Brokerage at a glance", icon: LayoutDashboard, group: "Operations" },
  { id: "enquiries", label: "Enquiries", description: "Inbound load enquiries", icon: Inbox, group: "Operations" },
  { id: "marketplace", label: "Marketplace", description: "Browse open loads", icon: Store, group: "Operations" },
  { id: "quotes", label: "Quotes", description: "Quotes you've sent", icon: Send, group: "Operations" },
  { id: "analytics", label: "Analytics & Insights", description: "Lane profit + win rates", icon: BarChart3, group: "Operations" },
  // Network
  { id: "sub-brokers", label: "Sub-Brokers", description: "Your broker network", icon: Users, group: "Network" },
  { id: "lane-coverage", label: "Lane Coverage", description: "Lanes you resell on", icon: MapPin, group: "Network" },
  { id: "rate-card", label: "Rate Card", description: "Resale rates + markup", icon: Tags, group: "Network" },
  // Finance
  { id: "settlements", label: "Settlements", description: "Commission cycles", icon: Gavel, group: "Finance" },
  { id: "ledger", label: "Ledger", description: "Credits + payout debits", icon: BookText, group: "Finance" },
  { id: "payouts", label: "Payouts", description: "NACH bank advice", icon: Banknote, group: "Finance" },
  { id: "tax-tds", label: "Tax & TDS", description: "GST + TDS @ 1%", icon: Receipt, group: "Finance" },
  { id: "compliance", label: "Compliance", description: "GST returns + licenses", icon: ShieldCheck, group: "Finance" },
  // Profile
  { id: "directory-listing", label: "Directory Listing", description: "Public profile card", icon: Building2, group: "Profile" },
  { id: "bank-details", label: "Bank Details", description: "NACH account", icon: Landmark, group: "Profile" },
  { id: "documents", label: "Documents", description: "Broker document vault", icon: FolderArchive, group: "Profile" },
  { id: "support", label: "Help & Support", description: "Raise tickets to Reanzly", icon: LifeBuoy, group: "Profile" },
  { id: "settings", label: "Settings", description: "Markup, cycle, GST", icon: SettingsIcon, group: "Profile" },
];

const GROUPS: SubNavItem["group"][] = ["Operations", "Network", "Finance", "Profile"];

export function BrokerShell() {
  const authUser = useAppStore((s) => s.authUser);
  const logout = useAppStore((s) => s.logout);
  const setAnnounceOpen = useAppStore((s) => s.setAnnounceOpen);
  const [active, setActive] = useState<BrokerSubView>("overview");
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Sub-nav click handler. Wrapped in useCallback so the handler reference
  // is stable across renders - this avoids any chance of a stale closure
  // causing the "needs 2 clicks" symptom on slower sub-views, and ensures
  // the active state updates on the very first click. The mobile-drawer
  // close call is harmless on desktop (the drawer is already closed).
  const selectSubView = useCallback((id: BrokerSubView) => {
    setActive(id);
    setMobileNavOpen(false);
  }, []);

  function handleSignOut() {
    logout();
  }

  const safeActive = SUB_NAV.some((i) => i.id === active) ? active : "overview";
  const activeLabel = SUB_NAV.find((i) => i.id === safeActive)?.label ?? safeActive;

  // Broker display name (fall back to authUser.email or role name).
  const brokerName = authUser?.name ?? "Faisal Ahmed";
  const brokerOrg = authUser?.orgName ?? "Reanzly Broker Network";
  const brokerCode = authUser?.brokerProfile?.brokerCode ?? "RZ-BRK-001";
  const initials = brokerName
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      {/* ── Top bar ── */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
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
            className="tap hidden h-9 w-9 items-center justify-center rounded-[6px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors lg:flex"
            aria-label="Toggle navigation"
          >
            <Command className="h-3.5 w-3.5" />
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-foreground text-[12px] font-bold text-background">
              RZ
            </span>
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="truncate text-[14px] font-semibold tracking-tight">Reanzly</span>
              <span className="hidden shrink-0 rounded-[3px] border border-border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground sm:inline">
                Broker
              </span>
              <span className="hidden shrink-0 text-[11px] tabular text-muted-foreground md:inline">
                broker.reanzly.com
              </span>
            </div>
          </div>
        </div>

        {/* Center search - desktop only */}
        <div className="hidden md:flex max-w-[420px] flex-1 items-center relative">
          <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lanes, sub-brokers, enquiries, settlements..."
            className="h-9 w-full rounded-[6px] border border-border bg-muted/40 pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/15"
          />
          <kbd className="pointer-events-none absolute right-2 hidden h-5 items-center gap-0.5 rounded-[3px] border border-border bg-background px-1 text-[9px] font-medium text-muted-foreground lg:flex">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setAnnounceOpen(true)}
            className="tap relative flex h-9 w-9 items-center justify-center rounded-[6px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors sm:h-8 sm:w-8"
            aria-label="Announcements"
          >
            <Bell className="h-[17px] w-[17px] sm:h-3.5 sm:w-3.5" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-foreground" />
          </button>

          <div className="hidden items-center gap-2 rounded-[6px] border border-border bg-card px-2.5 py-1.5 sm:flex">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
              {initials}
            </div>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="max-w-[120px] truncate text-[11px] font-medium text-foreground">
                {brokerName}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {brokerCode}
              </span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="tap flex h-9 w-9 items-center justify-center rounded-[6px] border border-border bg-background text-foreground hover:bg-accent transition-colors sm:w-auto sm:gap-1.5 sm:px-2.5"
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* ── Body: left rail + content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop left rail (lg+) - collapses to 56px when navCollapsed */}
        <nav
          aria-label="Broker sections"
          className={cn(
            "hidden lg:flex shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200",
            navCollapsed ? "w-[56px]" : "w-[224px]",
          )}
        >
          <div className="scrollbar-thin flex-1 overflow-y-auto py-2">
            {GROUPS.map((group) => {
              const items = SUB_NAV.filter((i) => i.group === group);
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
                    return (
                      <button
                        key={item.id}
                        // Use the unified selectSubView handler on desktop too -
                        // guarantees the same immediate setActive path that
                        // mobile uses, with no chance of a divergent closure.
                        onClick={() => selectSubView(item.id)}
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
                            <span
                              className={cn(
                                "block text-[12.5px] font-medium leading-tight truncate",
                                isActive ? "text-background" : "text-foreground",
                              )}
                            >
                              {item.label}
                            </span>
                            <span
                              className={cn(
                                "mt-0.5 block text-[10px] leading-tight truncate",
                                isActive ? "text-background/70" : "text-muted-foreground",
                              )}
                            >
                              {item.description}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Broker footer card */}
          {!navCollapsed && (
            <div className="border-t border-border p-2.5">
              <div className="rounded-[5px] border border-border bg-background p-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Handshake className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Brokerage
                  </span>
                </div>
                <div className="truncate text-[11.5px] font-medium text-foreground">
                  {brokerOrg}
                </div>
                <div className="mt-0.5 truncate text-[10px] text-muted-foreground tabular">
                  {brokerCode}
                </div>
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
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-foreground text-[12px] font-bold text-background">
                    RZ
                  </span>
                  <span className="truncate text-[14px] font-semibold tracking-tight">Reanzly Broker</span>
                </div>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="tap flex h-9 w-9 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
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
                  const items = SUB_NAV.filter((i) => i.group === group);
                  if (items.length === 0) return null;
                  return (
                    <div key={group} className="mb-1.5">
                      <div className="px-3 py-1.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                        {group}
                      </div>
                      {items.map((item) => {
                        const Icon = item.icon;
                        const isActive = safeActive === item.id;
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
                              <span
                                className={cn(
                                  "block text-[12.5px] font-medium leading-tight truncate",
                                  isActive ? "text-background" : "text-foreground",
                                )}
                              >
                                {item.label}
                              </span>
                              <span
                                className={cn(
                                  "mt-0.5 block text-[10px] leading-tight truncate",
                                  isActive ? "text-background/70" : "text-muted-foreground",
                                )}
                              >
                                {item.description}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              {/* Drawer footer - broker + sign out */}
              <div className="shrink-0 border-t border-border p-2.5">
                <div className="rounded-[5px] border border-border bg-background p-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium text-foreground">{brokerName}</div>
                      <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">{brokerCode}</div>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="tap flex h-9 w-9 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      aria-label="Sign out"
                    >
                      <LogOut className="h-4 w-4" />
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

          {/* Breadcrumb */}
          <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="hidden sm:inline">Reanzly</span>
              <ChevronRight className="hidden h-3 w-3 sm:inline" />
              <span className="hidden sm:inline">Broker</span>
              <ChevronRight className="h-3 w-3 shrink-0" />
              <span className="truncate font-medium text-foreground">{activeLabel}</span>
            </div>
            <span className="hidden rounded-[3px] border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
              {brokerCode}
            </span>
          </div>

          {/* Scrollable content */}
          <div className="scrollbar-thin flex flex-1 flex-col overflow-y-auto">
            <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
              <ErrorBoundary label={activeLabel}>
                {safeActive === "overview" && (
                  <BrokerOverview onNavigate={(v) => selectSubView(v as BrokerSubView)} />
                )}
                {safeActive === "enquiries" && <BrokerConsoleModule />}
                {safeActive === "marketplace" && <BrokerMarketplaceModule />}
                {safeActive === "quotes" && <BrokerQuotes />}
                {safeActive === "sub-brokers" && <BrokerSubBrokers />}
                {safeActive === "lane-coverage" && <BrokerLaneCoverage />}
                {safeActive === "rate-card" && <BrokerRateCard />}
                {safeActive === "settlements" && <BrokerSettlementsModule />}
                {safeActive === "ledger" && <BrokerLedger />}
                {safeActive === "payouts" && <BrokerPayouts />}
                {safeActive === "tax-tds" && <BrokerTaxTDS />}
                {safeActive === "compliance" && <BrokerCompliance />}
                {safeActive === "directory-listing" && <BrokerDirectoryListing />}
                {safeActive === "bank-details" && <BrokerBankDetails />}
                {safeActive === "analytics" && <BrokerAnalytics />}
                {safeActive === "documents" && <BrokerDocuments />}
                {safeActive === "support" && <BrokerSupport />}
                {safeActive === "settings" && <BrokerSettings />}
              </ErrorBoundary>
            </div>
            <BrokerFooter />
          </div>
        </main>
      </div>

      {/* Overlays */}
      <AnnouncementsCenter />
    </div>
  );
}

function BrokerFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-2 text-[11px] text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-3">
          <span className="font-medium text-foreground">Reanzly</span>
          <span>·</span>
          <span>Broker portal</span>
          <span>·</span>
          <span>broker.reanzly.com</span>
        </div>
        <div className="flex items-center gap-3">
          <span>DPDP + GDPR compliant</span>
          <span>·</span>
          <span>NACH registered</span>
          <span>·</span>
          <span className="tabular">v3.2 · Production</span>
        </div>
      </div>
    </footer>
  );
}

export default BrokerShell;

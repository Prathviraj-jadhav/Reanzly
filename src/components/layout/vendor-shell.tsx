"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/app-store";
import { AlertBanner } from "@/components/layout/alert-banner";
import { AnnouncementsCenter } from "@/components/layout/announcements-center";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { VendorOverview } from "@/components/modules/vendor-portal/vendor-overview";
import { VendorShipments } from "@/components/modules/vendor-portal/vendor-shipments";
import { VendorTracking } from "@/components/modules/vendor-portal/vendor-tracking";
import { VendorInvoices } from "@/components/modules/vendor-portal/vendor-invoices";
import { VendorPODs } from "@/components/modules/vendor-portal/vendor-pods";
import { VendorDocuments } from "@/components/modules/vendor-portal/vendor-documents";
import { VendorLedger } from "@/components/modules/vendor-portal/vendor-ledger";
import { VendorProfile } from "@/components/modules/vendor-portal/vendor-profile";
import { VendorAnalytics } from "@/components/modules/vendor-portal/vendor-analytics";
import { VendorRFQ } from "@/components/modules/vendor-portal/vendor-rfq";
import { VendorSupport } from "@/components/modules/vendor-portal/vendor-support";
import { type VendorSubView } from "@/components/modules/vendor-portal/_helpers";
import { MarketplaceSite } from "@/components/marketing/marketplace-site";
import {
  LayoutDashboard,
  Truck,
  MapPin,
  FileText,
  ClipboardCheck,
  FolderArchive,
  BookText,
  Building2,
  LogOut,
  Search,
  Bell,
  ChevronRight,
  Menu,
  X,
  Command,
  Lock,
  BarChart3,
  Send,
  LifeBuoy,
  Store,
  type LucideIcon,
} from "lucide-react";

/* ============================================================
   VendorShell
   ------------------------------------------------------------
   A separate full-screen shell for the Reanzly Vendor portal
   (vendor.reanzly.com). Vendors get their own panel - separate
   from the App portal that logistics companies use - where they
   see a focused, read-only view of THEIR shipments, invoices,
   PODs, documents, ledger, and profile. No desktop sidebar, no
   22+ modules, no edit/create surfaces.

   Pattern mirrors BrokerShell + SuperAdminShell:
     - slim top bar (brand + Vendor badge + search + notifications
       + signed-in user + sign out)
     - left rail of sub-views grouped (Operations / Finance /
       Account)
     - main content area renders the active sub-view
     - mobile: hamburger opens a drawer
     - role-context strip below the breadcrumb that says
       "Vendor Portal · Read-only access · Your shipments,
       invoices, PODs"

   State machine: VendorShell renders only when portal ===
   "vendor" (gated in AppShell). The authUser is guaranteed to
   be set. Local `active` state controls which sub-view shows -
   no global Zustand navigation needed.
   ============================================================ */

interface SubNavItem {
  id: VendorSubView;
  label: string;
  description: string;
  icon: LucideIcon;
  group: "Operations" | "Finance" | "Account";
}

const SUB_NAV: SubNavItem[] = [
  // Operations
  { id: "overview", label: "Overview", description: "Your shipments at a glance", icon: LayoutDashboard, group: "Operations" },
  { id: "shipments", label: "My Shipments", description: "All your trips", icon: Truck, group: "Operations" },
  { id: "tracking", label: "Live Tracking", description: "In-transit GPS view", icon: MapPin, group: "Operations" },
  { id: "pods", label: "PODs", description: "Proof of delivery", icon: ClipboardCheck, group: "Operations" },
  { id: "analytics", label: "Analytics", description: "Shipment performance", icon: BarChart3, group: "Operations" },
  { id: "rfq", label: "RFQ / Quotes", description: "Respond to freight RFQs", icon: Send, group: "Operations" },
  { id: "marketplace", label: "Marketplace", description: "Rent trucks & browse loads", icon: Store, group: "Operations" },
  // Finance
  { id: "invoices", label: "Invoices", description: "Your invoices + payments", icon: FileText, group: "Finance" },
  { id: "ledger", label: "Ledger", description: "Account statement", icon: BookText, group: "Finance" },
  { id: "documents", label: "Documents", description: "LR, eWay, statements", icon: FolderArchive, group: "Finance" },
  // Account
  { id: "profile", label: "Profile", description: "Company + contact info", icon: Building2, group: "Account" },
  { id: "support", label: "Support", description: "Raise support tickets", icon: LifeBuoy, group: "Account" },
];

const GROUPS: SubNavItem["group"][] = ["Operations", "Finance", "Account"];

export function VendorShell() {
  const authUser = useAppStore((s) => s.authUser);
  const logout = useAppStore((s) => s.logout);
  const setAnnounceOpen = useAppStore((s) => s.setAnnounceOpen);
  const [active, setActive] = useState<VendorSubView>("overview");
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState<{ vendorId: string; companyName: string; contactPerson: string } | null>(null);

  useEffect(() => {
    fetch("/api/vendor-portal/profile")
      .then((r) => (r.ok ? r.json() : { profile: null }))
      .then(({ profile }) => setProfile(profile))
      .catch(() => {});
  }, []);

  function selectSubView(id: VendorSubView) {
    setActive(id);
    setMobileNavOpen(false);
  }

  function handleSignOut() {
    logout();
  }

  const safeActive = SUB_NAV.some((i) => i.id === active) ? active : "overview";
  const activeLabel = SUB_NAV.find((i) => i.id === safeActive)?.label ?? safeActive;

  // Vendor display name (fall back to authUser.email or the real Customer profile).
  const vendorName = authUser?.name ?? profile?.contactPerson ?? "Vendor";
  const vendorOrg = authUser?.orgName ?? profile?.companyName ?? "-";
  const vendorCode = profile?.vendorId ?? "-";
  const initials = vendorName
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      {/* ── Top bar ── */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-3 sm:gap-4 sm:px-4">
        {/* Vercel-style: gap-2 generous spacing, all icon buttons 36px (h-9) on
            mobile / 32px (h-8) on desktop, rounded-[6px] tiles, softer borders
            come from globals.css --border oklch(0.922). */}
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
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-foreground text-[12px] font-bold text-background">
              RZ
            </span>
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="truncate text-[14px] font-semibold tracking-tight">Reanzly</span>
              <span className="hidden shrink-0 rounded-[3px] border border-border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground sm:inline">
                Vendor
              </span>
              <span className="hidden shrink-0 text-[11px] tabular text-muted-foreground md:inline">
                vendor.reanzly.com
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
            placeholder="Search shipments, invoices, PODs..."
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
                {vendorName}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {vendorCode}
              </span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="tap flex h-9 w-9 items-center justify-center rounded-[6px] border border-border bg-background text-foreground hover:bg-accent transition-colors sm:w-auto sm:gap-1.5 sm:px-2.5"
            aria-label="Sign out"
          >
            <LogOut className="h-[17px] w-[17px] sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* ── Body: left rail + content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop left rail (lg+) - collapses to 56px when navCollapsed */}
        <nav
          aria-label="Vendor sections"
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

          {/* Vendor footer card */}
          {!navCollapsed && (
            <div className="border-t border-border p-2.5">
              <div className="rounded-[6px] border border-border bg-background p-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Lock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Read-only
                  </span>
                </div>
                <div className="truncate text-[11.5px] font-medium text-foreground">
                  {vendorOrg}
                </div>
                <div className="mt-0.5 truncate text-[10px] text-muted-foreground tabular">
                  {vendorCode}
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
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-foreground text-[12px] font-bold text-background">
                    RZ
                  </span>
                  <span className="truncate text-[14px] font-semibold tracking-tight">Reanzly Vendor</span>
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
              {/* Drawer footer - vendor + sign out */}
              <div className="shrink-0 border-t border-border p-2.5">
                <div className="rounded-[6px] border border-border bg-background p-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium text-foreground">{vendorName}</div>
                      <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">{vendorCode}</div>
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

          {/* Role-context strip - surfaces the vendor's read-only context */}
          <div className="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-border bg-foreground/[0.03] px-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3 shrink-0" />
              <span className="truncate">
                <span className="font-medium text-foreground">Vendor Portal</span>
                <span className="mx-1.5">·</span>
                Read-only access
                <span className="mx-1.5">·</span>
                <span className="hidden sm:inline">Your shipments, invoices, PODs</span>
                <span className="sm:hidden">Shipments, invoices, PODs</span>
              </span>
            </div>
            <span className="hidden shrink-0 rounded-[3px] border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
              {vendorOrg}
            </span>
          </div>

          {/* Breadcrumb */}
          <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="hidden sm:inline">Reanzly</span>
              <ChevronRight className="hidden h-3 w-3 sm:inline" />
              <span className="hidden sm:inline">Vendor</span>
              <ChevronRight className="h-3 w-3 shrink-0" />
              <span className="truncate font-medium text-foreground">{activeLabel}</span>
            </div>
            <span className="hidden rounded-[3px] border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
              {vendorCode}
            </span>
          </div>

          {/* Scrollable content */}
          <div className="scrollbar-thin flex flex-1 flex-col overflow-y-auto">
            <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
              <ErrorBoundary label={activeLabel}>
                {safeActive === "overview" && (
                  <VendorOverview onNavigate={(v) => selectSubView(v)} />
                )}
                {safeActive === "shipments" && (
                  <VendorShipments onNavigate={(v) => selectSubView(v)} />
                )}
                {safeActive === "tracking" && (
                  <VendorTracking onNavigate={(v) => selectSubView(v)} />
                )}
                {safeActive === "invoices" && <VendorInvoices />}
                {safeActive === "pods" && <VendorPODs />}
                {safeActive === "documents" && (
                  <VendorDocuments onNavigate={(v) => selectSubView(v)} />
                )}
                {safeActive === "ledger" && <VendorLedger />}
                {safeActive === "profile" && <VendorProfile />}
                {safeActive === "analytics" && <VendorAnalytics />}
                {safeActive === "rfq" && <VendorRFQ />}
                {safeActive === "support" && <VendorSupport />}
                {safeActive === "marketplace" && <MarketplaceSite isPortal={true} />}
              </ErrorBoundary>
            </div>
            <VendorFooter />
          </div>
        </main>
      </div>

      {/* Overlays */}
      <AnnouncementsCenter />
    </div>
  );
}

function VendorFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-2 text-[11px] text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-3">
          <span className="font-medium text-foreground">Reanzly</span>
          <span>·</span>
          <span>Vendor portal</span>
          <span>·</span>
          <span>vendor.reanzly.com</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Read-only access</span>
          <span>·</span>
          <span>DPDP + GDPR compliant</span>
          <span>·</span>
          <span className="tabular">v3.2 · Production</span>
        </div>
      </div>
    </footer>
  );
}

export default VendorShell;

"use client";

import { useSyncExternalStore } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { Sidebar } from "./sidebar";
import { Header, MobileQuickAddFab } from "./header";
import { AlertBanner } from "./alert-banner";
import { NotificationPanel } from "./notification-panel";
import { AnnouncementsCenter } from "./announcements-center";
import { CommandPalette } from "./command-palette";
import { ChatPanel } from "./chat-panel";
import { TourOverlay } from "./tour-overlay";
import { CompanySwitcher } from "./company-switcher";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { ModuleRouter } from "@/components/modules/router";
import { DriverFieldApp } from "@/components/modules/driver-field";
import { WarehouseFieldApp } from "@/components/modules/warehouse-field";
import { LoginScreen } from "@/components/auth/login-screen";
import { SignupScreen } from "@/components/auth/signup-screen";
import { LandingSite } from "@/components/marketing/landing-site";
import { MarketplaceSite } from "@/components/marketing/marketplace-site";
import { SuperAdminShell } from "./superadmin-shell";
import { BrokerShell } from "./broker-shell";
import { VendorShell } from "./vendor-shell";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { MessageSquare, Loader2 } from "lucide-react";

/**
 * AppShell
 *
 * Auth gate: while the persisted Zustand store hydrates from localStorage we
 * show a minimal monochrome boot splash (avoids SSR/client hydration mismatch
 * on `isAuthenticated`). Once mounted:
 *   - not authenticated + authMode === "signup" → <SignupScreen />
 *   - not authenticated (default) → <LoginScreen />
 *   - authenticated + driver role → <DriverFieldApp />
 *   - authenticated + any other role → full desktop shell
 */
export function AppShell() {
  const { isAuthenticated, authMode, portal, currentRole, chatOpen, setChatOpen, activeView, marketingView } = useAppStore();
  // Offline-first: keep the sync store's online flag wired to the browser and
  // auto-flush the pending mutation queue when connectivity returns.
  useOnlineStatus();
  // useSyncExternalStore gives us a client-only mounted flag without
  // triggering the set-state-in-effect lint rule. Server snapshot returns
  // false (boot splash), client snapshot returns true (real auth state).
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Boot splash - monochrome, matches design system.
  if (!hydrated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-foreground text-[12px] font-bold text-background">
            RZ
          </span>
          <span className="text-[14px] font-semibold tracking-tight">Reanzly</span>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Not logged in → marketing landing site by default. Only render auth
  // screens when the user has explicitly clicked "Sign in" / "Start free
  // trial" (marketingView === "auth"). marketingView is not persisted, so a
  // fresh load always lands on the marketing site. authMode (signin/signup)
  // decides which auth screen renders once marketingView is "auth".
  //
  // "marketplace" renders the public Marketplace site (50+ integration
  // providers, SEO-optimised, browseable without signing in). It is checked
  // before the auth/landing split so it overrides both.
  if (!isAuthenticated) {
    if (marketingView === "marketplace") {
      return <MarketplaceSite />;
    }
    if (marketingView === "auth") {
      return authMode === "signup" ? <SignupScreen /> : <LoginScreen />;
    }
    return <LandingSite />;
  }

  // Driver portal → mobile-first field app (no desktop sidebar/header).
  // We keep the currentRole.id === "driver" fallback so existing persisted
  // sessions (pre-portal) still route correctly. The same portal now also
  // serves warehouse floor crews - a second role sharing the "driver"
  // subdomain/portal but rendering a task-centric app instead of a
  // trip-centric one.
  if (portal === "driver" || currentRole.id === "driver" || currentRole.id === "warehouse-crew") {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        {currentRole.id === "warehouse-crew" ? <WarehouseFieldApp /> : <DriverFieldApp />}
        {/* Overlays still available */}
        <NotificationPanel />
        <CommandPalette />
        <TourOverlay />
        <CompanySwitcher />
      </div>
    );
  }

  // Superadmin portal → completely separate full-screen shell. It does NOT
  // share the desktop Sidebar / Header / Footer. It owns its own chrome
  // (top bar + left rail of sub-views) and gates on the internal-staff
  // login. This fixes the "stuck login inside the desktop shell" and the
  // "double sidebar" issues.
  if (portal === "superadmin") {
    return <SuperAdminShell />;
  }

  // Broker portal → dedicated full-screen shell for freight brokers. Like
  // the superadmin shell, it owns its own chrome (top bar + left rail of
  // broker sub-views) and does not share the desktop Sidebar / Header /
  // Footer. Brokers manage their brokerage end-to-end from here - resale
  // rate card with their markup, sub-brokers, marketplace, settlements,
  // bank details, directory listing, commercial settings.
  if (portal === "broker") {
    return <BrokerShell />;
  }

  // Vendor portal → dedicated full-screen shell for vendors (customers
  // with read-only access). Like the broker shell, it owns its own chrome
  // (top bar + left rail of vendor sub-views) and does not share the
  // desktop Sidebar / Header / Footer. Vendors see only their own
  // shipments, invoices, PODs, documents, ledger, and profile - no
  // 22+ modules, no edit/create surfaces. This delivers on the marketing
  // promise: "Your shipments, live. No noise, no dashboards you'll
  // never use."
  if (portal === "vendor") {
    return <VendorShell />;
  }

  // App portal uses the full desktop shell - the sidebar filters nav by
  // the current role's permissions.

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        {/* Global alert banner - shown above the main content when a
            system-wide alert is set in the store. Dismissible per session. */}
        <AlertBanner />
        <main className="scrollbar-thin flex flex-1 flex-col overflow-y-auto">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-5 sm:py-5 lg:px-8">
            {/* ErrorBoundary wraps the module router so a crash in one
                module renders a graceful fallback instead of a white screen. */}
            <ErrorBoundary label="Module">
              <ModuleRouter />
            </ErrorBoundary>
          </div>
          <Footer />
        </main>
      </div>

      {/* Mobile Quick Add FAB - sits at bottom-right (just left of the chat
          FAB) so power users on mobile can create trips/vehicles/invoices in
          a single tap. Hidden when chat is open (the chat panel covers the
          right side). Visible even when the user is in the chat module
          because the chat panel is what overlaps the FAB, not the module. */}
      <MobileQuickAddFab hidden={chatOpen} />

      {/* Floating chat toggle - hidden when the Chat module is active
          (the user is already in chat, so the FAB would only overlap the
          composer's Send button) or when the chat panel is open. */}
      {!chatOpen && activeView.module !== "chat" && (
        <button
          onClick={() => setChatOpen(true)}
          className="tap fixed bottom-5 right-5 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm hover:bg-accent transition-colors"
          aria-label="Open chat"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      )}

      {/* Chat panel */}
      {chatOpen && <ChatPanel />}

      {/* Overlays */}
      <NotificationPanel />
      <AnnouncementsCenter />
      <CommandPalette />
      <TourOverlay />
      <CompanySwitcher />
    </div>
  );
}

function Footer() {
  // Read the active portal from the store so the footer badge reflects the
  // current product surface (admin / app / driver / vendor).
  const portal = useAppStore((s) => s.portal);
  return (
    <footer className="mt-auto border-t border-border bg-background px-4 py-3 sm:px-5 lg:px-8">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-2 text-[11px] text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-3">
          <span className="font-medium text-foreground">Reanzly</span>
          <span>·</span>
          <span>The logistics operating system</span>
        </div>
        <div className="flex items-center gap-3">
          <span>GDPR · DPDP compliant</span>
          <span>·</span>
          <span>Row-level isolation</span>
          <span>·</span>
          <span>v3.0 · Production</span>
          <span>·</span>
          <span className="font-mono uppercase tracking-wider">{portal} portal</span>
        </div>
      </div>
    </footer>
  );
}

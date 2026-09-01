"use client";

import { Sidebar } from "./sidebar";
import { Header, MobileQuickAddFab } from "./header";
import { AlertBanner } from "./alert-banner";
import { NotificationPanel } from "./notification-panel";
import { AnnouncementsCenter } from "./announcements-center";
import { CommandPalette } from "./command-palette";
import { ChatPanel } from "./chat-panel";
import { IncomingCallOverlay } from "./incoming-call-overlay";
import { TourOverlay } from "./tour-overlay";
import { CompanySwitcher } from "./company-switcher";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { useAppStore } from "@/lib/store/app-store";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { MessageSquare } from "lucide-react";

/**
 * Desktop tenant shell for `/app/*` routes.
 *
 * Wraps authenticated app-portal pages with the same chrome as legacy AppShell
 * (Sidebar, Header, overlays) but renders `{children}` instead of ModuleRouter.
 */
export function AppDesktopShell({ children }: { children: React.ReactNode }) {
  const { chatOpen, setChatOpen, activeView } = useAppStore();
  useOnlineStatus();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <AlertBanner />
        <main className="scrollbar-thin flex flex-1 flex-col overflow-y-auto">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-5 sm:py-5 lg:px-8">
            <ErrorBoundary label="Module">{children}</ErrorBoundary>
          </div>
        </main>
      </div>

      <MobileQuickAddFab hidden={chatOpen} />

      {!chatOpen && activeView.module !== "chat" && (
        <button
          onClick={() => setChatOpen(true)}
          className="tap fixed bottom-5 right-5 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm hover:bg-accent transition-colors"
          aria-label="Open chat"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      )}

      {chatOpen && <ChatPanel />}

      <NotificationPanel />
      <AnnouncementsCenter />
      <CommandPalette />
      <TourOverlay />
      <CompanySwitcher />
      <IncomingCallOverlay />
    </div>
  );
}

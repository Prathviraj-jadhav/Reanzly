"use client";

import { useState } from "react";
import { useWarehouseFieldStore } from "@/lib/store/warehouse-field-store";
import { useAppStore } from "@/lib/store/app-store";
import { WarehouseFieldHome } from "./warehouse-field-home";
import { WarehouseFieldTasks } from "./warehouse-field-tasks";
import { WarehouseFieldCapture } from "./warehouse-field-capture";
import { WarehouseFieldRecords } from "./warehouse-field-records";
import { WarehouseFieldProfile } from "./warehouse-field-profile";
import { Home, ClipboardList, Camera, ScrollText, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Tab = "home" | "tasks" | "capture" | "records" | "profile";

export type { Tab };

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "tasks", label: "Tasks", icon: ClipboardList },
  { id: "capture", label: "Capture", icon: Camera },
  { id: "records", label: "Records", icon: ScrollText },
  { id: "profile", label: "Profile", icon: User },
];

export function WarehouseFieldApp({
  activeTab: controlledTab,
  onNavigate,
}: {
  activeTab?: Tab;
  onNavigate?: (tab: Tab) => void;
} = {}) {
  const [localTab, setLocalTab] = useState<Tab>("home");
  const tab = controlledTab ?? localTab;

  function navigateTab(next: Tab) {
    if (onNavigate) {
      onNavigate(next);
    } else {
      setLocalTab(next);
    }
  }
  const crewName = useWarehouseFieldStore((s) => s.crewName);
  const duty = useWarehouseFieldStore((s) => s.duty);
  const checkOut = useWarehouseFieldStore((s) => s.checkOut);
  const logout = useAppStore((s) => s.logout);

  function handleLogout() {
    // Best practice: clock the crew member out of their shift before tearing
    // down the session so the backend gets a CHECK_OUT record and the
    // godown floor lead sees them as off-shift immediately.
    if (duty.checkedIn) {
      checkOut();
    }
    toast.success("Signed out. See you on the next shift.");
    // Small delay so the toast can paint before the view unmounts.
    setTimeout(() => logout(), 150);
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      {/* Compact top bar - crew name + shift status + logout
          Vercel-style polish: generous spacing, 36px touch targets,
          rounded-[6px] buttons, hairline borders, no shadows. */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <button
          onClick={() => navigateTab("home")}
          className="flex items-center gap-2"
          aria-label="Go home"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-foreground text-[11px] font-semibold text-background">
            R
          </span>
          <div className="flex flex-col leading-none">
            <span className="text-[13px] font-semibold tracking-tight">Reanzly</span>
            <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              Warehouse Crew
            </span>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-[6px] border px-2.5 text-[11px] font-medium",
              duty.checkedIn
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground"
            )}
            title={duty.checkedIn ? "On shift" : "Off shift"}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                duty.checkedIn ? "bg-background animate-pulse" : "bg-muted-foreground"
              )}
            />
            {duty.checkedIn ? "On Shift" : "Off Shift"}
          </div>
          <div className="hidden h-9 items-center rounded-[6px] border border-border px-2.5 text-[11px] font-medium tabular-nums sm:flex">
            {crewName.split(" ").map((p) => p[0]).join("")}
          </div>
          <button
            onClick={handleLogout}
            className="tap flex h-9 items-center gap-1.5 rounded-[6px] border border-border px-2.5 text-[11px] font-medium transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Scrollable screen area */}
      <main
        className="scrollbar-thin flex-1 overflow-y-auto"
        data-e2e-portal="warehouse"
        data-e2e-portal-tab={tab}
      >
        <div className="mx-auto w-full max-w-[640px] px-4 py-4 pb-24">
          {tab === "home" && <WarehouseFieldHome onNavigate={navigateTab} />}
          {tab === "tasks" && <WarehouseFieldTasks />}
          {tab === "capture" && <WarehouseFieldCapture />}
          {tab === "records" && <WarehouseFieldRecords />}
          {tab === "profile" && <WarehouseFieldProfile />}
        </div>
      </main>

      {/* Bottom navigation - mobile-first, touch-friendly (56px targets)
          Vercel-style: 5-tab grid, monochrome, hairline top border,
          backdrop blur, safe-area inset. */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto grid max-w-[640px] grid-cols-5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            const isCapture = t.id === "capture";
            return (
              <button
                key={t.id}
                onClick={() => navigateTab(t.id)}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                aria-label={t.label}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "flex items-center justify-center rounded-full transition-all",
                    isCapture
                      ? cn(
                          "h-8 w-8 border-2",
                          active
                            ? "border-foreground bg-foreground text-background"
                            : "border-foreground text-foreground"
                        )
                      : cn("h-5 w-5", active && "scale-110")
                  )}
                >
                  <Icon className={cn(isCapture ? "h-4 w-4" : "h-[18px] w-[18px]")} />
                </span>
                <span className={cn(isCapture && "sr-only")}>{isCapture ? "Capture" : t.label}</span>
              </button>
            );
          })}
        </div>
        {/* iOS safe-area inset */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}

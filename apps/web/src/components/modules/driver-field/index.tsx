"use client";

import { useState, useEffect } from "react";
import { useDriverStore } from "@/lib/store/driver-store";
import { useAppStore } from "@/lib/store/app-store";
import { useDriverGeolocation } from "@/hooks/use-geolocation";
import { DriverHome } from "./driver-home";
import { DriverTrips } from "./driver-trips";
import { DriverCapture } from "./driver-capture";
import { DriverRecords } from "./driver-records";
import { DriverEarnings } from "./driver-earnings";
import { DriverProfile } from "./driver-profile";
import {
  Home,
  Route,
  Camera,
  ScrollText,
  Wallet,
  User,
  Signal,
  SignalZero,
  Loader2,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Tab = "home" | "trips" | "capture" | "records" | "earnings" | "profile";

export type { Tab };

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "trips", label: "Trips", icon: Route },
  { id: "capture", label: "Capture", icon: Camera },
  { id: "records", label: "Records", icon: ScrollText },
  { id: "earnings", label: "Pay", icon: Wallet },
  { id: "profile", label: "Profile", icon: User },
];

export function DriverFieldApp({
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
  const trackingEnabled = useDriverStore((s) => s.trackingEnabled);
  const setTracking = useDriverStore((s) => s.setTracking);
  const setLocationPermission = useDriverStore((s) => s.setLocationPermission);
  const addPing = useDriverStore((s) => s.addPing);
  const activeTripId = useDriverStore((s) => s.activeTripId);
  const driverName = useDriverStore((s) => s.driverName);
  const checkOut = useDriverStore((s) => s.checkOut);
  const duty = useDriverStore((s) => s.duty);
  const hydrate = useDriverStore((s) => s.hydrate);
  const logout = useAppStore((s) => s.logout);

  // Resolve the real logged-in driver's identity + assigned trips
  // (GET /api/driver/me) on every mount - not just once - so a fresh login
  // (or a reassignment made elsewhere) is always reflected.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  function handleLogout() {
    // Best practice: clock the driver out of duty before tearing down the
    // session so the backend gets a CHECK_OUT record and dispatch sees them
    // as off-duty immediately.
    if (duty.checkedIn) {
      checkOut();
    }
    toast.success("Signed out. Drive safe.");
    // Small delay so the toast can paint before the view unmounts.
    setTimeout(() => logout(), 150);
  }

  // Continuous GPS tracking while enabled
  const geo = useDriverGeolocation(trackingEnabled);

  // Mirror permission state into the store
  useEffect(() => {
    setLocationPermission(geo.permission);
  }, [geo.permission, setLocationPermission]);

  // Push fixes to the store (which mirrors to backend)
  useEffect(() => {
    if (!geo.fix) return;
    addPing({
      tripId: activeTripId || undefined,
      lat: geo.fix.lat,
      lng: geo.fix.lng,
      accuracy: geo.fix.accuracy,
      speed: geo.fix.speed,
      heading: geo.fix.heading,
      altitude: geo.fix.altitude,
    });
  }, [geo.fix?.timestamp]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      {/* Compact top bar - driver name + GPS status + logout
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
              Driver
            </span>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <GpsIndicator
            watching={geo.watching}
            enabled={trackingEnabled}
            hasFix={!!geo.fix}
            onToggle={() => setTracking(!trackingEnabled)}
          />
          <div className="hidden h-9 items-center rounded-[6px] border border-border px-2.5 text-[11px] font-medium tabular-nums sm:flex">
            {driverName.split(" ").map((p) => p[0]).join("")}
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
        data-e2e-portal="driver"
        data-e2e-portal-tab={tab}
      >
        <div className="mx-auto w-full max-w-[640px] px-4 py-4 pb-24">
          {tab === "home" && <DriverHome onNavigate={navigateTab} />}
          {tab === "trips" && <DriverTrips />}
          {tab === "capture" && <DriverCapture />}
          {tab === "records" && <DriverRecords />}
          {tab === "earnings" && <DriverEarnings />}
          {tab === "profile" && <DriverProfile />}
        </div>
      </main>

      {/* Bottom navigation - mobile-first, touch-friendly (56px targets)
          Vercel-style: 6-tab grid, monochrome, hairline top border,
          backdrop blur, safe-area inset. */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto grid max-w-[640px] grid-cols-6">
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

function GpsIndicator({
  watching,
  enabled,
  hasFix,
  onToggle,
}: {
  watching: boolean;
  enabled: boolean;
  hasFix: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex h-9 items-center gap-1.5 rounded-[6px] border border-border px-2.5 text-[11px] font-medium tabular-nums transition-colors hover:bg-accent"
      aria-label={enabled ? "Pause GPS tracking" : "Start GPS tracking"}
      title={enabled ? (hasFix ? "Tracking active" : "Acquiring GPS…") : "GPS paused"}
    >
      {enabled && !hasFix ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : enabled ? (
        <Signal className="h-3.5 w-3.5" />
      ) : (
        <SignalZero className="h-3.5 w-3.5" />
      )}
      <span>{enabled ? (hasFix ? "LIVE" : "···") : "OFF"}</span>
      {enabled && hasFix && (
        <span className="hidden h-1.5 w-1.5 animate-pulse rounded-full bg-foreground sm:inline" />
      )}
    </button>
  );
}

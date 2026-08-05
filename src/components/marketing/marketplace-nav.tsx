"use client";

/**
 * MarketplaceNav — sticky top navigation for the public Vehicle Rental
 * Marketplace.
 *
 * Mirrors the marketing-nav chrome (RZ wordmark + sticky + hairline border +
 * backdrop-blur) but with marketplace-specific actions:
 *   • Wordmark → "Back to home" (setMarketingView("landing"))
 *   • Centre: Tab switcher — Browse Vehicles | Find Loads
 *            + eyebrow "60+ vehicles · 12 open loads"
 *   • Right: List your vehicle (border) + Post a load (filled) + Sign in
 *
 * Mobile collapses to a Sheet with the same tabs + CTAs + Back-to-home entry.
 *
 * Props:
 *   tab          — current tab ("vehicles" | "loads")
 *   onTabChange  — switch tabs
 *   onListVehicle — opens the ListYourVehicleSheet
 *   onPostLoad   — opens the PostLoadSheet
 */

import { useState } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { COMPANY } from "./_data";
import {
  Sheet, SheetContent, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu, ArrowLeft, Truck, Package, Plus, FileText,
} from "lucide-react";
import {
  MARKETPLACE_STATS,
} from "./marketplace-data";

export interface MarketplaceNavProps {
  tab: "vehicles" | "loads";
  onTabChange: (t: "vehicles" | "loads") => void;
  onListVehicle: () => void;
  onPostLoad: () => void;
}

export function MarketplaceNav({
  tab, onTabChange, onListVehicle, onPostLoad,
}: MarketplaceNavProps) {
  const setMarketingView = useAppStore((s) => s.setMarketingView);
  const setAuthMode = useAppStore((s) => s.setAuthMode);
  const [mobileOpen, setMobileOpen] = useState(false);

  function goHome() {
    setMobileOpen(false);
    setMarketingView("landing");
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }
  function goSignIn() {
    setMobileOpen(false);
    setAuthMode("signin");
    setMarketingView("auth");
  }
  function goListVehicle() {
    setMobileOpen(false);
    onListVehicle();
  }
  function goPostLoad() {
    setMobileOpen(false);
    onPostLoad();
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        {/* Wordmark + back-to-home */}
        <button
          type="button"
          onClick={goHome}
          className="tap flex shrink-0 items-center gap-2 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label={`${COMPANY.name} home`}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-foreground text-[11px] font-bold text-background">
            RZ
          </span>
          <span className="hidden text-[15px] font-semibold tracking-tight text-foreground sm:inline">
            {COMPANY.name}
          </span>
          <span className="mx-1 hidden h-4 w-px bg-border sm:inline" />
          <span className="hidden items-center gap-1 text-[12px] text-muted-foreground sm:inline-flex">
            <ArrowLeft className="h-3 w-3" />
            Back to home
          </span>
        </button>

        {/* Centre — desktop tab switcher + count eyebrow */}
        <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 flex-col items-center md:flex">
          <div className="pointer-events-auto flex items-center gap-1 rounded-[6px] border border-border bg-background p-0.5">
            <TabButton
              active={tab === "vehicles"}
              onClick={() => onTabChange("vehicles")}
              icon={<Truck className="h-3 w-3" />}
              label="Browse Vehicles"
            />
            <TabButton
              active={tab === "loads"}
              onClick={() => onTabChange("loads")}
              icon={<Package className="h-3 w-3" />}
              label="Find Loads"
            />
          </div>
          <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            {MARKETPLACE_STATS.totalListings}+ vehicles · {MARKETPLACE_STATS.openLoads} open loads · {MARKETPLACE_STATS.citiesCovered} cities
          </span>
        </div>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={goListVehicle}
            className="tap inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-border px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Plus className="h-3.5 w-3.5" />
            List your vehicle
          </button>
          <button
            type="button"
            onClick={goPostLoad}
            className="tap inline-flex h-9 items-center gap-1.5 rounded-[6px] bg-foreground px-3 text-[12px] font-medium uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
          >
            <FileText className="h-3.5 w-3.5" />
            Post a load
          </button>
          <button
            type="button"
            onClick={goSignIn}
            className="tap h-9 rounded-[6px] px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            Sign in
          </button>
        </div>

        {/* Mobile hamburger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="tap flex h-9 w-9 items-center justify-center rounded-[6px] border border-border text-foreground md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[320px] border-border p-0" showCloseButton={false}>
            <SheetTitle className="sr-only">Vehicle Rental Marketplace navigation</SheetTitle>
            <div className="flex h-16 items-center gap-2 border-b border-border px-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-foreground text-[11px] font-bold text-background">
                RZ
              </span>
              <span className="text-[14px] font-semibold tracking-tight">
                {COMPANY.name} · Marketplace
              </span>
            </div>
            <div className="flex flex-col gap-1 p-4">
              <button
                type="button"
                onClick={goHome}
                className="tap flex items-center gap-2 rounded-[6px] px-3 py-2.5 text-[14px] font-medium text-foreground transition-colors hover:bg-accent"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to home
              </button>

              <p className="mt-3 px-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                Browse
              </p>
              <div className="flex flex-col gap-1 px-3">
                <MobileTabRow
                  active={tab === "vehicles"}
                  onClick={() => { setMobileOpen(false); onTabChange("vehicles"); }}
                  icon={<Truck className="h-4 w-4" />}
                  label="Browse Vehicles"
                  description={`${MARKETPLACE_STATS.totalListings}+ verified vehicles for rent`}
                />
                <MobileTabRow
                  active={tab === "loads"}
                  onClick={() => { setMobileOpen(false); onTabChange("loads"); }}
                  icon={<Package className="h-4 w-4" />}
                  label="Find Loads"
                  description={`${MARKETPLACE_STATS.openLoads} open loads posted by shippers`}
                />
              </div>

              <p className="mt-4 px-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                For owners & shippers
              </p>
              <button
                type="button"
                onClick={goListVehicle}
                className="tap flex items-center gap-2 rounded-[6px] px-3 py-2.5 text-[14px] font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Plus className="h-4 w-4" />
                List your vehicle
              </button>
              <button
                type="button"
                onClick={goPostLoad}
                className="tap flex items-center gap-2 rounded-[6px] px-3 py-2.5 text-[14px] font-medium text-foreground transition-colors hover:bg-accent"
              >
                <FileText className="h-4 w-4" />
                Post a load
              </button>
            </div>
            <div className="mt-auto flex flex-col gap-2 border-t border-border p-4">
              <button
                type="button"
                onClick={() => { setMobileOpen(false); setAuthMode("signup"); setMarketingView("auth"); }}
                className="tap flex h-11 items-center justify-center rounded-[6px] bg-foreground text-[13px] font-medium uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
              >
                Get started
              </button>
              <button
                type="button"
                onClick={goSignIn}
                className="tap flex h-11 items-center justify-center rounded-[6px] border border-border text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
              >
                Sign in
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

/* ============================================================
   TabButton — segmented control button (desktop centre switcher)
   ============================================================ */
function TabButton({
  active, onClick, icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "tap flex items-center gap-1.5 rounded-[5px] px-3 py-1.5 text-[12px] font-medium transition-colors " +
        (active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-accent hover:text-foreground")
      }
    >
      {icon}
      {label}
    </button>
  );
}

/* ============================================================
   MobileTabRow — full-width tab row with description (mobile Sheet)
   ============================================================ */
function MobileTabRow({
  active, onClick, icon, label, description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "tap flex items-start gap-2.5 rounded-[6px] border px-3 py-2.5 text-left transition-colors " +
        (active
          ? "border-foreground bg-foreground/5"
          : "border-border hover:bg-accent")
      }
    >
      <span className={active ? "text-foreground" : "text-muted-foreground"}>
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-[13px] font-medium text-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

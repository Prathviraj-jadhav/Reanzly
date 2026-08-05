"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { NAV_LINKS, COMPANY } from "./_data";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";

/**
 * MarketingNav — sticky top navigation for the company landing site.
 *
 * Monochrome Swiss aesthetic: backdrop-blur over page background, hairline
 * bottom border, generous whitespace. Desktop shows the RZ wordmark on the
 * left, 7 anchor nav links in the centre, and "Sign in" + "Get in Touch"
 * CTAs on the right. Mobile collapses to a hamburger that opens a Sheet with
 * the same links + CTAs.
 *
 * "Sign in" flips marketingView to "auth" + authMode to "signin" (AppShell
 * then renders LoginScreen). "Get in Touch" smooth-scrolls to #contact.
 */

function scrollToId(id: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function MarketingNav() {
  const setMarketingView = useAppStore((s) => s.setMarketingView);
  const setAuthMode = useAppStore((s) => s.setAuthMode);
  const [mobileOpen, setMobileOpen] = useState(false);

  function goSignIn() {
    setAuthMode("signin");
    setMarketingView("auth");
  }

  function goMarketplace() {
    setMarketingView("marketplace");
  }

  function goContact() {
    setMobileOpen(false);
    scrollToId("contact");
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Wordmark */}
        <button
          type="button"
          onClick={() => scrollToId("home")}
          className="flex items-center gap-2 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label={`${COMPANY.name} home`}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-foreground text-[11px] font-bold text-background">
            RZ
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            {COMPANY.name}
          </span>
        </button>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-0.5 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-[4px] px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            onClick={goMarketplace}
            className="tap ml-1 inline-flex items-center gap-1 rounded-[4px] border border-border px-2.5 py-1 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            Marketplace
          </button>
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-2 lg:flex">
          <button
            type="button"
            onClick={goSignIn}
            className="h-9 rounded-[6px] px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={goContact}
            className="tap flex h-9 items-center rounded-[6px] bg-foreground px-4 text-[13px] font-medium uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
          >
            Get in Touch
          </button>
        </div>

        {/* Mobile hamburger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="tap flex h-9 w-9 items-center justify-center rounded-[6px] border border-border text-foreground lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] border-border p-0">
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            <div className="flex h-16 items-center gap-2 border-b border-border px-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-foreground text-[11px] font-bold text-background">
                RZ
              </span>
              <span className="text-[15px] font-semibold tracking-tight">
                {COMPANY.name}
              </span>
            </div>
            <nav className="flex flex-col gap-0.5 p-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-[6px] px-3 py-2.5 text-[14px] font-medium text-foreground transition-colors hover:bg-accent"
                >
                  {link.label}
                </a>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  goMarketplace();
                }}
                className="tap mt-1 flex items-center justify-between rounded-[6px] border border-border px-3 py-2.5 text-[14px] font-medium text-foreground transition-colors hover:bg-accent"
              >
                Marketplace
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Rent or list vehicles</span>
              </button>
            </nav>
            <div className="mt-auto flex flex-col gap-2 border-t border-border p-4">
              <button
                type="button"
                onClick={goContact}
                className={cn(
                  "tap flex h-11 items-center justify-center rounded-[6px] bg-foreground text-[13px] font-medium uppercase tracking-wider text-background transition-colors hover:bg-foreground/90",
                )}
              >
                Get in Touch
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  goSignIn();
                }}
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

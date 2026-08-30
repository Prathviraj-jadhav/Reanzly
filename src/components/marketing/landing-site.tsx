"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { MarketingNav } from "./marketing-nav";
import { MarketingHero } from "./marketing-hero";
import { MarketingFeatures } from "./marketing-features";
import { MarketingIntegrations } from "./marketing-integrations";
import { MarketingOptimize } from "./marketing-optimize";
import { MarketingControls } from "./marketing-controls";
import { MarketingTestimonials } from "./marketing-testimonials";
import { MarketingCTA } from "./marketing-cta";
import { MarketingFooter } from "./marketing-footer";
import { LoginScreen } from "@/components/auth/login-screen";
import { SignupScreen } from "@/components/auth/signup-screen";

/**
 * LandingSite — now renders the marketing page AND the auth modal.
 * When `marketingView === "auth"`, a full-screen overlay shows login/signup
 * without navigating away from the landing page (previous page preserved).
 *
 * The auth screens still use setMarketingView("landing") to close themselves,
 * so no changes to LoginScreen or SignupScreen are needed.
 */
export function LandingSite() {
  const marketingView = useAppStore((s) => s.marketingView);
  const authMode = useAppStore((s) => s.authMode);
  const setMarketingView = useAppStore((s) => s.setMarketingView);

  const isAuthOpen = marketingView === "auth";

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isAuthOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isAuthOpen]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isAuthOpen) setMarketingView("landing");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAuthOpen, setMarketingView]);

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#171717] antialiased">
      <MarketingNav />
      <main className="flex-1">
        <MarketingHero />
        <MarketingFeatures />
        <MarketingIntegrations />
        <MarketingOptimize />
        <MarketingControls />
        <MarketingTestimonials />
        <MarketingCTA />
      </main>
      <MarketingFooter />

      {/* Auth modal overlay */}
      {isAuthOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-[#050807]/80 backdrop-blur-sm"
          onClick={(e) => {
            // Close when clicking the backdrop (not the modal content)
            if (e.target === e.currentTarget) setMarketingView("landing");
          }}
        >
          {/* Close button floating top-right */}
          <button
            onClick={() => setMarketingView("landing")}
            className="fixed top-4 right-4 z-[110] flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#050807]/80 text-white/50 backdrop-blur-sm hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Auth screen content (LoginScreen / SignupScreen are full-page components,
              we render them inside the overlay so they fill the viewport) */}
          <div className="w-full min-h-screen">
            {authMode === "signup" ? <SignupScreen /> : <LoginScreen />}
          </div>
        </div>
      )}
    </div>
  );
}

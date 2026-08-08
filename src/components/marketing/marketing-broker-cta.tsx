"use client";

import { useAppStore } from "@/lib/store/app-store";
import { ArrowRight, Handshake } from "lucide-react";

/**
 * MarketingBrokerCta - slim full-width broker-recruitment banner.
 *
 * Section id="brokers". Lives between the directory (above) and the pricing
 * section (below) on the landing page. Sells the Reanzly Broker program:
 * resell Reanzly capacity under your own brand, set your markup, manage
 * sub-brokers and earn on every trip. CTA pushes the visitor into the
 * signup wizard (the businessType step surfaces "Reanzly Broker").
 *
 * Strictly monochrome Swiss/Scandinavian: hairline borders, 6px radii,
 * inverted (foreground-on-background) tile so it stands out without using
 * any hue.
 */
export function MarketingBrokerCta() {
  const setAuthMode = useAppStore((s) => s.setAuthMode);
  const setMarketingView = useAppStore((s) => s.setMarketingView);

  function startBrokerOnboarding() {
    setAuthMode("signup");
    setMarketingView("auth");
  }

  return (
    <section
      id="brokers"
      className="border-b border-border bg-foreground py-16 text-background sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left - icon + headline + value prop */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[6px] border border-background/30 bg-background/10 text-background">
              <Handshake className="h-6 w-6" />
            </div>
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.18em] text-background/60">
                Reanzly Broker Program
              </p>
              <h2 className="mt-2 text-2xl font-medium tracking-tight text-background sm:text-3xl">
                Become a Reanzly Broker
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-background/80">
                Resell Reanzly capacity under your own brand. Set your markup.
                Manage sub-brokers. Earn on every trip.
              </p>
            </div>
          </div>

          {/* Right - CTA */}
          <div className="w-full sm:w-auto">
            <button
              type="button"
              onClick={startBrokerOnboarding}
              className="tap flex h-11 w-full items-center justify-center gap-1.5 rounded-md bg-background px-6 text-sm font-medium uppercase tracking-wider text-foreground transition-opacity hover:bg-background/90 sm:w-auto"
            >
              Start broker onboarding
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useAppStore } from "@/lib/store/app-store";
import {
  SUBSCRIPTION_MODELS,
  type SubscriptionModelDef,
} from "@/lib/onboarding/module-catalog";
import { Check, ArrowRight, Sparkles } from "lucide-react";

/**
 * MarketingPricing - public pricing / payment-options section.
 *
 * Surfaces the three ways a logistics business can pay for Reanzly:
 *   1. SaaS Subscription        - flat monthly fee, full platform.
 *   2. Logistics Partner        - zero flat fee, 7% per booked trip
 *      (the marketplace / commission model). RECOMMENDED.
 *   3. Master Subscription      - SaaS + commission + broker tools, all-in-one.
 *
 * The tiers are sourced from `SUBSCRIPTION_MODELS` so the marketing copy and
 * the signup wizard / billing panel stay in lockstep. Each tier is rendered
 * as a premium monochrome card with a tagline, description, price block,
 * feature bullets (check icons) and a "Start 7-day free trial" CTA that flips
 * the visitor into the signup wizard.
 *
 * Section id="pricing" - placed between the broker CTA and the
 * transformations section on the landing page.
 */
export function MarketingPricing() {
  const setAuthMode = useAppStore((s) => s.setAuthMode);
  const setMarketingView = useAppStore((s) => s.setMarketingView);

  function startTrial() {
    setAuthMode("signup");
    setMarketingView("auth");
  }

  return (
    <section
      id="pricing"
      className="border-b border-border bg-muted/30 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Pricing
          </p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Three ways to pay. Pick what fits your business.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Flat SaaS for fleet owners. Commission for marketplace partners.
            Master for network operators who want it all. Every plan starts
            with a 15-day free trial - no card required.
          </p>
        </div>

        {/* Cards */}
        <div className="stagger mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {SUBSCRIPTION_MODELS.map((model) => (
            <PricingCard key={model.id} model={model} onCta={startTrial} />
          ))}
        </div>

        {/* Sub note */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          All prices in INR, exclusive of applicable taxes. Annual billing
          saves ~17%. Cancel anytime.
        </p>
      </div>
    </section>
  );
}

function PricingCard({
  model,
  onCta,
}: {
  model: SubscriptionModelDef;
  onCta: () => void;
}) {
  const isRecommended = model.recommended === true;
  const isMaster = model.id === "master";

  return (
    <div
      className={
        "relative flex flex-col rounded-lg border bg-card transition-colors " +
        (isRecommended
          ? "border-foreground"
          : "border-border hover:border-foreground/40")
      }
    >
      {/* Recommended ribbon */}
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-background">
            <Sparkles className="h-3 w-3" />
            Recommended
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        {/* Header */}
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            {model.label}
          </h3>
          <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
            {model.highlight}
          </p>
        </div>

        {/* Price block */}
        <div className="mt-5">
          <PriceBlock model={model} />
        </div>

        {/* Tagline */}
        <p className="mt-4 text-sm font-medium text-foreground">
          {model.tagline}
        </p>

        {/* Description */}
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {model.description}
        </p>

        {/* Hairline divider */}
        <div className="my-5 border-t border-border" />

        {/* Features */}
        <ul className="flex flex-col gap-2.5">
          {model.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-xs text-foreground/90"
            >
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA - pushes to bottom of card */}
        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={onCta}
            className={
              "tap flex h-11 w-full items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors " +
              (isMaster || isRecommended
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "border border-border bg-background text-foreground hover:bg-accent")
            }
          >
            Start 15-day free trial
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function PriceBlock({ model }: { model: SubscriptionModelDef }) {
  // Commission-only model: show "₹0" + "7% per trip".
  if (model.id === "commission") {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-medium tabular tracking-tight text-foreground font-mono">
            ₹0
          </span>
          <span className="text-sm text-muted-foreground">flat / month</span>
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground tabular font-mono">
            {model.commissionPct}%
          </span>{" "}
          commission per booked trip
        </p>
      </div>
    );
  }

  // SaaS + Master: show flat fee + optional commission addendum.
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-1.5">
        <span className="text-4xl font-medium tabular tracking-tight text-foreground font-mono">
          ₹{model.flatMonthly.toLocaleString("en-IN")}
        </span>
        <span className="text-sm text-muted-foreground">/ month</span>
      </div>
      {model.commissionPct > 0 ? (
        <p className="text-sm text-muted-foreground">
          +{" "}
          <span className="font-medium text-foreground tabular font-mono">
            {model.commissionPct}%
          </span>{" "}
          commission on marketplace trips
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          No per-trip commission
        </p>
      )}
    </div>
  );
}

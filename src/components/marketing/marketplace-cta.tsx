"use client";

/**
 * MarketplaceCTA — bottom call-to-action band for the Vehicle Rental
 * Marketplace.
 *
 * Two primary CTAs for the two marketplace audiences:
 *   1. "List your vehicle" — for vehicle owners with idle capacity
 *      → opens the ListYourVehicleSheet
 *   2. "Post a load" — for shippers needing capacity
 *      → opens the PostLoadSheet
 *
 * Plus a tertiary "Create a free account" CTA that flips marketingView
 * to "auth" with signup mode (so the visitor lands on the signup wizard).
 *
 * The band is inverted (bg-foreground text-background) so it stands apart
 * from the white catalogue above it. Monochrome — no hues.
 */

import { ArrowRight, Truck, Package, UserPlus } from "lucide-react";

export interface MarketplaceCTAProps {
  onListVehicle: () => void;
  onPostLoad: () => void;
  onSignUp: () => void;
}

export function MarketplaceCTA({
  onListVehicle, onPostLoad, onSignUp,
}: MarketplaceCTAProps) {
  return (
    <section
      id="marketplace-cta"
      aria-labelledby="marketplace-cta-title"
      className="border-t border-border bg-foreground text-background"
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          {/* Left — copy */}
          <div>
            <span className="inline-flex items-center rounded-full border border-background/30 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-background/80">
              For vehicle owners &amp; shippers
            </span>
            <h2
              id="marketplace-cta-title"
              className="mt-4 text-[28px] font-medium leading-tight tracking-tight sm:text-[36px]"
            >
              Put your fleet to work — or find the right vehicle in minutes.
            </h2>
            <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-background/70">
              List your truck, trailer, or tempo traveller and reach verified
              shippers across India. Or post a load and let owners come to you.
              KYC-verified owners, escrow-held payments, dispute mediation
              within 48 hours.
            </p>

            {/* Mini stat row */}
            <dl className="mt-6 grid max-w-md grid-cols-3 gap-px overflow-hidden rounded-[6px] border border-background/20 bg-background/10">
              <CTAStatCell value="0%" label="Listing fee" />
              <CTAStatCell value="48h" label="Dispute SLA" />
              <CTAStatCell value="100%" label="KYC verified" />
            </dl>
          </div>

          {/* Right — action stack */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onListVehicle}
              className="tap group flex items-center justify-between gap-3 rounded-[6px] bg-background px-5 py-4 text-left text-foreground transition-colors hover:bg-background/90"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-[5px] border border-border bg-muted/30">
                  <Truck className="h-5 w-5" aria-hidden />
                </span>
                <span className="flex flex-col">
                  <span className="text-[15px] font-semibold tracking-tight">List your vehicle</span>
                  <span className="text-[12px] text-muted-foreground">
                    Free for owners · live in 24 hours
                  </span>
                </span>
              </span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              type="button"
              onClick={onPostLoad}
              className="tap group flex items-center justify-between gap-3 rounded-[6px] border border-background/30 px-5 py-4 text-left text-background transition-colors hover:bg-background/10"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-[5px] border border-background/30 bg-background/10">
                  <Package className="h-5 w-5" aria-hidden />
                </span>
                <span className="flex flex-col">
                  <span className="text-[15px] font-semibold tracking-tight">Post a load</span>
                  <span className="text-[12px] text-background/60">
                    For shippers · receive bids in hours
                  </span>
                </span>
              </span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              type="button"
              onClick={onSignUp}
              className="tap inline-flex h-11 items-center justify-center gap-1.5 rounded-[6px] border border-background/30 px-4 text-[13px] font-medium uppercase tracking-wider text-background transition-colors hover:bg-background/10"
            >
              <UserPlus className="h-4 w-4" />
              Create a free account
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTAStatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center bg-foreground px-3 py-3">
      <dt className="text-[10px] font-medium uppercase tracking-wider text-background/60">
        {label}
      </dt>
      <dd className="mt-1 text-[18px] font-semibold tabular tracking-tight text-background">
        {value}
      </dd>
    </div>
  );
}

"use client";

/**
 * MarketplaceLoadsSection - the "Find Loads" tab content.
 *
 * Rendered when the visitor clicks "Find Loads" in the MarketplaceNav.
 * Composes:
 *   • A hero-style header with H1 "Find Loads Pan-India - Browse Open Freight
 *     from Verified Shippers" + subhead + 3-tile stats strip + a "Post a load"
 *     CTA for shippers who don't see the lane they need.
 *   • The LoadsGrid from marketplace-grid.tsx with the seed LOAD_LISTINGS.
 *
 * SEO: keyword-rich H1 + H2 + semantic <main>/<section>/<article>.
 * The hero uses the same grid texture + mask as the vehicle hero so the
 * two tabs feel like siblings.
 *
 * Props:
 *   loads           - the LOAD_LISTINGS seed array
 *   onApply         - called with the LoadListing when the user clicks
 *                     "Apply for this load" (the parent toasts a confirmation)
 *   onPostLoad      - opens the PostLoadSheet (when the visitor is a shipper
 *                     who can't find a matching open load)
 *   onBrowseVehicles - flips back to the Vehicles tab (tertiary CTA)
 */

import {
  Package, MapPin, Truck, IndianRupee, FileText, ArrowRight, Users,
} from "lucide-react";
import {
  MARKETPLACE_STATS,
  type LoadListing,
} from "./marketplace-data";
import { LoadsGrid } from "./marketplace-grid";

export interface MarketplaceLoadsSectionProps {
  loads: LoadListing[];
  onApply: (load: LoadListing) => void;
  onPostLoad: () => void;
  onBrowseVehicles: () => void;
}

export function MarketplaceLoadsSection({
  loads, onApply, onPostLoad, onBrowseVehicles,
}: MarketplaceLoadsSectionProps) {
  // Aggregate stats - total budget across open loads, distinct shippers,
  // distinct origin cities.
  const totalBudget = loads.reduce((s, l) => s + l.budget, 0);
  const distinctShippers = new Set(loads.map((l) => l.shipper)).size;
  const distinctOrigins = new Set(loads.map((l) => l.origin)).size;

  return (
    <>
      <section
        id="loads-hero"
        className="relative overflow-hidden border-b border-border bg-background"
        aria-labelledby="loads-hero-title"
      >
        {/* Grid texture */}
        <div
          className="bg-grid pointer-events-none absolute inset-0 opacity-30"
          style={{
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 80%)",
          }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-5xl px-6 py-16 text-center sm:py-20 lg:py-24">
          {/* Eyebrow */}
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Reanzly Load Board
            </span>
          </div>

          {/* H1 - keyword-rich */}
          <h1
            id="loads-hero-title"
            className="mx-auto max-w-3xl text-[32px] font-medium leading-[1.1] tracking-tight text-foreground sm:text-[42px] lg:text-[40px]"
          >
            Find Loads Pan-India - Browse Open Freight from Verified Shippers
          </h1>

          {/* Subhead */}
          <p className="mx-auto mt-5 max-w-2xl text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
            {MARKETPLACE_STATS.openLoads} open loads from Indian shippers -
            Tata Steel, Reliance Retail, Sun Pharma, Amazon, ITC, Asian Paints
            and more. Apply to carry, get escrow-protected payment on delivery.
          </p>

          {/* CTAs */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={onPostLoad}
              className="tap inline-flex h-11 items-center justify-center gap-1.5 rounded-[6px] bg-foreground px-5 text-[13px] font-medium uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
            >
              <FileText className="h-3.5 w-3.5" />
              Post a load
            </button>
            <button
              type="button"
              onClick={onBrowseVehicles}
              className="tap inline-flex h-11 items-center justify-center gap-1.5 rounded-[6px] border border-border px-5 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Truck className="h-3.5 w-3.5" />
              Browse vehicles instead
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Stats strip */}
          <dl className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-border bg-border sm:grid-cols-4">
            <StatCell icon={<Package className="h-3 w-3" />} label="Open loads" value={String(loads.length)} />
            <StatCell icon={<IndianRupee className="h-3 w-3" />} label="Total budget" value={`₹${(totalBudget / 100000).toFixed(1)}L`} />
            <StatCell icon={<Users className="h-3 w-3" />} label="Shippers" value={String(distinctShippers)} />
            <StatCell icon={<MapPin className="h-3 w-3" />} label="Origin cities" value={String(distinctOrigins)} />
          </dl>
        </div>
      </section>

      <section
        id="loads-catalogue"
        aria-label="Open loads"
        className="border-t border-border bg-background"
      >
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[22px] font-medium tracking-tight text-foreground">
                Open loads - apply to carry
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Posted by verified Indian shippers. Click <span className="font-medium text-foreground">Apply for this load</span> to
                send your bid - the shipper gets your contact + vehicle spec
                instantly.
              </p>
            </div>
          </div>

          <LoadsGrid loads={loads} onApply={onApply} />

          {/* Bottom: empty-state helper for shippers */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 rounded-[6px] border border-dashed border-border bg-muted/20 px-6 py-8 text-center">
            <p className="text-[14px] font-medium text-foreground">
              Don&apos;t see the lane you need?
            </p>
            <p className="max-w-md text-[13px] text-muted-foreground">
              Post your own load and let vehicle owners come to you. Most loads
              receive 3+ bids within 4 hours.
            </p>
            <button
              type="button"
              onClick={onPostLoad}
              className="tap mt-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-[6px] bg-foreground px-4 text-[13px] font-medium uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
            >
              <FileText className="h-3.5 w-3.5" />
              Post a load
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

/* ============================================================
   StatCell - single tile in the hero stats strip
   ============================================================ */
function StatCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center bg-background px-3 py-4">
      <dt className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-[22px] font-medium tabular tracking-tight text-foreground">
        {value}
      </dd>
    </div>
  );
}

"use client";

/**
 * MarketplaceGrid — renders the filtered + sorted list of vehicle listings
 * as responsive cards, plus a separate "Find Loads" tab that renders posted
 * loads browseable by vehicle owners.
 *
 * Vehicle Grid:
 *   Layout: 1 col mobile → 2 col tablet → 3 col desktop.
 *   Each card is an <article> with:
 *     • Photo placeholder tile (Truck icon + body type chip)
 *     • Title (e.g. "Tata Ace available for Mumbai-Pune route")
 *     • Route line (origin → destination · distance)
 *     • Owner name + rating
 *     • Body type / axle / capacity chips
 *     • Price/day
 *     • "View details" button + bookmark toggle
 *
 * Loads Grid:
 *   Layout: 1 col mobile → 2 col tablet.
 *   Each card is an <article> with:
 *     • Shipper name + posted-at
 *     • Origin → Destination · distance
 *     • Vehicle type required + body type required + weight
 *     • Pickup / delivery dates
 *     • Budget + "Apply for this load" CTA (stub)
 *
 * Empty state: friendly "no matches" message + Clear filters button.
 */

import { useState } from "react";
import {
  Search as SearchIcon, Star, MapPin, Truck, Bookmark, Calendar, Package, Weight, ArrowRight,
} from "lucide-react";
import {
  VEHICLE_TYPE_META, BODY_TYPE_META,
  type VehicleListing, type LoadListing,
} from "./marketplace-data";
import { motion } from "framer-motion";

interface VehicleGridProps {
  listings: VehicleListing[];
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
  onViewDetails: (id: string) => void;
  onClearFilters: () => void;
}

export function VehicleGrid({
  listings, savedIds, onToggleSave, onViewDetails, onClearFilters,
}: VehicleGridProps) {
  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[6px] border border-dashed border-border bg-background px-6 py-20 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted/30 text-muted-foreground">
          <SearchIcon className="h-5 w-5" />
        </span>
        <p className="mt-4 text-[15px] font-medium text-foreground">
          No vehicles match your filters
        </p>
        <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
          Try clearing your filters or widening your date / route range. New
          vehicle listings are added daily — if you still can&apos;t find what
          you need, post a load and let owners come to you.
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          className="tap mt-5 inline-flex h-10 items-center rounded-[6px] bg-foreground px-4 text-[13px] font-medium uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="list"
      aria-label="Vehicle listings"
    >
      {listings.map((l) => (
        <VehicleCard
          key={l.id}
          listing={l}
          saved={savedIds.has(l.id)}
          onToggleSave={() => onToggleSave(l.id)}
          onView={() => onViewDetails(l.id)}
        />
      ))}
    </div>
  );
}

/* ============================================================
   VehicleCard
   ============================================================ */
function VehicleCard({
  listing, saved, onToggleSave, onView,
}: {
  listing: VehicleListing;
  saved: boolean;
  onToggleSave: () => void;
  onView: () => void;
}) {
  const meta = VEHICLE_TYPE_META[listing.vehicle.type];
  return (
    <motion.article
      role="listitem"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group flex flex-col gap-3.5 rounded-[8px] border border-border bg-background p-3.5 transition-all hover:border-foreground/45 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)]"
    >
      {/* Photo placeholder */}
      <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-[6px] border border-border bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900/60 dark:to-neutral-950/80">
        {/* Large watermark text */}
        <div className="absolute inset-0 flex items-center justify-center select-none overflow-hidden opacity-[0.03] dark:opacity-[0.05]">
          <span className="font-mono font-black text-5xl tracking-widest uppercase truncate max-w-full px-2">
            {meta.label.split(" ")[0] || "TRUCK"}
          </span>
        </div>
        
        <Truck className="h-9 w-9 text-foreground/20 transition-transform duration-300 group-hover:scale-110" aria-hidden />
        
        <span className="absolute bottom-2.5 left-2.5 rounded-[4px] border border-border bg-background/90 px-2 py-0.5 text-[9px] font-mono font-medium uppercase tracking-wider text-muted-foreground backdrop-blur-sm shadow-sm">
          {meta.label}
        </span>
        {listing.owner.verified && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-[4px] border border-foreground/15 bg-background/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-foreground backdrop-blur-sm shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
            Verified
          </span>
        )}
        <button
          type="button"
          onClick={onToggleSave}
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved" : "Save this listing"}
          className="tap absolute right-2.5 top-2.5 flex h-7.5 w-7.5 items-center justify-center rounded-full border border-border bg-background/90 text-foreground backdrop-blur-sm shadow-sm transition-all hover:bg-background hover:scale-105 active:scale-95"
        >
          <Bookmark className={"h-3.5 w-3.5 transition-colors " + (saved ? "fill-foreground text-foreground" : "text-muted-foreground")} />
        </button>
      </div>

      {/* Title + route */}
      <div>
        <h3 className="line-clamp-2 text-[14.5px] font-semibold leading-normal tracking-tight text-foreground">
          {listing.title}
        </h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/80" />
          <span className="font-medium text-foreground truncate">{listing.route.origin}</span>
          <span className="text-muted-foreground/40">→</span>
          <span className="font-medium text-foreground truncate">{listing.route.destination}</span>
          <span className="font-mono text-[10px] bg-muted/40 px-1 py-0.2 rounded shrink-0">
            {listing.route.distanceKm}km
          </span>
        </p>
      </div>

      {/* Owner + rating */}
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className="font-medium text-muted-foreground truncate" title={listing.owner.name}>
          {listing.owner.name}
        </span>
        <span className="flex shrink-0 items-center gap-1 rounded-[4px] bg-neutral-50 dark:bg-neutral-900 px-1.5 py-0.5 text-[10.5px] font-semibold text-foreground border border-border/40">
          <Star className="h-3 w-3 fill-foreground stroke-foreground text-foreground" />
          <span className="font-mono">{listing.rating.toFixed(1)}</span>
          <span className="text-[9px] text-muted-foreground font-normal">({listing.reviewCount})</span>
        </span>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="rounded-[4px] border border-border/70 px-1.5 py-0.5 text-[8.5px] font-mono uppercase tracking-wider text-muted-foreground">
          {BODY_TYPE_META[listing.vehicle.bodyType].label}
        </span>
        <span className="rounded-[4px] border border-border/70 px-1.5 py-0.5 text-[8.5px] font-mono uppercase tracking-wider text-muted-foreground">
          {listing.vehicle.axle} Axle
        </span>
        <span className="rounded-[4px] border border-border/70 px-1.5 py-0.5 text-[8.5px] font-mono uppercase tracking-wider text-muted-foreground">
          {listing.vehicle.capacityTonnes} Tons
        </span>
        <span className="rounded-[4px] border border-border/70 px-1.5 py-0.5 text-[8.5px] font-mono uppercase tracking-wider text-muted-foreground">
          Yr {listing.vehicle.year}
        </span>
        <span className="ml-auto text-[9.5px] font-mono text-muted-foreground">
          {listing.totalBookings} trips
        </span>
      </div>

      {/* Price + CTA */}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/80 pt-3">
        <div>
          <p className="text-[18px] font-bold font-mono tracking-tight text-foreground">
            ₹{listing.pricing.perDay.toLocaleString("en-IN")}
          </p>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
            per day
          </p>
        </div>
        <button
          type="button"
          onClick={onView}
          className="tap flex h-9.5 flex-1 items-center justify-center gap-1 rounded-[5px] bg-foreground px-3 text-[12px] font-semibold text-background transition-all hover:bg-foreground/90 hover:shadow-md active:scale-[0.98]"
        >
          <span>View Details</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>
    </motion.article>
  );
}

/* ============================================================
   LoadsGrid — for the "Find Loads" tab
   ============================================================ */
interface LoadsGridProps {
  loads: LoadListing[];
  onApply: (load: LoadListing) => void;
}

export function LoadsGrid({ loads, onApply }: LoadsGridProps) {
  if (loads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[6px] border border-dashed border-border bg-background px-6 py-20 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted/30 text-muted-foreground">
          <Package className="h-5 w-5" />
        </span>
        <p className="mt-4 text-[15px] font-medium text-foreground">
          No open loads right now
        </p>
        <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
          Shippers post loads throughout the day. Check back later — or list
          your vehicle so shippers can find you directly.
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      role="list"
      aria-label="Open loads"
    >
      {loads.map((load) => (
        <LoadCard key={load.id} load={load} onApply={() => onApply(load)} />
      ))}
    </div>
  );
}

function LoadCard({ load, onApply }: { load: LoadListing; onApply: () => void }) {
  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group flex flex-col gap-3.5 rounded-[8px] border border-border bg-background p-4 transition-all hover:border-foreground/45 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-[14.5px] font-semibold text-foreground">
              {load.shipper}
            </p>
            <span className="inline-flex items-center gap-1 rounded-[3px] border border-border bg-muted/30 px-1 py-0.2 text-[8px] font-mono text-muted-foreground uppercase">
              ID {load.id}
            </span>
          </div>
          <p className="mt-0.5 text-[10.5px] font-mono text-muted-foreground">
            Posted {load.postedAt}
          </p>
        </div>
        
        <div className="shrink-0 text-right">
          <p className="text-[17px] font-bold font-mono text-foreground">
            ₹{load.budget.toLocaleString("en-IN")}
          </p>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
            budget
          </p>
        </div>
      </div>

      {/* Route map-style indicator */}
      <div className="flex items-center gap-2.5 rounded-[6px] border border-border/80 bg-neutral-50/50 dark:bg-neutral-900/30 px-3 py-2.5 text-[12.5px]">
        <div className="flex flex-1 items-center gap-2 truncate">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
          <span className="font-semibold text-foreground truncate">{load.origin}</span>
          <span className="text-muted-foreground/35 select-none font-light">────</span>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full border border-foreground bg-background" />
          <span className="font-semibold text-foreground truncate">{load.destination}</span>
        </div>
        <span className="shrink-0 font-mono text-[10.5px] bg-muted/40 px-1.5 py-0.2 rounded text-muted-foreground">
          {load.distanceKm} km
        </span>
      </div>

      {/* Requirements */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-[4px] border border-border/70 px-1.5 py-0.5 text-[8.5px] font-mono uppercase tracking-wider text-muted-foreground">
          {VEHICLE_TYPE_META[load.vehicleTypeRequired].label}
        </span>
        <span className="rounded-[4px] border border-border/70 px-1.5 py-0.5 text-[8.5px] font-mono uppercase tracking-wider text-muted-foreground">
          {BODY_TYPE_META[load.bodyTypeRequired].label}
        </span>
        <span className="rounded-[4px] border border-border/70 px-1.5 py-0.5 text-[8.5px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Weight className="h-2.5 w-2.5" />
          {load.weightTonnes} Tons
        </span>
      </div>

      {/* Pickup + delivery */}
      <div className="grid grid-cols-2 gap-2 text-[12px] border-t border-b border-border/40 py-2">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
          <span>Pickup: <span className="font-medium text-foreground">{load.pickupDate}</span></span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
          <span>Delivery: <span className="font-medium text-foreground">{load.deliveryDate}</span></span>
        </div>
      </div>

      {/* Description */}
      <p className="line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
        {load.description}
      </p>

      {/* CTA */}
      <div className="mt-auto flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onApply}
          className="tap flex h-9.5 flex-1 items-center justify-center gap-1.5 rounded-[5px] bg-foreground px-3 text-[12px] font-semibold text-background transition-all hover:bg-foreground/90 hover:shadow-md active:scale-[0.98]"
        >
          <span>Apply for this load</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>
    </motion.article>
  );
}

/* ============================================================
   SavedListingsStrip — compact list of saved listing IDs
   (rendered at the top of the grid when savedIds is non-empty)
   ============================================================ */
export function SavedListingsStrip({
  savedCount, onClearAll,
}: {
  savedCount: number;
  onClearAll: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (savedCount === 0 || dismissed) return null;
  return (
    <div className="mb-4 flex items-center justify-between gap-2 rounded-[5px] border border-border bg-muted/20 px-3 py-2 text-[12px]">
      <span className="flex items-center gap-1.5 text-foreground">
        <Bookmark className="h-3.5 w-3.5 fill-foreground" />
        <span className="font-medium">{savedCount}</span>
        <span className="text-muted-foreground">saved {savedCount === 1 ? "vehicle" : "vehicles"}</span>
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClearAll}
          className="tap text-[11px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          Clear all
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="tap text-[11px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

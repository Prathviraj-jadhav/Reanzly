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
  Search as SearchIcon, Star, MapPin, Truck, Bookmark, Calendar, Package, Weight,
} from "lucide-react";
import {
  VEHICLE_TYPE_META, BODY_TYPE_META,
  type VehicleListing, type LoadListing,
} from "./marketplace-data";

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
    <article
      role="listitem"
      className="group flex flex-col gap-3 rounded-[6px] border border-border bg-background p-3 transition-colors hover:border-foreground/30"
    >
      {/* Photo placeholder */}
      <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-[5px] border border-border bg-muted/40">
        <Truck className="h-12 w-12 text-foreground/25" aria-hidden />
        <span className="absolute bottom-1.5 left-1.5 rounded-[3px] border border-border bg-background/80 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
          {meta.label}
        </span>
        {listing.owner.verified && (
          <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-[3px] border border-foreground/30 bg-foreground/5 px-1 py-0 text-[9px] font-medium uppercase tracking-wider text-foreground">
            Verified
          </span>
        )}
        <button
          type="button"
          onClick={onToggleSave}
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved" : "Save this listing"}
          className="tap absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-[4px] border border-border bg-background/80 text-foreground backdrop-blur-sm transition-colors hover:bg-background"
        >
          <Bookmark className={"h-3.5 w-3.5 " + (saved ? "fill-foreground" : "")} />
        </button>
      </div>

      {/* Title + route */}
      <div>
        <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug text-foreground">
          {listing.title}
        </h3>
        <p className="mt-1 flex items-center gap-1 text-[12px] text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{listing.route.origin} → {listing.route.destination}</span>
          <span className="text-muted-foreground/60">· {listing.route.distanceKm} km</span>
        </p>
      </div>

      {/* Owner + rating */}
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[12px] text-muted-foreground" title={listing.owner.name}>
          {listing.owner.name}
        </span>
        <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-foreground">
          <Star className="h-3 w-3 fill-foreground" />
          <span className="tabular">{listing.rating.toFixed(1)}</span>
          <span className="text-muted-foreground">({listing.reviewCount})</span>
        </span>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="rounded-[3px] border border-border bg-muted/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          {BODY_TYPE_META[listing.vehicle.bodyType].label}
        </span>
        <span className="rounded-[3px] border border-border bg-muted/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          {listing.vehicle.axle}-tyre
        </span>
        <span className="rounded-[3px] border border-border bg-muted/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          {listing.vehicle.capacityTonnes}T
        </span>
        <span className="rounded-[3px] border border-border bg-muted/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          {listing.vehicle.year}
        </span>
        <span className="ml-auto text-[10px] tabular text-muted-foreground">
          {listing.totalBookings} bookings
        </span>
      </div>

      {/* Price + CTA */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2.5">
        <div>
          <p className="text-[16px] font-semibold tabular text-foreground">
            ₹{listing.pricing.perDay.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            per day
          </p>
        </div>
        <button
          type="button"
          onClick={onView}
          className="tap flex h-9 flex-1 items-center justify-center rounded-[5px] bg-foreground px-3 text-[12px] font-medium text-background transition-colors hover:bg-foreground/90"
        >
          View details
        </button>
      </div>
    </article>
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
    <article className="flex flex-col gap-3 rounded-[6px] border border-border bg-background p-4 transition-colors hover:border-foreground/30">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-foreground">
            {load.shipper}
          </p>
          <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            Posted {load.postedAt} · Load ID {load.id}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[16px] font-semibold tabular text-foreground">
            ₹{load.budget.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            budget
          </p>
        </div>
      </div>

      {/* Route */}
      <div className="flex items-center gap-2 rounded-[5px] border border-border bg-muted/20 px-3 py-2 text-[12px]">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="font-medium text-foreground">{load.origin}</span>
        <span className="text-muted-foreground">→</span>
        <span className="font-medium text-foreground">{load.destination}</span>
        <span className="ml-auto text-[10px] tabular text-muted-foreground">{load.distanceKm} km</span>
      </div>

      {/* Requirements */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="rounded-[3px] border border-border bg-muted/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          {VEHICLE_TYPE_META[load.vehicleTypeRequired].label}
        </span>
        <span className="rounded-[3px] border border-border bg-muted/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          {BODY_TYPE_META[load.bodyTypeRequired].label}
        </span>
        <span className="rounded-[3px] border border-border bg-muted/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          <Weight className="inline h-2.5 w-2.5" /> {load.weightTonnes}T
        </span>
      </div>

      {/* Pickup + delivery */}
      <div className="grid grid-cols-2 gap-2 text-[12px]">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>Pickup: <span className="text-foreground">{load.pickupDate}</span></span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>Delivery: <span className="text-foreground">{load.deliveryDate}</span></span>
        </div>
      </div>

      {/* Description */}
      <p className="line-clamp-2 text-[12px] leading-snug text-muted-foreground">
        {load.description}
      </p>

      {/* CTA */}
      <div className="mt-auto flex items-center gap-2 border-t border-border pt-2.5">
        <button
          type="button"
          onClick={onApply}
          className="tap flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[5px] bg-foreground px-3 text-[12px] font-medium text-background transition-colors hover:bg-foreground/90"
        >
          Apply for this load
        </button>
      </div>
    </article>
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

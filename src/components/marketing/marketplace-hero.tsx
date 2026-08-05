"use client";

/**
 * MarketplaceHero — topmost section of the Vehicle Rental Marketplace.
 *
 * Premium Swiss/Scandinavian feel: eyebrow badge, oversized headline
 * ("Rent Trucks, Trailers & Tempo Travellers Pan-India"), subhead, and a
 * 4-field search bar (origin, destination, vehicle type, availability date).
 *
 * The search bar is the primary entry to the marketplace — typing into any
 * field updates the lifted state in <MarketplaceSite /> which re-runs the
 * grid filter.
 *
 * Below the fold: a stats strip (60+ vehicles, 30+ verified owners, 17 cities,
 * 4.2K+ bookings, 12 open loads) + a "Featured vehicles" rail of 4 hand-picked
 * listings with photo placeholder, route, owner rating, price/day, and a
 * "View details" / "Request booking" CTA pair.
 *
 * SEO: keyword-rich H1 ("Rent Trucks, Trailers, Tempo Travellers Pan-India")
 *      + H2 ("Featured vehicle listings") + semantic <main>/<section>/<article>.
 */

import { useEffect, useRef } from "react";
import {
  Search, MapPin, Truck, Calendar, Star, ShieldCheck, ArrowRight, Users, Package, Route as RouteIcon,
} from "lucide-react";
import {
  VEHICLE_TYPE_META, VEHICLE_TYPE_ORDER, MARKETPLACE_STATS,
  type VehicleListing, type VehicleType,
} from "./marketplace-data";

interface MarketplaceHeroProps {
  search: string;
  onSearch: (v: string) => void;
  originFilter: string;
  onOriginFilter: (v: string) => void;
  destinationFilter: string;
  onDestinationFilter: (v: string) => void;
  vehicleTypeFilter: VehicleType | "";
  onVehicleTypeFilter: (v: VehicleType | "") => void;
  availabilityDate: string;
  onAvailabilityDate: (v: string) => void;
  featured: VehicleListing[];
  onViewDetails: (id: string) => void;
  onClearAndFocusCatalogue: () => void;
}

export function MarketplaceHero({
  search,
  onSearch,
  originFilter,
  onOriginFilter,
  destinationFilter,
  onDestinationFilter,
  vehicleTypeFilter,
  onVehicleTypeFilter,
  availabilityDate,
  onAvailabilityDate,
  featured,
  onViewDetails,
  onClearAndFocusCatalogue,
}: MarketplaceHeroProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    if (mq.matches && searchRef.current) {
      searchRef.current.focus({ preventScroll: true });
    }
  }, []);

  return (
    <section
      id="marketplace-hero"
      className="relative overflow-hidden border-b border-border bg-background"
      aria-labelledby="marketplace-hero-title"
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

      <div className="relative mx-auto max-w-5xl px-6 py-20 text-center sm:py-24 lg:py-28">
        {/* Eyebrow */}
        <div className="mb-7 flex justify-center animate-fade-in">
          <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Reanzly Vehicle Rental Marketplace
          </span>
        </div>

        {/* H1 — keyword-rich */}
        <h1
          id="marketplace-hero-title"
          className="mx-auto max-w-4xl text-[36px] font-medium leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[44px] animate-slide-up"
        >
          Rent Trucks, Trailers &amp; Tempo Travellers Pan-India
        </h1>

        {/* Subhead */}
        <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base animate-slide-up">
          Browse {MARKETPLACE_STATS.totalListings}+ verified vehicles for rent
          from Indian logistics owners. Tata Ace to Volvo tractor, container
          to refrigerated, with driver or without — book a vehicle for your
          next consignment in minutes.
        </p>

        {/* Search bar (4 fields) */}
        <form
          className="mx-auto mt-9 w-full max-w-3xl"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            onClearAndFocusCatalogue();
          }}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
            {/* Origin */}
            <FieldInput
              icon={<MapPin className="h-3.5 w-3.5" />}
              label="Origin"
              placeholder="Mumbai"
              value={originFilter}
              onChange={onOriginFilter}
              list="marketplace-cities"
            />
            {/* Destination */}
            <FieldInput
              icon={<MapPin className="h-3.5 w-3.5" />}
              label="Destination"
              placeholder="Pune"
              value={destinationFilter}
              onChange={onDestinationFilter}
              list="marketplace-cities"
            />
            {/* Vehicle type */}
            <div className="flex flex-col gap-1">
              <label className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-left sm:sr-only">
                Vehicle type
              </label>
              <div className="relative">
                <Truck className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <select
                  value={vehicleTypeFilter}
                  onChange={(e) => onVehicleTypeFilter(e.target.value as VehicleType | "")}
                  aria-label="Vehicle type"
                  className="focus-ring h-11 w-full appearance-none rounded-[6px] border border-border bg-background pl-8 pr-7 text-[13px] text-foreground"
                >
                  <option value="">Any vehicle</option>
                  {VEHICLE_TYPE_ORDER.map((vt) => (
                    <option key={vt} value={vt}>{VEHICLE_TYPE_META[vt].label}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* Date */}
            <div className="flex flex-col gap-1">
              <label className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-left sm:sr-only">
                Available from
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input
                  type="date"
                  value={availabilityDate}
                  onChange={(e) => onAvailabilityDate(e.target.value)}
                  aria-label="Available from date"
                  className="focus-ring h-11 w-full rounded-[6px] border border-border bg-background pl-8 pr-2 text-[13px] text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Full-text search + submit */}
          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search by route, owner, vehicle model — e.g. Mumbai-Pune, Tata Ace, Sharma Logistics"
                aria-label="Search vehicle listings"
                className="focus-ring h-12 w-full rounded-[6px] border border-border bg-background pl-10 pr-3 text-[14px] text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <button
              type="submit"
              className="tap inline-flex h-12 items-center justify-center gap-1.5 rounded-[6px] bg-foreground px-5 text-[13px] font-medium uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
            >
              Search
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* Stats strip */}
        <dl className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
          <StatCell icon={<Truck className="h-3 w-3" />} label="Vehicles" value={`${MARKETPLACE_STATS.totalListings}+`} />
          <StatCell icon={<ShieldCheck className="h-3 w-3" />} label="Verified owners" value={`${MARKETPLACE_STATS.verifiedOwners}+`} />
          <StatCell icon={<MapPin className="h-3 w-3" />} label="Cities" value={`${MARKETPLACE_STATS.citiesCovered}`} />
          <StatCell icon={<Users className="h-3 w-3" />} label="Total bookings" value={`${(MARKETPLACE_STATS.totalBookings / 1000).toFixed(1)}K+`} />
          <StatCell icon={<RouteIcon className="h-3 w-3" />} label="Vehicle types" value={`${MARKETPLACE_STATS.vehicleTypes}`} />
          <StatCell icon={<Package className="h-3 w-3" />} label="Open loads" value={`${MARKETPLACE_STATS.openLoads}`} />
        </dl>

        {/* Datalist of all cities */}
        <datalist id="marketplace-cities">
          <option value="Mumbai" />
          <option value="Delhi" />
          <option value="Bangalore" />
          <option value="Chennai" />
          <option value="Kolkata" />
          <option value="Hyderabad" />
          <option value="Pune" />
          <option value="Ahmedabad" />
          <option value="Surat" />
          <option value="Jaipur" />
          <option value="Lucknow" />
          <option value="Kanpur" />
          <option value="Nagpur" />
          <option value="Indore" />
          <option value="Bhopal" />
        </datalist>
      </div>

      {/* Featured vehicles row */}
      <div className="relative mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-[22px] font-medium tracking-tight text-foreground">
              Featured vehicle listings
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Hand-picked vehicles from verified owners across India. Ready
              to book today.
            </p>
          </div>
          <a
            href="#catalogue"
            onClick={(e) => {
              e.preventDefault();
              onClearAndFocusCatalogue();
            }}
            className="tap hidden items-center gap-1 text-[12px] font-medium text-foreground hover:underline sm:inline-flex"
          >
            Browse all vehicles
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((l) => (
            <FeaturedTile
              key={l.id}
              listing={l}
              onView={() => onViewDetails(l.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   FieldInput — labelled input with leading icon (origin/destination)
   ============================================================ */
function FieldInput({
  icon, label, placeholder, value, onChange, list,
}: {
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  list?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-left sm:sr-only">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden>
          {icon}
        </span>
        <input
          type="text"
          list={list}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          className="focus-ring h-11 w-full rounded-[6px] border border-border bg-background pl-8 pr-2 text-[13px] text-foreground placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}

/* ============================================================
   StatCell — single tile in the hero stats strip
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

/* ============================================================
   FeaturedTile — a hero "Featured vehicle" card
   ============================================================ */
function FeaturedTile({
  listing, onView,
}: {
  listing: VehicleListing;
  onView: () => void;
}) {
  const meta = VEHICLE_TYPE_META[listing.vehicle.type];
  return (
    <article className="group flex flex-col gap-3 rounded-[6px] border border-border bg-background p-4 transition-colors hover:border-foreground/30">
      {/* Photo placeholder — colored tile with the vehicle type abbreviation */}
      <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-[5px] border border-border bg-muted/40">
        <Truck className="h-10 w-10 text-foreground/30" aria-hidden />
        <span className="absolute bottom-1.5 left-1.5 rounded-[3px] border border-border bg-background/80 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
          {meta.label}
        </span>
        {listing.owner.verified && (
          <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-[3px] border border-foreground/30 bg-foreground/5 px-1 py-0 text-[9px] font-medium uppercase tracking-wider text-foreground">
            <ShieldCheck className="h-2.5 w-2.5" /> Verified
          </span>
        )}
      </div>

      {/* Title + route */}
      <div>
        <h3 className="truncate text-[14px] font-semibold text-foreground">
          {listing.title}
        </h3>
        <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {listing.route.origin} → {listing.route.destination}
          <span className="text-muted-foreground/60">· {listing.route.distanceKm} km</span>
        </p>
      </div>

      {/* Owner + rating */}
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[12px] text-muted-foreground">
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
          {listing.vehicle.bodyType}
        </span>
        <span className="rounded-[3px] border border-border bg-muted/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          {listing.vehicle.axle}-tyre
        </span>
        <span className="rounded-[3px] border border-border bg-muted/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          {listing.vehicle.capacityTonnes}T
        </span>
      </div>

      {/* Price + CTA */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2.5">
        <div>
          <p className="text-[15px] font-semibold tabular text-foreground">
            ₹{listing.pricing.perDay.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            per day
          </p>
        </div>
        <button
          type="button"
          onClick={onView}
          className="tap flex h-8 items-center justify-center rounded-[5px] border border-border px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
        >
          View details
        </button>
      </div>
    </article>
  );
}

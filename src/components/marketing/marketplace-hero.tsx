"use client";

/**
 * MarketplaceHero — topmost section of the Vehicle Rental Marketplace.
 *
 * Premium Swiss/Scandinavian feel: eyebrow badge, oversized headline
 * ("Rent Trucks, Trailers & Tempo Travellers Pan-India"), subhead, and a
 * 4-field search bar with interactive custom suggestion flyers (popovers)
 * for Origin, Destination, and Vehicle Type.
 *
 * Typing into any field or selecting from the popover suggestion flyer updates 
 * the lifted state in <MarketplaceSite /> which re-runs the grid filter.
 */

import { useEffect, useRef, useState, useMemo } from "react";
import {
  Search, MapPin, Truck, Calendar, Star, ShieldCheck, ArrowRight, Users, Package, Route as RouteIcon,
} from "lucide-react";
import {
  VEHICLE_TYPE_META, VEHICLE_TYPE_ORDER, MARKETPLACE_STATS,
  type VehicleListing, type VehicleType,
} from "./marketplace-data";
import { motion, AnimatePresence } from "framer-motion";

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

const POPULAR_HUBS = [
  { city: "Mumbai", region: "West Hub", volume: "140+ available" },
  { city: "Delhi", region: "North Terminal", volume: "190+ available" },
  { city: "Bangalore", region: "South Hub", volume: "110+ available" },
  { city: "Chennai", region: "South Terminal", volume: "85+ available" },
  { city: "Pune", region: "West Terminal", volume: "70+ available" },
  { city: "Kolkata", region: "East Hub", volume: "65+ available" },
  { city: "Hyderabad", region: "Central Hub", volume: "90+ available" },
];

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

  // Flyer open/close focus states
  const [originFocused, setOriginFocused] = useState(false);
  const [destFocused, setDestFocused] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);

  // References for click-outside detection
  const originContainerRef = useRef<HTMLDivElement>(null);
  const destContainerRef = useRef<HTMLDivElement>(null);
  const typeContainerRef = useRef<HTMLDivElement>(null);

  // Filter Origin/Destination suggestions dynamically
  const originSuggestions = useMemo(() => {
    const q = originFilter.trim().toLowerCase();
    if (!q) return POPULAR_HUBS;
    const cities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Pune", "Ahmedabad", "Surat", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Bhopal"];
    const matched = cities.filter((c) => c.toLowerCase().includes(q));
    return matched.map((city) => {
      const existing = POPULAR_HUBS.find((h) => h.city === city);
      return {
        city,
        region: existing?.region || "Logistics Node",
        volume: existing?.volume || "40+ available",
      };
    });
  }, [originFilter]);

  const destSuggestions = useMemo(() => {
    const q = destinationFilter.trim().toLowerCase();
    if (!q) return POPULAR_HUBS;
    const cities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Pune", "Ahmedabad", "Surat", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Bhopal"];
    const matched = cities.filter((c) => c.toLowerCase().includes(q));
    return matched.map((city) => {
      const existing = POPULAR_HUBS.find((h) => h.city === city);
      return {
        city,
        region: existing?.region || "Logistics Node",
        volume: existing?.volume || "40+ available",
      };
    });
  }, [destinationFilter]);

  // Click outside effect
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (originContainerRef.current && !originContainerRef.current.contains(event.target as Node)) {
        setOriginFocused(false);
      }
      if (destContainerRef.current && !destContainerRef.current.contains(event.target as Node)) {
        setDestFocused(false);
      }
      if (typeContainerRef.current && !typeContainerRef.current.contains(event.target as Node)) {
        setTypeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // Autofocus search on load on desktop
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

        {/* Search bar (4 fields + full-text search) */}
        <form
          className="mx-auto mt-10 w-full max-w-3xl rounded-[12px] border border-border bg-background/50 p-2 shadow-2xl backdrop-blur-md dark:bg-neutral-900/30 dark:shadow-neutral-950/20"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            onClearAndFocusCatalogue();
          }}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1.1fr_1.1fr_1.3fr_0.9fr] lg:gap-0 lg:divide-x lg:divide-border">
            {/* Origin with custom suggestions popover */}
            <FieldInput
              icon={<MapPin className="h-3.5 w-3.5" />}
              label="Origin"
              placeholder="Mumbai"
              value={originFilter}
              onChange={onOriginFilter}
              focused={originFocused}
              setFocused={setOriginFocused}
              suggestions={originSuggestions}
              containerRef={originContainerRef}
            />

            {/* Destination with custom suggestions popover */}
            <FieldInput
              icon={<MapPin className="h-3.5 w-3.5" />}
              label="Destination"
              placeholder="Pune"
              value={destinationFilter}
              onChange={onDestinationFilter}
              focused={destFocused}
              setFocused={setDestFocused}
              suggestions={destSuggestions}
              containerRef={destContainerRef}
            />

            {/* Vehicle Type custom dropdown */}
            <div ref={typeContainerRef} className="flex flex-col gap-1 relative lg:px-2">
              <label className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-left sm:sr-only">
                Vehicle type
              </label>
              <div className="relative">
                <Truck className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <button
                  type="button"
                  onClick={() => setTypeOpen(!typeOpen)}
                  className="focus-ring flex h-11 w-full items-center justify-between rounded-[6px] border border-border bg-background pl-8 pr-3 text-[13px] text-foreground text-left transition-colors focus:border-foreground lg:border-none lg:bg-transparent lg:rounded-none lg:focus:ring-0"
                >
                  <span className="truncate">
                    {vehicleTypeFilter ? VEHICLE_TYPE_META[vehicleTypeFilter].label : "Any vehicle"}
                  </span>
                  <span className="text-[8px] text-muted-foreground select-none">
                    ▼
                  </span>
                </button>
              </div>

              {/* vehicle type flyer */}
              <AnimatePresence>
                {typeOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-[6px] border border-border bg-card p-1 shadow-lg scrollbar-none md:w-80 md:right-auto"
                  >
                    <div className="px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1">
                      Select Vehicle Class
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onVehicleTypeFilter("");
                        setTypeOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-[4px] px-2 py-1.5 text-left text-xs font-semibold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                    >
                      <span>Any vehicle</span>
                    </button>
                    {VEHICLE_TYPE_ORDER.map((vt) => {
                      const meta = VEHICLE_TYPE_META[vt];
                      return (
                        <button
                          key={vt}
                          type="button"
                          onClick={() => {
                            onVehicleTypeFilter(vt);
                            setTypeOpen(false);
                          }}
                          className="flex w-full items-center justify-between rounded-[4px] px-2 py-2 text-left text-xs text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{meta.label}</span>
                            <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              Capacity: {meta.capacityTonnes}T · {meta.bodyType}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium font-mono text-neutral-600 dark:text-neutral-300">
                            ₹{meta.basePerDay.toLocaleString("en-IN")}/d
                          </span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1 lg:px-2">
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
                  className="focus-ring h-11 w-full rounded-[6px] border border-border bg-background pl-8 pr-2 text-[13px] text-foreground lg:border-none lg:bg-transparent lg:rounded-none lg:focus:ring-0"
                />
              </div>
            </div>
          </div>

          {/* Full-text search + submit */}
          <div className="mt-2.5 flex items-center gap-2 rounded-[10px] border border-border bg-background p-1.5 shadow-md">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search route, owner, model — e.g. Tata Ace, Sharma Logistics"
                aria-label="Search vehicle listings"
                className="h-10 w-full rounded-[6px] border-none bg-transparent pl-9 pr-3 text-[13.5px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
              />
            </div>
            <button
              type="submit"
              className="tap inline-flex h-10 items-center justify-center gap-1.5 rounded-[6px] bg-foreground px-5 text-[12px] font-semibold uppercase tracking-wider text-background transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
            >
              Search
              <ArrowRight className="h-3.5 w-3.5" />
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
   FieldInput — custom styled popover suggestion input
   ============================================================ */
function FieldInput({
  icon, label, placeholder, value, onChange, focused, setFocused, suggestions, containerRef
}: {
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  focused: boolean;
  setFocused: (v: boolean) => void;
  suggestions: typeof POPULAR_HUBS;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={containerRef} className="flex flex-col gap-1 relative lg:px-2">
      <label className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-left sm:sr-only">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden>
          {icon}
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setFocused(true);
          }}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          aria-label={label}
          className="focus-ring h-11 w-full rounded-[6px] border border-border bg-background pl-8 pr-2 text-[13px] text-foreground placeholder:text-muted-foreground lg:border-none lg:bg-transparent lg:rounded-none lg:focus:ring-0 lg:focus-visible:ring-0"
        />
      </div>

      {/* Suggestion popover flyer */}
      <AnimatePresence>
        {focused && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-[6px] border border-border bg-card p-1 shadow-lg scrollbar-none"
          >
            <div className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1">
              Popular Transport Hubs
            </div>
            {suggestions.map((s) => (
              <button
                key={s.city}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // prevents input blur before click registers
                  onChange(s.city);
                  setFocused(false);
                }}
                className="flex w-full items-center justify-between rounded-[4px] px-2 py-1.5 text-left text-xs text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  {s.city}
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-2">
                  <span>{s.region}</span>
                  <span className="rounded bg-neutral-150 dark:bg-neutral-800 px-1 py-0.2 text-[9px]">
                    {s.volume}
                  </span>
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
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
      {/* Photo placeholder */}
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

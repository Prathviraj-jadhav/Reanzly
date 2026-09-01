"use client";

/**
 * MarketplaceSite - public, SEO-optimised orchestrator for the Reanzly
 * Vehicle Rental Marketplace.
 *
 * Renders at `marketingView === "marketplace"` (state-driven, NOT a real
 * Next.js route - the visitor only ever sees `/` in the URL bar). Composes:
 *   MarketplaceNav → MarketplaceHero → MarketplaceFilters + VehicleGrid
 *                  → MarketplaceCTA → MarketingFooter
 *                  → (Find Loads tab) MarketplaceLoadsSection
 *                  → (Sheets) ListYourVehicleSheet, PostLoadSheet
 *                  → (Dialog) MarketplaceDetailDialog
 *
 * Two tabs:
 *   • "vehicles" - browse vehicle listings (60 seed listings)
 *   • "loads"    - browse open loads posted by shippers (12 seed loads)
 *
 * Activities supported:
 *   • Browse listings (filter, sort, search, hero search w/ origin/dest/type/date)
 *   • View listing details (Dialog with Overview / Specs / Owner / Reviews / Book tabs)
 *   • Request Booking (stub form in the Book tab - date range + driver + message)
 *   • Contact Owner (stub - toast confirmation)
 *   • Save Listing (bookmark - persisted to localStorage)
 *   • List Your Vehicle (CTA → opens ListYourVehicleSheet form stub)
 *   • Post a Load (CTA → opens PostLoadSheet form stub)
 *   • Find Loads (tab switch → LoadsGrid with "Apply for this load" stub)
 *
 * SEO:
 *   • document.title + meta description + OG + canonical set via useEffect
 *   • ItemList JSON-LD with every vehicle listing as a ListItem
 *   • WebSite + BreadcrumbList JSON-LD so Google understands the page's place
 *     in the Reanzly marketing site root.
 *   • Per-listing Vehicle JSON-LD emitted inside <MarketplaceDetailDialog />
 *   • Visually-hidden anchor links to vehicle-type sections for crawlers.
 *   • Semantic HTML throughout (header, nav, main, section, article, h1/h2/h3).
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store/app-store";
import {
  VEHICLE_LISTINGS, LOAD_LISTINGS, MARKETPLACE_STATS,
  VEHICLE_TYPE_META, VEHICLE_TYPE_ORDER,
  type VehicleListing,
} from "./marketplace-data";
import { MarketplaceNav } from "./marketplace-nav";
import { MarketplaceHero } from "./marketplace-hero";
import {
  MarketplaceFilters,
  type SortKey,
  type MarketplaceFilterState,
} from "./marketplace-filters";
import {
  VehicleGrid, SavedListingsStrip,
} from "./marketplace-grid";
import { MarketplaceDetailDialog } from "./marketplace-detail-dialog";
import { MarketplaceCTA } from "./marketplace-cta";
import { MarketplaceLoadsSection } from "./marketplace-loads-section";
import { MarketingFooter } from "./marketing-footer";
import { ListYourVehicleSheet } from "./marketplace-list-vehicle-sheet";
import { PostLoadSheet } from "./marketplace-post-load-sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const PRICE_MAX_DEFAULT = 16000;
const SAVED_STORAGE_KEY = "reanzly-marketplace-saved-v1";

type MarketplaceTab = "vehicles" | "loads";

export function MarketplaceSite({ isPortal = false }: { isPortal?: boolean }) {
  const [biddingLoad, setBiddingLoad] = useState<any | null>(null);
  const [bidRate, setBidRate] = useState("");
  const [bidNotes, setBidNotes] = useState("");
  const [submittingBid, setSubmittingBid] = useState(false);

  async function handleBidSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bidRate || submittingBid) return;
    setSubmittingBid(true);

    try {
      const res = await fetch("/api/vendor-portal/rfqs/submit-load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: biddingLoad.origin,
          destination: biddingLoad.destination,
          vehicleType: biddingLoad.vehicleType,
          weight: biddingLoad.weight,
          ratePerKm: bidRate,
          validityDays: 7,
          notes: bidNotes,
          shipper: biddingLoad.shipper,
          budget: biddingLoad.budget,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit quote");
      }

      toast.success("Bid submitted successfully!", {
        description: `Your bid of ₹${bidRate}/km has been logged. Verify it under RFQ / Quotes.`,
      });
      setBiddingLoad(null);
      setBidRate("");
      setBidNotes("");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit quote");
    } finally {
      setSubmittingBid(false);
    }
  }

  // ---- Tab state (Browse Vehicles vs Find Loads) ----
  const [tab, setTab] = useState<MarketplaceTab>("vehicles");

  // ---- Filter + sort state (lifted so hero search + sidebar share it) ----
  const [filterState, setFilterState] = useState<MarketplaceFilterState>({
    search: "",
    originFilter: "",
    destinationFilter: "",
    vehicleTypeFilter: "",
    availabilityDate: "",
    selectedBodyTypes: [],
    selectedAxles: [],
    selectedRegions: [],
    priceCeiling: PRICE_MAX_DEFAULT,
    verifiedOnly: false,
    withDriverOnly: false,
  });
  const [sort, setSort] = useState<SortKey>("recommended");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ---- Saved listings (localStorage persistence) ----
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as unknown;
        if (Array.isArray(arr)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSavedIds(new Set(arr.filter((x): x is string => typeof x === "string")));
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify([...savedIds]));
    } catch {
      /* ignore quota errors */
    }
  }, [savedIds]);

  // ---- Sheet state (List Your Vehicle / Post a Load) ----
  const [listVehicleOpen, setListVehicleOpen] = useState(false);
  const [postLoadOpen, setPostLoadOpen] = useState(false);

  // ---- Deep-link listing detail dialog (uses the app-store field) ----
  const selectedListingId = useAppStore((s) => s.selectedMarketplaceProvider);
  const setSelectedListingId = useAppStore((s) => s.setSelectedMarketplaceProvider);

  const featuredListings = useMemo(
    () => VEHICLE_LISTINGS.filter((l) => l.featured).slice(0, 4),
    [],
  );

  const filteredListings = useMemo(() => {
    const q = filterState.search.trim().toLowerCase();
    const originQ = filterState.originFilter.trim().toLowerCase();
    const destQ = filterState.destinationFilter.trim().toLowerCase();

    let list = VEHICLE_LISTINGS.filter((l) => {
      if (filterState.vehicleTypeFilter && l.vehicle.type !== filterState.vehicleTypeFilter) return false;
      if (filterState.selectedBodyTypes.length > 0 && !filterState.selectedBodyTypes.includes(l.vehicle.bodyType)) return false;
      if (filterState.selectedAxles.length > 0 && !filterState.selectedAxles.includes(l.vehicle.axle)) return false;
      if (filterState.selectedRegions.length > 0 && !filterState.selectedRegions.includes(l.route.region)) return false;
      if (l.pricing.perDay > filterState.priceCeiling) return false;
      if (filterState.verifiedOnly && !l.owner.verified) return false;
      // withDriverOnly - every listing supports both modes (with/without driver),
      // so the toggle is a no-op filter. We keep it for future richness.
      if (originQ && !l.route.origin.toLowerCase().includes(originQ) && !l.route.preferredLanes.join(" ").toLowerCase().includes(originQ)) return false;
      if (destQ && !l.route.destination.toLowerCase().includes(destQ) && !l.route.preferredLanes.join(" ").toLowerCase().includes(destQ)) return false;
      if (filterState.availabilityDate && l.availability.toDate < filterState.availabilityDate) return false;
      if (q) {
        const haystack = `${l.title} ${l.owner.name} ${l.vehicle.model} ${l.vehicle.make} ${l.vehicle.typeLabel} ${l.route.origin} ${l.route.destination} ${l.route.preferredLanes.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    list = [...list];
    if (sort === "price-asc") {
      list.sort((a, b) => a.pricing.perDay - b.pricing.perDay);
    } else if (sort === "price-desc") {
      list.sort((a, b) => b.pricing.perDay - a.pricing.perDay);
    } else if (sort === "rating") {
      list.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    } else if (sort === "newest") {
      // postedAt strings like "2 days ago" / "1 week ago" - sort by a rough
      // ordinal so "1 hour ago" < "2 days ago" < "1 month ago".
      const ord = (s: string) => {
        if (s.includes("hour")) return 1;
        if (s.includes("day")) return 2 * parseInt(s, 10);
        if (s.includes("week")) return 14 * parseInt(s, 10);
        if (s.includes("month")) return 60 * parseInt(s, 10);
        return 999;
      };
      list.sort((a, b) => ord(a.postedAt) - ord(b.postedAt));
    } else {
      // "recommended" - featured first, then verified, then rating, then reviews.
      list.sort((a, b) => {
        if (!!a.featured !== !!b.featured) return a.featured ? -1 : 1;
        if (a.owner.verified !== b.owner.verified) return a.owner.verified ? -1 : 1;
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.reviewCount - a.reviewCount;
      });
    }
    return list;
  }, [filterState, sort]);

  function patchFilter(p: Partial<MarketplaceFilterState>) {
    setFilterState((prev) => ({ ...prev, ...p }));
  }

  function clearFilters() {
    setFilterState({
      search: "",
      originFilter: "",
      destinationFilter: "",
      vehicleTypeFilter: "",
      availabilityDate: "",
      selectedBodyTypes: [],
      selectedAxles: [],
      selectedRegions: [],
      priceCeiling: PRICE_MAX_DEFAULT,
      verifiedOnly: false,
      withDriverOnly: false,
    });
    setSort("recommended");
  }

  function toggleSave(id: string) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast("Removed from saved", { description: "Listing removed from your saved vehicles." });
      } else {
        next.add(id);
        toast.success("Saved", { description: "Listing added to your saved vehicles." });
      }
      return next;
    });
  }

  function focusCatalogue() {
    if (typeof document !== "undefined") {
      document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // ---- SEO: title + meta description + OG + canonical ----
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Reanzly Vehicle Rental Marketplace - Rent Trucks, Trailers, Tempo Travellers Pan-India";

    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        const [, name] = selector.match(/\[(?:name|property)="([^"]+)"\]/) ?? [];
        if (selector.includes("property")) el.setAttribute("property", name ?? "");
        else el.setAttribute("name", name ?? "");
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    const description =
      "Rent trucks, trailers, tempo travellers and container vehicles pan-India on the Reanzly Vehicle Rental Marketplace. " +
      `${MARKETPLACE_STATS.totalListings}+ verified vehicles from Indian logistics owners - Tata Ace, Eicher, Ashok Leyland, Tata Prima, Volvo, refrigerated, tipper, flatbed. ` +
      "Per day, per km, or per trip pricing. With or without driver. List your idle vehicle or post a load today.";

    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[property="og:title"]', "content", "Reanzly Vehicle Rental Marketplace - Rent Trucks, Trailers, Tempo Travellers Pan-India");
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:type"]', "content", "website");
    setMeta('meta[property="og:site_name"]', "content", "Reanzly");
    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "content", "Reanzly Vehicle Rental Marketplace");
    setMeta('meta[name="twitter:description"]', "content", description);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = "https://reanzly.com/marketplace";

    return () => {
      document.title = prevTitle;
    };
  }, []);

  // ---- SEO: ItemList JSON-LD ----
  const itemListJsonLd = useMemo(() => {
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Reanzly Vehicle Rental Marketplace",
      description:
        "Rent trucks, trailers, tempo travellers and container vehicles pan-India. " +
        "Verified vehicles from Indian logistics owners with per day, per km, or per trip pricing.",
      numberOfItems: VEHICLE_LISTINGS.length,
      itemListElement: VEHICLE_LISTINGS.map((l, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: l.title,
        description: `${l.vehicle.typeLabel} · ${l.vehicle.capacityTonnes}T · ${l.route.origin} to ${l.route.destination} · ₹${l.pricing.perDay}/day`,
        url: `https://reanzly.com/marketplace#listing-${l.id}`,
      })),
    });
  }, []);

  // ---- SEO: WebSite + BreadcrumbList JSON-LD ----
  const websiteJsonLd = useMemo(() => {
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Reanzly Vehicle Rental Marketplace",
      url: "https://reanzly.com/marketplace",
      publisher: { "@type": "Organization", name: "Reanzly" },
    });
  }, []);

  const breadcrumbJsonLd = useMemo(() => {
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Reanzly", item: "https://reanzly.com/" },
        { "@type": "ListItem", position: 2, name: "Vehicle Rental Marketplace", item: "https://reanzly.com/marketplace" },
      ],
    });
  }, []);

  // Resolve the currently-selected listing (deep-link support).
  const selectedListing = useMemo(() => {
    if (!selectedListingId) return null;
    return VEHICLE_LISTINGS.find((l) => l.id === selectedListingId) ?? null;
  }, [selectedListingId]);

  // Visually-hidden anchor links to vehicle-type sections - internal links
  // for crawlers. Each type section in <VehicleGrid /> can carry an id like
  // `#cat-tata-ace` for deep-linking. The anchors are hidden from sighted users.
  const vehicleTypeAnchors = useMemo(
    () => VEHICLE_TYPE_ORDER.map((vt) => ({ id: vt, href: `#cat-${vt}`, label: VEHICLE_TYPE_META[vt].label })),
    [],
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* JSON-LD structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: itemListJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: websiteJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />

      {/* Visually-hidden vehicle-type anchor links for crawlers */}
      <nav aria-hidden="true" className="sr-only">
        {vehicleTypeAnchors.map((a) => (
          <a key={a.id} href={a.href}>{a.label} rental</a>
        ))}
      </nav>

      <MarketplaceNav
        tab={tab}
        onTabChange={setTab}
        onListVehicle={() => setListVehicleOpen(true)}
        onPostLoad={() => setPostLoadOpen(true)}
        isPortal={isPortal}
      />

      <main className="flex-1">
        {tab === "vehicles" ? (
          <>
            <MarketplaceHero
              search={filterState.search}
              onSearch={(v) => patchFilter({ search: v })}
              originFilter={filterState.originFilter}
              onOriginFilter={(v) => patchFilter({ originFilter: v })}
              destinationFilter={filterState.destinationFilter}
              onDestinationFilter={(v) => patchFilter({ destinationFilter: v })}
              vehicleTypeFilter={filterState.vehicleTypeFilter}
              onVehicleTypeFilter={(v) => patchFilter({ vehicleTypeFilter: v })}
              availabilityDate={filterState.availabilityDate}
              onAvailabilityDate={(v) => patchFilter({ availabilityDate: v })}
              featured={featuredListings}
              onViewDetails={(id) => setSelectedListingId(id)}
              onClearAndFocusCatalogue={focusCatalogue}
            />

            <section
              id="catalogue"
              aria-label="Browse vehicle listings"
              className="border-t border-border bg-background"
            >
              <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
                <MarketplaceFilters
                  state={filterState}
                  onPatch={patchFilter}
                  onSearch={(v) => patchFilter({ search: v })}
                  sort={sort}
                  onSort={setSort}
                  onClear={clearFilters}
                  totalCount={VEHICLE_LISTINGS.length}
                  resultCount={filteredListings.length}
                  open={filtersOpen}
                  onOpenChange={setFiltersOpen}
                />

                <div className="mt-8">
                  <SavedListingsStrip
                    savedCount={savedIds.size}
                    onClearAll={() => setSavedIds(new Set())}
                  />
                  <VehicleGrid
                    listings={filteredListings}
                    savedIds={savedIds}
                    onToggleSave={toggleSave}
                    onViewDetails={(id) => setSelectedListingId(id)}
                    onClearFilters={clearFilters}
                  />
                </div>
              </div>
            </section>
          </>
        ) : (
          <MarketplaceLoadsSection
            loads={LOAD_LISTINGS}
            onApply={(load) => {
              if (isPortal) {
                setBiddingLoad(load);
              } else {
                toast.success("Load applied", {
                  description: `Your application for ${load.origin} → ${load.destination} (₹${load.budget.toLocaleString("en-IN")}) has been sent to ${load.shipper}.`,
                });
              }
            }}
            onPostLoad={() => setPostLoadOpen(true)}
            onBrowseVehicles={() => setTab("vehicles")}
          />
        )}

        {!isPortal && (
          <MarketplaceCTA
            onListVehicle={() => setListVehicleOpen(true)}
            onPostLoad={() => setPostLoadOpen(true)}
            onSignUp={() => {
              useAppStore.getState().setAuthMode("signup");
              useAppStore.getState().setMarketingView("auth");
            }}
          />
        )}
      </main>

      {!isPortal && <MarketingFooter />}

      {/* Live bidding modal dialog for vendors */}
      {biddingLoad && (
        <Dialog open onOpenChange={(open) => !open && setBiddingLoad(null)}>
          <DialogContent className="rounded-[6px] border-border bg-background p-5 shadow-lg sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-[16px] font-semibold text-foreground">
                Submit Bid for {biddingLoad.shipper}
              </DialogTitle>
              <DialogDescription className="text-[12px] text-muted-foreground">
                Lane: {biddingLoad.origin} → {biddingLoad.destination} · Budget: ₹{biddingLoad.budget.toLocaleString("en-IN")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleBidSubmit} className="mt-4 flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Your Bid Rate (₹ / km) *
                </label>
                <input
                  type="number"
                  required
                  value={bidRate}
                  onChange={(e) => setBidRate(e.target.value)}
                  placeholder="e.g. 14"
                  className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Notes / Fleet Details
                </label>
                <textarea
                  value={bidNotes}
                  onChange={(e) => setBidNotes(e.target.value)}
                  placeholder="Mention vehicle number, driver availability..."
                  rows={3}
                  className="focus-ring w-full rounded-[5px] border border-border bg-background p-2.5 text-[13px] text-foreground"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBiddingLoad(null)}
                  className="h-10 flex-1 rounded-[6px] border border-border text-[13px] font-medium text-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBid}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[6px] bg-foreground text-[13px] font-medium uppercase tracking-wider text-background hover:bg-foreground/90 disabled:opacity-50"
                >
                  {submittingBid ? "Submitting..." : "Submit Bid"}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Listing detail dialog (state-driven, deep-linkable) */}
      {selectedListing && (
        <MarketplaceDetailDialog
          listing={selectedListing}
          onOpenChange={(open) => {
            if (!open) setSelectedListingId(null);
          }}
          onContactOwner={(l) => {
            toast.success("Contact request sent", {
              description: `${l.owner.name} will reach out shortly. They usually reply ${l.owner.responseTime.toLowerCase().replace("usually replies ", "in ")}.`,
            });
          }}
          onSignUp={() => {
            setSelectedListingId(null);
            useAppStore.getState().setAuthMode("signup");
            useAppStore.getState().setMarketingView("auth");
          }}
        />
      )}

      {/* List Your Vehicle sheet (vehicle owners) */}
      <ListYourVehicleSheet open={listVehicleOpen} onOpenChange={setListVehicleOpen} />

      {/* Post a Load sheet (shippers) */}
      <PostLoadSheet open={postLoadOpen} onOpenChange={setPostLoadOpen} />
    </div>
  );
}

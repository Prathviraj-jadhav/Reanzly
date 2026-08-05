"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppStore } from "@/lib/store/app-store";
import {
  Store, Send, Check, Star, BadgeCheck, MapPin, Truck, Filter, Clock,
  TrendingUp, Inbox, ChevronDown, Percent, Calendar, Tags,
  Sparkles, ArrowRight, Phone, Award, Image as ImageIcon, X,
  BellRing, Handshake, Plus,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  REANZLY_LANE_RATES,
  SEED_MARKETPLACE_LOADS,
  SEED_QUOTES,
  SEED_LISTING,
  DEFAULT_MARKUP_PCT,
  VEHICLE_TYPES,
  LISTING_SERVICE_OPTIONS,
  LISTING_SPECIALIZATIONS,
  LISTING_CERTIFICATIONS,
  type MarketplaceLoad,
  type BrokerQuote,
  type MarketplaceListing,
  formatINR,
  formatINRCompact,
  formatDate,
  relativeTime,
  resaleRate,
  quoteStatusBadge,
  KpiTile,
  FieldLabel,
} from "./_helpers";

type PostingTimeFilter = "any" | "24h" | "48h" | "7d";

export function BrokerMarketplaceModule() {
  const authUser = useAppStore((s) => s.authUser);
  const brokerProfile = authUser?.brokerProfile;
  const markupPct = brokerProfile?.markupPct ?? DEFAULT_MARKUP_PCT;

  // Marketplace listing (editable via drawer)
  const [listing, setListing] = useState<MarketplaceListing>(SEED_LISTING);
  const [listingOpen, setListingOpen] = useState(false);
  const [profilePreviewOpen, setProfilePreviewOpen] = useState(false);

  // Active load board - filters + search + Quote action.
  // `filters` is the active set of removable filter pills (lane + vehicle +
  // posting-time). The dropdowns above the table push into this set; each
  // pill has an X to remove it.
  const [loadSearch, setLoadSearch] = useState("");
  const [laneFilter, setLaneFilter] = useState<string>("");
  const [vehicleFilter, setVehicleFilter] = useState<string>("");
  const [postingTimeFilter, setPostingTimeFilter] = useState<PostingTimeFilter>("any");
  const [loads, setLoads] = useState<MarketplaceLoad[]>(SEED_MARKETPLACE_LOADS);

  // Quotes list (local state - quoting a load prepends to it)
  const [quotes, setQuotes] = useState<BrokerQuote[]>(SEED_QUOTES);

  // Quote drawer - opens when "Quote" button is clicked on a load row.
  const [quoteTarget, setQuoteTarget] = useState<MarketplaceLoad | null>(null);

  // ===== Derived: filtered loads =====
  const filteredLoads = useMemo(() => {
    let r = loads;
    if (loadSearch.trim()) {
      const q = loadSearch.toLowerCase().trim();
      r = r.filter(
        (l) =>
          l.id.toLowerCase().includes(q) ||
          l.lane.toLowerCase().includes(q) ||
          l.customer.toLowerCase().includes(q),
      );
    }
    if (laneFilter) r = r.filter((l) => l.lane === laneFilter);
    if (vehicleFilter) r = r.filter((l) => l.vehicleType === vehicleFilter);
    if (postingTimeFilter !== "any") {
      const now = Date.now();
      const cutoff = postingTimeFilter === "24h" ? 1 : postingTimeFilter === "48h" ? 2 : 7;
      r = r.filter((l) => now - new Date(l.postedAt).getTime() <= cutoff * 86400000);
    }
    return r;
  }, [loads, loadSearch, laneFilter, vehicleFilter, postingTimeFilter]);

  // ===== Derived: KPIs =====
  const pendingQuotes = quotes.filter((q) => q.status === "Pending").length;
  const acceptedQuotes = quotes.filter((q) => q.status === "Accepted").length;
  const decided = quotes.filter((q) => q.status === "Accepted" || q.status === "Rejected").length;
  const winRate = decided === 0 ? 0 : Math.round((acceptedQuotes / decided) * 100);
  const totalQuotedValue = quotes.reduce(
    (s, q) => s + q.quotedRatePerKm * (REANZLY_LANE_RATES.find((l) => l.lane === q.lane)?.distanceKm ?? 0),
    0,
  );

  // Sorted quotes (most recent first).
  const sortedQuotes = useMemo(
    () => [...quotes].sort((a, b) => new Date(b.quotedAt).getTime() - new Date(a.quotedAt).getTime()),
    [quotes],
  );

  // ===== Handlers =====
  const quoteLoad = (load: MarketplaceLoad) => setQuoteTarget(load);

  const submitQuote = (input: {
    load: MarketplaceLoad;
    markupPct: number;
    etaHours: number;
    terms: string;
  }) => {
    const { load, markupPct: appliedMarkup, etaHours } = input;
    const rate = resaleRate(load.baseRatePerKm, appliedMarkup);
    const newQuote: BrokerQuote = {
      id: `qte-${String(6200 + quotes.length).padStart(5, "0")}`,
      loadId: load.id,
      lane: load.lane,
      vehicleType: load.vehicleType,
      customer: load.customer,
      quotedRatePerKm: rate,
      baseRatePerKm: load.baseRatePerKm,
      markupPct: appliedMarkup,
      quotedAt: new Date().toISOString(),
      status: "Pending",
    };
    setQuotes((prev) => [newQuote, ...prev]);
    setLoads((prev) => prev.filter((l) => l.id !== load.id));
    setQuoteTarget(null);
    toast.success(`Quote sent at ${formatINR(rate)}/km`, {
      description: `${load.id} · ${load.lane} · ${load.customer} · ETA ${etaHours}h`,
    });
  };

  const saveListing = (next: MarketplaceListing) => {
    setListing(next);
    setListingOpen(false);
    toast.success("Marketplace listing updated", {
      description: "Public profile changes are live on the directory.",
    });
  };

  const followUpQuote = (q: BrokerQuote) => {
    toast(`Reminder set for ${q.id}`, {
      description: `Follow-up scheduled for tomorrow 10:00 IST · ${q.customer}.`,
      icon: <BellRing className="h-4 w-4" />,
    });
  };

  // Active filter pills (lane + vehicle + posting-time).
  const activeFilterPills: { label: string; onRemove: () => void }[] = [];
  if (laneFilter) activeFilterPills.push({ label: `Lane: ${laneFilter}`, onRemove: () => setLaneFilter("") });
  if (vehicleFilter) activeFilterPills.push({ label: `Vehicle: ${vehicleFilter}`, onRemove: () => setVehicleFilter("") });
  if (postingTimeFilter !== "any")
    activeFilterPills.push({
      label: `Posted within ${postingTimeFilter === "24h" ? "24h" : postingTimeFilter === "48h" ? "48h" : "7d"}`,
      onRemove: () => setPostingTimeFilter("any"),
    });

  return (
    <div className="flex min-h-full flex-col gap-4 pb-8">
      <PageHeader
        title="Broker Marketplace"
        description="Get found by customers, quote on open loads, and track your win rate. Your public listing drives inbound enquiries."
        meta={[
          { label: "Rating", value: `${listing.rating} / 5` },
          { label: "Reviews", value: String(listing.reviewCount) },
          { label: "Badges", value: String(listing.badges.length) },
        ]}
        actions={
          <Btn variant="outline" icon={<Store className="h-3.5 w-3.5" />} onClick={() => setListingOpen(true)}>
            Edit listing
          </Btn>
        }
      />

      {/* Hero - polished marketplace presence banner */}
      <HeroBanner listing={listing} onEdit={() => setListingOpen(true)} onPreview={() => setProfilePreviewOpen(true)} />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile icon={<Inbox className="h-3.5 w-3.5" />} label="Open loads" value={String(loads.length)} hint="matching your coverage" />
        <KpiTile icon={<Send className="h-3.5 w-3.5" />} label="Pending quotes" value={String(pendingQuotes)} hint="awaiting customer response" />
        <KpiTile icon={<Check className="h-3.5 w-3.5" />} label="Accepted" value={String(acceptedQuotes)} hint="won this cycle" />
        <KpiTile icon={<TrendingUp className="h-3.5 w-3.5" />} label="Win rate" value={`${winRate}%`} hint={`${decided} decided`} />
        <KpiTile icon={<Star className="h-3.5 w-3.5" />} label="Rating" value={`${listing.rating}`} hint={`${listing.reviewCount} reviews`} />
        <KpiTile icon={<TrendingUp className="h-3.5 w-3.5" />} label="Quoted value" value={formatINRCompact(totalQuotedValue)} hint="all sent quotes" />
      </div>

      {/* "Market Yourself" CTA banner */}
      <MarketYourselfBanner listing={listing} onEnhance={() => setListingOpen(true)} />

      {/* My marketplace listing - redesigned */}
      <SectionCard
        title="My marketplace listing"
        description="Your public profile on the Reanzly directory. Customers find you by lane, city, or service."
        icon={<Store className="h-4 w-4" />}
        action={
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={() => setProfilePreviewOpen(true)}>
              View public profile
            </Btn>
            <Btn variant="outline" size="sm" onClick={() => setListingOpen(true)}>
              Edit
            </Btn>
          </div>
        }
      >
        <ListingCard listing={listing} markupPct={markupPct} />
      </SectionCard>

      {/* Active load board - redesigned with filter pills */}
      <SectionCard
        title="Active load board"
        description="Open loads on the Reanzly marketplace matching your coverage. Quote fast - loads expire when the customer accepts."
        icon={<Truck className="h-4 w-4" />}
        flush
      >
        {/* Toolbar: search + dropdowns + count */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
          <SearchInput
            value={loadSearch}
            onChange={setLoadSearch}
            placeholder="Search loads by id, lane, customer..."
            className="max-w-[260px]"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Lane:</span>
                <span className="max-w-[140px] truncate">{laneFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-[280px] w-56 overflow-y-auto scrollbar-thin">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by lane
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLaneFilter("")} className="text-[13px]">All lanes</DropdownMenuItem>
              {REANZLY_LANE_RATES.map((l) => (
                <DropdownMenuItem key={l.id} onClick={() => setLaneFilter(l.lane)} className="text-[13px]">
                  {l.lane}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Vehicle:</span>
                <span className="max-w-[120px] truncate">{vehicleFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by vehicle
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setVehicleFilter("")} className="text-[13px]">All types</DropdownMenuItem>
              {VEHICLE_TYPES.map((v) => (
                <DropdownMenuItem key={v} onClick={() => setVehicleFilter(v)} className="text-[13px]">
                  {v}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Posted:</span>
                <span className="max-w-[100px] truncate">
                  {postingTimeFilter === "any" ? "Any time" : postingTimeFilter === "24h" ? "Last 24h" : postingTimeFilter === "48h" ? "Last 48h" : "Last 7d"}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by posting time
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPostingTimeFilter("any")} className="text-[13px]">Any time</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPostingTimeFilter("24h")} className="text-[13px]">Last 24 hours</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPostingTimeFilter("48h")} className="text-[13px]">Last 48 hours</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPostingTimeFilter("7d")} className="text-[13px]">Last 7 days</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="ml-auto text-[11px] text-muted-foreground tabular">
            {filteredLoads.length} of {loads.length} loads
          </div>
        </div>

        {/* Active filter pills row (only shown when filters are active) */}
        {activeFilterPills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/20 px-4 py-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Active filters:</span>
            {activeFilterPills.map((p, i) => (
              <span
                key={i}
                className="inline-flex h-6 items-center gap-1 rounded-[5px] border border-foreground bg-foreground px-2 text-[11px] font-medium text-background"
              >
                {p.label}
                <button
                  onClick={p.onRemove}
                  className="tap ml-0.5 rounded-[2px] hover:opacity-70"
                  aria-label={`Remove filter ${p.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              onClick={() => {
                setLaneFilter("");
                setVehicleFilter("");
                setPostingTimeFilter("any");
              }}
              className="tap ml-1 inline-flex h-6 items-center gap-1 rounded-[5px] px-2 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Load board table - redesigned */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-[13px]">
            <thead className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Load</th>
                <th className="px-4 py-2 text-left font-medium">Lane</th>
                <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Vehicle</th>
                <th className="px-4 py-2 text-right font-medium">Weight</th>
                <th className="px-4 py-2 text-left font-medium">Pickup</th>
                <th className="px-4 py-2 text-right font-medium">Base rate</th>
                <th className="px-4 py-2 text-right font-medium">Your resale</th>
                <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Customer</th>
                <th className="px-4 py-2 text-left font-medium">Posted</th>
                <th className="px-4 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLoads.map((l, i) => {
                const resale = resaleRate(l.baseRatePerKm, markupPct);
                const urgent = l.timeToQuoteHrs <= 4;
                const postedLabel = relativeTime(l.postedAt);
                return (
                  <tr
                    key={l.id}
                    className={
                      i % 2 === 0 ? "border-b border-border/60 bg-background" : "border-b border-border/60 bg-muted/10"
                    }
                  >
                    <td className="px-4 py-2.5">
                      <div className="tabular text-[12.5px] font-medium text-foreground">{l.id}</div>
                      <div className="text-[11px] text-muted-foreground">
                        <span className={"inline-flex items-center gap-1 " + (urgent ? "font-medium text-foreground" : "")}>
                          <Clock className="h-3 w-3" />
                          {l.timeToQuoteHrs}h left to quote
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-left text-foreground">{l.lane}</td>
                    <td className="hidden px-4 py-2.5 text-left text-muted-foreground sm:table-cell">{l.vehicleType}</td>
                    <td className="px-4 py-2.5 text-right tabular text-muted-foreground">{l.weightTon} T</td>
                    <td className="px-4 py-2.5 text-left text-muted-foreground">{formatDate(l.pickupDate)}</td>
                    <td className="px-4 py-2.5 text-right tabular text-muted-foreground">{formatINR(l.baseRatePerKm)}/km</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="tabular font-medium text-foreground">{formatINR(resale)}/km</span>
                    </td>
                    <td className="hidden px-4 py-2.5 text-left md:table-cell">
                      <div className="text-foreground">{l.customer}</div>
                      <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] tabular text-muted-foreground">
                        <Star className="h-2.5 w-2.5" />
                        {l.customerRating.toFixed(1)}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-left">
                      <span
                        className={
                          "inline-flex items-center gap-1 rounded-[5px] border px-1.5 py-0.5 text-[10px] font-medium tabular " +
                          (urgent
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-background text-muted-foreground")
                        }
                      >
                        {postedLabel}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Btn
                        variant="primary"
                        size="sm"
                        icon={<Send className="h-3 w-3" />}
                        onClick={() => quoteLoad(l)}
                      >
                        Quote
                      </Btn>
                    </td>
                  </tr>
                );
              })}
              {filteredLoads.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                    No open loads match your filters. Try clearing the lane or vehicle filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* My quotes - improved with sort + follow up */}
      <SectionCard
        title="My quotes"
        description="Quotes you have sent on marketplace loads. Sorted by most recent. Use Follow up to schedule a reminder."
        icon={<Send className="h-4 w-4" />}
        flush
      >
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-[13px]">
            <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Quote</th>
                <th className="px-4 py-2 text-left font-medium">Lane</th>
                <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Vehicle</th>
                <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Customer</th>
                <th className="px-4 py-2 text-right font-medium">Base rate</th>
                <th className="px-4 py-2 text-right font-medium">Markup</th>
                <th className="px-4 py-2 text-right font-medium">Quoted rate</th>
                <th className="px-4 py-2 text-left font-medium">Sent</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedQuotes.map((q, i) => {
                const qb = quoteStatusBadge(q.status);
                return (
                  <tr
                    key={q.id}
                    className={i % 2 === 0 ? "border-b border-border/60 bg-background" : "border-b border-border/60 bg-muted/10"}
                  >
                    <td className="px-4 py-2.5">
                      <div className="tabular text-[12.5px] font-medium text-foreground">{q.id}</div>
                      <div className="text-[11px] text-muted-foreground tabular">{q.loadId}</div>
                    </td>
                    <td className="px-4 py-2.5 text-left text-foreground">{q.lane}</td>
                    <td className="hidden px-4 py-2.5 text-left text-muted-foreground sm:table-cell">{q.vehicleType}</td>
                    <td className="hidden px-4 py-2.5 text-left text-muted-foreground md:table-cell">{q.customer}</td>
                    <td className="px-4 py-2.5 text-right tabular text-muted-foreground">{formatINR(q.baseRatePerKm)}/km</td>
                    <td className="px-4 py-2.5 text-right tabular text-muted-foreground">{q.markupPct}%</td>
                    <td className="px-4 py-2.5 text-right tabular font-medium text-foreground">{formatINR(q.quotedRatePerKm)}/km</td>
                    <td className="px-4 py-2.5 text-left text-muted-foreground">{relativeTime(q.quotedAt)}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge variant={qb.variant} pulse={qb.pulse}>{q.status}</StatusBadge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Btn
                        variant="outline"
                        size="sm"
                        icon={<BellRing className="h-3 w-3" />}
                        onClick={() => followUpQuote(q)}
                      >
                        Follow up
                      </Btn>
                    </td>
                  </tr>
                );
              })}
              {sortedQuotes.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                    No quotes sent yet. Quote an open load above to see it here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Edit listing drawer - expanded with comprehensive form */}
      <ListingDrawer
        key={listingOpen ? "open" : "closed"}
        open={listingOpen}
        listing={listing}
        onClose={() => setListingOpen(false)}
        onSave={saveListing}
      />

      {/* Public profile preview dialog */}
      <ProfilePreviewDialog
        open={profilePreviewOpen}
        onClose={() => setProfilePreviewOpen(false)}
        listing={listing}
      />

      {/* Quote drawer */}
      <QuoteDrawer
        key={quoteTarget?.id ?? "closed"}
        load={quoteTarget}
        defaultMarkupPct={markupPct}
        onClose={() => setQuoteTarget(null)}
        onSubmit={submitQuote}
      />
    </div>
  );
}

/* ============================================================
   Hero Banner - polished marketplace presence card.
   Strong typography hierarchy, big rating number, badge chips,
   lanes covered, response time, all monochrome.
   ============================================================ */
function HeroBanner({
  listing,
  onEdit,
  onPreview,
}: {
  listing: MarketplaceListing;
  onEdit: () => void;
  onPreview: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-[6px] border border-border bg-card">
      {/* Top strip - identity */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="flex items-start gap-4">
          {/* 56px avatar/logo tile */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[6px] border border-foreground bg-foreground text-background">
            <Store className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[20px] font-medium leading-tight tracking-tight text-foreground">
                {listing.name}
              </h2>
              {listing.verified && (
                <StatusBadge variant="solid" pulse>
                  <BadgeCheck className="h-3 w-3" /> Verified
                </StatusBadge>
              )}
            </div>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{listing.tagline}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] tabular text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {listing.cities[0]} +{listing.cities.length - 1} cities
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Est. {listing.yearEstablished}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> Responds {listing.responseTimeSla}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="ghost" size="sm" onClick={onPreview}>View public profile</Btn>
          <Btn variant="primary" size="sm" icon={<Store className="h-3.5 w-3.5" />} onClick={onEdit}>
            Enhance listing
          </Btn>
        </div>
      </div>

      {/* Stats row - big rating + badges + lanes */}
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[200px_1fr]">
        {/* Big rating block */}
        <div className="border-b border-border px-5 py-4 lg:border-b-0 lg:border-r">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Marketplace rating
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="tabular text-[36px] font-medium leading-none tracking-tight text-foreground">
              {listing.rating.toFixed(1)}
            </span>
            <span className="tabular text-[12px] text-muted-foreground">/ 5</span>
          </div>
          <div className="mt-1.5 flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={
                  "h-3.5 w-3.5 " +
                  (i < Math.round(listing.rating)
                    ? "fill-foreground text-foreground"
                    : "text-muted-foreground/40")
                }
              />
            ))}
            <span className="ml-1.5 tabular text-[11px] text-muted-foreground">
              {listing.reviewCount} reviews
            </span>
          </div>
        </div>

        {/* Right side - badges + lanes */}
        <div className="flex flex-col gap-3 px-5 py-4">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Badges & certifications
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {listing.badges.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1 rounded-[5px] border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground"
                >
                  <Check className="h-3 w-3 text-muted-foreground" /> {b}
                </span>
              ))}
              {listing.certifications.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 rounded-[5px] border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground"
                >
                  <Award className="h-3 w-3 text-muted-foreground" /> {c}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Coverage lanes
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {listing.coverageLanes.map((l) => (
                <span
                  key={l}
                  className="inline-flex items-center gap-1 rounded-[5px] border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground"
                >
                  <Truck className="h-3 w-3 text-muted-foreground" /> {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MarketYourselfBanner - "Promote your business" CTA above the
   load board. Calls the user to complete their listing to
   attract inbound enquiries.
   ============================================================ */
function MarketYourselfBanner({
  listing,
  onEnhance,
}: {
  listing: MarketplaceListing;
  onEnhance: () => void;
}) {
  // Completeness score (rough): how many optional fields are filled.
  const checks = [
    !!listing.about,
    listing.services.length >= 3,
    listing.coverageLanes.length >= 3,
    listing.cities.length >= 3,
    listing.specializations.length > 0,
    listing.certifications.length > 0,
    listing.galleryImages.length >= 3,
    !!listing.contactHours,
  ];
  const filled = checks.filter(Boolean).length;
  const completeness = Math.round((filled / checks.length) * 100);

  return (
    <div className="relative overflow-hidden rounded-[6px] border border-foreground bg-foreground text-background">
      <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[6px] border border-background/30 bg-background/10 text-background">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15px] font-medium tracking-tight">
                Promote your business on the Reanzly Marketplace
              </h3>
              <span className="inline-flex items-center gap-1 rounded-[5px] border border-background/30 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">
                Listing {completeness}% complete
              </span>
            </div>
            <p className="mt-1 text-[13px] text-background/80">
              Get found by 12,000+ shippers searching the Reanzly marketplace. Complete your listing to attract inbound enquiries and stand out from 800+ competing brokers.
            </p>
            {/* Completeness bar */}
            <div className="mt-2.5 h-1 w-full max-w-md overflow-hidden rounded-full bg-background/20">
              <div
                className="h-full bg-background transition-[width] duration-500"
                style={{ width: `${completeness}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Btn
            variant="outline"
            className="border-background/40 bg-transparent text-background hover:bg-background/10 hover:border-background"
            iconRight={<ArrowRight className="h-3.5 w-3.5" />}
            onClick={onEnhance}
          >
            Enhance Your Listing
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ListingCard - redesigned "My marketplace listing" body.
   2-column grid: [coverage lanes] [services] [cities] [year+fleet]
   Plus about + specializations + certifications + gallery + contact.
   ============================================================ */
function ListingCard({
  listing,
  markupPct,
}: {
  listing: MarketplaceListing;
  markupPct: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* About */}
      {listing.about && (
        <div className="rounded-[6px] border border-border bg-muted/20 px-3 py-2.5">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            About this broker
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-foreground">{listing.about}</p>
        </div>
      )}

      {/* 2-column grid: lanes / services / cities / year+fleet */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListingSubsection label="Coverage lanes" icon={<Truck className="h-3 w-3" />}>
          <div className="flex flex-wrap gap-1.5">
            {listing.coverageLanes.map((l) => (
              <span
                key={l}
                className="inline-flex items-center gap-1 rounded-[5px] border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground"
              >
                <Truck className="h-3 w-3 text-muted-foreground" /> {l}
              </span>
            ))}
          </div>
        </ListingSubsection>

        <ListingSubsection label="Services" icon={<Tags className="h-3 w-3" />}>
          <div className="flex flex-wrap gap-1.5">
            {listing.services.map((s) => (
              <span
                key={s}
                className="rounded-[5px] bg-muted/40 px-2 py-0.5 text-[11px] text-foreground"
              >
                {s}
              </span>
            ))}
          </div>
        </ListingSubsection>

        <ListingSubsection label="Cities" icon={<MapPin className="h-3 w-3" />}>
          <div className="flex flex-wrap gap-1.5">
            {listing.cities.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 rounded-[5px] border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground"
              >
                <MapPin className="h-3 w-3 text-muted-foreground" /> {c}
              </span>
            ))}
          </div>
        </ListingSubsection>

        <ListingSubsection label="Year established & fleet size" icon={<Calendar className="h-3 w-3" />}>
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-[5px] border border-border bg-background px-2.5 py-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Year</div>
              <div className="tabular text-[14px] font-medium text-foreground">{listing.yearEstablished}</div>
            </div>
            <div className="rounded-[5px] border border-border bg-background px-2.5 py-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Fleet</div>
              <div className="text-[12px] font-medium text-foreground">{listing.fleetSizeRange}</div>
            </div>
          </div>
        </ListingSubsection>
      </div>

      {/* Specializations + contact + SLA */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListingSubsection label="Specializations" icon={<Award className="h-3 w-3" />}>
          <div className="flex flex-wrap gap-1.5">
            {listing.specializations.length === 0 ? (
              <span className="text-[11px] text-muted-foreground">Not specified.</span>
            ) : (
              listing.specializations.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 rounded-[5px] border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground"
                >
                  <Award className="h-3 w-3 text-muted-foreground" /> {s}
                </span>
              ))
            )}
          </div>
        </ListingSubsection>

        <ListingSubsection label="Contact & response SLA" icon={<Phone className="h-3 w-3" />}>
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-[5px] border border-border bg-background px-2.5 py-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Response time</div>
              <div className="text-[12px] font-medium text-foreground">{listing.responseTimeSla}</div>
            </div>
            <div className="rounded-[5px] border border-border bg-background px-2.5 py-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Contact hours</div>
              <div className="text-[12px] font-medium text-foreground">{listing.contactHours}</div>
            </div>
          </div>
        </ListingSubsection>
      </div>

      {/* Gallery preview */}
      <ListingSubsection label="Gallery" icon={<ImageIcon className="h-3 w-3" />}>
        {listing.galleryImages.length === 0 ? (
          <div className="rounded-[5px] border border-dashed border-border bg-background px-3 py-4 text-center text-[11px] text-muted-foreground">
            No gallery images yet. Add images in the listing editor to showcase your fleet, warehouse, and operations.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {listing.galleryImages.map((src, i) => (
              <div
                key={i}
                className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[5px] border border-border bg-muted/30"
              >
                <ImageIcon className="h-5 w-5 text-muted-foreground/60" />
                <span className="absolute bottom-1 left-1 right-1 truncate text-[9px] text-muted-foreground">
                  {src.split("/").pop()}
                </span>
              </div>
            ))}
          </div>
        )}
      </ListingSubsection>

      {/* Resale rate card preview */}
      <div className="rounded-[6px] border border-border bg-muted/20 p-3">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Resale rate card preview
        </div>
        <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {REANZLY_LANE_RATES.slice(0, 6).map((l) => (
            <div key={l.id} className="flex items-center justify-between text-[12px]">
              <span className="truncate text-muted-foreground">{l.lane}</span>
              <span className="tabular font-medium text-foreground">{formatINR(resaleRate(l.baseRatePerKm, markupPct))}/km</span>
            </div>
          ))}
        </div>
        <div className="mt-2 border-t border-border pt-2 text-[10px] text-muted-foreground tabular">
          Markup {markupPct}% applied · {REANZLY_LANE_RATES.length} lanes published
        </div>
      </div>
    </div>
  );
}

function ListingSubsection({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

/* ============================================================
   ProfilePreviewDialog - shows how customers see the listing.
   ============================================================ */
function ProfilePreviewDialog({
  open,
  onClose,
  listing,
}: {
  open: boolean;
  onClose: () => void;
  listing: MarketplaceListing;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-medium tracking-tight">
            Public profile preview
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            This is how customers see your listing on the Reanzly marketplace directory.
          </DialogDescription>
        </DialogHeader>

        {/* Customer-facing card */}
        <div className="rounded-[6px] border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[6px] border border-foreground bg-foreground text-background">
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[15px] font-medium tracking-tight text-foreground">{listing.name}</h3>
                {listing.verified && (
                  <StatusBadge variant="solid">
                    <BadgeCheck className="h-3 w-3" /> Verified
                  </StatusBadge>
                )}
              </div>
              <p className="mt-0.5 text-[12px] text-muted-foreground">{listing.tagline}</p>
              <div className="mt-1.5 flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={
                      "h-3 w-3 " +
                      (i < Math.round(listing.rating) ? "fill-foreground text-foreground" : "text-muted-foreground/40")
                    }
                  />
                ))}
                <span className="ml-1 tabular text-[11px] text-muted-foreground">
                  {listing.rating} ({listing.reviewCount})
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 border-t border-border pt-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">About</div>
            <p className="mt-1 text-[12px] leading-relaxed text-foreground">{listing.about}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {listing.services.map((s) => (
              <span key={s} className="rounded-[5px] bg-muted/40 px-2 py-0.5 text-[10px] text-foreground">{s}</span>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {listing.cities.slice(0, 3).join(", ")}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Responds {listing.responseTimeSla}</span>
          </div>
        </div>

        <DialogFooter>
          <Btn variant="outline" icon={<Handshake className="h-3.5 w-3.5" />} onClick={() => toast.info("Enquiry sent", { description: "A test enquiry has been simulated." })}>
            Send test enquiry
          </Btn>
          <Btn variant="primary" onClick={onClose}>Close</Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   ListingDrawer - expanded editor with all fields.
   tagline, about, services (multi-select via checkboxes),
   coverage lanes (multi-select), cities (multi-input), year,
   fleet size, response time SLA, specializations, certifications,
   gallery images (URL inputs), contact hours.
   ============================================================ */
function ListingDrawer({
  open,
  listing,
  onClose,
  onSave,
}: {
  open: boolean;
  listing: MarketplaceListing;
  onClose: () => void;
  onSave: (next: MarketplaceListing) => void;
}) {
  const [name, setName] = useState(listing.name);
  const [tagline, setTagline] = useState(listing.tagline);
  const [about, setAbout] = useState(listing.about);
  const [services, setServices] = useState<string[]>(listing.services);
  const [coverageLanes, setCoverageLanes] = useState<string[]>(listing.coverageLanes);
  const [cities, setCities] = useState(listing.cities.join(", "));
  const [fleetSizeRange, setFleetSizeRange] = useState(listing.fleetSizeRange);
  const [yearEstablished, setYearEstablished] = useState(String(listing.yearEstablished));
  const [responseTimeSla, setResponseTimeSla] = useState(listing.responseTimeSla);
  const [contactHours, setContactHours] = useState(listing.contactHours);
  const [specializations, setSpecializations] = useState<string[]>(listing.specializations);
  const [certifications, setCertifications] = useState<string[]>(listing.certifications);
  const [galleryImages, setGalleryImages] = useState<string[]>(listing.galleryImages);

  const toggleIn = (arr: string[], v: string, set: (next: string[]) => void) => {
    if (arr.includes(v)) set(arr.filter((x) => x !== v));
    else set([...arr, v]);
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="inset-y-0 right-0 left-auto w-full sm:max-w-lg rounded-l-[6px] border-l p-0">
        <DrawerHeader className="border-b border-border px-5 py-4 text-left">
          <DrawerTitle className="text-[16px] font-medium tracking-tight">Edit marketplace listing</DrawerTitle>
          <DrawerDescription className="text-[12px] text-muted-foreground">
            Update your public profile on the Reanzly directory. All fields are visible to customers.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
          <div className="flex flex-col gap-4">
            {/* Identity */}
            <div>
              <FieldLabel required>Listing name</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 rounded-[5px] text-[13px]" />
            </div>
            <div>
              <FieldLabel>Tagline</FieldLabel>
              <Input value={tagline} onChange={(e) => setTagline(e.target.value)} className="h-8 rounded-[5px] text-[13px]" />
            </div>
            <div>
              <FieldLabel hint="2-3 sentences">About</FieldLabel>
              <Textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                rows={4}
                className="rounded-[5px] text-[12.5px]"
                placeholder="Tell customers about your brokerage, experience, and the value you bring."
              />
            </div>

            {/* Services (multi-select via checkboxes) */}
            <div>
              <FieldLabel hint={`${services.length} selected`}>Services</FieldLabel>
              <div className="grid grid-cols-2 gap-1.5 rounded-[5px] border border-border bg-background p-2">
                {LISTING_SERVICE_OPTIONS.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-[12px] text-foreground cursor-pointer">
                    <Checkbox
                      checked={services.includes(s)}
                      onCheckedChange={() => toggleIn(services, s, setServices)}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            {/* Coverage lanes (multi-select) */}
            <div>
              <FieldLabel hint={`${coverageLanes.length} selected`}>Coverage lanes</FieldLabel>
              <div className="grid grid-cols-1 gap-1.5 rounded-[5px] border border-border bg-background p-2">
                {REANZLY_LANE_RATES.map((l) => (
                  <label key={l.id} className="flex items-center gap-2 text-[12px] text-foreground cursor-pointer">
                    <Checkbox
                      checked={coverageLanes.includes(l.lane)}
                      onCheckedChange={() => toggleIn(coverageLanes, l.lane, setCoverageLanes)}
                    />
                    {l.lane} <span className="tabular text-[10px] text-muted-foreground">· {l.distanceKm} km</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Cities (multi-input as comma-separated) */}
            <div>
              <FieldLabel hint="comma separated">Cities</FieldLabel>
              <Input value={cities} onChange={(e) => setCities(e.target.value)} className="h-8 rounded-[5px] text-[13px]" />
            </div>

            {/* Year + Fleet size + Response SLA + Contact hours */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Year established</FieldLabel>
                <Input
                  type="number"
                  value={yearEstablished}
                  onChange={(e) => setYearEstablished(e.target.value)}
                  className="h-8 rounded-[5px] text-[13px] tabular"
                />
              </div>
              <div>
                <FieldLabel>Fleet size (display)</FieldLabel>
                <Input value={fleetSizeRange} onChange={(e) => setFleetSizeRange(e.target.value)} className="h-8 rounded-[5px] text-[13px]" />
              </div>
              <div>
                <FieldLabel>Response time SLA</FieldLabel>
                <Input value={responseTimeSla} onChange={(e) => setResponseTimeSla(e.target.value)} className="h-8 rounded-[5px] text-[13px]" />
              </div>
              <div>
                <FieldLabel>Contact hours</FieldLabel>
                <Input value={contactHours} onChange={(e) => setContactHours(e.target.value)} className="h-8 rounded-[5px] text-[13px]" />
              </div>
            </div>

            {/* Specializations (multi-select) */}
            <div>
              <FieldLabel hint={`${specializations.length} selected`}>Specializations</FieldLabel>
              <div className="grid grid-cols-2 gap-1.5 rounded-[5px] border border-border bg-background p-2">
                {LISTING_SPECIALIZATIONS.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-[12px] text-foreground cursor-pointer">
                    <Checkbox
                      checked={specializations.includes(s)}
                      onCheckedChange={() => toggleIn(specializations, s, setSpecializations)}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            {/* Certifications (multi-select) */}
            <div>
              <FieldLabel hint={`${certifications.length} selected`}>Certifications</FieldLabel>
              <div className="grid grid-cols-2 gap-1.5 rounded-[5px] border border-border bg-background p-2">
                {LISTING_CERTIFICATIONS.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-[12px] text-foreground cursor-pointer">
                    <Checkbox
                      checked={certifications.includes(c)}
                      onCheckedChange={() => toggleIn(certifications, c, setCertifications)}
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            {/* Gallery images (URL inputs) */}
            <div>
              <FieldLabel hint={`${galleryImages.length} images`}>Gallery images</FieldLabel>
              <div className="flex flex-col gap-1.5">
                {galleryImages.map((src, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Input
                      value={src}
                      onChange={(e) => setGalleryImages((prev) => prev.map((p, idx) => (idx === i ? e.target.value : p)))}
                      className="h-8 flex-1 rounded-[5px] text-[12px] font-mono"
                    />
                    <button
                      onClick={() => setGalleryImages((prev) => prev.filter((_, idx) => idx !== i))}
                      className="tap flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <Btn
                  variant="outline"
                  size="sm"
                  icon={<Plus className="h-3 w-3" />}
                  onClick={() => setGalleryImages((prev) => [...prev, "/marketplace/new-image.jpg"])}
                >
                  Add image
                </Btn>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn
            variant="primary"
            icon={<Check className="h-3.5 w-3.5" />}
            onClick={() =>
              onSave({
                ...listing,
                name: name.trim() || listing.name,
                tagline: tagline.trim() || listing.tagline,
                about: about.trim(),
                services,
                coverageLanes,
                cities: cities.split(",").map((c) => c.trim()).filter(Boolean),
                fleetSizeRange: fleetSizeRange.trim() || listing.fleetSizeRange,
                yearEstablished: Number(yearEstablished) || listing.yearEstablished,
                responseTimeSla: responseTimeSla.trim() || listing.responseTimeSla,
                contactHours: contactHours.trim() || listing.contactHours,
                specializations,
                certifications,
                galleryImages,
              })
            }
          >
            Save listing
          </Btn>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ============================================================
   QuoteDrawer - opens from the load board.
   Pre-fills origin/destination/vehicle/customer rate from the
   load and lets the broker adjust markup %, ETA and terms.
   ============================================================ */
function QuoteDrawer({
  load,
  defaultMarkupPct,
  onClose,
  onSubmit,
}: {
  load: MarketplaceLoad | null;
  defaultMarkupPct: number;
  onClose: () => void;
  onSubmit: (input: {
    load: MarketplaceLoad;
    markupPct: number;
    etaHours: number;
    terms: string;
  }) => void;
}) {
  const [markupPct, setMarkupPct] = useState<number>(defaultMarkupPct);
  const [etaHours, setEtaHours] = useState<number>(24);
  const [terms, setTerms] = useState<string>(
    "Quoted rate valid for 7 days from issue. Pickup confirmation subject to vehicle availability. Late payment charges @ 18% p.a. after 30 days.",
  );

  const lane = load ? REANZLY_LANE_RATES.find((l) => l.lane === load.lane) : undefined;
  const resale = load ? resaleRate(load.baseRatePerKm, markupPct) : 0;
  const totalFreight = lane ? resale * lane.distanceKm : 0;
  const open = !!load;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="inset-y-0 right-0 left-auto w-full sm:max-w-md rounded-l-[6px] border-l p-0">
        <DrawerHeader className="border-b border-border px-5 py-4 text-left">
          <DrawerTitle className="text-[16px] font-medium tracking-tight">
            Quote on marketplace load
          </DrawerTitle>
          <DrawerDescription className="text-[12px] text-muted-foreground">
            Pre-filled from the load board. Adjust your markup, ETA and terms, then send.
          </DrawerDescription>
        </DrawerHeader>

        {load && (
          <>
            {/* Pre-filled load summary - read-only */}
            <div className="border-b border-border bg-muted/20 px-5 py-3">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="tabular font-medium text-foreground">{load.id}</span>
                <span>posted {relativeTime(load.postedAt)}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[13px] font-medium text-foreground">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {lane ? `${lane.origin} → ${lane.destination}` : load.lane}
                {lane && (
                  <span className="text-[11px] text-muted-foreground tabular">
                    · {lane.distanceKm} km · {lane.transitHours}h transit
                  </span>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <div>
                  <span className="uppercase tracking-wider">Vehicle</span>
                  <div className="mt-0.5 text-[12.5px] font-medium text-foreground">
                    {load.vehicleType} · {load.weightTon} T
                  </div>
                </div>
                <div>
                  <span className="uppercase tracking-wider">Pickup</span>
                  <div className="mt-0.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-foreground">
                    <Calendar className="h-3 w-3" /> {formatDate(load.pickupDate)}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="uppercase tracking-wider">Customer</span>
                  <div className="mt-0.5 flex items-center gap-2 text-[12.5px] font-medium text-foreground">
                    {load.customer}
                    <span className="inline-flex items-center gap-0.5 text-[10px] tabular text-muted-foreground">
                      <Star className="h-2.5 w-2.5" /> {load.customerRating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[12px]">
                <span className="text-muted-foreground">Customer base rate</span>
                <span className="tabular font-medium text-foreground">{formatINR(load.baseRatePerKm)}/km</span>
              </div>
            </div>

            {/* Editable broker inputs */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel required hint="0-50">Markup %</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      step={0.5}
                      value={markupPct}
                      onChange={(e) => setMarkupPct(Number(e.target.value) || 0)}
                      className="h-8 rounded-[5px] text-[13px] tabular"
                    />
                  </div>
                  <div>
                    <FieldLabel required hint="hours">ETA</FieldLabel>
                    <Input
                      type="number"
                      min={1}
                      max={240}
                      value={etaHours}
                      onChange={(e) => setEtaHours(Number(e.target.value) || 0)}
                      className="h-8 rounded-[5px] text-[13px] tabular"
                    />
                  </div>
                </div>

                {/* Computed resale preview */}
                <div className="rounded-[6px] border border-border bg-muted/30 p-3">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Tags className="h-3 w-3" /> Your resale rate</span>
                    <span className="inline-flex items-center gap-1"><Percent className="h-3 w-3" /> +{markupPct}%</span>
                  </div>
                  <div className="mt-1 text-[20px] font-medium tabular text-foreground">
                    {formatINR(resale)}/km
                    {lane && (
                      <span className="ml-2 text-[11px] font-normal text-muted-foreground tabular">
                        = {formatINR(totalFreight)} for {lane.distanceKm} km
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <FieldLabel hint="optional">Terms & conditions</FieldLabel>
                  <Textarea
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    rows={4}
                    className="rounded-[5px] text-[12.5px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
              <Btn
                variant="primary"
                icon={<Send className="h-3.5 w-3.5" />}
                onClick={() =>
                  onSubmit({
                    load,
                    markupPct,
                    etaHours,
                    terms,
                  })
                }
              >
                Send quote
              </Btn>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

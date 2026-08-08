"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DIRECTORY_LISTINGS,
  DIRECTORY_CATEGORIES,
  DIRECTORY_SORT_OPTIONS,
  subscriptionModelLabel,
  type DirectoryListing,
  type DirectoryCategory,
  type DirectorySortKey,
} from "./directory-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  Star,
  BadgeCheck,
  MapPin,
  ArrowRight,
  ExternalLink,
  Send,
  Calendar,
  Truck,
  Clock,
} from "lucide-react";

/**
 * MarketingDirectory - public Logistics Partner Directory.
 *
 * IndiaMART / Zomato-style listing of verified transport companies, brokers,
 * warehouses and fleet owners on the Reanzly network. Section id="directory"
 * lives between the Products section and the Broker CTA on the landing page.
 *
 * Layout:
 *  - Section header + subhead.
 *  - Toolbar: search input (name / city / lane / service), category filter
 *    chips, sort dropdown (Rating / Reviews / Newest).
 *  - Responsive card grid (1 / 2 / 3) - each card has logo-initials tile,
 *    name + verified check, star rating + review count, tagline, cities,
 *    service badges, subscription-model badge and a "View profile" button.
 *  - Clicking a card opens a Dialog with the full profile (about, lanes,
 *    cities, services, badges, year established, fleet size, response time)
 *    and a "Request quote" CTA (toast) + "Visit website" link.
 *
 * Strictly monochrome Swiss/Scandinavian - hairline borders, 6px radii,
 * generous whitespace, no hues, no shadows.
 */

type CategoryFilter = "All" | DirectoryCategory;

const FILTER_CHIPS: CategoryFilter[] = ["All", ...DIRECTORY_CATEGORIES];

export function MarketingDirectory() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [sort, setSort] = useState<DirectorySortKey>("rating");
  const [openListing, setOpenListing] = useState<DirectoryListing | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = DIRECTORY_LISTINGS.filter((l) => {
      if (category !== "All" && l.category !== category) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.tagline.toLowerCase().includes(q) ||
        l.services.some((s) => s.toLowerCase().includes(q)) ||
        l.lanes.some((lane) => lane.toLowerCase().includes(q)) ||
        l.cities.some((c) => c.toLowerCase().includes(q))
      );
    });

    const sorted = [...matches];
    if (sort === "rating") {
      sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    } else if (sort === "reviews") {
      sorted.sort((a, b) => b.reviewCount - a.reviewCount);
    } else {
      sorted.sort((a, b) => b.yearEstablished - a.yearEstablished);
    }
    return sorted;
  }, [query, category, sort]);

  function openProfile(listing: DirectoryListing) {
    setOpenListing(listing);
    setDialogOpen(true);
  }

  function requestQuote(listing: DirectoryListing) {
    toast.success(`Quote request sent to ${listing.name}.`);
    setDialogOpen(false);
  }

  return (
    <section
      id="directory"
      className="border-b border-border bg-background py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Directory
          </p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Logistics Partner Directory
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Verified transport companies, brokers and fleet owners on the
            Reanzly network. Searchable. SEO-ranked. Book in one click.
          </p>
        </div>

        {/* Toolbar */}
        <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search */}
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by company, city, lane or service…"
              aria-label="Search logistics partners"
              className="focus-ring h-11 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="directory-sort"
              className="text-xs uppercase tracking-wider text-muted-foreground"
            >
              Sort
            </label>
            <select
              id="directory-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as DirectorySortKey)}
              className="focus-ring h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
            >
              {DIRECTORY_SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {FILTER_CHIPS.map((chip) => {
            const active = chip === category;
            return (
              <button
                key={chip}
                type="button"
                onClick={() => setCategory(chip)}
                aria-pressed={active}
                className={
                  "tap rounded-full border px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors " +
                  (active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground")
                }
              >
                {chip}
              </button>
            );
          })}
          <span className="ml-auto text-xs tabular text-muted-foreground">
            {filtered.length}{" "}
            {filtered.length === 1 ? "partner" : "partners"}
          </span>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="mt-12 rounded-lg border border-dashed border-border bg-card p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No logistics partners match your search.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("All");
              }}
              className="mt-3 text-sm font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="stagger mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((listing) => (
              <DirectoryCard
                key={listing.slug}
                listing={listing}
                onView={() => openProfile(listing)}
              />
            ))}
          </div>
        )}
      </div>

      <DirectoryProfileDialog
        listing={openListing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onRequestQuote={requestQuote}
      />
    </section>
  );
}

// ── Card ──────────────────────────────────────────────────────────────

function DirectoryCard({
  listing,
  onView,
}: {
  listing: DirectoryListing;
  onView: () => void;
}) {
  const visibleCities = listing.cities.slice(0, 3);
  const extraCities = Math.max(0, listing.cities.length - 3);
  const modelLabel = subscriptionModelLabel(listing.subscriptionModel);

  return (
    <div className="group flex flex-col rounded-lg border border-border bg-card transition-colors hover:border-foreground/40">
      {/* Header: logo + name + verified */}
      <div className="flex items-start gap-3 p-5 sm:p-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[6px] border border-border bg-muted text-sm font-bold tabular text-foreground">
          {listing.logoInitials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-base font-semibold tracking-tight text-foreground">
              {listing.name}
            </h3>
            {listing.verified && (
              <BadgeCheck
                className="h-4 w-4 shrink-0 text-foreground"
                aria-label="Verified"
              />
            )}
          </div>
          {/* Rating */}
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Star
              className="h-3.5 w-3.5 fill-foreground text-foreground"
              aria-hidden
            />
            <span className="font-medium tabular text-foreground">
              {listing.rating.toFixed(1)}
            </span>
            <span aria-hidden>·</span>
            <span className="tabular">{listing.reviewCount} reviews</span>
          </div>
        </div>
      </div>

      {/* Tagline */}
      <div className="px-5 sm:px-6">
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {listing.tagline}
        </p>
      </div>

      {/* Cities */}
      <div className="mt-3 flex items-start gap-2 px-5 sm:px-6">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <p className="text-xs text-foreground/80">
          {visibleCities.join(", ")}
          {extraCities > 0 && (
            <span className="text-muted-foreground"> +{extraCities}</span>
          )}
        </p>
      </div>

      {/* Services */}
      <div className="mt-4 flex flex-wrap gap-1.5 px-5 sm:px-6">
        {listing.services.slice(0, 3).map((svc) => (
          <span
            key={svc}
            className="rounded border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground/80"
          >
            {svc}
          </span>
        ))}
      </div>

      {/* Footer: model badge + CTA */}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border p-5 sm:p-6">
        <SubscriptionModelBadge model={listing.subscriptionModel} label={modelLabel} />
        <button
          type="button"
          onClick={onView}
          className="tap inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:text-foreground/80"
          aria-label={`View profile of ${listing.name}`}
        >
          View profile
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}

function SubscriptionModelBadge({
  model,
  label,
}: {
  model: DirectoryListing["subscriptionModel"];
  label: string;
}) {
  // Master tier gets the inverted fill - it's the top plan.
  const isMaster = model === "master";
  const isCommission = model === "commission";
  return (
    <span
      className={
        "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " +
        (isMaster
          ? "border-foreground bg-foreground text-background"
          : isCommission
            ? "border-foreground/40 bg-background text-foreground"
            : "border-border bg-background text-muted-foreground")
      }
    >
      {label}
    </span>
  );
}

// ── Profile Dialog ────────────────────────────────────────────────────

function DirectoryProfileDialog({
  listing,
  open,
  onOpenChange,
  onRequestQuote,
}: {
  listing: DirectoryListing | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRequestQuote: (l: DirectoryListing) => void;
}) {
  if (!listing) {
    // Keep the dialog mounted but invisible when nothing is selected so
    // Radix's controlled open state has content to render.
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl p-0">
          <div className="p-6" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="border-b border-border p-6 text-left">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[6px] border border-border bg-muted text-base font-bold tabular text-foreground">
              {listing.logoInitials}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="flex items-center gap-1.5 text-xl font-semibold tracking-tight">
                {listing.name}
                {listing.verified && (
                  <BadgeCheck
                    className="h-4 w-4 text-foreground"
                    aria-label="Verified"
                  />
                )}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                {listing.tagline}
              </DialogDescription>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star
                    className="h-3.5 w-3.5 fill-foreground text-foreground"
                    aria-hidden
                  />
                  <span className="font-medium tabular text-foreground">
                    {listing.rating.toFixed(1)}
                  </span>
                  <span className="tabular">
                    ({listing.reviewCount} reviews)
                  </span>
                </span>
                <span aria-hidden>·</span>
                <span>{listing.category}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
          {/* About */}
          <div className="p-6">
            <SectionLabel>About</SectionLabel>
            <p className="mt-3 text-sm leading-relaxed text-foreground">
              {listing.about}
            </p>

            {/* Quick stats */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <QuickStat
                icon={<Calendar className="h-3.5 w-3.5" />}
                label="Established"
                value={String(listing.yearEstablished)}
              />
              <QuickStat
                icon={<Truck className="h-3.5 w-3.5" />}
                label="Fleet size"
                value={listing.fleetSizeRange}
              />
              <QuickStat
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Response time"
                value={listing.responseTime}
              />
            </div>
          </div>

          {/* Lanes */}
          <div className="border-t border-border px-6 py-5">
            <SectionLabel>Served lanes</SectionLabel>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {listing.lanes.map((lane) => (
                <span
                  key={lane}
                  className="rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground"
                >
                  {lane}
                </span>
              ))}
            </div>
          </div>

          {/* Cities */}
          <div className="border-t border-border px-6 py-5">
            <SectionLabel>Operating cities</SectionLabel>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {listing.cities.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground"
                >
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Services */}
          <div className="border-t border-border px-6 py-5">
            <SectionLabel>Services</SectionLabel>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {listing.services.map((svc) => (
                <span
                  key={svc}
                  className="rounded border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground/80"
                >
                  {svc}
                </span>
              ))}
            </div>
          </div>

          {/* Badges */}
          <div className="border-t border-border bg-muted/30 px-6 py-5">
            <SectionLabel>Trust badges</SectionLabel>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {listing.badges.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground"
                >
                  <BadgeCheck className="h-3 w-3" />
                  {b}
                </span>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-foreground/70">Plan:</span>
              <SubscriptionModelBadge
                model={listing.subscriptionModel}
                label={subscriptionModelLabel(listing.subscriptionModel)}
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col gap-2 border-t border-border bg-background p-4 sm:flex-row sm:justify-between sm:items-center">
          <a
            href={`https://${listing.slug}.reanzly.in`}
            target="_blank"
            rel="noopener noreferrer"
            className="tap inline-flex h-10 items-center justify-center gap-1.5 rounded-[6px] border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Visit website
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            type="button"
            onClick={() => onRequestQuote(listing)}
            className="tap inline-flex h-10 items-center justify-center gap-1.5 rounded-[6px] bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
          >
            Request quote
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

function QuickStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[6px] border border-border bg-background p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

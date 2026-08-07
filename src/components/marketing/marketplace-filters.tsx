"use client";

/**
 * MarketplaceFilters — left sidebar (desktop) / slide-over drawer (mobile)
 * for the Vehicle Rental Marketplace.
 *
 * Controls:
 *   • Search input (mirrors the hero search — both update the same state)
 *   • Vehicle type checkboxes (15 types, each with listing count)
 *   • Body type checkboxes (open / closed / container / refrigerated / tipper / tanker)
 *   • Axle checkboxes (4 / 6 / 10 / 12)
 *   • Region checkboxes (West / North / South / East / Central)
 *   • Availability date (single date input — show listings available from that date)
 *   • Price range (slider — max ₹/day)
 *   • "Verified owners only" toggle
 *   • "With driver" toggle
 *   • Sort dropdown (Recommended / Price ↑ / Price ↓ / Rating / Newest)
 *   • Clear filters button
 *
 * All state is owned by <MarketplaceSite />; this component is purely
 * presentational + dispatches user intents via callbacks. The mobile drawer
 * is a Radix Sheet that mirrors the desktop sidebar exactly.
 */

import { useMemo, useState } from "react";
import {
  Sheet, SheetContent, SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, SlidersHorizontal, X, RotateCcw, ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  VEHICLE_LISTINGS,
  VEHICLE_TYPE_META, VEHICLE_TYPE_ORDER,
  BODY_TYPE_META,
  AXLE_META,
  REGION_LIST,
  type VehicleType, type BodyType, type AxleType, type Region,
} from "./marketplace-data";

export type SortKey = "recommended" | "price-asc" | "price-desc" | "rating" | "newest";

export interface MarketplaceFilterState {
  search: string;
  originFilter: string;
  destinationFilter: string;
  vehicleTypeFilter: VehicleType | "";
  availabilityDate: string;
  selectedBodyTypes: BodyType[];
  selectedAxles: AxleType[];
  selectedRegions: Region[];
  priceCeiling: number; // max ₹/day
  verifiedOnly: boolean;
  withDriverOnly: boolean;
}

interface MarketplaceFiltersProps {
  state: MarketplaceFilterState;
  onPatch: (patch: Partial<MarketplaceFilterState>) => void;
  onSearch: (v: string) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  onClear: () => void;
  totalCount: number;
  resultCount: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const BODY_TYPE_ORDER: BodyType[] = ["open", "closed", "container", "refrigerated", "tipper", "tanker"];
const AXLE_ORDER: AxleType[] = ["4", "6", "10", "12"];
const PRICE_FLOOR = 1000;
const PRICE_MAX = 16000;

export function MarketplaceFilters(props: MarketplaceFiltersProps) {
  const { state, onPatch, onSearch, sort, onSort, onClear, totalCount, resultCount, open, onOpenChange } = props;

  const vehicleTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of VEHICLE_LISTINGS) counts[l.vehicle.type] = (counts[l.vehicle.type] ?? 0) + 1;
    return counts;
  }, []);
  const bodyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of VEHICLE_LISTINGS) counts[l.vehicle.bodyType] = (counts[l.vehicle.bodyType] ?? 0) + 1;
    return counts;
  }, []);
  const axleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of VEHICLE_LISTINGS) counts[l.vehicle.axle] = (counts[l.vehicle.axle] ?? 0) + 1;
    return counts;
  }, []);
  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of VEHICLE_LISTINGS) counts[l.route.region] = (counts[l.route.region] ?? 0) + 1;
    return counts;
  }, []);

  const anyFilterActive =
    state.search.trim() !== "" ||
    state.originFilter.trim() !== "" ||
    state.destinationFilter.trim() !== "" ||
    state.vehicleTypeFilter !== "" ||
    state.availabilityDate !== "" ||
    state.selectedBodyTypes.length > 0 ||
    state.selectedAxles.length > 0 ||
    state.selectedRegions.length > 0 ||
    state.priceCeiling < PRICE_MAX ||
    state.verifiedOnly ||
    state.withDriverOnly;

  const sidebar = (
    <SidebarBody
      state={state}
      onPatch={onPatch}
      onSearch={onSearch}
      onClear={onClear}
      anyFilterActive={anyFilterActive}
      vehicleTypeCounts={vehicleTypeCounts}
      bodyCounts={bodyCounts}
      axleCounts={axleCounts}
      regionCounts={regionCounts}
    />
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-[6px] border border-border bg-background">
          {sidebar}
        </div>
      </aside>

      {/* Mobile toolbar + drawer */}
      <div className="lg:hidden">
        <MobileToolbar
          search={state.search}
          onSearch={onSearch}
          sort={sort}
          onSort={onSort}
          resultCount={resultCount}
          totalCount={totalCount}
          anyFilterActive={anyFilterActive}
          onOpenFilters={() => onOpenChange(true)}
        />
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="left" className="w-[300px] overflow-y-auto border-border p-0" showCloseButton={false}>
            <SheetTitle className="sr-only">Filters</SheetTitle>
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <span className="flex items-center gap-2 text-[14px] font-semibold">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </span>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="tap flex h-8 w-8 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Close filters"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {sidebar}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop top bar */}
      <div className="hidden lg:block">
        <DesktopToolbar
          sort={sort}
          onSort={onSort}
          resultCount={resultCount}
          totalCount={totalCount}
          onClear={onClear}
          anyFilterActive={anyFilterActive}
        />
      </div>
    </div>
  );
}

/* ============================================================
   SidebarBody
   ============================================================ */
function SidebarBody({
  state, onPatch, onSearch, onClear, anyFilterActive,
  vehicleTypeCounts, bodyCounts, axleCounts, regionCounts,
}: {
  state: MarketplaceFilterState;
  onPatch: (patch: Partial<MarketplaceFilterState>) => void;
  onSearch: (v: string) => void;
  onClear: () => void;
  anyFilterActive: boolean;
  vehicleTypeCounts: Record<string, number>;
  bodyCounts: Record<string, number>;
  axleCounts: Record<string, number>;
  regionCounts: Record<string, number>;
}) {
  const toggleArr = <T,>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Search */}
      <div className="border-b border-border/50 pb-4">
        <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Search
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={state.search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Route, owner, model…"
            aria-label="Filter listings by search"
            className="focus-ring h-9 w-full rounded-[5px] border border-border bg-background pl-8 pr-2 text-[12px] text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Collapsible: Vehicle Type */}
      <CollapsibleSection title="Vehicle Class" defaultOpen={true}>
        <ul className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
          {VEHICLE_TYPE_ORDER.map((vt) => {
            const checked = state.vehicleTypeFilter === vt;
            const count = vehicleTypeCounts[vt] ?? 0;
            return (
              <li key={vt}>
                <label
                  className={
                    "flex cursor-pointer items-center gap-2 rounded-[4px] px-1.5 py-1 text-[12px] transition-colors hover:bg-accent " +
                    (checked ? "text-foreground font-medium" : "text-muted-foreground")
                  }
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => onPatch({ vehicleTypeFilter: checked ? "" : vt })}
                    aria-label={VEHICLE_TYPE_META[vt].label}
                  />
                  <span className="flex-1 truncate">{VEHICLE_TYPE_META[vt].label}</span>
                  <span className="text-[10px] tabular text-muted-foreground font-mono">{count}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </CollapsibleSection>

      {/* Collapsible: Specifications */}
      <CollapsibleSection title="Specifications" defaultOpen={false}>
        <div className="flex flex-col gap-4">
          {/* Body type */}
          <div>
            <h4 className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Body Type
            </h4>
            <ul className="flex flex-col gap-1">
              {BODY_TYPE_ORDER.map((b) => {
                const checked = state.selectedBodyTypes.includes(b);
                const count = bodyCounts[b] ?? 0;
                return (
                  <li key={b}>
                    <label
                      className={
                        "flex cursor-pointer items-center gap-2 rounded-[4px] px-1.5 py-1 text-[12px] transition-colors hover:bg-accent " +
                        (checked ? "text-foreground font-medium" : "text-muted-foreground")
                      }
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => onPatch({ selectedBodyTypes: toggleArr(state.selectedBodyTypes, b) })}
                        aria-label={BODY_TYPE_META[b].label}
                      />
                      <span className="flex-1 truncate">{BODY_TYPE_META[b].label}</span>
                      <span className="text-[10px] tabular text-muted-foreground font-mono">{count}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Axle */}
          <div>
            <h4 className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Axles
            </h4>
            <ul className="flex flex-col gap-1">
              {AXLE_ORDER.map((a) => {
                const checked = state.selectedAxles.includes(a);
                const count = axleCounts[a] ?? 0;
                return (
                  <li key={a}>
                    <label
                      className={
                        "flex cursor-pointer items-center gap-2 rounded-[4px] px-1.5 py-1 text-[12px] transition-colors hover:bg-accent " +
                        (checked ? "text-foreground font-medium" : "text-muted-foreground")
                      }
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => onPatch({ selectedAxles: toggleArr(state.selectedAxles, a) })}
                        aria-label={AXLE_META[a].label}
                      />
                      <span className="flex-1 truncate">{AXLE_META[a].label}</span>
                      <span className="text-[10px] tabular text-muted-foreground font-mono">{count}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Region */}
          <div>
            <h4 className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Region
            </h4>
            <ul className="flex flex-col gap-1">
              {REGION_LIST.map((r) => {
                const checked = state.selectedRegions.includes(r);
                const count = regionCounts[r] ?? 0;
                return (
                  <li key={r}>
                    <label
                      className={
                        "flex cursor-pointer items-center gap-2 rounded-[4px] px-1.5 py-1 text-[12px] transition-colors hover:bg-accent " +
                        (checked ? "text-foreground font-medium" : "text-muted-foreground")
                      }
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => onPatch({ selectedRegions: toggleArr(state.selectedRegions, r) })}
                        aria-label={r}
                      />
                      <span className="flex-1 truncate">{r}</span>
                      <span className="text-[10px] tabular text-muted-foreground font-mono">{count}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </CollapsibleSection>

      {/* Collapsible: Pricing & Timing */}
      <CollapsibleSection title="Pricing & Timing" defaultOpen={false}>
        <div className="flex flex-col gap-4">
          {/* Price ceiling */}
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Max Price / Day
              </span>
              <span className="text-[11px] font-mono font-medium text-foreground">
                ₹{state.priceCeiling.toLocaleString("en-IN")}
              </span>
            </div>
            <Slider
              value={[state.priceCeiling]}
              min={PRICE_FLOOR}
              max={PRICE_MAX}
              step={500}
              onValueChange={(v) => onPatch({ priceCeiling: v[0] ?? PRICE_MAX })}
              aria-label="Max price per day"
            />
            <div className="mt-1 flex justify-between text-[9px] tabular text-muted-foreground font-mono">
              <span>₹{PRICE_FLOOR.toLocaleString("en-IN")}</span>
              <span>₹{PRICE_MAX.toLocaleString("en-IN")}+</span>
            </div>
          </div>

          {/* Availability date */}
          <div>
            <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Available From
            </span>
            <input
              type="date"
              value={state.availabilityDate}
              onChange={(e) => onPatch({ availabilityDate: e.target.value })}
              aria-label="Available from date"
              className="focus-ring h-9 w-full rounded-[5px] border border-border bg-background px-2 text-[12px] text-foreground"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Collapsible: Verification & Driver */}
      <CollapsibleSection title="Verification & Driver" defaultOpen={false}>
        <ul className="flex flex-col gap-1.5">
          <ToggleRow
            label="Verified owners only"
            checked={state.verifiedOnly}
            onCheckedChange={(v) => onPatch({ verifiedOnly: v })}
          />
          <ToggleRow
            label="Includes driver options"
            checked={state.withDriverOnly}
            onCheckedChange={(v) => onPatch({ withDriverOnly: v })}
          />
        </ul>
      </CollapsibleSection>

      {/* Clear */}
      <button
        type="button"
        onClick={onClear}
        disabled={!anyFilterActive}
        className="tap mt-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-[5px] border border-border text-[12px] font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Clear all filters
      </button>
    </div>
  );
}

/* ============================================================
   CollapsibleSection — helper for filters accordion
   ============================================================ */
function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/50 pb-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left focus:outline-none"
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
          {title}
        </span>
        <ChevronDown
          className={
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 " +
            (isOpen ? "rotate-180" : "")
          }
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: "auto", opacity: 1, marginTop: 12 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToggleRow({
  label, checked, onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <li>
      <label className="flex cursor-pointer items-center justify-between gap-2 rounded-[4px] px-1.5 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-accent">
        <span className={checked ? "text-foreground" : ""}>{label}</span>
        <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
      </label>
    </li>
  );
}

/* ============================================================
   DesktopToolbar
   ============================================================ */
function DesktopToolbar({
  sort, onSort, resultCount, totalCount, onClear, anyFilterActive,
}: {
  sort: SortKey;
  onSort: (s: SortKey) => void;
  resultCount: number;
  totalCount: number;
  onClear: () => void;
  anyFilterActive: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[6px] border border-border bg-background px-4 py-2.5">
      <div className="flex items-baseline gap-2 text-[12px]">
        <span className="font-semibold text-foreground tabular">{resultCount}</span>
        <span className="text-muted-foreground">of {totalCount} vehicles</span>
      </div>
      <div className="flex items-center gap-2">
        {anyFilterActive && (
          <button
            type="button"
            onClick={onClear}
            className="tap inline-flex h-8 items-center gap-1 rounded-[5px] border border-border px-2 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
        <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <span>Sort</span>
          <SortSelect value={sort} onValueChange={onSort} />
        </label>
      </div>
    </div>
  );
}

/* ============================================================
   MobileToolbar
   ============================================================ */
function MobileToolbar({
  search, onSearch, sort, onSort, resultCount, totalCount, anyFilterActive, onOpenFilters,
}: {
  search: string;
  onSearch: (v: string) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  resultCount: number;
  totalCount: number;
  anyFilterActive: boolean;
  onOpenFilters: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search vehicles…"
            aria-label="Search vehicle listings"
            className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background pl-8 pr-2 text-[13px] text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="button"
          onClick={onOpenFilters}
          className="tap relative flex h-10 w-10 items-center justify-center rounded-[5px] border border-border text-foreground transition-colors hover:bg-accent"
          aria-label="Open filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {anyFilterActive && (
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-foreground" />
          )}
        </button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground tabular">{resultCount}</span> of {totalCount}
        </span>
        <SortSelect value={sort} onValueChange={onSort} />
      </div>
    </div>
  );
}

/* ============================================================
   SortSelect
   ============================================================ */
function SortSelect({
  value, onValueChange,
}: {
  value: SortKey;
  onValueChange: (s: SortKey) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as SortKey)}>
      <SelectTrigger className="h-8 w-[140px] rounded-[5px] border border-border bg-background text-[12px] font-medium text-foreground" aria-label="Sort listings">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-[5px] border-border">
        <SelectItem value="recommended">Recommended</SelectItem>
        <SelectItem value="price-asc">Price: low to high</SelectItem>
        <SelectItem value="price-desc">Price: high to low</SelectItem>
        <SelectItem value="rating">Rating</SelectItem>
        <SelectItem value="newest">Newest</SelectItem>
      </SelectContent>
    </Select>
  );
}

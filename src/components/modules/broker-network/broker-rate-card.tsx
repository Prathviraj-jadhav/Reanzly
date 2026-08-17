"use client";

import { useMemo, useState } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { Btn } from "@/components/shared/btn";
import { SearchInput } from "@/components/shared/toolbar";
import {
  Tags,
  Upload,
  Truck,
  Clock,
  TrendingUp,
  Percent,
  Wallet,
  Filter,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  VEHICLE_TYPES,
  DEFAULT_MARKUP_PCT,
  formatINR,
  formatINRCompact,
  resaleRate,
  freightForLane,
  type VehicleType,
} from "./_helpers";
import { useBrokerProfileData } from "./use-broker-profile-data";

/* ============================================================
   BrokerRateCard - the broker's published resale rate card.
   ------------------------------------------------------------
   Shows every Reanzly base lane rate with the broker's markup
   applied. The broker can adjust markup % inline, filter by
   vehicle type, search lanes, and "publish" the rate card
   (notifies sub-brokers in the demo).
   ============================================================ */

export function BrokerRateCard() {
  const { profile, laneRates, updateProfile } = useBrokerProfileData();
  const [markupPct, setMarkupPct] = useState<number>(DEFAULT_MARKUP_PCT);
  const [search, setSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState<VehicleType | "">("");

  const [loadedProfile, setLoadedProfile] = useState(profile);
  if (profile !== loadedProfile) {
    setLoadedProfile(profile);
    if (profile) setMarkupPct(profile.markupPct);
  }

  // ===== Derived: filtered lanes =====
  const filteredLanes = useMemo(() => {
    let r = laneRates;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (l) =>
          l.lane.toLowerCase().includes(q) ||
          l.origin.toLowerCase().includes(q) ||
          l.destination.toLowerCase().includes(q),
      );
    }
    if (vehicleFilter) r = r.filter((l) => l.vehicleTypes.includes(vehicleFilter));
    return r;
  }, [laneRates, search, vehicleFilter]);

  // ===== Derived: aggregate KPIs =====
  const avgBaseRate = laneRates.length
    ? Math.round(laneRates.reduce((s, l) => s + l.baseRatePerKm, 0) / laneRates.length)
    : 0;
  const avgResaleRate = laneRates.length
    ? Math.round(laneRates.reduce((s, l) => s + resaleRate(l.baseRatePerKm, markupPct), 0) / laneRates.length)
    : 0;
  const totalFreightValue = laneRates.reduce((s, l) => s + freightForLane(l, markupPct), 0);
  const avgMarkupPerKm = avgResaleRate - avgBaseRate;

  const publishRateCard = async () => {
    const ok = await updateProfile({ markupPct });
    if (ok) {
      toast.success("Rate card published", {
        description: `Markup ${markupPct}% applied to ${laneRates.length} lanes.`,
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Local header (no PageHeader dependency on global nav) */}
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] font-medium leading-tight tracking-tight text-foreground">
              Rate Card
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Reanzly base lane rates with your markup applied. This is what your sub-brokers and customers see when they quote.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Lanes</span>
                <span className="font-medium text-foreground tabular">{laneRates.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Markup</span>
                <span className="font-medium text-foreground tabular">{markupPct}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Avg resale</span>
                <span className="font-medium text-foreground tabular">{formatINR(avgResaleRate)}/km</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Total freight</span>
                <span className="font-medium text-foreground tabular">{formatINRCompact(totalFreightValue)}</span>
              </div>
            </div>
          </div>
          <Btn variant="primary" icon={<Upload className="h-3.5 w-3.5" />} onClick={publishRateCard}>
            Publish rate card
          </Btn>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiTile icon={<Tags className="h-3.5 w-3.5" />} label="Lanes published" value={String(laneRates.length)} hint="across India" />
        <KpiTile icon={<Percent className="h-3.5 w-3.5" />} label="Your markup" value={`${markupPct}%`} hint="over Reanzly base" />
        <KpiTile icon={<TrendingUp className="h-3.5 w-3.5" />} label="Avg base rate" value={`${formatINR(avgBaseRate)}/km`} hint="Reanzly published" />
        <KpiTile icon={<Wallet className="h-3.5 w-3.5" />} label="Avg resale rate" value={`${formatINR(avgResaleRate)}/km`} hint={`+${formatINR(avgMarkupPerKm)}/km margin`} />
        <KpiTile icon={<Truck className="h-3.5 w-3.5" />} label="Total freight value" value={formatINRCompact(totalFreightValue)} hint="across all lanes" />
      </div>

      {/* Markup editor */}
      <SectionCard
        title="Markup editor"
        description="Your markup applies across all lanes. Resale rate = base x (1 + markup/100). Changes publish on the next rate card release."
        icon={<Percent className="h-4 w-4" />}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-[12px] font-medium text-foreground">Markup %</label>
            <input
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={markupPct}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!isNaN(v)) setMarkupPct(Math.max(0, Math.min(50, v)));
              }}
              className="h-9 w-24 rounded-[5px] border border-border bg-background px-2.5 text-[14px] tabular focus-visible:outline-2 focus-visible:outline-ring"
            />
          </div>
          {/* Quick markup presets */}
          <div className="flex items-center gap-1 rounded-[5px] border border-border bg-muted/30 p-0.5">
            {[5, 8, 10, 12, 15].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMarkupPct(m)}
                className={
                  "tap inline-flex h-7 items-center rounded-[3px] px-2.5 text-[12px] font-medium transition-colors " +
                  (markupPct === m
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {m}%
              </button>
            ))}
          </div>
          <div className="ml-auto text-[12px] text-muted-foreground tabular">
            Avg resale: <span className="font-medium text-foreground">{formatINR(avgResaleRate)}/km</span>
            <span className="mx-2">·</span>
            Avg margin: <span className="font-medium text-foreground">+{formatINR(avgMarkupPerKm)}/km</span>
          </div>
        </div>
      </SectionCard>

      {/* Full rate card table */}
      <SectionCard
        title="Resale rate card"
        description="Every published lane with your markup applied. Search or filter to drill in."
        icon={<Tags className="h-4 w-4" />}
        action={
          <Btn variant="outline" size="sm" icon={<Upload className="h-3.5 w-3.5" />} onClick={publishRateCard}>
            Publish
          </Btn>
        }
        flush
      >
        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search lanes, origins, destinations..."
            className="max-w-[280px]"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Vehicle:</span>
                <span className="max-w-[120px] truncate">{vehicleFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
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
          <div className="ml-auto text-[11px] text-muted-foreground tabular">
            {filteredLanes.length} of {laneRates.length} lanes
          </div>
        </div>
        {/* Rate table */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-[13px]">
            <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Lane</th>
                <th className="px-4 py-2 text-right font-medium">Distance</th>
                <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Vehicle types</th>
                <th className="px-4 py-2 text-right font-medium">Base rate</th>
                <th className="px-4 py-2 text-right font-medium">Markup</th>
                <th className="px-4 py-2 text-right font-medium">Resale rate</th>
                <th className="hidden px-4 py-2 text-right font-medium md:table-cell">Freight</th>
                <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Transit</th>
              </tr>
            </thead>
            <tbody>
              {filteredLanes.map((l, i) => {
                const resale = resaleRate(l.baseRatePerKm, markupPct);
                const freight = freightForLane(l, markupPct);
                const margin = resale - l.baseRatePerKm;
                return (
                  <tr
                    key={l.id}
                    className={i % 2 === 0 ? "border-b border-border/60 bg-background" : "border-b border-border/60 bg-muted/10"}
                  >
                    <td className="px-4 py-2.5">
                      <div className="text-[12.5px] font-medium text-foreground">{l.lane}</div>
                      <div className="text-[11px] text-muted-foreground tabular">{l.origin} - {l.destination}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular text-muted-foreground">{l.distanceKm} km</td>
                    <td className="hidden px-4 py-2.5 text-left text-muted-foreground sm:table-cell">
                      <span className="text-[11px]">{l.vehicleTypes.join(", ")}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular text-muted-foreground">{formatINR(l.baseRatePerKm)}/km</td>
                    <td className="px-4 py-2.5 text-right tabular text-muted-foreground">+{formatINR(margin)}/km</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="tabular font-medium text-foreground">{formatINR(resale)}/km</span>
                      <span className="ml-1 text-[10px] text-muted-foreground tabular">+{markupPct}%</span>
                    </td>
                    <td className="hidden px-4 py-2.5 text-right tabular font-medium text-foreground md:table-cell">{formatINRCompact(freight)}</td>
                    <td className="hidden px-4 py-2.5 text-right tabular text-muted-foreground sm:table-cell">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {l.transitHours}h
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredLanes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                    No lanes match your filters. Try clearing the search or vehicle filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          {filteredLanes.length} lanes shown - markup {markupPct}% applied - avg resale {formatINR(avgResaleRate)}/km
        </div>
      </SectionCard>
    </div>
  );
}

function KpiTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

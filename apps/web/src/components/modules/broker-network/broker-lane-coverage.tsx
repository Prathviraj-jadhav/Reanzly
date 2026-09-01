"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  MapPin, Plus, Eye, Pencil, Pause, Play, Filter, ChevronDown,
  TrendingUp, Truck, BarChart3, AlertTriangle, Percent, Tags,
} from "lucide-react";
import { toast } from "sonner";
import {
  REANZLY_LANE_RATES,
  VEHICLE_TYPES,
  DEFAULT_MARKUP_PCT,
  formatINR,
  formatINRCompact,
  formatNumber,
  relativeTime,
  resaleRate,
  KpiTile,
  FieldLabel,
  type VehicleType,
} from "./_helpers";

/* ============================================================
   BrokerLaneCoverage - lanes the broker actively resells on.
   Set markup per lane, monitor volume, watch competitor rates.
   ============================================================ */

type LaneStatus = "Active" | "Paused" | "Under Review";

const LANE_STATUSES: LaneStatus[] = ["Active", "Paused", "Under Review"];

interface LaneRow {
  id: string;
  lane: string;
  origin: string;
  destination: string;
  distanceKm: number;
  vehicleTypes: VehicleType[];
  markupPct: number;
  baseRatePerKm: number;
  bookings30d: number;
  revenue30dINR: number;
  status: LaneStatus;
  // Rate trend (last 6 cycles, Rs/km - broker selling rate).
  rateTrend: number[];
  // Competitor rates (Reanzly sampled).
  competitorRates: { name: string; ratePerKm: number }[];
  // Last 10 booking refs (mock).
  lastBookings: { id: string; customer: string; date: string; ratePerKm: number }[];
  notes?: string;
}

function laneStatusBadge(s: LaneStatus): { variant: "solid" | "outline" | "muted"; pulse?: boolean } {
  switch (s) {
    case "Active": return { variant: "solid", pulse: true };
    case "Paused": return { variant: "muted" };
    case "Under Review": return { variant: "outline", pulse: true };
    default: return { variant: "outline" };
  }
}

const COMPETITORS = ["Sahyadri Carriers", "Blue Ocean Logistics", "Mahindra Logistics", "VRL Network"];

function buildInitialLanes(): LaneRow[] {
  return REANZLY_LANE_RATES.map((l, i) => {
    const markup = DEFAULT_MARKUP_PCT + ((i % 5) - 2);
    const resale = resaleRate(l.baseRatePerKm, markup);
    const bookings = [12, 24, 8, 18, 5, 31, 9, 14, 22, 7][i % 10];
    const revenue = resale * l.distanceKm * bookings;
    const marginPct = Math.round((markup / (100 + markup)) * 1000) / 10;
    const status: LaneStatus = i === 2 || i === 8 ? "Under Review" : i === 4 ? "Paused" : "Active";
    return {
      id: l.id,
      lane: l.lane,
      origin: l.origin,
      destination: l.destination,
      distanceKm: l.distanceKm,
      vehicleTypes: l.vehicleTypes,
      markupPct: markup,
      baseRatePerKm: l.baseRatePerKm,
      bookings30d: bookings,
      revenue30dINR: revenue,
      status,
      rateTrend: [
        resale - 2, resale - 1, resale, resale + 1, resale, resale,
      ],
      competitorRates: COMPETITORS.slice(0, 3).map((c, ci) => ({
        name: c,
        ratePerKm: resale + (ci - 1) * 3,
      })),
      lastBookings: Array.from({ length: 6 }).map((_, bi) => ({
        id: `bk-${String(7200 + i * 10 + bi).padStart(5, "0")}`,
        customer: ["Asian Paints Ltd", "UltraTech Cement", "Tata Steel BSL", "Havells India", "Supreme Industries"][bi % 5],
        date: new Date(Date.now() - bi * 86400000 * 3).toISOString(),
        ratePerKm: resale + (bi % 3) - 1,
      })),
      notes: i % 3 === 0 ? "High-volume lane - keep margin under 10% to stay competitive." : undefined,
    };
  });
}

export function BrokerLaneCoverage() {
  const [lanes, setLanes] = useState<LaneRow[]>(buildInitialLanes);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LaneStatus | "">("");
  const [viewing, setViewing] = useState<LaneRow | null>(null);
  const [editing, setEditing] = useState<LaneRow | null>(null);
  const [adding, setAdding] = useState(false);

  const [addForm, setAddForm] = useState({
    origin: "",
    destination: "",
    distanceKm: 500,
    vehicleTypes: [] as VehicleType[],
    markupPct: DEFAULT_MARKUP_PCT,
    notes: "",
  });

  // ===== Derived =====
  const filtered = useMemo(() => {
    let r = lanes;
    if (statusFilter) r = r.filter((l) => l.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (l) => l.lane.toLowerCase().includes(q) || l.origin.toLowerCase().includes(q) || l.destination.toLowerCase().includes(q),
      );
    }
    return r;
  }, [lanes, statusFilter, search]);

  // Top 10 by volume (for bar chart)
  const topByVolume = useMemo(
    () => [...lanes].sort((a, b) => b.bookings30d - a.bookings30d).slice(0, 10),
    [lanes],
  );
  const maxVolume = topByVolume[0]?.bookings30d ?? 1;

  // ===== KPIs =====
  const total = lanes.length;
  const active = lanes.filter((l) => l.status === "Active").length;
  const highVolume = lanes.filter((l) => l.bookings30d >= 15).length;
  const avgMarkup = total === 0 ? 0 : Math.round((lanes.reduce((s, l) => s + l.markupPct, 0) / total) * 10) / 10;
  const totalVolume = lanes.reduce((s, l) => s + l.bookings30d, 0);
  const needingAttention = lanes.filter((l) => l.markupPct < 6 || l.status === "Under Review").length;

  // ===== Handlers =====
  const pause = (l: LaneRow) => {
    setLanes((p) => p.map((x) => x.id === l.id ? { ...x, status: "Paused" as LaneStatus } : x));
    toast.success("Lane paused", { description: `${l.lane} is no longer accepting new bookings.` });
  };
  const resume = (l: LaneRow) => {
    setLanes((p) => p.map((x) => x.id === l.id ? { ...x, status: "Active" as LaneStatus } : x));
    toast.success("Lane resumed", { description: `${l.lane} is accepting bookings again.` });
  };
  const saveEdit = (l: LaneRow) => {
    setLanes((p) => p.map((x) => x.id === l.id ? l : x));
    setEditing(null);
    toast.success("Lane updated", { description: `${l.lane} - markup ${l.markupPct}% applied.` });
  };
  const submitAdd = () => {
    if (!addForm.origin.trim() || !addForm.destination.trim()) {
      toast.error("Missing fields", { description: "Origin and destination are required." });
      return;
    }
    const lane = `${addForm.origin} - ${addForm.destination}`;
    const newId = `ln-${String(lanes.length + 1).padStart(3, "0")}`;
    const resale = resaleRate(60, addForm.markupPct); // default base 60 for custom lanes
    const newRow: LaneRow = {
      id: newId,
      lane,
      origin: addForm.origin,
      destination: addForm.destination,
      distanceKm: Number(addForm.distanceKm) || 0,
      vehicleTypes: addForm.vehicleTypes.length > 0 ? addForm.vehicleTypes : [VEHICLE_TYPES[0]],
      markupPct: Number(addForm.markupPct) || 0,
      baseRatePerKm: 60,
      bookings30d: 0,
      revenue30dINR: 0,
      status: "Active",
      rateTrend: [resale, resale, resale, resale, resale, resale],
      competitorRates: COMPETITORS.slice(0, 3).map((c, ci) => ({ name: c, ratePerKm: resale + (ci - 1) * 3 })),
      lastBookings: [],
      notes: addForm.notes,
    };
    setLanes((p) => [newRow, ...p]);
    setAdding(false);
    setAddForm({ origin: "", destination: "", distanceKm: 500, vehicleTypes: [], markupPct: DEFAULT_MARKUP_PCT, notes: "" });
    toast.success("Lane added", { description: `${lane} added with ${newRow.markupPct}% markup.` });
  };

  const toggleVehicleInForm = (v: VehicleType) => {
    setAddForm((f) => ({
      ...f,
      vehicleTypes: f.vehicleTypes.includes(v)
        ? f.vehicleTypes.filter((x) => x !== v)
        : [...f.vehicleTypes, v],
    }));
  };

  return (
    <div className="flex min-h-full flex-col gap-4 pb-8">
      <PageHeader
        title="Lane Coverage"
        description="Lanes you serve - set your markup, track volume, monitor competition."
        meta={[
          { label: "Total lanes", value: total },
          { label: "Active", value: active },
          { label: "Avg markup", value: `${avgMarkup}%` },
        ]}
        actions={
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAdding(true)}>
            Add lane
          </Btn>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile icon={<MapPin className="h-3.5 w-3.5" />} label="Total lanes" value={String(total)} hint="across India" />
        <KpiTile icon={<TrendingUp className="h-3.5 w-3.5" />} label="Active lanes" value={String(active)} hint={`${total - active} paused / review`} />
        <KpiTile icon={<Truck className="h-3.5 w-3.5" />} label="High-volume lanes" value={String(highVolume)} hint="15+ bookings / 30d" />
        <KpiTile icon={<Percent className="h-3.5 w-3.5" />} label="Avg markup" value={`${avgMarkup}%`} hint="across active lanes" />
        <KpiTile icon={<BarChart3 className="h-3.5 w-3.5" />} label="Total volume (30d)" value={formatNumber(totalVolume)} hint="bookings across lanes" />
        <KpiTile icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Needs attention" value={String(needingAttention)} hint="low margin or under review" />
      </div>

      {/* Top 10 lanes by volume bar chart */}
      <SectionCard
        title="Top 10 lanes by volume"
        description="Last 30 days of bookings. Long bar = high-volume lane."
        icon={<BarChart3 className="h-4 w-4" />}
      >
        <div className="flex flex-col gap-2">
          {topByVolume.map((l, i) => {
            const pct = Math.max(8, Math.round((l.bookings30d / maxVolume) * 100));
            return (
              <div key={l.id} className="flex items-center gap-3">
                <div className="w-12 shrink-0 text-right text-[11px] tabular text-muted-foreground">#{i + 1}</div>
                <div className="w-44 shrink-0 truncate text-[12.5px] font-medium text-foreground">{l.lane}</div>
                <div className="relative h-6 flex-1 overflow-hidden rounded-[5px] border border-border bg-muted/30">
                  <div
                    className="flex h-full items-center justify-end rounded-[5px] bg-foreground px-2 text-[10px] font-medium tabular text-background transition-[width] duration-500"
                    style={{ width: `${pct}%` }}
                  >
                    {pct > 18 ? `${l.bookings30d}` : ""}
                  </div>
                </div>
                <div className="w-24 shrink-0 text-right text-[12px] tabular text-muted-foreground">
                  {l.bookings30d} bk
                </div>
                <div className="hidden w-24 shrink-0 text-right text-[12px] tabular font-medium text-foreground sm:block">
                  {formatINRCompact(l.revenue30dINR)}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Lane table */}
      <SectionCard
        title="Lane coverage"
        description="Every lane you resell on - search by lane, origin, or destination."
        icon={<MapPin className="h-4 w-4" />}
        action={
          <Btn variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAdding(true)}>
            Add lane
          </Btn>
        }
        flush
      >
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
                <span className="text-muted-foreground">Status:</span>
                <span className="max-w-[120px] truncate">{statusFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter("")} className="text-[13px]">All</DropdownMenuItem>
              {(["Active", "Paused", "Under Review"] as LaneStatus[]).map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className="text-[13px]">{s}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="ml-auto text-[11px] text-muted-foreground tabular">
            {filtered.length} of {lanes.length} lanes
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-[13px]">
            <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Lane</th>
                <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Distance</th>
                <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Vehicles</th>
                <th className="px-4 py-2 text-right font-medium">Markup</th>
                <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Base</th>
                <th className="px-4 py-2 text-right font-medium">Selling</th>
                <th className="px-4 py-2 text-right font-medium">Bookings</th>
                <th className="hidden px-4 py-2 text-right font-medium md:table-cell">Revenue</th>
                <th className="hidden px-4 py-2 text-right font-medium lg:table-cell">Margin</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => {
                const b = laneStatusBadge(l.status);
                const resale = resaleRate(l.baseRatePerKm, l.markupPct);
                const marginPct = Math.round((l.markupPct / (100 + l.markupPct)) * 1000) / 10;
                return (
                  <tr
                    key={l.id}
                    className={i % 2 === 0 ? "border-b border-border/60 bg-background" : "border-b border-border/60 bg-muted/10"}
                  >
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => setViewing(l)}
                        className="tap text-left text-[12.5px] font-medium text-foreground hover:underline underline-offset-2"
                      >
                        {l.lane}
                      </button>
                      <div className="text-[11px] text-muted-foreground tabular">{l.origin} → {l.destination}</div>
                    </td>
                    <td className="hidden px-4 py-2.5 text-right tabular text-muted-foreground sm:table-cell">{l.distanceKm} km</td>
                    <td className="hidden px-4 py-2.5 text-left text-muted-foreground md:table-cell">
                      <span className="text-[11px]">{l.vehicleTypes.join(", ")}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular text-muted-foreground">{l.markupPct}%</td>
                    <td className="hidden px-4 py-2.5 text-right tabular text-muted-foreground sm:table-cell">{formatINR(l.baseRatePerKm)}/km</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="tabular font-medium text-foreground">{formatINR(resale)}/km</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular font-medium text-foreground">{l.bookings30d}</td>
                    <td className="hidden px-4 py-2.5 text-right tabular text-muted-foreground md:table-cell">{formatINRCompact(l.revenue30dINR)}</td>
                    <td className="hidden px-4 py-2.5 text-right tabular text-muted-foreground lg:table-cell">{marginPct}%</td>
                    <td className="px-4 py-2.5"><StatusBadge variant={b.variant} pulse={b.pulse}>{l.status}</StatusBadge></td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewing(l)}
                          className="tap flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          aria-label="View detail"
                          title="View detail"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setEditing(l)}
                          className="tap flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          aria-label="Edit markup"
                          title="Edit markup"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="tap flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                              aria-label="More actions"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {l.status === "Paused" ? (
                              <DropdownMenuItem onClick={() => resume(l)} className="text-[13px]">
                                <Play className="h-3.5 w-3.5" /> Resume
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => pause(l)} className="text-[13px]">
                                <Pause className="h-3.5 w-3.5" /> Pause
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                    No lanes match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          {filtered.length} lanes - {active} active - {lanes.filter((l) => l.status === "Paused").length} paused - {lanes.filter((l) => l.status === "Under Review").length} under review
        </div>
      </SectionCard>

      {/* ===== View-detail sheet ===== */}
      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {viewing && (
            <>
              <SheetHeader>
                <SheetTitle className="text-[16px]">{viewing.lane}</SheetTitle>
                <SheetDescription className="text-[12px]">
                  {viewing.origin} → {viewing.destination} - {viewing.distanceKm} km
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4 pb-4">
                <div className="flex items-center gap-2">
                  <StatusBadge variant={laneStatusBadge(viewing.status).variant} pulse={laneStatusBadge(viewing.status).pulse}>
                    {viewing.status}
                  </StatusBadge>
                  <span className="text-[11px] text-muted-foreground">Last 30d - {viewing.bookings30d} bookings</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <StatCell label="Markup" value={`${viewing.markupPct}%`} />
                  <StatCell label="Selling" value={`${formatINR(resaleRate(viewing.baseRatePerKm, viewing.markupPct))}/km`} />
                  <StatCell label="Revenue" value={formatINRCompact(viewing.revenue30dINR)} />
                </div>

                {/* Rate trend (chart-as-table) */}
                <div className="rounded-[6px] border border-border bg-background p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Rate trend (last 6 cycles)</div>
                  <div className="mt-2 overflow-x-auto scrollbar-thin">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          <th className="px-1 py-1 text-left font-medium">Cycle</th>
                          {viewing.rateTrend.map((_, ci) => (
                            <th key={ci} className="px-1 py-1 text-right font-medium">C-{ci + 1}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-1 py-1 text-muted-foreground">Rs/km</td>
                          {viewing.rateTrend.map((r, ci) => (
                            <td key={ci} className="px-1 py-1 text-right tabular font-medium text-foreground">{r}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Competitor rates */}
                <div className="rounded-[6px] border border-border bg-background p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Competitor rates (sampled)</div>
                  <div className="mt-2 space-y-1.5">
                    {viewing.competitorRates.map((c) => (
                      <div key={c.name} className="flex items-center justify-between text-[12px]">
                        <span className="text-muted-foreground">{c.name}</span>
                        <span className="tabular font-medium text-foreground">{formatINR(c.ratePerKm)}/km</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Last 10 bookings (mocked with 6) */}
                <div className="rounded-[6px] border border-border bg-background p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Recent bookings</div>
                  <div className="mt-2 space-y-1.5">
                    {viewing.lastBookings.length === 0 ? (
                      <p className="text-[12px] text-muted-foreground">No bookings yet.</p>
                    ) : viewing.lastBookings.map((b) => (
                      <div key={b.id} className="flex items-center justify-between text-[12px]">
                        <div className="min-w-0">
                          <span className="tabular font-medium text-foreground">{b.id}</span>
                          <span className="ml-2 truncate text-muted-foreground">{b.customer}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="tabular text-muted-foreground">{formatINR(b.ratePerKm)}/km</span>
                          <span className="tabular text-muted-foreground text-[11px]">{relativeTime(b.date)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {viewing.notes && (
                  <div className="rounded-[6px] border border-border bg-muted/30 p-3">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Notes</div>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-foreground">{viewing.notes}</p>
                  </div>
                )}
              </div>
              <SheetFooter className="flex-row gap-2 border-t border-border">
                <Btn variant="outline" size="sm" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => { const l = viewing; setViewing(null); setEditing(l); }}>Edit markup</Btn>
                {viewing.status === "Paused" ? (
                  <Btn variant="primary" size="sm" icon={<Play className="h-3.5 w-3.5" />} onClick={() => { resume(viewing); setViewing(null); }}>Resume</Btn>
                ) : (
                  <Btn variant="ghost" size="sm" icon={<Pause className="h-3.5 w-3.5" />} onClick={() => { pause(viewing); setViewing(null); }}>Pause</Btn>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ===== Edit-markup sheet ===== */}
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {editing && (
            <>
              <SheetHeader>
                <SheetTitle className="text-[16px]">Edit {editing.lane}</SheetTitle>
                <SheetDescription className="text-[12px]">
                  {editing.origin} → {editing.destination} - adjust markup to control your selling rate.
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-3 px-4 pb-4">
                <Field>
                  <FieldLabel required hint="0-50">Markup %</FieldLabel>
                  <Input
                    type="number" min={0} max={50} step={0.5}
                    value={editing.markupPct}
                    onChange={(e) => setEditing({ ...editing, markupPct: Number(e.target.value) })}
                    className="h-9 rounded-[5px] text-[13px] tabular"
                  />
                  <div className="mt-2 flex items-center gap-1 rounded-[5px] border border-border bg-muted/30 p-0.5 w-fit">
                    {[5, 8, 10, 12, 15].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setEditing({ ...editing, markupPct: m })}
                        className={"tap inline-flex h-6 items-center rounded-[3px] px-2 text-[11px] font-medium transition-colors " + (editing.markupPct === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
                      >
                        {m}%
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="rounded-[6px] border border-border bg-muted/30 p-3">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Tags className="h-3 w-3" /> Computed selling rate</span>
                    <span className="inline-flex items-center gap-1"><Percent className="h-3 w-3" /> +{editing.markupPct}% over {formatINR(editing.baseRatePerKm)}/km</span>
                  </div>
                  <div className="mt-1 text-[20px] font-medium tabular text-foreground">
                    {formatINR(resaleRate(editing.baseRatePerKm, editing.markupPct))}/km
                    <span className="ml-2 text-[11px] font-normal text-muted-foreground tabular">
                      freight {formatINRCompact(editing.distanceKm * resaleRate(editing.baseRatePerKm, editing.markupPct))}
                    </span>
                  </div>
                </div>
                <Field>
                  <FieldLabel>Notes</FieldLabel>
                  <Textarea
                    value={editing.notes ?? ""}
                    onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                    rows={3}
                    className="rounded-[5px] text-[12.5px]"
                  />
                </Field>
              </div>
              <SheetFooter className="flex-row gap-2 border-t border-border">
                <Btn variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
                <Btn variant="primary" onClick={() => saveEdit(editing)}>Save changes</Btn>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ===== Add-lane sheet ===== */}
      <Sheet open={adding} onOpenChange={setAdding}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-[16px]">Add lane</SheetTitle>
            <SheetDescription className="text-[12px]">
              Declare a new lane you cover. Reanzly will route matching enquiries to you.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-3 px-4 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel required>Origin</FieldLabel>
                <Input
                  value={addForm.origin}
                  onChange={(e) => setAddForm({ ...addForm, origin: e.target.value })}
                  placeholder="Mumbai"
                  className="h-9 rounded-[5px] text-[13px]"
                />
              </Field>
              <Field>
                <FieldLabel required>Destination</FieldLabel>
                <Input
                  value={addForm.destination}
                  onChange={(e) => setAddForm({ ...addForm, destination: e.target.value })}
                  placeholder="Nagpur"
                  className="h-9 rounded-[5px] text-[13px]"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel hint="km">Distance</FieldLabel>
                <Input
                  type="number" min={1}
                  value={addForm.distanceKm}
                  onChange={(e) => setAddForm({ ...addForm, distanceKm: Number(e.target.value) })}
                  className="h-9 rounded-[5px] text-[13px] tabular"
                />
              </Field>
              <Field>
                <FieldLabel hint="0-50">Markup %</FieldLabel>
                <Input
                  type="number" min={0} max={50} step={0.5}
                  value={addForm.markupPct}
                  onChange={(e) => setAddForm({ ...addForm, markupPct: Number(e.target.value) })}
                  className="h-9 rounded-[5px] text-[13px] tabular"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel>Vehicle types (multi-select)</FieldLabel>
              <div className="flex flex-wrap gap-1.5 rounded-[5px] border border-border bg-background p-2.5">
                {VEHICLE_TYPES.map((v) => {
                  const sel = addForm.vehicleTypes.includes(v);
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => toggleVehicleInForm(v)}
                      className={"tap inline-flex items-center gap-1 rounded-[5px] border px-2 py-0.5 text-[11px] font-medium transition-colors " + (sel ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted-foreground hover:text-foreground")}
                    >
                      <Truck className="h-3 w-3" /> {v}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field>
              <FieldLabel>Notes</FieldLabel>
              <Textarea
                value={addForm.notes}
                onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                rows={3}
                placeholder="e.g. High-volume lane - keep margin under 10% to stay competitive."
                className="rounded-[5px] text-[12.5px]"
              />
            </Field>
          </div>
          <SheetFooter className="flex-row gap-2 border-t border-border">
            <Btn variant="ghost" onClick={() => setAdding(false)}>Cancel</Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={submitAdd}>Add lane</Btn>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ===== Local UI helpers ===== */
function Field({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[5px] border border-border bg-muted/30 p-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-[15px] font-medium tabular text-foreground">{value}</div>
    </div>
  );
}

"use client";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import type { FuelEntry, Vehicle, Driver } from "@/lib/types";
import {
  Plus,
  Download,
  ChevronDown,
  Search,
  Fuel,
  Coins,
  TrendingUp,
  Sparkles,
  Truck,
  User,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  FUEL_TYPES,
  STATIONS,
  formatDate,
  formatINR,
  formatNumber,
} from "./_helpers";
import { LogFuelDrawer } from "./log-fuel-drawer";

interface FuelListProps {
  fuelEntries: FuelEntry[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onCreate: () => void;
  onOpenAnalytics: () => void;
  onOpenAnomalies: () => void;
  onUpdate?: (id: string, data: Partial<FuelEntry>) => Promise<boolean>;
  onAdd?: (entry: FuelEntry) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
}

const DATE_RANGE_PRESETS = [
  { id: "all", label: "All time" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
];

export function FuelList({
  fuelEntries,
  vehicles,
  drivers,
  onCreate,
  onOpenAnalytics,
  onOpenAnomalies,
  onUpdate,
  onAdd,
  onDelete,
}: FuelListProps) {
  const { navigateDetailCompat: navigateDetail } = useNavigateCompat();
  const [editing, setEditing] = useState<FuelEntry | null>(null);
  const [search, setSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState<string>("");
  const [driverFilter, setDriverFilter] = useState<string>("");
  const [fuelTypeFilter, setFuelTypeFilter] = useState<Set<string>>(new Set());
  const [anomalyFilter, setAnomalyFilter] = useState<string>(""); // "" | "flagged" | "clean"
  const [dateRange, setDateRange] = useState<string>("all");

  const handleUpdate = (id: string, data: Partial<FuelEntry>) => {
    return onUpdate ? onUpdate(id, data) : Promise.resolve(false);
  };

  const uniqueVehicles = useMemo(
    () => Array.from(new Set(fuelEntries.map((f) => f.vehicle))).sort(),
    [fuelEntries],
  );
  const uniqueDrivers = useMemo(
    () => Array.from(new Set(fuelEntries.map((f) => f.driver).filter(Boolean) as string[])).sort(),
    [fuelEntries],
  );

  const filtered = useMemo(() => {
    let r = fuelEntries;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (f) =>
          f.vehicle.toLowerCase().includes(q) ||
          (f.driver || "").toLowerCase().includes(q) ||
          f.station.toLowerCase().includes(q) ||
          f.fuelType.toLowerCase().includes(q),
      );
    }
    if (vehicleFilter) r = r.filter((f) => f.vehicle === vehicleFilter);
    if (driverFilter) r = r.filter((f) => f.driver === driverFilter);
    if (fuelTypeFilter.size > 0) r = r.filter((f) => fuelTypeFilter.has(f.fuelType));
    if (anomalyFilter === "flagged") r = r.filter((f) => f.anomaly);
    if (anomalyFilter === "clean") r = r.filter((f) => !f.anomaly);
    if (dateRange !== "all") {
      const cutoff = Date.now() - Number(dateRange) * 86400000;
      r = r.filter((f) => new Date(f.date).getTime() >= cutoff);
    }
    return r;
  }, [fuelEntries, search, vehicleFilter, driverFilter, fuelTypeFilter, anomalyFilter, dateRange]);

  const toggleFuelType = (t: string) =>
    setFuelTypeFilter((p) => {
      const n = new Set(p);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n;
    });

  // KPIs
  const total = fuelEntries.length;
  const totalSpend = fuelEntries.reduce((s, f) => s + f.totalCost, 0);
  const totalQty = fuelEntries.reduce((s, f) => s + f.quantity, 0);
  const anomalyCount = fuelEntries.filter((f) => f.anomaly).length;
  const fleetAvgEff = fuelEntries.reduce((s, f) => s + f.efficiency, 0) / (total || 1);

  const columns: Column<FuelEntry>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.date,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.date)}</span>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle",
      sortable: true,
      width: "170px",
      sortValue: (r) => r.vehicle,
      render: (r) => {
        const v = vehicles.find((x) => x.name === r.vehicle);
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (v) navigateDetail("vehicles", v.id);
            }}
            className="flex items-center gap-1.5 text-[12px] text-foreground hover:text-foreground/70 transition-colors"
          >
            <Truck className="h-3 w-3 text-muted-foreground" />
            <span className="truncate">{r.vehicle}</span>
          </button>
        );
      },
    },
    {
      key: "driver",
      header: "Driver",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.driver || "",
      render: (r) => {
        if (!r.driver) return <span className="text-muted-foreground">-</span>;
        const d = drivers.find((x) => x.name === r.driver);
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (d) navigateDetail("drivers-staff", d.id);
            }}
            className="text-[12px] text-foreground hover:text-foreground/70 transition-colors"
          >
            {r.driver}
          </button>
        );
      },
    },
    {
      key: "station",
      header: "Station",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.station,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.station}</span>,
    },
    {
      key: "fuelType",
      header: "Fuel Type",
      sortable: true,
      width: "100px",
      sortValue: (r) => r.fuelType,
      render: (r) => <StatusBadge variant="outline">{r.fuelType}</StatusBadge>,
    },
    {
      key: "quantity",
      header: "Qty (L)",
      sortable: true,
      align: "right",
      width: "100px",
      sortValue: (r) => r.quantity,
      render: (r) => <span className="tabular text-[13px]">{formatNumber(r.quantity, 1)}</span>,
    },
    {
      key: "unitPrice",
      header: "Unit Price",
      sortable: true,
      align: "right",
      width: "110px",
      sortValue: (r) => r.unitPrice,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">₹{formatNumber(r.unitPrice, 2)}</span>,
    },
    {
      key: "totalCost",
      header: "Total Cost",
      sortable: true,
      align: "right",
      width: "120px",
      sortValue: (r) => r.totalCost,
      render: (r) => <span className="tabular text-[13px] font-medium">{formatINR(r.totalCost)}</span>,
    },
    {
      key: "odometer",
      header: "Odometer",
      sortable: true,
      align: "right",
      width: "120px",
      sortValue: (r) => r.odometer,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatNumber(r.odometer)} km</span>,
    },
    {
      key: "efficiency",
      header: "Efficiency",
      sortable: true,
      align: "right",
      width: "110px",
      sortValue: (r) => r.efficiency,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{formatNumber(r.efficiency, 1)} km/L</span>
      ),
    },
    {
      key: "anomaly",
      header: "Anomaly",
      width: "100px",
      align: "center",
      render: (r) =>
        r.anomaly ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateDetail("fuel-energy", r.id);
                }}
                className="inline-flex items-center gap-1 rounded-[3px] border border-foreground bg-foreground px-2 py-0.5 text-[11px] font-medium text-background transition-opacity hover:opacity-90"
              >
                <Sparkles className="h-3 w-3" />
                Rean
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] text-left leading-relaxed">
              {r.anomalyNote || "Anomaly flagged by Rean engine - pattern deviation detected."}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-[12px] text-muted-foreground">-</span>
        ),
    },
  ];

  const rowActions = [
    { label: "View", onClick: (f: FuelEntry) => navigateDetail("fuel-energy", f.id) },
    { label: "Edit", onClick: (f: FuelEntry) => setEditing(f) },
    {
      label: "Delete",
      onClick: async (f: FuelEntry) => {
        const ok = await onDelete?.(f.id);
        if (ok === false) return;
        toast(`Deleted fuel entry`, { description: `${f.vehicle} · ${formatDate(f.date)}` });
      },
      destructive: true,
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (selected: FuelEntry[]) =>
        toast(`${selected.length} fuel entr${selected.length === 1 ? "y" : "ies"} exported`, { description: "CSV file generated" }),
    },
  ];

  const fuelTypeLabel = fuelTypeFilter.size === 0 ? "All" : fuelTypeFilter.size === 1 ? Array.from(fuelTypeFilter)[0] : `${fuelTypeFilter.size} selected`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Fuel & Energy"
        description="Log every refuel, track efficiency by vehicle, and let Rean flag anomalies - overfills, mileage gaps, station price outliers."
        actions={
          <>
            <Btn icon={<BarChart3 className="h-3.5 w-3.5" />} onClick={onOpenAnalytics} aria-label="Analytics">
              <span className="hidden sm:inline">Analytics</span>
            </Btn>
            <Btn icon={<Sparkles className="h-3.5 w-3.5" />} onClick={onOpenAnomalies} aria-label="Anomalies">
              <span className="hidden sm:inline">Anomalies</span>
              {anomalyCount > 0 && (
                <span className="ml-1 rounded-[3px] bg-foreground px-1.5 py-0.5 text-[10px] tabular text-background">
                  {anomalyCount}
                </span>
              )}
            </Btn>
            <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting fuel entries", { description: "CSV file generated" })} aria-label="Export">
              <span className="hidden sm:inline">Export</span>
            </Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>Log Fuel</Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<Fuel className="h-3.5 w-3.5" />} label="Total Fuelled" value={String(total)} hint={`${formatNumber(totalQty, 0)} L total`} />
        <KpiTile icon={<Coins className="h-3.5 w-3.5" />} label="Total Spend" value={formatINR(totalSpend)} hint={`${formatINR(Math.round(totalSpend / (total || 1)))} per entry`} />
        <KpiTile icon={<TrendingUp className="h-3.5 w-3.5" />} label="Fleet Avg Eff." value={`${formatNumber(fleetAvgEff, 1)} km/L`} hint="across all vehicles" />
        <KpiTile icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Anomalies Flagged" value={String(anomalyCount)} hint="by Rean" />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicle, driver, station…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <Truck className="h-3 w-3 text-muted-foreground" />
                <span className="max-w-[100px] truncate">{vehicleFilter || "All vehicles"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-72 overflow-y-auto scrollbar-thin">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by vehicle</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setVehicleFilter("")} className="text-[13px]">All vehicles</DropdownMenuItem>
              <DropdownMenuSeparator />
              {uniqueVehicles.map((v) => (
                <DropdownMenuItem key={v} onClick={() => setVehicleFilter(v)} className="text-[13px] tabular">{v}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="max-w-[100px] truncate">{driverFilter || "All drivers"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-72 overflow-y-auto scrollbar-thin">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by driver</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setDriverFilter("")} className="text-[13px]">All drivers</DropdownMenuItem>
              <DropdownMenuSeparator />
              {uniqueDrivers.map((d) => (
                <DropdownMenuItem key={d} onClick={() => setDriverFilter(d)} className="text-[13px]">{d}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Fuel:</span>
                <span className="max-w-[80px] truncate">{fuelTypeLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by fuel type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {FUEL_TYPES.map((t) => (
                <DropdownMenuCheckboxItem key={t} checked={fuelTypeFilter.has(t)} onCheckedChange={() => toggleFuelType(t)} className="text-[13px]">
                  {t}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={
                  "flex h-8 items-center gap-1.5 rounded-[5px] border px-2.5 text-[12px] font-medium transition-colors " +
                  (anomalyFilter === "flagged" ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:bg-accent")
                }
              >
                <Sparkles className="h-3 w-3" />
                <span>{anomalyFilter === "flagged" ? "Flagged only" : anomalyFilter === "clean" ? "Clean only" : "All anomalies"}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by anomaly</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setAnomalyFilter("")} className="text-[13px]">All entries</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAnomalyFilter("flagged")} className="text-[13px]">Rean-flagged only</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAnomalyFilter("clean")} className="text-[13px]">Clean only</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Range:</span>
                <span>{DATE_RANGE_PRESETS.find((p) => p.id === dateRange)?.label}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Date range</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {DATE_RANGE_PRESETS.map((p) => (
                <DropdownMenuItem key={p.id} onClick={() => setDateRange(p.id)} className="text-[13px]">{p.label}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">
            {filtered.length} {filtered.length === 1 ? "record" : "records"}
          </div>
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          onRowClick={(f) => navigateDetail("fuel-energy", f.id)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle="No fuel entries"
          emptyDescription="Log your first refuel to start tracking spend and efficiency."
          emptyAction={
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
              Log Fuel
            </Btn>
          }
          initialSort={{ key: "date", dir: "desc" }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {fuelEntries.length} entries across {uniqueVehicles.length} vehicles · {STATIONS.length} stations · fleet avg {formatNumber(fleetAvgEff, 1)} km/L · {anomalyCount} Rean-flagged
      </p>

      <LogFuelDrawer
        key={editing ? `edit-${editing.id}` : "closed"}
        open={!!editing}
        record={editing || undefined}
        onClose={() => setEditing(null)}
        onAdd={onAdd}
        onUpdate={handleUpdate}
      />
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

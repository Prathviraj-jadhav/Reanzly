"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Btn } from "@/components/shared/btn";
import { toast } from "sonner";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import type { Vehicle, Trip, Driver } from "@/lib/types";
import {
  Shield,
  RefreshCw,
  Plus,
  Download,
  Locate,
  Layers,
  Maximize2,
  History,
} from "lucide-react";
import { FilterBar, type FilterState } from "./filter-bar";
import { VehicleSummaryPanel } from "./vehicle-summary-panel";
import { LegendPanel } from "./legend-panel";
import { PlaybackBar } from "./playback-bar";
import { GeofencePanel } from "./geofence-panel";
import {
  GEOFENCES,
  GEOFENCE_BREACHES,
  buildPlaybackPath,
} from "./_helpers";

// Leaflet touches `window` on import - must be loaded client-side only.
const OsmMap = dynamic(() => import("./osm-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-[6px] border border-border bg-card">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-[12px] uppercase tracking-wider">Loading map…</span>
      </div>
    </div>
  ),
});

export function FleetMapModule() {
  const searchParams = useSearchParams();
  const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();
  const urlVehicleId = searchParams.get("vehicle");
  // Real, database-backed vehicles/trips/drivers (src/app/api/*) -
  // previously read directly from mock-data.ts. Read-only here (Fleet Map
  // doesn't create/edit records, just visualizes fleet state), so a plain
  // fetch-on-mount is enough - no CRUD wiring needed.
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    Promise.all([
      fetch("/api/vehicles").then((r) => (r.ok ? r.json() : { vehicles: [] })),
      fetch("/api/trips").then((r) => (r.ok ? r.json() : { trips: [] })),
      fetch("/api/drivers").then((r) => (r.ok ? r.json() : { drivers: [] })),
    ]).then(([v, t, d]) => {
      setVehicles(v.vehicles ?? []);
      setTrips(t.trips ?? []);
      setDrivers(d.drivers ?? []);
    }).catch(() => toast.error("Couldn't load fleet map data", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

  // ---- Filters ----
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    vehicleTypes: [],
    group: null,
    driver: null,
    status: null,
    showRoutes: true,
    showPlannedRoutes: true,
    showGeofences: true,
  });

  // ---- Selection ----
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(urlVehicleId);

  useEffect(() => {
    setSelectedVehicleId(urlVehicleId);
  }, [urlVehicleId]);

  const updateVehicleSelection = useCallback(
    (id: string | null) => {
      if (id) {
        goToModule("fleet-map", "list", id);
      } else {
        goToModule("fleet-map");
      }
    },
    [goToModule],
  );

  // ---- Geofence drawer ----
  const [geofenceOpen, setGeofenceOpen] = useState(false);

  // ---- Playback state ----
  const [playbackActive, setPlaybackActive] = useState(false);
  const [playbackVehicleId, setPlaybackVehicleId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playbackRange, setPlaybackRange] = useState({
    start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
  });

  // ---- Layers collapse (mobile) ----
  const [legendVisibleMobile, setLegendVisibleMobile] = useState(false);

  // Build driver list (operators on vehicles + drivers from DRIVERS with role Driver).
  const driverOptions = useMemo(() => {
    const set = new Set<string>();
    vehicles.forEach((v) => v.operator && set.add(v.operator));
    drivers.filter((d) => d.role === "Driver").forEach((d) => set.add(d.name));
    return Array.from(set).sort();
  }, [vehicles, drivers]);

  // Apply filters
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matches =
          v.name.toLowerCase().includes(q) ||
          v.licensePlate.toLowerCase().includes(q) ||
          (v.operator ?? "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (filters.vehicleTypes.length > 0 && !filters.vehicleTypes.includes(v.type)) return false;
      if (filters.group && v.group !== filters.group) return false;
      if (filters.driver && v.operator !== filters.driver) return false;
      if (filters.status && v.status !== filters.status) return false;
      return true;
    });
  }, [filters, vehicles]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) ?? null,
    [selectedVehicleId, vehicles]
  );
  const selectedTrip = useMemo(() => {
    if (!selectedVehicle?.assignedTripId) return null;
    return trips.find((t) => t.id === selectedVehicle.assignedTripId) ?? null;
  }, [selectedVehicle, trips]);

  const playbackPath = useMemo(() => {
    if (!playbackActive || !playbackVehicleId) return undefined;
    const v = vehicles.find((x) => x.id === playbackVehicleId);
    if (!v) return undefined;
    return buildPlaybackPath(v);
  }, [playbackActive, playbackVehicleId, vehicles]);

  const activeCount = useMemo(
    () => filteredVehicles.filter((v) => v.status === "Active").length,
    [filteredVehicles]
  );

  function handleSelectVehicle(id: string) {
    updateVehicleSelection(id);
  }

  function handleRefresh() {
    toast.success("Map refreshed", {
      description: `${filteredVehicles.length} vehicles · ${GEOFENCES.filter((g) => g.status === "Active").length} active geofences`,
    });
  }

  function handleLocate() {
    // Pick a random active vehicle and center on it.
    const active = filteredVehicles.find((v) => v.status === "Active");
    if (active) {
      updateVehicleSelection(active.id);
      toast.success("Located nearest active vehicle", {
        description: `${active.name} · ${active.licensePlate}`,
      });
    } else {
      toast.error("No active vehicles in current filter");
    }
  }

  function handleExport() {
    toast.success("Map export queued", {
      description: "Snapshot PDF will appear in Documents when ready.",
    });
  }

  function handleFullscreen() {
    toast.info("Fullscreen view", {
      description: "Press Esc to exit.",
    });
  }

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading fleet map…</div>;
  }

  return (
    <div className="flex flex-col gap-3 pb-4">
      <PageHeader
        title="Fleet Map"
        description="Real-time fleet positions across India. Live GPS pings, route overlays, geofence alerts, and historical playback."
        actions={
          <>
            <Btn icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={handleRefresh} aria-label="Refresh">
              <span className="hidden sm:inline">Refresh</span>
            </Btn>
            <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={handleExport} aria-label="Export">
              <span className="hidden sm:inline">Export</span>
            </Btn>
            <Btn icon={<Shield className="h-3.5 w-3.5" />} onClick={() => setGeofenceOpen(true)} aria-label="Geofences">
              <span className="hidden sm:inline">Geofences</span>
            </Btn>
            <Btn
              variant="primary"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => {
                setGeofenceOpen(true);
                toast.info("Drawing mode ready", {
                  description: "Define a new geofence zone in the side panel.",
                });
              }}
            >
              <span className="hidden sm:inline">Create Geofence</span>
              <span className="sm:hidden">Geofence</span>
            </Btn>
          </>
        }
      />

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        drivers={driverOptions}
        activeCount={activeCount}
        totalShown={filteredVehicles.length}
        totalCount={vehicles.length}
      />

      {/* Main grid: map + right sidebar (legend) */}
      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        {/* Map column */}
        <div className="relative flex flex-col gap-3">
          {/* Map container */}
          <div className="relative h-[60vh] min-h-[460px] lg:h-[640px]">
            <OsmMap
              vehicles={filteredVehicles}
              trips={trips}
              geofences={GEOFENCES}
              showRoutes={filters.showRoutes}
              showPlannedRoutes={filters.showPlannedRoutes}
              showGeofences={filters.showGeofences}
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={handleSelectVehicle}
              playbackActive={playbackActive}
              playbackVehicleId={playbackVehicleId}
              playbackProgress={playbackProgress}
              playbackPath={playbackPath}
            />

            {/* Floating left toolbar (vertical icons) */}
            <div className="absolute left-3 top-3 z-20 flex flex-col gap-1 rounded-[6px] border border-border bg-card/95 p-1 backdrop-blur-sm">
              <ToolbarBtn label="Locate nearest" onClick={handleLocate}>
                <Locate className="h-3.5 w-3.5" />
              </ToolbarBtn>
              <ToolbarBtn
                label="Toggle layers"
                onClick={() => {
                  setFilters((f) => ({ ...f, showGeofences: !f.showGeofences, showRoutes: !f.showRoutes }));
                  toast.info("Toggled layers");
                }}
              >
                <Layers className="h-3.5 w-3.5" />
              </ToolbarBtn>
              <ToolbarBtn label="Fullscreen" onClick={handleFullscreen}>
                <Maximize2 className="h-3.5 w-3.5" />
              </ToolbarBtn>
              <div className="my-0.5 h-px bg-border" />
              <ToolbarBtn label="Geofences" onClick={() => setGeofenceOpen(true)}>
                <Shield className="h-3.5 w-3.5" />
              </ToolbarBtn>
              <ToolbarBtn
                label="Playback"
                active={playbackActive}
                onClick={() => setPlaybackActive((v) => !v)}
              >
                <History className="h-3.5 w-3.5" />
              </ToolbarBtn>
              {/* Mobile-only: toggle legend */}
              <div className="my-0.5 h-px bg-border lg:hidden" />
              <ToolbarBtn
                label="Legend"
                active={legendVisibleMobile}
                onClick={() => setLegendVisibleMobile((v) => !v)}
                className="lg:hidden"
              >
                <Layers className="h-3.5 w-3.5" />
              </ToolbarBtn>
            </div>

            {/* Vehicle summary panel (floating top-right) */}
            <VehicleSummaryPanel
              vehicle={selectedVehicle}
              trip={selectedTrip}
              open={!!selectedVehicle}
              onClose={() => updateVehicleSelection(null)}
            />

            {/* Mobile legend overlay */}
            {legendVisibleMobile && (
              <div className="absolute bottom-3 left-3 right-3 z-20 lg:hidden">
                <LegendPanel
                  vehicles={filteredVehicles}
                  breaches={GEOFENCE_BREACHES}
                  onSelectVehicle={(name) => {
                    const v = vehicles.find((x) => x.name === name);
                    if (v) handleSelectVehicle(v.id);
                  }}
                  onOpenGeofences={() => setGeofenceOpen(true)}
                />
              </div>
            )}
          </div>

          {/* Playback bar (always rendered; compact when inactive) */}
          <PlaybackBar
            vehicles={filteredVehicles}
            active={playbackActive}
            vehicleId={playbackVehicleId}
            progress={playbackProgress}
            speed={playbackSpeed}
            dateRange={playbackRange}
            onActivate={setPlaybackActive}
            onSelectVehicle={setPlaybackVehicleId}
            onProgress={setPlaybackProgress}
            onSpeed={setPlaybackSpeed}
            onDateRange={setPlaybackRange}
          />
        </div>

        {/* Right sidebar: legend (desktop always visible) */}
        <aside className="hidden lg:block">
          <LegendPanel
            vehicles={filteredVehicles}
            breaches={GEOFENCE_BREACHES}
            onSelectVehicle={(name) => {
              const v = vehicles.find((x) => x.name === name);
              if (v) handleSelectVehicle(v.id);
            }}
            onOpenGeofences={() => setGeofenceOpen(true)}
          />
        </aside>
      </div>

      {/* Geofence management drawer */}
      <GeofencePanel open={geofenceOpen} onOpenChange={setGeofenceOpen} />
    </div>
  );
}

function ToolbarBtn({
  children,
  label,
  onClick,
  active,
  className = "",
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-[4px] text-foreground transition-colors hover:bg-accent ${
        active ? "bg-foreground text-background hover:bg-foreground/90" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
}

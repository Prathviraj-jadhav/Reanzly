"use client";

import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Btn } from "@/components/shared/btn";
import {
  MapPin,
  Truck,
  User,
  Gauge,
  Clock,
  Navigation,
  Lock,
  Radio,
  Battery,
  Wifi,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import {
  VENDOR_TRIPS,
  vehicleByName,
  driverByName,
  formatDate,
  relativeTime,
  tripStatusBadge,
  type VendorSubView,
} from "./_helpers";
import { toastInfo } from "@/lib/toast";

/* ============================================================
   VendorTracking - simplified live tracking.
   ------------------------------------------------------------
   A card grid showing only this vendor's in-transit shipments
   with live status: Vehicle, Driver, Last location, Speed, ETA.
   If no trips are in transit, shows the next-up planned trip.
   ============================================================ */

interface VendorTrackingProps {
  onNavigate?: (view: VendorSubView) => void;
}

interface LiveTrip {
  tripId: string;
  lrNumber: string;
  origin: string;
  destination: string;
  vehicleName: string;
  vehiclePlate: string;
  driverName: string;
  driverPhone: string;
  lastLocation: string;
  lastUpdate: string;
  speedKph: number;
  etaIso: string;
  progressPct: number;
  status: string;
  gps: { lat: number; lng: number };
  signal: "Live" | "Stale" | "Offline";
  batteryPct: number;
}

// Build a synthesized live view from the vendor's in-transit trips.
function buildLiveTrips(): LiveTrip[] {
  // Take trips that are Active / In Transit (or Planned as next-up).
  const inTransit = VENDOR_TRIPS.filter((t) => t.status === "Active" || t.status === "In Transit");
  const planned = VENDOR_TRIPS.filter((t) => t.status === "Planned");
  const pool = [...inTransit, ...planned].slice(0, 4);

  const LOCATIONS = [
    "NH-48 near Lonavala, Maharashtra",
    "Mumbai-Pune Expressway, near Talegaon",
    "Outskirts of Nashik, NH-60",
    "Approaching Pune bypass, NH-48",
  ];
  const SIGNALS: LiveTrip["signal"][] = ["Live", "Live", "Stale", "Live"];

  return pool.map((t, i) => {
    const v = vehicleByName(t.vehicleName);
    const d = driverByName(t.driverName);
    const speed = t.status === "Planned" ? 0 : 38 + (i * 13) % 32;
    return {
      tripId: t.tripId,
      lrNumber: t.lrNumber,
      origin: t.origin,
      destination: t.destination,
      vehicleName: t.vehicleName,
      vehiclePlate: v?.licensePlate ?? "MH 12 AB 7896",
      driverName: t.driverName,
      driverPhone: d?.contact ?? "+91 98200 14582",
      lastLocation: t.status === "Planned" ? "At origin hub, awaiting dispatch" : LOCATIONS[i % LOCATIONS.length],
      lastUpdate: t.status === "Planned" ? t.createdDate : new Date(Date.now() - (i + 1) * 4 * 60000).toISOString(),
      speedKph: speed,
      etaIso: t.expectedDelivery,
      progressPct: t.status === "Planned" ? 0 : 28 + (i * 19) % 55,
      status: t.status,
      gps: { lat: 18.93 + (i * 0.04), lng: 73.25 + (i * 0.06) },
      signal: SIGNALS[i % SIGNALS.length],
      batteryPct: 78 - (i * 11) % 38,
    };
  });
}

export function VendorTracking({ onNavigate }: VendorTrackingProps) {
  const live = buildLiveTrips();
  const inTransitCount = live.filter((l) => l.status === "Active" || l.status === "In Transit").length;

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Local header */}
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <Lock className="h-3 w-3" />
              Live tracking · Read-only
            </div>
            <h1 className="mt-1 text-[22px] font-medium leading-tight tracking-tight text-foreground">
              Live Tracking
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Your in-transit shipments with live GPS, speed, and ETA. Updates every 30 seconds.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="outline" size="sm" icon={<Truck className="h-3.5 w-3.5" />} onClick={() => onNavigate?.("shipments")}>
              All shipments
              <ArrowRight className="h-3.5 w-3.5" />
            </Btn>
          </div>
        </div>
      </div>

      {/* Live status strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatusTile label="In transit" value={String(inTransitCount)} icon={<Truck className="h-3.5 w-3.5" />} hint="live GPS" />
        <StatusTile label="Avg speed" value={`${Math.round(live.reduce((s, l) => s + l.speedKph, 0) / Math.max(live.length, 1))} km/h`} icon={<Gauge className="h-3.5 w-3.5" />} hint="across live trips" />
        <StatusTile label="Devices online" value={`${live.filter((l) => l.signal === "Live").length}/${live.length}`} icon={<Radio className="h-3.5 w-3.5" />} hint="GPS trackers" />
        <StatusTile label="Avg ETA" value={live[0] ? formatDate(live[0].etaIso) : "-"} icon={<Clock className="h-3.5 w-3.5" />} hint="nearest arrival" />
      </div>

      {/* Live trip cards */}
      {live.length === 0 ? (
        <SectionCard title="No live trips" description="Nothing in transit right now." icon={<AlertCircle className="h-4 w-4" />}>
          <div className="py-6 text-center text-[12px] text-muted-foreground">
            When your shipments are dispatched, their live location, speed, and ETA will appear here.
          </div>
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {live.map((t) => (
            <LiveTripCard key={t.tripId} trip={t} onView={() => toastInfo("Trip detail", `${t.tripId} - opens the shipments view`)} />
          ))}
        </div>
      )}

      {/* Footer note */}
      <div className="flex items-center gap-3 rounded-[5px] border border-border bg-muted/30 px-3 py-2.5 text-[11px] text-muted-foreground">
        <Navigation className="h-3.5 w-3.5 shrink-0" />
        <span>
          GPS positions update every 30 seconds when the vehicle is on a national highway. In low-coverage zones, the last known position is shown with a stale indicator.
        </span>
      </div>
    </div>
  );
}

function LiveTripCard({ trip, onView }: { trip: LiveTrip; onView: () => void }) {
  const b = tripStatusBadge(trip.status);
  const isLive = trip.signal === "Live";
  return (
    <SectionCard
      title={trip.tripId}
      description={`LR ${trip.lrNumber} · ${trip.origin} → ${trip.destination}`}
      icon={<Truck className="h-4 w-4" />}
      action={
        <div className="flex items-center gap-2">
          <span
            className={
              "inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-0.5 text-[10px] font-medium " +
              (isLive
                ? "border-foreground bg-foreground text-background"
                : trip.signal === "Stale"
                  ? "border-border bg-background text-muted-foreground"
                  : "border-transparent bg-muted text-muted-foreground")
            }
          >
            <span className={"h-1.5 w-1.5 rounded-full " + (isLive ? "bg-background animate-pulse" : trip.signal === "Stale" ? "bg-muted-foreground" : "bg-muted-foreground/50")} />
            {trip.signal}
          </span>
          <StatusBadge variant={b.variant} pulse={b.pulse}>{trip.status}</StatusBadge>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {/* Last location */}
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border border-border bg-background text-muted-foreground">
            <MapPin className="h-3 w-3" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Last location</p>
            <p className="mt-0.5 text-[12.5px] text-foreground">{trip.lastLocation}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground tabular">
              {relativeTime(trip.lastUpdate)} · {trip.gps.lat.toFixed(4)}, {trip.gps.lng.toFixed(4)}
            </p>
          </div>
        </div>

        {/* Speed + ETA */}
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Speed" value={`${trip.speedKph}`} unit="km/h" icon={<Gauge className="h-3 w-3" />} />
          <MiniStat label="ETA" value={formatDate(trip.etaIso).split(" ")[0]} unit="" icon={<Clock className="h-3 w-3" />} />
          <MiniStat label="Progress" value={`${trip.progressPct}`} unit="%" icon={<Navigation className="h-3 w-3" />} />
        </div>

        {/* Progress bar */}
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground transition-[width] duration-500"
            style={{ width: `${trip.progressPct}%` }}
          />
        </div>

        {/* Driver + vehicle */}
        <div className="grid grid-cols-1 gap-2 border-t border-border pt-2 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border border-border bg-background text-muted-foreground">
              <User className="h-3 w-3" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Driver</p>
              <p className="truncate text-[12px] text-foreground">{trip.driverName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border border-border bg-background text-muted-foreground">
              <Truck className="h-3 w-3" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Vehicle</p>
              <p className="truncate text-[12px] text-foreground tabular">{trip.vehiclePlate}</p>
            </div>
          </div>
        </div>

        {/* Device telemetry */}
        <div className="flex items-center justify-between border-t border-border pt-2 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Wifi className="h-3 w-3" />
            {isLive ? "GPS lock · 4G" : trip.signal === "Stale" ? "GPS stale · 2G" : "No signal"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Battery className="h-3 w-3" />
            {trip.batteryPct}% tracker
          </span>
        </div>

        {/* Action */}
        <div className="flex items-center justify-end gap-2 border-t border-border pt-2">
          <Btn variant="outline" size="sm" icon={<MapPin className="h-3.5 w-3.5" />} onClick={onView}>
            View on map
          </Btn>
        </div>
      </div>
    </SectionCard>
  );
}

function StatusTile({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[18px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[10px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

function MiniStat({ label, value, unit, icon }: { label: string; value: string; unit: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[5px] border border-border bg-background p-2">
      <div className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-[14px] font-medium tabular text-foreground">
        {value}
        <span className="ml-0.5 text-[10px] text-muted-foreground tabular">{unit}</span>
      </p>
    </div>
  );
}

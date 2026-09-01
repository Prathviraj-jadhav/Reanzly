"use client";

import { X, Truck, Navigation, Clock, Gauge, User, ArrowRight, ExternalLink } from "lucide-react";
import type { Vehicle, Trip } from "@/lib/types";
import { useAppStore } from "@/lib/store/app-store";
import { StatusBadge, vehicleStatusBadge } from "@/components/shared/status-badge";
import { formatDateTime, relativeTime } from "./_helpers";

interface VehicleSummaryPanelProps {
  vehicle: Vehicle | null;
  trip: Trip | null;
  open: boolean;
  onClose: () => void;
}

export function VehicleSummaryPanel({ vehicle, trip, open, onClose }: VehicleSummaryPanelProps) {
  const { navigateDetail } = useAppStore();
  if (!open || !vehicle) return null;

  const badge = vehicleStatusBadge(vehicle.status);

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-20 w-80 animate-slide-in-right rounded-[6px] border border-border bg-card">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-border p-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Truck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate text-[13px] font-medium text-foreground">{vehicle.name}</span>
          </div>
          <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {vehicle.licensePlate}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge variant={badge.variant} pulse={badge.pulse}>
            {vehicle.status}
          </StatusBadge>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close vehicle panel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Live status row */}
      <div className="grid grid-cols-3 gap-px border-b border-border bg-border">
        <div className="bg-card p-2.5">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Gauge className="h-3 w-3" />
            <span>Speed</span>
          </div>
          <div className="mt-1 font-mono text-[16px] tabular text-foreground">
            {vehicle.gpsSpeed ?? 0}
            <span className="ml-1 text-[10px] text-muted-foreground">km/h</span>
          </div>
        </div>
        <div className="bg-card p-2.5">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Navigation className="h-3 w-3" />
            <span>Location</span>
          </div>
          <div className="mt-1 truncate text-[13px] font-medium text-foreground">
            {vehicle.location ?? "-"}
          </div>
        </div>
        <div className="bg-card p-2.5">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Last GPS</span>
          </div>
          <div className="mt-1 truncate text-[12px] text-foreground" title={vehicle.lastGpsUpdate ? formatDateTime(vehicle.lastGpsUpdate) : ""}>
            {vehicle.lastGpsUpdate ? relativeTime(vehicle.lastGpsUpdate) : "-"}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="divide-y divide-border">
        <Row label="Driver / Operator" value={vehicle.operator || "Unassigned"} icon={<User className="h-3 w-3" />} />
        <Row label="Vehicle Type" value={vehicle.type} />
        <Row label="Group" value={vehicle.group} />
        <Row label="Ownership" value={vehicle.ownership} />
        <Row label="Fuel Type" value={vehicle.fuelType} />
        <Row label="Odometer" value={`${vehicle.currentMeter.toLocaleString("en-IN")} km`} mono />
        <Row label="Year" value={String(vehicle.year)} mono />
        {trip && (
          <Row
            label="Assigned Trip"
            value={
              <button
                onClick={() => navigateDetail("trips", trip.tripId)}
                className="inline-flex items-center gap-1 font-mono text-[11px] text-foreground underline-offset-2 hover:underline"
              >
                <span>{trip.tripId}</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            }
          />
        )}
        {trip && (
          <div className="px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Trip Route</div>
            <div className="mt-1 flex items-center gap-1.5 text-[12px] text-foreground">
              <span className="truncate">{trip.origin}</span>
              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{trip.destination}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              <StatusBadge variant={trip.status === "Active" || trip.status === "In Transit" ? "solid" : "outline"} pulse={trip.status === "Active" || trip.status === "In Transit"}>
                {trip.status}
              </StatusBadge>
              <span className="tabular">{trip.distanceKm} km</span>
              <span>·</span>
              <span>{trip.orderMode}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-2 border-t border-border p-3">
        <button
          onClick={() => navigateDetail("vehicles", vehicle.id)}
          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[5px] border border-border bg-background text-[12px] font-medium text-foreground hover:bg-accent"
        >
          <span>Vehicle Profile</span>
          <ExternalLink className="h-3 w-3" />
        </button>
        {trip && (
          <button
            onClick={() => navigateDetail("trips", trip.tripId)}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[5px] bg-foreground text-[12px] font-medium text-background hover:bg-foreground/90"
          >
            <span>Open Trip</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, icon, mono }: { label: string; value: React.ReactNode; icon?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`truncate text-[12px] text-foreground ${mono ? "font-mono tabular" : ""}`}>
        {value}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState, useEffect } from "react";
import { StatCard, InfoRow } from "@/components/shared/detail-layout";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge, vehicleStatusBadge, licenseExpiryBadge } from "@/components/shared/status-badge";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import type { Vehicle } from "@/lib/types";
import {
  Truck, Gauge, Fuel, Activity, Calendar, MapPin, Navigation,
  ShieldCheck, ArrowUpRight, User, CircleDot, Wrench,
} from "lucide-react";
import { formatNumber, relativeTime, vehicleSeed, daysFromNow, formatDate } from "../_helpers";

export function VehicleOverviewTab({ vehicle }: { vehicle: Vehicle }) {
  const { goToDetail } = useAppNavigation();
  const seed = vehicleSeed(vehicle.id);

  const [drivers, setDrivers] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/drivers").then((r) => r.ok ? r.json() : { drivers: [] }),
      fetch("/api/trips").then((r) => r.ok ? r.json() : { trips: [] }),
    ]).then(([drv, trp]) => {
      setDrivers(drv.drivers ?? []);
      setTrips(trp.trips ?? []);
    }).catch(() => {});
  }, []);

  const currentDriver = useMemo(
    () => drivers.find((d) => d.name === vehicle.operator),
    [drivers, vehicle.operator],
  );
  const currentTrip = useMemo(
    () => (vehicle.assignedTripId ? trips.find((t) => t.id === vehicle.assignedTripId || t.tripId === vehicle.assignedTripId) : undefined),
    [trips, vehicle.assignedTripId],
  );

  const { variant, pulse } = vehicleStatusBadge(vehicle.status);

  // Synthetic but deterministic KPIs
  const kmThisMonth = vehicle.distanceThisPeriod;
  const tripsThisMonth = 8 + (seed % 22);
  const fuelEff = (3.4 + (seed % 4) * 0.6).toFixed(1);
  const utilization = 60 + (seed % 38);
  const nextServiceKm = Math.max(0, 20000 - (vehicle.currentMeter % 20000));

  // Expiry countdowns - deterministic
  const rcExpiry = new Date(Date.now() + ((seed % 120) - 30) * 86400000).toISOString();
  const insuranceExpiry = new Date(Date.now() + ((seed % 90) - 20) * 86400000).toISOString();
  const fitnessExpiry = new Date(Date.now() + ((seed % 180) - 60) * 86400000).toISOString();

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total KM" value={formatNumber(vehicle.currentMeter)} icon={<Gauge className="h-4 w-4" />} />
        <StatCard label="Trips This Month" value={tripsThisMonth} icon={<Truck className="h-4 w-4" />} />
        <StatCard label="Fuel Efficiency" value={`${fuelEff} km/L`} icon={<Fuel className="h-4 w-4" />} />
        <StatCard label="Utilization" value={`${utilization}%`} icon={<Activity className="h-4 w-4" />} />
        <StatCard label="Next Service" value={`${formatNumber(nextServiceKm)} km`} icon={<Wrench className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Current status */}
        <SectionCard title="Current Status" icon={<CircleDot className="h-4 w-4" />}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <StatusBadge variant={variant} pulse={pulse}>{vehicle.status}</StatusBadge>
            <span className="text-[11px] tabular text-muted-foreground">
              Last GPS: {relativeTime(vehicle.lastGpsUpdate ?? new Date().toISOString())}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <InfoRow label="Type" value={vehicle.type} />
            <InfoRow label="Group" value={vehicle.group} />
            <InfoRow label="Ownership" value={vehicle.ownership} />
            <InfoRow label="Fuel Type" value={vehicle.fuelType} />
            <InfoRow label="GPS Speed" value={`${vehicle.gpsSpeed ?? 0} km/h`} mono />
            <InfoRow label="Odometer" value={`${formatNumber(vehicle.currentMeter)} km`} mono />
          </div>
        </SectionCard>

        {/* Current driver + trip */}
        <SectionCard title="Current Driver & Trip" icon={<User className="h-4 w-4" />}>
          {currentDriver ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <button
                    onClick={() => goToDetail("drivers-staff", currentDriver.id)}
                    className="text-[14px] font-medium text-foreground hover:underline inline-flex items-center gap-1"
                  >
                    {currentDriver.name}
                    <ArrowUpRight className="h-3 w-3" />
                  </button>
                  <div className="text-[12px] tabular text-muted-foreground">{currentDriver.contact}</div>
                </div>
                <StatusBadge variant="outline">{currentDriver.role}</StatusBadge>
              </div>
              {currentTrip && (
                <div className="rounded-[5px] border border-border bg-background p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Active Trip</span>
                    <StatusBadge variant="solid" pulse>{currentTrip.status}</StatusBadge>
                  </div>
                  <div className="mt-1.5 text-[13px] text-foreground">
                    {currentTrip.origin} → {currentTrip.destination}
                  </div>
                  <div className="mt-1 text-[12px] tabular text-muted-foreground">
                    {currentTrip.tripId} · {formatNumber(currentTrip.distanceKm)} km
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
              <User className="h-6 w-6 text-muted-foreground" />
              <p className="text-[13px] font-medium text-foreground">No driver assigned</p>
              <p className="text-[12px] text-muted-foreground">Assign a driver from the Drivers module.</p>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* RC / insurance / fitness expiry countdowns */}
        <SectionCard title="Compliance Countdowns" icon={<ShieldCheck className="h-4 w-4" />}>
          <div className="flex flex-col gap-2">
            <CountdownRow label="RC Book" expiry={rcExpiry} number={`RC-${vehicle.licensePlate.replace(/\s+/g, "")}`} />
            <CountdownRow label="Insurance" expiry={insuranceExpiry} number={`POL-${(seed * 313).toString().padStart(8, "0")}`} />
            <CountdownRow label="Fitness Certificate" expiry={fitnessExpiry} number={`FIT-${(seed * 211).toString().padStart(6, "0")}`} />
          </div>
        </SectionCard>

        {/* Location card */}
        <SectionCard title="Location" icon={<MapPin className="h-4 w-4" />}>
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[18px] font-medium text-foreground">{vehicle.location ?? "No GPS lock"}</div>
                <div className="text-[12px] tabular text-muted-foreground">
                  Last ping: {relativeTime(vehicle.lastGpsUpdate ?? new Date().toISOString())}
                </div>
              </div>
              <StatusBadge variant={vehicle.status === "Active" ? "solid" : "outline"} pulse={vehicle.status === "Active"}>
                {vehicle.status === "Active" ? "Moving" : "Stationary"}
              </StatusBadge>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <InfoRow label="Speed" value={`${vehicle.gpsSpeed ?? 0} km/h`} mono />
              <InfoRow label="Heading" value={["N", "NE", "E", "SE", "S", "SW", "W", "NW"][seed % 8]} />
              <InfoRow label="GPS Source" value="OEM Tracker" />
              <InfoRow label="Ignition" value={vehicle.status === "Active" ? "On" : "Off"} />
            </div>
            <div className="rounded-[5px] border border-dashed border-border bg-background p-3 text-[12px] text-muted-foreground">
              <Navigation className="mb-1 inline h-3.5 w-3.5" /> Live map view available via “View on Map” quick action.
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Specifications snapshot */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Specifications" icon={<Truck className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <InfoRow label="Make" value={vehicle.make} />
            <InfoRow label="Model" value={vehicle.model} />
            <InfoRow label="Year" value={vehicle.year} mono />
            <InfoRow label="VIN" value={vehicle.vin} mono />
            <InfoRow label="License Plate" value={vehicle.licensePlate} mono />
            <InfoRow label="Operator" value={vehicle.operator ?? "-"} />
          </div>
        </SectionCard>
        <SectionCard title="Service & Compliance" icon={<Calendar className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <InfoRow label="Next Service" value={`${formatNumber(nextServiceKm)} km`} mono />
            <InfoRow label="KM This Period" value={formatNumber(kmThisMonth)} mono />
            <InfoRow label="Trips This Month" value={tripsThisMonth} mono />
            <InfoRow label="Utilization" value={`${utilization}%`} mono />
            <InfoRow label="RC Expiry" value={daysFromNow(rcExpiry)} mono />
            <InfoRow label="Insurance Expiry" value={daysFromNow(insuranceExpiry)} mono />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function CountdownRow({ label, expiry, number }: { label: string; expiry: string; number: string }) {
  const badge = licenseExpiryBadge(expiry);
  return (
    <div className="flex items-center justify-between gap-3 rounded-[5px] border border-border bg-background p-2.5">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-foreground">{label}</div>
        <div className="text-[11px] tabular text-muted-foreground">{number}</div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <StatusBadge variant={badge.variant} pulse={badge.pulse}>{badge.label}</StatusBadge>
        <span className="text-[11px] tabular text-muted-foreground">{formatDate(expiry)}</span>
      </div>
    </div>
  );
}

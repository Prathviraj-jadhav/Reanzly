"use client";

import { useMemo } from "react";
import { StatCard, InfoSection, InfoRow } from "@/components/shared/detail-layout";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Btn } from "@/components/shared/btn";
import { useAppStore } from "@/lib/store/app-store";
import { VEHICLES, TRIPS } from "@/lib/mock-data";
import type { Driver } from "@/lib/types";
import {
  Truck, TrendingUp, Gauge, Star, ShieldCheck, Fuel, Activity,
  ArrowUpRight, Car, Banknote, AlertTriangle, CheckCircle2,
  MessageSquare, FileText, ClipboardCheck,
} from "lucide-react";
import {
  formatDate, relativeTime, daysUntil, licenseExpiryBadge,
  driverSeed, generateActivityTimeline, generateCompliance,
} from "../_helpers";

export function DriverOverviewTab({ driver }: { driver: Driver }) {
  const { navigateDetail } = useAppStore();
  const seed = driverSeed(driver.id);

  const currentVehicle = useMemo(
    () => VEHICLES.find((v) => v.name === driver.assignedVehicle),
    [driver.assignedVehicle],
  );
  const currentTrip = useMemo(
    () => (currentVehicle?.assignedTripId ? TRIPS.find((t) => t.id === currentVehicle.assignedTripId) : undefined),
    [currentVehicle],
  );

  const licenseBadge = licenseExpiryBadge(driver.licenseExpiry);
  const permitExpiry = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3 + (seed % 4));
    return d.toISOString();
  }, [seed]);
  const permitBadge = licenseExpiryBadge(permitExpiry);

  const timeline = useMemo(() => generateActivityTimeline(driver.id), [driver.id]);
  const compliance = useMemo(
    () => generateCompliance(driver.id, driver.licenseExpiry),
    [driver.id, driver.licenseExpiry],
  );

  const kmThisMonth = 2400 + (seed % 30) * 180;
  const fuelEff = (3.4 + (seed % 4) * 0.7).toFixed(1);
  const onTimePct = Math.round(driver.onTimeRate * 100);
  const compliantCount = compliance.filter((c) => c.status === "Compliant").length;
  const complianceScore = Math.round((compliantCount / compliance.length) * 100);

  const timelineIcon = (kind: string) => {
    switch (kind) {
      case "trip": return <Truck className="h-3.5 w-3.5" />;
      case "fuel": return <Fuel className="h-3.5 w-3.5" />;
      case "issue": return <AlertTriangle className="h-3.5 w-3.5" />;
      case "doc": return <FileText className="h-3.5 w-3.5" />;
      case "pay": return <Banknote className="h-3.5 w-3.5" />;
      case "msg": return <MessageSquare className="h-3.5 w-3.5" />;
      case "inspect": return <ClipboardCheck className="h-3.5 w-3.5" />;
      default: return <Activity className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Trips Completed" value={driver.tripsCompleted} icon={<Truck className="h-4 w-4" />} />
        <StatCard label="On-Time %" value={`${onTimePct}%`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="KM This Month" value={kmThisMonth.toLocaleString("en-IN")} icon={<Gauge className="h-4 w-4" />} />
        <StatCard label="Avg Fuel Eff" value={`${fuelEff} km/L`} icon={<Fuel className="h-4 w-4" />} />
        <StatCard label="Rating" value={driver.rating.toFixed(1)} icon={<Star className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Current assignment */}
        <SectionCard title="Current Assignment" icon={<Car className="h-4 w-4" />}>
          {currentVehicle ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <button
                    onClick={() => navigateDetail("vehicles", currentVehicle.id)}
                    className="text-[14px] font-medium text-foreground hover:underline inline-flex items-center gap-1"
                  >
                    {currentVehicle.name}
                    <ArrowUpRight className="h-3 w-3" />
                  </button>
                  <div className="text-[12px] tabular text-muted-foreground">{currentVehicle.licensePlate}</div>
                </div>
                <StatusBadge variant="outline">{currentVehicle.status}</StatusBadge>
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
                    {currentTrip.tripId} · {currentTrip.distanceKm.toLocaleString("en-IN")} km
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <InfoRow label="Type" value={currentVehicle.type} />
                <InfoRow label="Group" value={currentVehicle.group} />
                <InfoRow label="Odometer" value={`${currentVehicle.currentMeter.toLocaleString("en-IN")} km`} mono />
                <InfoRow label="Ownership" value={currentVehicle.ownership} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
              <Car className="h-6 w-6 text-muted-foreground" />
              <p className="text-[13px] font-medium text-foreground">No active vehicle assignment</p>
              <p className="text-[12px] text-muted-foreground">Assign a vehicle from the Vehicle Assignment tab.</p>
            </div>
          )}
        </SectionCard>

        {/* License & permit expiry countdowns */}
        <SectionCard title="License & Permit Countdowns" icon={<ShieldCheck className="h-4 w-4" />}>
          <div className="flex flex-col gap-2">
            <ExpiryRow
              label="Driving License"
              number={driver.licenseNumber || "-"}
              expiry={driver.licenseExpiry}
              badge={licenseBadge}
            />
            <ExpiryRow
              label="National Permit"
              number={`NP-${(seed * 211).toString().padStart(7, "0")}`}
              expiry={permitExpiry}
              badge={permitBadge}
            />
            <ExpiryRow
              label="Medical Certificate"
              number={`MC-${(seed * 89).toString().padStart(6, "0")}`}
              expiry={new Date(Date.now() + 60 * 86400000 + seed * 86400000).toISOString()}
              badge={licenseExpiryBadge(new Date(Date.now() + 60 * 86400000 + seed * 86400000).toISOString())}
            />
            <ExpiryRow
              label="Police Verification"
              number={`PV-${(seed * 137).toString().padStart(6, "0")}`}
              expiry={undefined}
              badge={{ variant: "muted", label: "No expiry" }}
            />
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Activity timeline */}
        <SectionCard title="Recent Activity" icon={<Activity className="h-4 w-4" />}>
          <ol className="relative flex flex-col">
            {timeline.map((t, i) => (
              <li key={t.id} className="relative flex gap-3 pb-4 last:pb-0">
                {/* vertical line */}
                {i < timeline.length - 1 && (
                  <span className="absolute left-[14px] top-7 bottom-0 w-px bg-border" aria-hidden />
                )}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
                  {timelineIcon(t.icon)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-medium text-foreground">{t.title}</span>
                    <span className="shrink-0 text-[11px] tabular text-muted-foreground">{relativeTime(t.ts)}</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground">{t.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </SectionCard>

        {/* Compliance scorecard */}
        <SectionCard title="Compliance Scorecard" icon={<ShieldCheck className="h-4 w-4" />}>
          <div className="mb-3 flex items-center justify-between gap-3 rounded-[5px] border border-border bg-background p-3">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Overall Score</div>
              <div className="text-[24px] font-medium leading-none tabular text-foreground">{complianceScore}%</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] tabular text-muted-foreground">
                {compliantCount}/{compliance.length} compliant
              </div>
              <Btn size="sm" variant="ghost" iconRight={<ArrowUpRight className="h-3 w-3" />} onClick={() => {}}>
                Open checklist
              </Btn>
            </div>
          </div>
          <ul className="flex flex-col gap-2">
            {compliance.map((c) => (
              <li key={c.id} className="flex items-start gap-2.5 rounded-[5px] border border-border bg-background p-2.5">
                {c.status === "Compliant" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                ) : c.status === "Warning" ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-foreground">{c.label}</span>
                    <StatusBadge variant={c.status === "Compliant" ? "outline" : c.status === "Warning" ? "solid" : "solid"} pulse={c.status !== "Compliant"}>
                      {c.status}
                    </StatusBadge>
                  </div>
                  <p className="text-[12px] text-muted-foreground">{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* Personal + employment snapshot */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InfoSection title="Personal Details">
          <InfoRow label="Full Name" value={driver.name} />
          <InfoRow label="City" value={driver.city} />
          <InfoRow label="Phone" value={driver.contact} mono />
          <InfoRow label="Email" value={driver.email} />
          <InfoRow label="Last Active" value={relativeTime(driver.lastActive)} />
        </InfoSection>
        <InfoSection title="Employment Snapshot">
          <InfoRow label="Role" value={driver.role} />
          <InfoRow label="Department" value={driver.department} />
          <InfoRow label="Status" value={driver.status} />
          <InfoRow label="Trips Completed" value={driver.tripsCompleted} mono />
          <InfoRow label="On-Time Rate" value={`${onTimePct}%`} mono />
        </InfoSection>
      </div>
    </div>
  );
}

function ExpiryRow({
  label,
  number,
  expiry,
  badge,
}: {
  label: string;
  number: string;
  expiry?: string;
  badge: { variant: "solid" | "outline" | "muted"; pulse?: boolean; label: string };
}) {
  const days = daysUntil(expiry);
  return (
    <div className="flex items-center justify-between gap-3 rounded-[5px] border border-border bg-background p-2.5">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-foreground">{label}</div>
        <div className="text-[11px] tabular text-muted-foreground">{number}</div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <StatusBadge variant={badge.variant} pulse={badge.pulse}>{badge.label}</StatusBadge>
        {expiry && (
          <span className="text-[11px] tabular text-muted-foreground">
            {formatDate(expiry)}{days !== null ? ` · ${days}d` : ""}
          </span>
        )}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState, useEffect } from "react";
import { StatCard, InfoRow, InfoSection } from "@/components/shared/detail-layout";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge, vehicleStatusBadge } from "@/components/shared/status-badge";
import { ProgressMeter } from "@/components/shared/section-card";
import { useAppStore } from "@/lib/store/app-store";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import type { Vehicle } from "@/lib/types";
import {
  Truck, Gauge, Fuel, Activity, Calendar, MapPin, Navigation,
  ShieldCheck, ArrowUpRight, User, Wrench, Banknote, Coins,
  TrendingUp, TrendingDown, CircleDot, FileText, Award, Receipt,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { formatNumber, relativeTime, vehicleSeed, daysFromNow, formatDate, licenseExpiryBadge } from "../_helpers";

/* ============================================================
   Vehicle360Tab - single-page 360-degree view of a vehicle.
   Combines: RC / Insurance / Fitness / Permit / Pollution details,
   Service History summary, Fuel Efficiency trend, Current Driver,
   Current Trip, Utilization %, Revenue this month, and the
   Cost of Ownership summary.
   ============================================================ */

export function Vehicle360Tab({ vehicle }: { vehicle: Vehicle }) {
    const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();
  const seed = vehicleSeed(vehicle.id);

  const [drivers, setDrivers] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [fuelEntries, setFuelEntries] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/drivers").then((r) => r.ok ? r.json() : { drivers: [] }),
      fetch("/api/trips").then((r) => r.ok ? r.json() : { trips: [] }),
      fetch("/api/fuel-entries").then((r) => r.ok ? r.json() : { fuelEntries: [] }),
      fetch("/api/expenses").then((r) => r.ok ? r.json() : { expenses: [] }),
      fetch("/api/work-orders").then((r) => r.ok ? r.json() : { workOrders: [] }),
    ]).then(([drv, trp, fuel, exp, wo]) => {
      setDrivers(drv.drivers ?? []);
      setTrips(trp.trips ?? []);
      setFuelEntries(fuel.fuelEntries ?? []);
      setExpenses(exp.expenses ?? []);
      setWorkOrders(wo.workOrders ?? []);
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
  const vehicleFuelEntries = useMemo(
    () => fuelEntries.filter((f) => f.vehicle === vehicle.name).sort(
      (a, b) => +new Date(a.date) - +new Date(b.date),
    ),
    [fuelEntries, vehicle.name],
  );
  const vehicleTrips = useMemo(
    () => trips.filter((t) => t.vehicleName === vehicle.name),
    [trips, vehicle.name],
  );
  const vehicleExpenses = useMemo(
    () => expenses.filter((e) => e.vehicle === vehicle.name),
    [expenses, vehicle.name],
  );
  const vehicleWorkOrders = useMemo(
    () => workOrders.filter((w) => w.vehicle === vehicle.name),
    [workOrders, vehicle.name],
  );

  // ===== Synthetic KPIs =====
  const kmThisMonth = vehicle.distanceThisPeriod;
  const tripsThisMonth = 8 + (seed % 22);
  const avgEff = vehicleFuelEntries.length > 0
    ? vehicleFuelEntries.reduce((s, f) => s + f.efficiency, 0) / vehicleFuelEntries.length
    : 3.4 + (seed % 4) * 0.6;
  const utilization = 60 + (seed % 38);
  const nextServiceKm = Math.max(0, 20000 - (vehicle.currentMeter % 20000));

  // Revenue this month - deterministic from trips.
  const revenueThisMonth = vehicleTrips
    .filter((t) => +new Date(t.createdDate) > Date.now() - 30 * 86400000)
    .reduce((s, t) => s + t.freightAmount, 0);
  const revenueLifetime = vehicleTrips.reduce((s, t) => s + t.freightAmount, 0);

  // ===== Compliance document details (deterministic per vehicle) =====
  const rcExpiry = new Date(Date.now() + ((seed % 600) + 30) * 86400000).toISOString();
  const rcIssue = new Date(Date.now() - ((seed % 1095) + 365) * 86400000).toISOString();
  const insuranceExpiry = new Date(Date.now() + ((seed % 280) - 60) * 86400000).toISOString();
  const insuranceIssue = new Date(Date.now() - ((seed % 365) + 100) * 86400000).toISOString();
  const fitnessExpiry = new Date(Date.now() + ((seed % 540) - 90) * 86400000).toISOString();
  const fitnessIssue = new Date(Date.now() - ((seed % 730) + 365) * 86400000).toISOString();
  const permitExpiry = new Date(Date.now() + ((seed % 365) + 30) * 86400000).toISOString();
  const permitIssue = new Date(Date.now() - ((seed % 365) + 1) * 86400000).toISOString();
  const pucExpiry = new Date(Date.now() + ((seed % 180) - 30) * 86400000).toISOString();
  const pucIssue = new Date(Date.now() - ((seed % 90) + 30) * 86400000).toISOString();

  const rcBadge = licenseExpiryBadge(rcExpiry);
  const insBadge = licenseExpiryBadge(insuranceExpiry);
  const fitBadge = licenseExpiryBadge(fitnessExpiry);
  const permBadge = licenseExpiryBadge(permitExpiry);
  const pucBadge = licenseExpiryBadge(pucExpiry);

  // ===== Cost of Ownership summary (deterministic per vehicle) =====
  const acquisitionCost = 2800000 + (seed % 12) * 180000;
  const fuelLifetime = vehicleFuelEntries.reduce((s, f) => s + f.totalCost, 0)
    + Math.round(vehicle.currentMeter * (12 + (seed % 4)) * 0.8);
  const maintenanceLifetime = vehicleWorkOrders.reduce((s, w) => s + (w.actualCost ?? w.estimatedCost), 0)
    + Math.round(vehicle.currentMeter * 1.6);
  const insuranceLifetime = Math.round((vehicle.currentMeter / 80000) * 78000);
  const driverLifetime = Math.round((vehicle.currentMeter / 350) * 600);
  const tollLifetime = Math.round(vehicle.currentMeter * 1.1);
  const totalOwnership = acquisitionCost + fuelLifetime + maintenanceLifetime + insuranceLifetime + driverLifetime + tollLifetime;
  const costPerKm = vehicle.currentMeter > 0 ? Math.round((totalOwnership / vehicle.currentMeter) * 100) / 100 : 0;
  const residualValue = Math.round(acquisitionCost * 0.42);
  const depreciation = acquisitionCost - residualValue;

  // Fuel efficiency trend data (last 6 months).
  const effTrend = useMemo(() => {
    const months: { label: string; eff: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startTs = d.getTime();
      const endTs = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).getTime();
      const monthEntries = vehicleFuelEntries.filter((f) => {
        const t = +new Date(f.date);
        return t >= startTs && t < endTs;
      });
      const avg = monthEntries.length > 0
        ? Math.round((monthEntries.reduce((s, f) => s + f.efficiency, 0) / monthEntries.length) * 10) / 10
        : 0;
      months.push({
        label: d.toLocaleDateString("en-IN", { month: "short" }),
        eff: avg || Math.round((3.6 + (i % 3) * 0.4) * 10) / 10,
      });
    }
    return months;
  }, [vehicleFuelEntries]);

  // Cost-of-ownership breakdown (for the stacked bar).
  const costItems = [
    { label: "Acquisition", value: acquisitionCost },
    { label: "Fuel", value: fuelLifetime },
    { label: "Maintenance", value: maintenanceLifetime },
    { label: "Insurance", value: insuranceLifetime },
    { label: "Driver", value: driverLifetime },
    { label: "Toll", value: tollLifetime },
  ];
  const costTotal = costItems.reduce((s, c) => s + c.value, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* ===== KPI strip ===== */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total KM" value={formatNumber(vehicle.currentMeter)} icon={<Gauge className="h-4 w-4" />} hint="lifetime odometer" />
        <StatCard label="Revenue (Month)" value={`₹${(revenueThisMonth / 100000).toFixed(1)}L`} icon={<Banknote className="h-4 w-4" />} hint={`${tripsThisMonth} trips`} />
        <StatCard label="Fuel Efficiency" value={`${avgEff.toFixed(1)} km/L`} icon={<Fuel className="h-4 w-4" />} hint="fleet avg 3.8" />
        <StatCard label="Utilization" value={`${utilization}%`} icon={<Activity className="h-4 w-4" />} hint="of 30 days" />
        <StatCard label="Cost / km" value={`₹${costPerKm}`} icon={<Coins className="h-4 w-4" />} hint="lifetime TCO" />
      </div>

      {/* ===== Compliance Documents (RC, Insurance, Fitness, Permit, PUC) ===== */}
      <SectionCard
        title="Statutory Documents"
        description="RC, Insurance, Fitness, Permit, and PUC details with expiry countdowns."
        icon={<ShieldCheck className="h-4 w-4" />}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ComplianceCard
            label="RC Book"
            number={`RC-${vehicle.licensePlate.replace(/\s+/g, "")}`}
            issue={rcIssue}
            expiry={rcExpiry}
            badge={rcBadge}
            authority="RTO"
          />
          <ComplianceCard
            label="Insurance Policy"
            number={`POL-${(seed * 313).toString().padStart(8, "0")}`}
            issue={insuranceIssue}
            expiry={insuranceExpiry}
            badge={insBadge}
            authority={["United India", "Oriental", "New India", "ICICI Lombard"][seed % 4]}
            premium={28000 + (seed % 8) * 1200}
          />
          <ComplianceCard
            label="Fitness Certificate"
            number={`FIT-${(seed * 211).toString().padStart(6, "0")}`}
            issue={fitnessIssue}
            expiry={fitnessExpiry}
            badge={fitBadge}
            authority="RTO"
          />
          <ComplianceCard
            label="National Permit"
            number={`NP-${(seed * 411).toString().padStart(7, "0")}`}
            issue={permitIssue}
            expiry={permitExpiry}
            badge={permBadge}
            authority="MoRTH"
          />
          <ComplianceCard
            label="Pollution (PUC)"
            number={`PUC-${(seed * 137).toString().padStart(6, "0")}`}
            issue={pucIssue}
            expiry={pucExpiry}
            badge={pucBadge}
            authority="Authorised PUC Centre"
          />
          <ComplianceCard
            label="Road Tax Receipt"
            number={`TAX-${(seed * 711).toString().padStart(7, "0")}`}
            issue={permitIssue}
            expiry={undefined}
            badge={{ variant: "muted", label: "Paid" }}
            authority="RTO"
          />
        </div>
      </SectionCard>

      {/* ===== Current Driver + Current Trip ===== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Current Driver" icon={<User className="h-4 w-4" />}>
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
                  <div className="text-[11px] text-muted-foreground">{currentDriver.email}</div>
                </div>
                <StatusBadge variant="outline">{currentDriver.role}</StatusBadge>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border pt-3">
                <InfoRow label="License" value={currentDriver.licenseNumber} mono />
                <InfoRow label="License Expiry" value={formatDate(currentDriver.licenseExpiry)} mono />
                <InfoRow label="Rating" value={`${currentDriver.rating.toFixed(1)} / 5.0`} mono />
                <InfoRow label="Trips Done" value={currentDriver.tripsCompleted} mono />
                <InfoRow label="On-Time Rate" value={`${currentDriver.onTimeRate}%`} mono />
                <InfoRow label="Last Active" value={relativeTime(currentDriver.lastActive)} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
              <User className="h-6 w-6 text-muted-foreground" />
              <p className="text-[13px] font-medium text-foreground">No driver assigned</p>
              <p className="text-[12px] text-muted-foreground">Assign a driver from the Drivers module.</p>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Current Trip" icon={<Truck className="h-4 w-4" />}>
          {currentTrip ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <button
                    onClick={() => goToDetail("trips", currentTrip.tripId)}
                    className="text-[14px] font-medium text-foreground hover:underline inline-flex items-center gap-1"
                  >
                    {currentTrip.tripId}
                    <ArrowUpRight className="h-3 w-3" />
                  </button>
                  <div className="text-[12px] tabular text-muted-foreground">{currentTrip.lrNumber}</div>
                  <div className="text-[12px] text-foreground">
                    {currentTrip.origin} <span className="text-muted-foreground">→</span> {currentTrip.destination}
                  </div>
                </div>
                <StatusBadge variant="solid" pulse>{currentTrip.status}</StatusBadge>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border pt-3">
                <InfoRow label="Distance" value={`${formatNumber(currentTrip.distanceKm)} km`} mono />
                <InfoRow label="Freight" value={`₹${currentTrip.freightAmount.toLocaleString("en-IN")}`} mono />
                <InfoRow label="Customer" value={currentTrip.customer} />
                <InfoRow label="Consignee" value={currentTrip.consignee} />
                <InfoRow label="eWay Bill" value={currentTrip.eWayBill ?? "-"} mono />
                <InfoRow label="Expected" value={formatDate(currentTrip.expectedDelivery)} mono />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
              <Truck className="h-6 w-6 text-muted-foreground" />
              <p className="text-[13px] font-medium text-foreground">Vehicle idle in yard</p>
              <p className="text-[12px] text-muted-foreground">No active trip assigned right now.</p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ===== Fuel Efficiency Trend ===== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Fuel Efficiency Trend"
          description="Monthly average km/L vs fleet benchmark."
          icon={<TrendingUp className="h-4 w-4" />}
          className="lg:col-span-2"
        >
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={effTrend} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} domain={[2.5, 5]} tickFormatter={(v) => `${v}`} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 5, fontSize: 11 }}
                  formatter={(v: number) => [`${v} km/L`, "Avg"]}
                  labelStyle={{ color: "var(--muted-foreground)" }}
                />
                <Line type="monotone" dataKey="eff" stroke="var(--foreground)" strokeWidth={1.5} dot={{ r: 3, fill: "var(--foreground)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Utilization"
          description="Days in operation vs idle this month."
          icon={<Activity className="h-4 w-4" />}
        >
          <div className="flex flex-col gap-3">
            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-[11px] text-muted-foreground">Operating days</span>
                <span className="text-[14px] font-medium tabular">{Math.round(utilization * 0.3)} / 30</span>
              </div>
              <ProgressMeter value={utilization} max={100} tone="solid" />
            </div>
            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-[11px] text-muted-foreground">Idle days</span>
                <span className="text-[14px] font-medium tabular">{30 - Math.round(utilization * 0.3)} / 30</span>
              </div>
              <ProgressMeter value={100 - utilization} max={100} tone="muted" />
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Trips</div>
                <div className="text-[18px] font-medium tabular">{tripsThisMonth}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">KM This Month</div>
                <div className="text-[18px] font-medium tabular">{formatNumber(kmThisMonth)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Fuel Cost</div>
                <div className="text-[18px] font-medium tabular">₹{(fuelLifetime / 100000).toFixed(1)}L</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue</div>
                <div className="text-[18px] font-medium tabular">₹{(revenueLifetime / 100000).toFixed(1)}L</div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ===== Cost of Ownership summary ===== */}
      <SectionCard
        title="Cost of Ownership"
        description="Lifetime cost breakdown - acquisition + fuel + maintenance + insurance + driver + toll."
        icon={<Coins className="h-4 w-4" />}
        badge={
          <span className="tabular text-[11px] text-muted-foreground">
            ₹{costPerKm}/km lifetime
          </span>
        }
      >
        {/* Headline tiles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <TcoTile
            label="Acquisition"
            value={`₹${(acquisitionCost / 100000).toFixed(1)}L`}
            sub={vehicle.ownership}
            icon={<Banknote className="h-3.5 w-3.5" />}
          />
          <TcoTile
            label="Total Cost (Lifetime)"
            value={`₹${(totalOwnership / 100000).toFixed(1)}L`}
            sub={`${formatNumber(vehicle.currentMeter)} km`}
            icon={<Coins className="h-3.5 w-3.5" />}
          />
          <TcoTile
            label="Residual Value"
            value={`₹${(residualValue / 100000).toFixed(1)}L`}
            sub="42% of acquisition"
            icon={<TrendingUp className="h-3.5 w-3.5" />}
          />
          <TcoTile
            label="Depreciation"
            value={`₹${(depreciation / 100000).toFixed(1)}L`}
            sub="to date"
            icon={<TrendingDown className="h-3.5 w-3.5" />}
          />
        </div>

        {/* Cost breakdown bar + legend */}
        <div className="mt-4 border-t border-border pt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Cost Composition
            </span>
            <span className="text-[11px] tabular text-muted-foreground">
              Total ₹{(totalOwnership / 100000).toFixed(1)}L
            </span>
          </div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-[3px] border border-border">
            {costItems.map((c, i) => {
              const pct = costTotal > 0 ? Math.round((c.value / costTotal) * 100) : 0;
              const shades = ["bg-foreground", "bg-foreground/85", "bg-foreground/70", "bg-foreground/55", "bg-foreground/40", "bg-foreground/25"];
              return (
                <div
                  key={c.label}
                  className={shades[i % shades.length]}
                  style={{ width: `${pct}%` }}
                  title={`${c.label}: ₹${(c.value / 100000).toFixed(1)}L (${pct}%)`}
                />
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {costItems.map((c, i) => {
              const pct = costTotal > 0 ? Math.round((c.value / costTotal) * 100) : 0;
              const shades = ["bg-foreground", "bg-foreground/85", "bg-foreground/70", "bg-foreground/55", "bg-foreground/40", "bg-foreground/25"];
              return (
                <div key={c.label} className="rounded-[4px] border border-border bg-background px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 shrink-0 rounded-[2px] ${shades[i % shades.length]}`} />
                    <span className="truncate text-[11px] text-muted-foreground">{c.label}</span>
                  </div>
                  <div className="mt-1 text-[12px] tabular font-medium text-foreground">
                    ₹{(c.value / 100000).toFixed(1)}L
                  </div>
                  <div className="text-[10px] tabular text-muted-foreground">{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cost per km vs fleet benchmark */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-[5px] border border-border bg-background px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Cost / km (this vehicle)</div>
            <div className="text-[18px] font-medium tabular">₹{costPerKm}</div>
          </div>
          <div className="rounded-[5px] border border-border bg-background px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Fleet avg cost / km</div>
            <div className="text-[18px] font-medium tabular">₹{14.7}</div>
          </div>
          <div className="rounded-[5px] border border-border bg-background px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Variance</div>
            <div className="text-[18px] font-medium tabular">
              {costPerKm > 14.7 ? "+" : ""}{(costPerKm - 14.7).toFixed(1)} / km
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ===== Service history summary + recent expenses ===== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Service History Summary"
          description="Last 6 service entries with total spend."
          icon={<Wrench className="h-4 w-4" />}
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <InfoRow label="Total Services" value={String(vehicleWorkOrders.length)} mono />
            <InfoRow label="Open Work Orders" value={String(vehicleWorkOrders.filter((w) => w.status !== "Completed").length)} mono />
            <InfoRow label="Avg Cost / Service" value={`₹${vehicleWorkOrders.length > 0 ? Math.round(vehicleWorkOrders.reduce((s, w) => s + (w.actualCost ?? w.estimatedCost), 0) / vehicleWorkOrders.length).toLocaleString("en-IN") : 0}`} mono />
            <InfoRow label="Next Service" value={`${formatNumber(nextServiceKm)} km`} mono />
            <InfoRow label="Last Service" value={vehicleWorkOrders[0] ? formatDate(vehicleWorkOrders[0].createdDate) : "-"} />
            <InfoRow label="Last Service Type" value={vehicleWorkOrders[0]?.type ?? "-"} />
          </div>
        </SectionCard>

        <SectionCard
          title="Recent Expenses"
          description="Latest expense entries linked to this vehicle."
          icon={<Receipt className="h-4 w-4" />}
          flush
          bodyClassName="divide-y divide-border max-h-[240px] overflow-y-auto scrollbar-thin"
        >
          {vehicleExpenses.length === 0 ? (
            <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
              No expenses recorded yet.
            </div>
          ) : (
            vehicleExpenses.slice(0, 6).map((e) => (
              <div key={e.id} className="px-4 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12px] font-medium text-foreground">{e.description}</span>
                  <span className="tabular text-[12px] font-medium">₹{e.amount.toLocaleString("en-IN")}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{e.category}</span>
                  <span>·</span>
                  <span className="tabular">{formatDate(e.date)}</span>
                  <span>·</span>
                  <span>{e.paymentMode}</span>
                </div>
              </div>
            ))
          )}
        </SectionCard>
      </div>
    </div>
  );
}

/* ============================================================
   ComplianceCard - compact compliance document tile.
   ============================================================ */
function ComplianceCard({
  label,
  number,
  issue,
  expiry,
  badge,
  authority,
  premium,
}: {
  label: string;
  number: string;
  issue: string;
  expiry?: string;
  badge: { variant: "solid" | "outline" | "muted"; pulse?: boolean; label: string };
  authority: string;
  premium?: number;
}) {
  return (
    <div className="rounded-[5px] border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-0.5 truncate text-[12px] font-medium tabular text-foreground">{number}</div>
        </div>
        <StatusBadge variant={badge.variant} pulse={badge.pulse}>{badge.label}</StatusBadge>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Issued</span>
          <span className="tabular text-foreground">{formatDate(issue)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Expiry</span>
          <span className="tabular text-foreground">{expiry ? formatDate(expiry) : "-"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Authority</span>
          <span className="text-foreground">{authority}</span>
        </div>
        {premium !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Premium</span>
            <span className="tabular text-foreground">₹{premium.toLocaleString("en-IN")}/yr</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   TcoTile - compact Cost-of-Ownership metric tile.
   ============================================================ */
function TcoTile({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[5px] border border-border bg-background px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[18px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {sub && <span className="truncate text-[10px] text-muted-foreground tabular">{sub}</span>}
    </div>
  );
}

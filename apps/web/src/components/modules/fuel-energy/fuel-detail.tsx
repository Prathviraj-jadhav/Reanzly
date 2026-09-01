"use client";
import { useState, useMemo, useEffect } from "react";
import { DetailLayout, InfoRow, InfoSection, StatCard } from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import type { FuelEntry, Vehicle, Driver } from "@/lib/types";
import {
  Pencil,
  Trash2,
  Truck,
  User,
  Fuel,
  Coins,
  Gauge,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatDate,
  formatDateTime,
  formatINR,
  formatNumber,
  relativeTime,
  efficiencyVariant,
} from "./_helpers";
import { cn } from "@/lib/utils";
import { EditFuelLogDrawer } from "./edit-fuel-log-drawer";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "comparison", label: "Efficiency Comparison" },
];

interface FuelDetailProps {
  fuelId: string;
  fuelEntries: FuelEntry[];
  onUpdate: (id: string, data: Partial<FuelEntry>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export function FuelDetail({ fuelId, fuelEntries, onUpdate: onUpdateReal, onDelete }: FuelDetailProps) {
  const { navigateCompat: navigate, navigateDetailCompat: navigateDetail } = useNavigateCompat();
  const [activeTab, setActiveTab] = useState("overview");
  const entry = fuelEntries.find((f) => f.id === fuelId);
  const [editing, setEditing] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  useEffect(() => {
    Promise.all([
      fetch("/api/vehicles").then((r) => (r.ok ? r.json() : { vehicles: [] })),
      fetch("/api/drivers").then((r) => (r.ok ? r.json() : { drivers: [] })),
    ]).then(([v, d]) => {
      setVehicles(v.vehicles ?? []);
      setDrivers(d.drivers ?? []);
    });
  }, []);

  const handleUpdate = (id: string, data: Partial<FuelEntry>) => {
    onUpdateReal(id, data);
  };

  // Vehicle history for comparison
  const vehicleHistory = useMemo(() => {
    if (!entry) return [];
    return fuelEntries.filter((f) => f.vehicle === entry.vehicle)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [entry, fuelEntries]);

  const vehicleAvgEfficiency = useMemo(() => {
    if (!entry) return 0;
    const vEntries = fuelEntries.filter((f) => f.vehicle === entry.vehicle);
    if (vEntries.length === 0) return entry.efficiency;
    return vEntries.reduce((s, f) => s + f.efficiency, 0) / vEntries.length;
  }, [entry, fuelEntries]);

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Fuel entry <span className="tabular">{fuelId}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => navigate("fuel-energy")}>Back to Fuel & Energy</Btn>
      </div>
    );
  }

  const vehicle = vehicles.find((v) => v.name === entry.vehicle);
  const driver = drivers.find((d) => d.name === entry.driver);
  const fleetAvgEff = fuelEntries.length > 0
    ? fuelEntries.reduce((s, f) => s + f.efficiency, 0) / fuelEntries.length
    : 0;
  const effVar = entry.efficiency - vehicleAvgEfficiency;
  const effPctChange = vehicleAvgEfficiency > 0 ? (effVar / vehicleAvgEfficiency) * 100 : 0;

  const actions = (
    <>
      <Btn icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(true)} aria-label="Edit">
        <span className="hidden sm:inline">Edit</span>
      </Btn>
      <Btn
        variant="primary"
        icon={<Trash2 className="h-3.5 w-3.5" />}
        onClick={async () => {
          const ok = await onDelete(entry.id);
          if (!ok) return;
          toast(`Deleted fuel entry`, { description: `${entry.vehicle} · ${formatDate(entry.date)}` });
          navigate("fuel-energy");
        }}
      >
        Delete
      </Btn>
    </>
  );

  const quickActions = [
    { label: "Print Receipt", onClick: () => toast("Generating PDF", { description: `${entry.vehicle} · ${formatDate(entry.date)}` }) },
    { label: "Mark as Verified", onClick: () => toast.success("Entry verified", { description: `${entry.vehicle} · ${formatDate(entry.date)}` }) },
    { label: "Duplicate Entry", onClick: () => toast("Entry duplicated", { description: `${entry.vehicle} · ${formatDate(entry.date)}` }) },
  ];

  return (
    <DetailLayout
      title={`${entry.vehicle} · ${formatDate(entry.date)}`}
      subtitle={`${entry.station} · ${formatNumber(entry.quantity, 1)} L · ${entry.fuelType}`}
      badges={
        <>
          <StatusBadge variant="outline">{entry.fuelType}</StatusBadge>
          {entry.anomaly && (
            <StatusBadge variant="solid" pulse><Sparkles className="h-3 w-3" />Rean Flag</StatusBadge>
          )}
        </>
      }
      meta={
        <>
          <span className="flex items-center gap-1"><Coins className="h-3 w-3" />{formatINR(entry.totalCost)}</span>
          <span className="tabular">{formatDateTime(entry.date)}</span>
          <span className="flex items-center gap-1 tabular"><Gauge className="h-3 w-3" />{formatNumber(entry.odometer)} km</span>
          <span className="tabular">{formatNumber(entry.efficiency, 1)} km/L</span>
        </>
      }
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={actions}
      quickActions={quickActions}
    >
      {/* ===== Overview ===== */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Quantity" value={`${formatNumber(entry.quantity, 1)} L`} icon={<Fuel className="h-3.5 w-3.5" />} />
            <StatCard label="Unit Price" value={`₹${formatNumber(entry.unitPrice, 2)}`} icon={<Coins className="h-3.5 w-3.5" />} />
            <StatCard label="Total Cost" value={formatINR(entry.totalCost)} icon={<Coins className="h-3.5 w-3.5" />} />
            <StatCard label="Efficiency" value={`${formatNumber(entry.efficiency, 1)} km/L`} icon={<Gauge className="h-3.5 w-3.5" />} />
          </div>

          {entry.anomaly && (
            <div className="rounded-[6px] border border-foreground/30 bg-foreground/[0.04] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] bg-foreground text-background">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground">Rean Anomaly Detected</span>
                    <StatusBadge variant="solid" pulse>Investigate</StatusBadge>
                  </div>
                  <p className="text-[12px] text-foreground mt-1">{entry.anomalyNote || "Anomaly flagged by Rean engine - pattern deviation detected."}</p>
                  <Btn size="sm" variant="outline" className="mt-2" icon={<Sparkles className="h-3 w-3" />} onClick={() => toast.success("Investigation started", { description: "Rean will trace cause and surface recommendations." })}>
                    Investigate with Rean
                  </Btn>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InfoSection title="Fuel Entry Details">
              <InfoRow label="Date / Time" value={<span className="tabular">{formatDateTime(entry.date)}</span>} />
              <InfoRow label="Vehicle" value={entry.vehicle} />
              <InfoRow label="Driver" value={entry.driver || "-"} />
              <InfoRow label="Station" value={entry.station} />
              <InfoRow label="Fuel Type" value={entry.fuelType} />
              <InfoRow label="Quantity" value={<span className="tabular">{formatNumber(entry.quantity, 1)} L</span>} />
              <InfoRow label="Unit Price" value={<span className="tabular">₹{formatNumber(entry.unitPrice, 2)}/L</span>} />
              <InfoRow label="Total Cost" value={<span className="tabular">{formatINR(entry.totalCost)}</span>} />
              <InfoRow label="Odometer" value={<span className="tabular">{formatNumber(entry.odometer)} km</span>} />
              <InfoRow label="Efficiency" value={<span className="tabular">{formatNumber(entry.efficiency, 1)} km/L</span>} />
            </InfoSection>

            <InfoSection title="Linked Entities">
              <div className="px-4 py-3 flex flex-col gap-3">
                <button
                  onClick={() => vehicle && navigateDetail("vehicles", vehicle.id)}
                  className="flex items-center justify-between gap-3 rounded-[5px] border border-border px-3 py-2.5 hover:bg-accent transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] bg-muted">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-foreground truncate">{entry.vehicle}</div>
                      <div className="text-[11px] text-muted-foreground tabular truncate">{vehicle?.licensePlate || "-"} · {vehicle?.type || "-"}</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>

                {driver && (
                  <button
                    onClick={() => navigateDetail("drivers-staff", driver.id)}
                    className="flex items-center justify-between gap-3 rounded-[5px] border border-border px-3 py-2.5 hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] bg-muted">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-foreground truncate">{driver.name}</div>
                        <div className="text-[11px] text-muted-foreground tabular truncate">License: {driver.licenseNumber || "-"}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                )}

                <div className="rounded-[5px] border border-border px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] bg-muted">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[13px] font-medium text-foreground">Receipt</div>
                      <div className="text-[11px] text-muted-foreground">Cash transaction · no receipt on file</div>
                    </div>
                  </div>
                </div>
              </div>
            </InfoSection>
          </div>
        </div>
      )}

      {/* ===== Efficiency Comparison ===== */}
      {activeTab === "comparison" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="This Entry" value={`${formatNumber(entry.efficiency, 1)} km/L`} icon={<Gauge className="h-3.5 w-3.5" />} />
            <StatCard label="Vehicle Avg" value={`${formatNumber(vehicleAvgEfficiency, 1)} km/L`} icon={<TrendingUp className="h-3.5 w-3.5" />} />
            <StatCard
              label="Fleet Avg"
              value={`${formatNumber(fleetAvgEff, 1)} km/L`}
              icon={<TrendingUp className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="vs Vehicle Avg"
              value={`${effVar > 0 ? "+" : ""}${formatNumber(effVar, 1)} km/L`}
              icon={effVar >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="rounded-[6px] border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Efficiency Variance</span>
              <StatusBadge variant={efficiencyVariant(entry.efficiency, vehicleAvgEfficiency)}>
                {effPctChange > 0 ? "+" : ""}{formatNumber(effPctChange, 1)}% vs vehicle avg
              </StatusBadge>
            </div>
            <div className="relative h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "absolute inset-y-0 left-0",
                  effVar >= 0 ? "bg-foreground" : "bg-foreground/60",
                )}
                style={{
                  width: `${Math.min(100, Math.max(0, (entry.efficiency / (vehicleAvgEfficiency * 1.3 || 1)) * 100))}%`,
                }}
              />
              <div
                className="absolute inset-y-0 w-px bg-foreground"
                style={{ left: `${(vehicleAvgEfficiency / (vehicleAvgEfficiency * 1.3 || 1)) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground tabular">
              <span>0 km/L</span>
              <span>Vehicle avg: {formatNumber(vehicleAvgEfficiency, 1)} km/L</span>
              <span>{formatNumber(vehicleAvgEfficiency * 1.3, 1)} km/L</span>
            </div>
          </div>

          <InfoSection title="Recent Refuels for This Vehicle">
            <div className="px-4 py-3">
              <div className="overflow-x-auto scrollbar-thin -mx-1">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                      <th className="px-2 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Qty</th>
                      <th className="px-2 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Cost</th>
                      <th className="px-2 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Odometer</th>
                      <th className="px-2 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Efficiency</th>
                      <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {vehicleHistory.map((h) => (
                      <tr key={h.id} className={cn("hover:bg-accent/40 transition-colors", h.id === entry.id && "bg-accent/30")}>
                        <td className="px-2 py-2 text-[12px] tabular text-muted-foreground">{formatDate(h.date)}</td>
                        <td className="px-2 py-2 text-[12px] tabular text-right">{formatNumber(h.quantity, 1)} L</td>
                        <td className="px-2 py-2 text-[12px] tabular text-right">{formatINR(h.totalCost)}</td>
                        <td className="px-2 py-2 text-[12px] tabular text-right text-muted-foreground">{formatNumber(h.odometer)} km</td>
                        <td className="px-2 py-2 text-[12px] tabular text-right">{formatNumber(h.efficiency, 1)} km/L</td>
                        <td className="px-2 py-2 text-center">
                          {h.anomaly ? <Sparkles className="h-3.5 w-3.5 inline-block" /> : <span className="text-muted-foreground">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </InfoSection>
        </div>
      )}

      <EditFuelLogDrawer
        open={editing}
        entry={entry}
        onClose={() => setEditing(false)}
        onUpdate={handleUpdate}
      />
    </DetailLayout>
  );
}

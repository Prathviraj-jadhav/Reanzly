"use client";
import { useState, useMemo } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  Search,
  ChevronRight,
  Truck,
  Coins,
  Gauge,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import type { FuelEntry, Vehicle } from "@/lib/types";
import { useAppStore } from "@/lib/store/app-store";
import { formatDate, formatINR, formatNumber, relativeTime } from "./_helpers";

interface AnomalyAlertsProps {
  fuelEntries: FuelEntry[];
  vehicles: Vehicle[];
  onBack: () => void;
}

const ANOMALY_TYPES = ["Overfill", "Mileage Gap", "Price Outlier", "Duplicate Entry", "Off-hours Refuel"];

export function AnomalyAlerts({ fuelEntries, vehicles, onBack }: AnomalyAlertsProps) {
  const { navigateDetail } = useAppStore();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const anomalies = useMemo(() => {
    return fuelEntries.filter((f) => f.anomaly).map((f, i) => ({
      ...f,
      anomalyType: ANOMALY_TYPES[i % ANOMALY_TYPES.length],
    }));
  }, [fuelEntries]);

  const filtered = useMemo(() => {
    let r = anomalies;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (f) =>
          f.vehicle.toLowerCase().includes(q) ||
          (f.anomalyNote || "").toLowerCase().includes(q) ||
          f.station.toLowerCase().includes(q),
      );
    }
    if (typeFilter) r = r.filter((f) => f.anomalyType === typeFilter);
    return r;
  }, [anomalies, search, typeFilter]);

  const totalAnomalies = anomalies.length;
  const totalImpact = anomalies.reduce((s, f) => s + f.totalCost, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <button
          onClick={onBack}
          className="flex h-7 w-fit items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Fuel List
        </button>
        <div>
          <h1 className="text-[22px] font-medium leading-tight tracking-tight text-foreground flex items-center gap-2">
            Anomaly Alerts
            <Sparkles className="h-5 w-5" />
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            All Rean-flagged fuel entries. Investigate each one to confirm or dismiss the anomaly.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Total Anomalies" value={String(totalAnomalies)} />
        <KpiTile icon={<Coins className="h-3.5 w-3.5" />} label="Total Impact" value={formatINR(totalImpact)} hint="across flagged entries" />
        <KpiTile icon={<Truck className="h-3.5 w-3.5" />} label="Vehicles Affected" value={String(new Set(anomalies.map((a) => a.vehicle)).size)} />
        <KpiTile icon={<Gauge className="h-3.5 w-3.5" />} label="Anomaly Types" value={String(ANOMALY_TYPES.length)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex h-8 w-full max-w-xs items-center">
          <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vehicle, station, note…"
            className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setTypeFilter("")}
            className={
              "flex h-8 items-center rounded-[5px] border px-2.5 text-[12px] font-medium transition-colors " +
              (!typeFilter ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:bg-accent")
            }
          >
            All
          </button>
          {ANOMALY_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={
                "flex h-8 items-center rounded-[5px] border px-2.5 text-[12px] font-medium transition-colors " +
                (typeFilter === t ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:bg-accent")
              }
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="text-[12px] text-muted-foreground tabular">
          {filtered.length} {filtered.length === 1 ? "anomaly" : "anomalies"}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="rounded-[6px] border border-border bg-card p-12 flex flex-col items-center justify-center gap-2 text-center">
            <Sparkles className="h-6 w-6 text-muted-foreground" />
            <p className="text-[13px] text-foreground font-medium">No anomalies found</p>
            <p className="text-[12px] text-muted-foreground">All fuel entries look clean for this filter.</p>
          </div>
        ) : (
          filtered.map((a) => {
            const v = vehicles.find((x) => x.name === a.vehicle);
            return (
              <div key={a.id} className="rounded-[6px] border border-foreground/30 bg-foreground/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] bg-foreground text-background">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge variant="solid" pulse>{a.anomalyType}</StatusBadge>
                        <span className="text-[12px] text-muted-foreground tabular">{formatDate(a.date)} · {relativeTime(a.date)}</span>
                      </div>
                      <p className="text-[13px] text-foreground mt-1.5">{a.anomalyNote}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground tabular">
                        <button
                          onClick={() => v && navigateDetail("vehicles", v.id)}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          <Truck className="h-3 w-3" />{a.vehicle}
                        </button>
                        <span>{a.station}</span>
                        <span>{formatNumber(a.quantity, 1)} L @ ₹{formatNumber(a.unitPrice, 2)}/L</span>
                        <span className="text-foreground font-medium">{formatINR(a.totalCost)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Btn size="sm" variant="outline" onClick={() => toast(`Anomaly dismissed`, { description: a.vehicle })}>
                      Dismiss
                    </Btn>
                    <Btn size="sm" variant="primary" icon={<Sparkles className="h-3 w-3" />} onClick={() => navigateDetail("fuel-energy", a.id)}>
                      Investigate
                    </Btn>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Rean scans every fuel entry against the vehicle's history. {totalAnomalies} anomalies flagged · {ANOMALY_TYPES.length} anomaly types tracked
      </p>
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

"use client";

import { useState, useMemo } from "react";
import { useDriverStore, type DriverActivityType } from "@/lib/store/driver-store";
import { activityTypeLabel, relativeTime, formatINR, fmtCoord, photoSrc } from "./_helpers";
import {
  PackageCheck,
  Fuel,
  Receipt,
  AlertTriangle,
  ClipboardCheck,
  StickyNote,
  Navigation,
  Clock,
  MapPin,
  ImageIcon,
  X,
  RefreshCw,
  Loader2,
  Filter,
  Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ICONS: Record<string, typeof Camera> = {
  POD: PackageCheck,
  FUEL_LOG: Fuel,
  EXPENSE: Receipt,
  ISSUE: AlertTriangle,
  INSPECTION: ClipboardCheck,
  NOTE: StickyNote,
  STATUS_UPDATE: Navigation,
  CHECK_IN: Clock,
  CHECK_OUT: Clock,
};

const FILTERS: { id: DriverActivityType | "ALL"; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "POD", label: "POD" },
  { id: "FUEL_LOG", label: "Fuel" },
  { id: "EXPENSE", label: "Expense" },
  { id: "ISSUE", label: "Issues" },
  { id: "INSPECTION", label: "Inspect" },
  { id: "STATUS_UPDATE", label: "Status" },
];

export function DriverRecords() {
  const { activities, syncing, syncToBackend, lastSyncError, locationPings } = useDriverStore();
  const [filter, setFilter] = useState<DriverActivityType | "ALL">("ALL");
  const [preview, setPreview] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filter === "ALL" ? activities : activities.filter((a) => a.type === filter)),
    [activities, filter]
  );

  // Compute summary stats
  const stats = useMemo(() => {
    let fuel = 0;
    let fuelL = 0;
    let expense = 0;
    let pod = 0;
    let issues = 0;
    for (const a of activities) {
      if (a.type === "FUEL_LOG") {
        fuel += (a.payload.amount as number) || 0;
        fuelL += (a.payload.litres as number) || 0;
      } else if (a.type === "EXPENSE") {
        expense += (a.payload.amount as number) || 0;
      } else if (a.type === "POD") {
        pod++;
      } else if (a.type === "ISSUE") {
        issues++;
      }
    }
    return { fuel, fuelL, expense, pod, issues };
  }, [activities]);

  const unsyncedCount = activities.filter((a) => !a.synced).length;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight">Records</h1>
          <p className="text-[12px] text-muted-foreground tabular-nums">
            {activities.length} total · {locationPings.length} GPS pings
          </p>
        </div>
        <button
          onClick={() => {
            void syncToBackend();
            toast.message("Syncing…");
          }}
          disabled={syncing || unsyncedCount === 0}
          className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[11px] font-medium hover:bg-accent disabled:opacity-50"
        >
          {syncing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {unsyncedCount > 0 ? `Sync ${unsyncedCount}` : "Synced"}
        </button>
      </header>

      {lastSyncError && (
        <div className="rounded-[5px] border border-border bg-accent/30 p-2 text-[11px] text-muted-foreground">
          Last sync issue: {lastSyncError}. Will retry.
        </div>
      )}

      {/* Summary tiles */}
      <section className="grid grid-cols-2 gap-2">
        <StatTile label="Fuel Spent" value={formatINR(stats.fuel)} sub={`${stats.fuelL.toFixed(1)} L`} />
        <StatTile label="Expenses" value={formatINR(stats.expense)} sub="this period" />
        <StatTile label="POD Captured" value={String(stats.pod)} sub="deliveries" />
        <StatTile label="Issues" value={String(stats.issues)} sub="reported" />
      </section>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-1">
        <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "h-7 shrink-0 rounded-full border px-2.5 text-[11px] font-medium transition-colors",
              filter === f.id
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Records list */}
      {filtered.length === 0 ? (
        <div className="rounded-[6px] border border-dashed border-border p-8 text-center">
          <ClipboardCheck className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-[13px] font-medium">No records yet</p>
          <p className="text-[11px] text-muted-foreground">
            Capture a POD, log fuel, or report an issue.
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {filtered.map((a) => {
            const Icon = ICONS[a.type] || StickyNote;
            return (
              <li
                key={a.id}
                className="overflow-hidden rounded-[6px] border border-border bg-background"
              >
                <div className="flex items-start gap-3 p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border border-border">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold">{activityTypeLabel(a.type)}</span>
                      <span className="flex items-center gap-1 text-[10px] tabular-nums text-muted-foreground">
                        {!a.synced && (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                            title="Pending sync"
                          />
                        )}
                        {relativeTime(a.createdAt)}
                      </span>
                    </div>
                    {a.note && <p className="mt-0.5 text-[12px] text-muted-foreground">{a.note}</p>}
                    {/* Payload summary */}
                    <PayloadSummary type={a.type} payload={a.payload} />
                    {/* Geo + trip */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] tabular-nums text-muted-foreground">
                      {a.tripId && <span>Trip {a.tripId}</span>}
                      {a.lat != null && a.lng != null && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" />
                          {fmtCoord(a.lat, a.lng)}
                        </span>
                      )}
                    </div>
                  </div>
                  {a.photoDataUrl && (
                    <button
                      onClick={() => setPreview(a.photoDataUrl!)}
                      className="relative shrink-0"
                      aria-label="View photo"
                    >
                      <img
                        src={photoSrc(a.photoDataUrl)}
                        alt="capture"
                        className="h-12 w-12 rounded-[4px] border border-border object-cover"
                      />
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background">
                        <ImageIcon className="h-2.5 w-2.5" />
                      </span>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Photo preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur"
          onClick={() => setPreview(null)}
        >
          <button
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={photoSrc(preview)}
            alt="capture preview"
            className="max-h-[85vh] max-w-full rounded-[6px] border border-border object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[6px] border border-border p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-[15px] font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function PayloadSummary({ type, payload }: { type: DriverActivityType; payload: Record<string, unknown> }) {
  switch (type) {
    case "FUEL_LOG":
      return (
        <p className="mt-0.5 text-[12px] tabular-nums">
          <span className="font-medium">{(payload.litres as number)?.toFixed(2) || "-"} L</span>
          <span className="text-muted-foreground"> · {formatINR((payload.amount as number) || 0)}</span>
          {payload.station ? <span className="text-muted-foreground"> · {payload.station as string}</span> : null}
          {payload.odometer ? <span className="text-muted-foreground"> · {payload.odometer as number} km</span> : null}
        </p>
      );
    case "EXPENSE":
      return (
        <p className="mt-0.5 text-[12px] tabular-nums">
          <span className="font-medium">{formatINR((payload.amount as number) || 0)}</span>
          {payload.category ? <span className="text-muted-foreground"> · {payload.category as string}</span> : null}
        </p>
      );
    case "ISSUE":
      return (
        <p className="mt-0.5 text-[12px]">
          {payload.severity ? <span className="font-medium">{payload.severity as string}</span> : null}
          {payload.category ? <span className="text-muted-foreground"> · {payload.category as string}</span> : null}
        </p>
      );
    case "INSPECTION":
      return (
        <p className="mt-0.5 text-[12px]">
          <span className="font-medium">Result: {payload.result as string}</span>
          {payload.odometer ? <span className="text-muted-foreground tabular-nums"> · {payload.odometer as number} km</span> : null}
        </p>
      );
    case "STATUS_UPDATE":
      return (
        <p className="mt-0.5 text-[12px]">
          <span className="font-medium">→ {payload.status as string}</span>
          {payload.from ? <span className="text-muted-foreground"> from {payload.from as string}</span> : null}
        </p>
      );
    case "CHECK_IN":
    case "CHECK_OUT":
      return null;
    default:
      return null;
  }
}

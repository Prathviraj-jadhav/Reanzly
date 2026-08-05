"use client";

import { useMemo } from "react";
import { Shield, AlertTriangle, ChevronRight, Activity } from "lucide-react";
import type { Vehicle } from "@/lib/types";
import { VEHICLE_MARKER_STYLES, type GeofenceBreach, relativeTime } from "./_helpers";

interface LegendPanelProps {
  vehicles: Vehicle[];
  breaches: GeofenceBreach[];
  onSelectVehicle?: (id: string) => void;
  onOpenGeofences?: () => void;
}

export function LegendPanel({ vehicles, breaches, onSelectVehicle, onOpenGeofences }: LegendPanelProps) {
  const counts = useMemo(() => {
    const c = { Active: 0, Idle: 0, "In Maintenance": 0, Offline: 0 } as Record<string, number>;
    for (const v of vehicles) c[v.status] = (c[v.status] ?? 0) + 1;
    return c;
  }, [vehicles]);

  const recentBreaches = breaches.slice(0, 5);

  return (
    <div className="flex w-full flex-col gap-3 rounded-[6px] border border-border bg-card p-3">
      {/* Status legend */}
      <section>
        <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Status legend
        </h3>
        <ul className="flex flex-col gap-1.5">
          {(["Active", "Idle", "In Maintenance", "Offline"] as const).map((s) => {
            const style = VEHICLE_MARKER_STYLES[s];
            const isFilled = style.fill === "var(--foreground)";
            const isMutedFill = s === "In Maintenance";
            const isMutedStroke = s === "Offline";
            return (
              <li key={s} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="relative inline-flex h-5 w-5 items-center justify-center">
                    <span
                      className={`block rounded-full ${style.pulse ? "fleet-pulse-ring" : ""}`}
                      style={{
                        width: 12,
                        height: 12,
                        backgroundColor: isMutedFill
                          ? "var(--muted-foreground)"
                          : isFilled
                            ? "var(--foreground)"
                            : "transparent",
                        border: `${Math.max(1, style.strokeWidth)}px solid ${
                          isMutedStroke ? "var(--muted-foreground)" : "var(--foreground)"
                        }`,
                      }}
                    />
                  </span>
                  <span className="text-[12px] text-foreground">{s}</span>
                </div>
                <span className="font-mono text-[12px] tabular text-muted-foreground">
                  {counts[s] ?? 0}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Active summary */}
      <section className="rounded-[5px] border border-border bg-background p-2.5">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Active now</span>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-mono text-[24px] tabular leading-none text-foreground">
            {counts.Active ?? 0}
          </span>
          <span className="text-[11px] text-muted-foreground">vehicles in motion</span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
          <div>
            <div className="font-mono text-[14px] tabular text-foreground">{counts.Idle}</div>
            <div className="uppercase tracking-wider text-muted-foreground">Idle</div>
          </div>
          <div>
            <div className="font-mono text-[14px] tabular text-foreground">{counts["In Maintenance"]}</div>
            <div className="uppercase tracking-wider text-muted-foreground">Maint.</div>
          </div>
          <div>
            <div className="font-mono text-[14px] tabular text-foreground">{counts.Offline}</div>
            <div className="uppercase tracking-wider text-muted-foreground">Offline</div>
          </div>
        </div>
      </section>

      {/* Recent geofence breaches */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Recent geofence breaches
          </h3>
          <button
            onClick={onOpenGeofences}
            className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            <Shield className="h-3 w-3" />
            <span>Manage</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        {recentBreaches.length === 0 ? (
          <div className="rounded-[5px] border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
            No breaches in the last 24h.
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {recentBreaches.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => onSelectVehicle?.(b.vehicleName)}
                  className="flex w-full items-start gap-2 rounded-[5px] border border-border bg-background px-2 py-1.5 text-left hover:bg-accent"
                >
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] font-medium text-foreground">
                        {b.event}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        {relativeTime(b.timestamp)}
                      </span>
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">{b.geofenceName}</div>
                    <div className="truncate font-mono text-[10px] text-muted-foreground">
                      {b.licensePlate}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Quick facts footer */}
      <section className="mt-auto border-t border-border pt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Fleet utilization</span>
          <span className="font-mono tabular text-foreground">
            {vehicles.length > 0
              ? `${Math.round(((counts.Active ?? 0) / vehicles.length) * 100)}%`
              : "-"}
          </span>
        </div>
      </section>
    </div>
  );
}

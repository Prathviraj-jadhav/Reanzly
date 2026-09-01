"use client";

import { useState } from "react";
import { useDriverStore } from "@/lib/store/driver-store";
import { useDriverTrips, useActiveTrip, formatINR, relativeTime, STATUS_FLOW, statusColor } from "./_helpers";
import { ChevronRight, MapPin, Truck, Package, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TripFieldStatus } from "@/lib/store/driver-store";

type Filter = "all" | "active" | "delivered";

export function DriverTrips() {
  const allTrips = useDriverTrips();
  const { activeTripId, setActiveTrip, tripStatus } = useDriverStore();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = allTrips.filter((t) => {
    if (filter === "active") return t.status !== "Delivered" && t.status !== "Cancelled";
    if (filter === "delivered") return t.status === "Delivered";
    return true;
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[18px] font-semibold tracking-tight">My Trips</h1>
        <p className="text-[12px] text-muted-foreground tabular-nums">
          {allTrips.length} assigned · {allTrips.filter((t) => t.status !== "Delivered" && t.status !== "Cancelled").length} active
        </p>
      </header>

      {/* Filter pills */}
      <div className="flex gap-1.5">
        {(["all", "active", "delivered"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "h-8 rounded-full border px-3 text-[12px] font-medium capitalize transition-colors",
              filter === f
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Trip list */}
      {filtered.length === 0 ? (
        <div className="rounded-[6px] border border-dashed border-border p-8 text-center">
          <Truck className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-[13px] font-medium">No trips in this view</p>
          <p className="text-[11px] text-muted-foreground">Try a different filter.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => {
            const myStatus = (tripStatus[t.id] as TripFieldStatus) || "Assigned";
            const isActive = activeTripId === t.id;
            const isDelivered = t.status === "Delivered" || myStatus === "Delivered";
            return (
              <li key={t.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveTrip(isActive ? null : t.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveTrip(isActive ? null : t.id);
                    }
                  }}
                  className={cn(
                    "block w-full cursor-pointer overflow-hidden rounded-[6px] border bg-background text-left transition-colors",
                    isActive ? "border-foreground" : "border-border hover:bg-accent/30"
                  )}
                >
                  {/* Header strip */}
                  <div className="flex items-center justify-between border-b border-border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold tabular-nums">{t.tripId}</span>
                      {isActive && (
                        <span className="rounded-[3px] bg-foreground px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-background">
                          Active
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "rounded-[4px] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        statusColor(myStatus)
                      )}
                    >
                      {myStatus}
                    </span>
                  </div>

                  {/* Route */}
                  <div className="flex items-start gap-3 p-3">
                    <div className="flex flex-col items-center pt-1">
                      <span className="h-1.5 w-1.5 rounded-full border border-foreground" />
                      <span className="my-1 h-5 w-px bg-border" />
                      <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                    </div>
                    <div className="flex-1 space-y-1.5 text-[12px]">
                      <div>
                        <p className="font-medium">{t.origin}</p>
                      </div>
                      <div>
                        <p className="font-medium">{t.destination}</p>
                      </div>
                    </div>
                    <div className="text-right text-[11px]">
                      <p className="font-semibold tabular-nums">{formatINR(t.freightAmount)}</p>
                      <p className="tabular-nums text-muted-foreground">{t.distanceKm} km</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" /> {t.consignee}
                      </span>
                      {!isDelivered && t.expectedDelivery && (
                        <span className="flex items-center gap-1 tabular-nums">
                          <Clock className="h-3 w-3" /> {new Date(t.expectedDelivery).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </span>
                      )}
                    </div>
                    <span className="tabular-nums">{relativeTime(t.createdDate)}</span>
                  </div>

                  {/* Status stepper */}
                  {isActive && !isDelivered && (
                    <div className="border-t border-border bg-accent/20 px-3 py-2.5">
                      <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Tap to advance status</span>
                        <span className="tabular-nums">
                          {STATUS_FLOW.indexOf(myStatus) + 1}/{STATUS_FLOW.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {STATUS_FLOW.map((s) => {
                          const idx = STATUS_FLOW.indexOf(myStatus);
                          const i = STATUS_FLOW.indexOf(s);
                          const done = i <= idx;
                          return (
                            <button
                              key={s}
                              onClick={(e) => {
                                e.stopPropagation();
                                useDriverStore.getState().setTripStatus(t.id, s);
                                useDriverStore.getState().addActivity({
                                  type: "STATUS_UPDATE",
                                  tripId: t.id,
                                  vehicleId: t.vehicleId,
                                  payload: { status: s, from: myStatus },
                                  note: `Marked as ${s}`,
                                });
                                if (s !== myStatus) {
                                  toast.success(`Status: ${s}`, {
                                    description: `${t.tripId} · ${t.origin} → ${t.destination}`,
                                  });
                                }
                              }}
                              className={cn(
                                "h-6 rounded-[4px] border px-2 text-[10px] font-medium transition-colors",
                                done
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-border text-muted-foreground hover:text-foreground",
                                s === myStatus && "ring-1 ring-foreground ring-offset-1 ring-offset-background"
                              )}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {isActive && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toast("Opening fleet map", { description: `${t.tripId} · ${t.origin} → ${t.destination}` });
                      }}
                      className="flex w-full items-center justify-end gap-1 border-t border-border px-3 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <MapPin className="h-3 w-3" /> View on map <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

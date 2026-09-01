"use client";
import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { TripsList } from "./trips-list";
import { TripDetail } from "./trip-detail";
import { TripExecutionDetail } from "./trip-execution-detail";
import { JobOrderDrawer } from "./job-order-drawer";
import { TripPlanningDrawer } from "./trip-planning-drawer";
import type { Trip } from "@/lib/types";
import { toast } from "sonner";

export function TripsModule() {
  const { activeView, navigate } = useAppStore();
  const [planOpen, setPlanOpen] = useState(false);
  // Real, database-backed trips (src/app/api/trips) - previously
  // useState(TRIPS) seeded from mock-data.ts.
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/trips")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(({ trips }) => setTrips(trips))
      .catch(() => toast.error("Couldn't load trips", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

  const updateTrip = useCallback(async (id: string, data: Partial<Trip>): Promise<boolean> => {
    setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t))); // optimistic
    const res = await fetch(`/api/trips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't save trip", { description: body.error || "Try again." });
      return false;
    }
    const { trip } = await res.json();
    setTrips((prev) => prev.map((t) => (t.id === id ? trip : t)));
    return true;
  }, []);

  const addTrip = useCallback(async (t: Trip): Promise<boolean> => {
    const { id: _clientId, ...payload } = t;
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't create trip", { description: body.error || "Try again." });
      return false;
    }
    const { trip } = await res.json();
    setTrips((prev) => [trip, ...prev]);
    return true;
  }, []);

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading trips…</div>;
  }

  // Drawer visibility is derived directly from the active view - no
  // synchronous setState-in-effect needed.
  const jobDrawerOpen =
    activeView.module === "trips" && activeView.view === "create";

  const closeJobDrawer = () => {
    if (activeView.module === "trips" && activeView.view === "create") {
      navigate("trips");
    }
  };

  // Detail view - Active/In-Transit trips use the execution detail view;
  // other statuses use the legacy trip detail page.
  if (activeView.module === "trips" && activeView.view === "detail" && activeView.id) {
    const tripId = activeView.id;
    return <TripDetailRouter tripId={tripId} trips={trips} onUpdate={updateTrip} />;
  }

  return (
    <>
      <TripsList
        trips={trips}
        onCreateJobOrder={() => navigate("trips", "create")}
        onPlanTrip={() => setPlanOpen(true)}
        onUpdate={updateTrip}
      />
      <JobOrderDrawer open={jobDrawerOpen} onClose={closeJobDrawer} onAdd={addTrip} />
      <TripPlanningDrawer open={planOpen} onClose={() => setPlanOpen(false)} />
    </>
  );
}

/**
 * Routes to the execution detail view for Active/In-Transit trips,
 * otherwise to the standard TripDetail page.
 */
function TripDetailRouter({
  tripId,
  trips,
  onUpdate,
}: {
  tripId: string;
  trips: Trip[];
  onUpdate: (id: string, data: Partial<Trip>) => void;
}) {
  const [useExecution, setUseExecution] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const trip = trips.find((t) => t.tripId === tripId);
    if (!active) return;
    const execStatuses = ["Active", "In Transit", "Planned"];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUseExecution(trip ? execStatuses.includes(trip.status) : false);
    return () => {
      active = false;
    };
  }, [tripId, trips]);

  if (useExecution === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="skeleton h-6 w-40 rounded-[3px]" />
      </div>
    );
  }
  if (useExecution) {
    return <TripExecutionDetail tripId={tripId} trips={trips} onUpdate={onUpdate} />;
  }
  return <TripDetail tripId={tripId} trips={trips} onUpdate={onUpdate} />;
}

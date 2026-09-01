"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import { resolveModuleView, type ModuleRouteState } from "@/lib/navigation/module-route-state";
import { TripsList } from "./trips-list";
import { TripDetail } from "./trip-detail";
import { TripExecutionDetail } from "./trip-execution-detail";
import { JobOrderDrawer } from "./job-order-drawer";
import { TripPlanningDrawer } from "./trip-planning-drawer";
import type { Trip } from "@/lib/types";
import { toast } from "sonner";

export function TripsModule({ route }: { route?: ModuleRouteState } = {}) {
  const { activeView } = useAppStore();
  const { navigateCompat } = useNavigateCompat();
  const view = resolveModuleView(route, activeView, "trips");
  const [planOpen, setPlanOpen] = useState(false);
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
    setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
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

  const jobDrawerOpen = view.module === "trips" && view.view === "create";

  const closeJobDrawer = () => {
    if (view.module === "trips" && view.view === "create") {
      navigateCompat("trips");
    }
  };

  if (view.module === "trips" && view.view === "detail" && view.id) {
    const tripId = view.id;
    return (
      <TripDetailRouter
        tripId={tripId}
        trips={trips}
        loaded={loaded}
        onUpdate={updateTrip}
      />
    );
  }

  return (
    <>
      <TripsList
        trips={trips}
        onCreateJobOrder={() => navigateCompat("trips", "create")}
        onPlanTrip={() => setPlanOpen(true)}
        onUpdate={updateTrip}
      />
      <JobOrderDrawer open={jobDrawerOpen} onClose={closeJobDrawer} onAdd={addTrip} />
      <TripPlanningDrawer open={planOpen} onClose={() => setPlanOpen(false)} />
    </>
  );
}

function TripDetailRouter({
  tripId,
  trips,
  loaded,
  onUpdate,
}: {
  tripId: string;
  trips: Trip[];
  loaded: boolean;
  onUpdate: (id: string, data: Partial<Trip>) => void;
}) {
  const useExecution = useMemo(() => {
    if (!loaded) return null;
    const trip = trips.find((t) => t.tripId === tripId);
    const execStatuses = ["Active", "In Transit", "Planned"];
    return trip ? execStatuses.includes(trip.status) : false;
  }, [tripId, trips, loaded]);

  if (!loaded || useExecution === null) {
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

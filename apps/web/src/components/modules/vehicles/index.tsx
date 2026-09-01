"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import { resolveModuleView, type ModuleRouteState } from "@/lib/navigation/module-route-state";
import { VehiclesList } from "./vehicles-list";
import { VehicleDetail } from "./vehicle-detail";
import { VehicleOnboarding } from "./vehicle-onboarding";
import type { Vehicle } from "@/lib/types";
import { toast } from "sonner";

export function VehiclesModule({ route }: { route?: ModuleRouteState } = {}) {
  const { activeView } = useAppStore();
  const { navigateCompat } = useNavigateCompat();
  const view = resolveModuleView(route, activeView, "vehicles");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/vehicles")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(({ vehicles }) => setVehicles(vehicles))
      .catch(() => toast.error("Couldn't load vehicles", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

  const updateVehicle = useCallback(async (id: string, data: Partial<Vehicle>) => {
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...data } : v)));
    const res = await fetch(`/api/vehicles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't save vehicle", { description: body.error || "Try again." });
      return;
    }
    const { vehicle } = await res.json();
    setVehicles((prev) => prev.map((v) => (v.id === id ? vehicle : v)));
  }, []);

  const addVehicle = useCallback(async (v: Vehicle): Promise<boolean> => {
    const { id: _clientId, ...payload } = v;
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't add vehicle", { description: body.error || "Try again." });
      return false;
    }
    const { vehicle } = await res.json();
    setVehicles((prev) => [vehicle, ...prev]);
    return true;
  }, []);

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading vehicles…</div>;
  }

  if (view.module === "vehicles" && view.view === "detail" && view.id) {
    return (
      <VehicleDetail
        key={`${view.id}-${view.tab ?? "overview"}`}
        vehicleId={view.id}
        initialTab={view.tab}
        vehicles={vehicles}
        onUpdate={updateVehicle}
      />
    );
  }

  if (view.module === "vehicles" && view.view === "create") {
    return (
      <VehicleOnboarding
        onClose={() => navigateCompat("vehicles")}
        onAdd={addVehicle}
      />
    );
  }

  return (
    <VehiclesList
      vehicles={vehicles}
      onCreate={() => navigateCompat("vehicles", "create")}
      onBulkCreate={() =>
        toast("Bulk vehicle import", {
          description: "Upload a CSV to add multiple vehicles at once",
        })
      }
      onUpdate={updateVehicle}
    />
  );
}

"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { VehiclesList } from "./vehicles-list";
import { VehicleDetail } from "./vehicle-detail";
import { VehicleOnboarding } from "./vehicle-onboarding";
import type { Vehicle } from "@/lib/types";
import { toast } from "sonner";

export function VehiclesModule() {
  const { activeView, navigate } = useAppStore();
  // Real, database-backed vehicles (src/app/api/vehicles) - previously
  // useState(VEHICLES) seeded from mock-data.ts, so edits vanished on
  // reload and nothing was shared across users/devices.
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
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...data } : v))); // optimistic
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
    const { id: _clientId, ...payload } = v; // server assigns the real id
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

  // Detail view
  if (activeView.module === "vehicles" && activeView.view === "detail" && activeView.id) {
    return (
      <VehicleDetail
        vehicleId={activeView.id}
        vehicles={vehicles}
        onUpdate={updateVehicle}
      />
    );
  }

  // Create / onboarding view
  if (activeView.module === "vehicles" && activeView.view === "create") {
    return (
      <VehicleOnboarding
        onClose={() => navigate("vehicles")}
        onAdd={addVehicle}
      />
    );
  }

  // List view (default)
  return (
    <VehiclesList
      vehicles={vehicles}
      onCreate={() => navigate("vehicles", "create")}
      onBulkCreate={() =>
        toast("Bulk vehicle import", {
          description: "Upload a CSV to add multiple vehicles at once",
        })
      }
      onUpdate={updateVehicle}
    />
  );
}

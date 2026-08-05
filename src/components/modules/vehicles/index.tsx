"use client";
import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { VehiclesList } from "./vehicles-list";
import { VehicleDetail } from "./vehicle-detail";
import { VehicleOnboarding } from "./vehicle-onboarding";
import { VEHICLES } from "@/lib/mock-data";
import type { Vehicle } from "@/lib/types";
import { toast } from "sonner";

export function VehiclesModule() {
  const { activeView, navigate } = useAppStore();
  // Lift VEHICLES into state so in-session edits persist across list ↔ detail.
  const [vehicles, setVehicles] = useState<Vehicle[]>(VEHICLES);

  const updateVehicle = useCallback((id: string, data: Partial<Vehicle>) => {
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...data } : v)));
  }, []);

  const addVehicle = useCallback((v: Vehicle) => {
    setVehicles((prev) => [v, ...prev]);
  }, []);

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

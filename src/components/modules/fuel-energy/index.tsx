"use client";
import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { FUEL_ENTRIES } from "@/lib/mock-data";
import type { FuelEntry } from "@/lib/types";
import { FuelList } from "./fuel-list";
import { FuelDetail } from "./fuel-detail";
import { LogFuelDrawer } from "./log-fuel-drawer";
import { FuelAnalytics } from "./fuel-analytics";
import { AnomalyAlerts } from "./anomaly-alerts";

type SecondaryView = "list" | "analytics" | "anomalies";

export function FuelEnergyModule() {
  const { activeView, navigate } = useAppStore();
  const [secondary, setSecondary] = useState<SecondaryView>("list");
  // Lift FUEL_ENTRIES into state so in-session adds/edits persist across list ↔ detail.
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>(FUEL_ENTRIES);

  const addFuelEntry = useCallback((f: FuelEntry) => {
    setFuelEntries((prev) => [f, ...prev]);
  }, []);

  const updateFuelEntry = useCallback((id: string, data: Partial<FuelEntry>) => {
    setFuelEntries((prev) => prev.map((f) => (f.id === id ? { ...f, ...data } : f)));
  }, []);

  if (
    activeView.module === "fuel-energy" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return <FuelDetail fuelId={activeView.id} />;
  }

  const drawerOpen =
    activeView.module === "fuel-energy" && activeView.view === "create";
  const closeDrawer = () => {
    if (activeView.module === "fuel-energy" && activeView.view === "create") {
      navigate("fuel-energy");
    }
  };

  return (
    <>
      {secondary === "analytics" ? (
        <FuelAnalytics onBack={() => setSecondary("list")} />
      ) : secondary === "anomalies" ? (
        <AnomalyAlerts onBack={() => setSecondary("list")} />
      ) : (
        <FuelList
          fuelEntries={fuelEntries}
          onCreate={() => navigate("fuel-energy", "create")}
          onOpenAnalytics={() => setSecondary("analytics")}
          onOpenAnomalies={() => setSecondary("anomalies")}
          onUpdate={updateFuelEntry}
          onAdd={addFuelEntry}
        />
      )}
      <LogFuelDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addFuelEntry} />
    </>
  );
}

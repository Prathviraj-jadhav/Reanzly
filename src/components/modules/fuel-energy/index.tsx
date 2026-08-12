"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import type { FuelEntry } from "@/lib/types";
import { toast } from "sonner";
import { FuelList } from "./fuel-list";
import { FuelDetail } from "./fuel-detail";
import { LogFuelDrawer } from "./log-fuel-drawer";
import { FuelAnalytics } from "./fuel-analytics";
import { AnomalyAlerts } from "./anomaly-alerts";

type SecondaryView = "list" | "analytics" | "anomalies";

export function FuelEnergyModule() {
  const { activeView, navigate } = useAppStore();
  const [secondary, setSecondary] = useState<SecondaryView>("list");
  // Real, database-backed fuel entries (src/app/api/fuel-entries) -
  // previously useState(FUEL_ENTRIES) seeded from mock-data.ts.
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/fuel-entries")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(({ fuelEntries }) => setFuelEntries(fuelEntries))
      .catch(() => toast.error("Couldn't load fuel entries", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

  const addFuelEntry = useCallback(async (f: FuelEntry): Promise<boolean> => {
    const { id: _clientId, ...payload } = f;
    const res = await fetch("/api/fuel-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't log fuel entry", { description: body.error || "Try again." });
      return false;
    }
    const { fuelEntry } = await res.json();
    setFuelEntries((prev) => [fuelEntry, ...prev]);
    return true;
  }, []);

  const updateFuelEntry = useCallback(async (id: string, data: Partial<FuelEntry>): Promise<boolean> => {
    setFuelEntries((prev) => prev.map((f) => (f.id === id ? { ...f, ...data } : f))); // optimistic
    const res = await fetch(`/api/fuel-entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't save fuel entry", { description: body.error || "Try again." });
      return false;
    }
    const { fuelEntry } = await res.json();
    setFuelEntries((prev) => prev.map((f) => (f.id === id ? fuelEntry : f)));
    return true;
  }, []);

  const deleteFuelEntry = useCallback(async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/fuel-entries/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Couldn't delete fuel entry", { description: "Try again." });
      return false;
    }
    setFuelEntries((prev) => prev.filter((f) => f.id !== id));
    return true;
  }, []);

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading fuel entries…</div>;
  }

  if (
    activeView.module === "fuel-energy" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return <FuelDetail fuelId={activeView.id} fuelEntries={fuelEntries} onUpdate={updateFuelEntry} onDelete={deleteFuelEntry} />;
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
          onDelete={deleteFuelEntry}
        />
      )}
      <LogFuelDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addFuelEntry} />
    </>
  );
}

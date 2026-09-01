"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import { resolveModuleView, type ModuleRouteState } from "@/lib/navigation/module-route-state";
import type { FuelEntry, Vehicle, Driver } from "@/lib/types";
import { toast } from "sonner";
import { FuelList } from "./fuel-list";
import { FuelDetail } from "./fuel-detail";
import { LogFuelDrawer } from "./log-fuel-drawer";
import { FuelAnalytics } from "./fuel-analytics";
import { AnomalyAlerts } from "./anomaly-alerts";

type SecondaryView = "list" | "analytics" | "anomalies";

export function FuelEnergyModule({ route }: { route?: ModuleRouteState } = {}) {
  const { activeView } = useAppStore();
  const { navigateCompat } = useNavigateCompat();
  const view = resolveModuleView(route, activeView, "fuel-energy");
  const [secondary, setSecondary] = useState<SecondaryView>("list");
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/fuel-entries").then(r => r.ok ? r.json() : { fuelEntries: [] }),
      fetch("/api/vehicles").then(r => r.ok ? r.json() : { vehicles: [] }),
      fetch("/api/drivers").then(r => r.ok ? r.json() : { drivers: [] })
    ])
      .then(([fData, vData, dData]) => {
        setFuelEntries(fData.fuelEntries ?? []);
        setVehicles(vData.vehicles ?? []);
        setDrivers(dData.drivers ?? []);
      })
      .catch(() => toast.error("Couldn't load fuel data", { description: "Try reloading the page." }))
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
    setFuelEntries((prev) => prev.map((f) => (f.id === id ? { ...f, ...data } : f)));
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

  if (view.module === "fuel-energy" && view.view === "detail" && view.id) {
    return (
      <FuelDetail
        fuelId={view.id}
        fuelEntries={fuelEntries}
        onUpdate={updateFuelEntry}
        onDelete={deleteFuelEntry}
      />
    );
  }

  const drawerOpen = view.module === "fuel-energy" && view.view === "create";
  const closeDrawer = () => {
    if (view.module === "fuel-energy" && view.view === "create") {
      navigateCompat("fuel-energy");
    }
  };

  return (
    <>
      {secondary === "analytics" ? (
        <FuelAnalytics fuelEntries={fuelEntries} vehicles={vehicles} onBack={() => setSecondary("list")} />
      ) : secondary === "anomalies" ? (
        <AnomalyAlerts fuelEntries={fuelEntries} vehicles={vehicles} onBack={() => setSecondary("list")} />
      ) : (
        <FuelList
          fuelEntries={fuelEntries}
          vehicles={vehicles}
          drivers={drivers}
          onCreate={() => navigateCompat("fuel-energy", "create")}
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

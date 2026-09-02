"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import type { ModuleRouteState } from "@/lib/navigation/module-route-state";
import { DriversStaffList } from "./drivers-staff-list";
import { DriverDetail } from "./driver-detail";
import { AddEmployeeDrawer } from "./add-employee-drawer";
import type { Driver } from "@/lib/types";
import { toast } from "sonner";

export function DriversStaffModule({ route }: { route: ModuleRouteState }) {
  const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();
  const view = route;
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/drivers")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(({ drivers }) => setDrivers(drivers))
      .catch(() => toast.error("Couldn't load drivers", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

  const updateDriver = useCallback(async (id: string, data: Partial<Driver>) => {
    setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)));
    const res = await fetch(`/api/drivers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't save driver", { description: body.error || "Try again." });
      return;
    }
    const { driver } = await res.json();
    setDrivers((prev) => prev.map((d) => (d.id === id ? driver : d)));
  }, []);

  const addDriver = useCallback(async (d: Driver): Promise<boolean> => {
    const { id: _clientId, ...payload } = d;
    const res = await fetch("/api/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't add driver", { description: body.error || "Try again." });
      return false;
    }
    const { driver } = await res.json();
    setDrivers((prev) => [driver, ...prev]);
    return true;
  }, []);

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading drivers…</div>;
  }

  if (view.view === "detail" && view.id) {
    return (
      <DriverDetail
        driverId={view.id}
        drivers={drivers}
        onUpdate={updateDriver}
      />
    );
  }

  const drawerOpen = view.view === "create";
  const closeDrawer = () => {
    if (view.view === "create") {
      goToModule("drivers-staff");
    }
  };

  return (
    <>
      <DriversStaffList
        drivers={drivers}
        onCreate={() => goToModule("drivers-staff", "create")}
        onUpdate={updateDriver}
      />
      <AddEmployeeDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addDriver} />
    </>
  );
}

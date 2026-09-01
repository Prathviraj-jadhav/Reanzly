"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { DriversStaffList } from "./drivers-staff-list";
import { DriverDetail } from "./driver-detail";
import { AddEmployeeDrawer } from "./add-employee-drawer";
import type { Driver } from "@/lib/types";
import { toast } from "sonner";

export function DriversStaffModule() {
  const { activeView, navigate } = useAppStore();
  // Real, database-backed drivers (src/app/api/drivers) - previously
  // useState(DRIVERS) seeded from mock-data.ts.
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
    setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d))); // optimistic
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

  // Detail view
  if (activeView.module === "drivers-staff" && activeView.view === "detail" && activeView.id) {
    return (
      <DriverDetail
        driverId={activeView.id}
        drivers={drivers}
        onUpdate={updateDriver}
      />
    );
  }

  const drawerOpen =
    activeView.module === "drivers-staff" && activeView.view === "create";
  const closeDrawer = () => {
    if (activeView.module === "drivers-staff" && activeView.view === "create") {
      navigate("drivers-staff");
    }
  };

  return (
    <>
      <DriversStaffList
        drivers={drivers}
        onCreate={() => navigate("drivers-staff", "create")}
        onUpdate={updateDriver}
      />
      <AddEmployeeDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addDriver} />
    </>
  );
}

"use client";
import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { DriversStaffList } from "./drivers-staff-list";
import { DriverDetail } from "./driver-detail";
import { AddEmployeeDrawer } from "./add-employee-drawer";
import { DRIVERS } from "@/lib/mock-data";
import type { Driver } from "@/lib/types";

export function DriversStaffModule() {
  const { activeView, navigate } = useAppStore();
  // Lift DRIVERS into state so in-session edits persist across list ↔ detail.
  const [drivers, setDrivers] = useState<Driver[]>(DRIVERS);

  const updateDriver = useCallback((id: string, data: Partial<Driver>) => {
    setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)));
  }, []);

  const addDriver = useCallback((d: Driver) => {
    setDrivers((prev) => [d, ...prev]);
  }, []);

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

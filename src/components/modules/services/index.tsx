"use client";
import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { ServicesList, ServiceDueList } from "./services-list";
import { AddServiceProgramDrawer } from "./add-service-program-drawer";
import { EditServiceProgramDrawer } from "./edit-service-program-drawer";
import { SERVICE_PROGRAMS, type ServiceProgram } from "./_helpers";

export function ServicesModule() {
  const { activeView, navigate } = useAppStore();
  const [showDue, setShowDue] = useState(false);

  // Lifted state - lets the Edit drawer mutate programs in-memory.
  const [programs, setPrograms] = useState<ServiceProgram[]>(SERVICE_PROGRAMS);
  const [editRecord, setEditRecord] = useState<ServiceProgram | null>(null);

  const drawerOpen =
    activeView.module === "services" && activeView.view === "create";
  const closeDrawer = () => {
    if (activeView.module === "services" && activeView.view === "create") {
      navigate("services");
    }
  };

  const handleUpdate = useCallback((id: string, patch: Partial<ServiceProgram>) => {
    setPrograms((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setEditRecord(null);
  }, []);

  const addProgram = useCallback((p: ServiceProgram) => {
    setPrograms((prev) => [p, ...prev]);
  }, []);

  const openEdit = (p: ServiceProgram) => setEditRecord(p);
  const closeEdit = () => setEditRecord(null);

  return (
    <>
      {showDue ? (
        <ServiceDueList onBack={() => setShowDue(false)} />
      ) : (
        <ServicesList
          programs={programs}
          onCreate={() => navigate("services", "create")}
          onOpenDue={() => setShowDue(true)}
          onEdit={openEdit}
        />
      )}
      <AddServiceProgramDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        onAdd={addProgram}
      />
      <EditServiceProgramDrawer
        open={!!editRecord}
        program={editRecord}
        onClose={closeEdit}
        onUpdate={handleUpdate}
      />
    </>
  );
}


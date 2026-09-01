"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { ServicesList, ServiceDueList } from "./services-list";
import { AddServiceProgramDrawer } from "./add-service-program-drawer";
import { EditServiceProgramDrawer } from "./edit-service-program-drawer";
import { type ServiceProgram } from "./_helpers";

export function ServicesModule() {
  const { activeView, navigate } = useAppStore();
  const [showDue, setShowDue] = useState(false);

  const [programs, setPrograms] = useState<ServiceProgram[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editRecord, setEditRecord] = useState<ServiceProgram | null>(null);

  useEffect(() => {
    fetch("/api/service-templates")
      .then((r) => (r.ok ? r.json() : { templates: [] }))
      .then(({ templates }) => {
        setPrograms(templates ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const drawerOpen =
    activeView.module === "services" && activeView.view === "create";
  const closeDrawer = () => {
    if (activeView.module === "services" && activeView.view === "create") {
      navigate("services");
    }
  };

  const handleUpdate = useCallback((id: string, updated: ServiceProgram) => {
    setPrograms((prev) => prev.map((p) => (p.id === id ? updated : p)));
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
          loaded={loaded}
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

"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import type { ModuleRouteState } from "@/lib/navigation/module-route-state";
import type { LorryReceipt } from "@/lib/types";
import { toast } from "sonner";
import { LorryReceiptsList } from "./lorry-receipts-list";
import { LRDetail } from "./lr-detail";
import { AddConsignmentDrawer } from "./add-consignment-drawer";
import { EditLRDrawer } from "./edit-lr-drawer";

export function LorryReceiptsModule({ route }: { route: ModuleRouteState }) {
  const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();
  const view = route;

  const [lrs, setLrs] = useState<LorryReceipt[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/lorry-receipts")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(({ lrs }) => setLrs(lrs))
      .catch(() => toast.error("Couldn't load lorry receipts", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

  const [editRecord, setEditRecord] = useState<LorryReceipt | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const handleUpdate = useCallback(async (id: string, patch: Partial<LorryReceipt>): Promise<boolean> => {
    setLrs((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    setEditRecord(null);
    setEditOpen(false);
    const res = await fetch(`/api/lorry-receipts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't save lorry receipt", { description: body.error || "Try again." });
      return false;
    }
    const { lr } = await res.json();
    setLrs((prev) => prev.map((l) => (l.id === id ? lr : l)));
    return true;
  }, []);

  const addLr = useCallback(async (lr: LorryReceipt): Promise<boolean> => {
    const { id: _clientId, ...payload } = lr;
    const res = await fetch("/api/lorry-receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't create lorry receipt", { description: body.error || "Try again." });
      return false;
    }
    const { lr: created } = await res.json();
    setLrs((prev) => [created, ...prev]);
    return true;
  }, []);

  const openEdit = (lr: LorryReceipt) => {
    setEditRecord(lr);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditRecord(null);
    setEditOpen(false);
  };

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading lorry receipts…</div>;
  }

  if (view.module === "lorry-receipts" && view.view === "detail" && view.id) {
    return (
      <LRDetail
        lrId={view.id}
        lrs={lrs}
        onEdit={openEdit}
        onUpdate={handleUpdate}
        editOpen={editOpen}
        editRecord={editRecord}
        onCloseEdit={closeEdit}
      />
    );
  }

  const drawerOpen = view.module === "lorry-receipts" && view.view === "create";

  const closeDrawer = () => {
    if (view.module === "lorry-receipts" && view.view === "create") {
      goToModule("lorry-receipts");
    }
  };

  return (
    <>
      <LorryReceiptsList
        lrs={lrs}
        onCreate={() => goToModule("lorry-receipts", "create")}
        onEdit={openEdit}
      />
      <AddConsignmentDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        onAdd={addLr}
      />
      <EditLRDrawer
        open={editOpen}
        lr={editRecord}
        onClose={closeEdit}
        onUpdate={handleUpdate}
      />
    </>
  );
}

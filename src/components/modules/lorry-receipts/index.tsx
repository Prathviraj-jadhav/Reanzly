"use client";
import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { LORRY_RECEIPTS } from "@/lib/mock-data";
import type { LorryReceipt } from "@/lib/types";
import { LorryReceiptsList } from "./lorry-receipts-list";
import { LRDetail } from "./lr-detail";
import { AddConsignmentDrawer } from "./add-consignment-drawer";
import { EditLRDrawer } from "./edit-lr-drawer";

export function LorryReceiptsModule() {
  const { activeView, navigate } = useAppStore();

  // Lifted state - lets the Edit drawer mutate records in-memory without
  // touching the static mock-data export.
  const [lrs, setLrs] = useState<LorryReceipt[]>(LORRY_RECEIPTS);

  // Edit drawer state.
  const [editRecord, setEditRecord] = useState<LorryReceipt | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const handleUpdate = useCallback((id: string, patch: Partial<LorryReceipt>) => {
    setLrs((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    setEditRecord(null);
    setEditOpen(false);
  }, []);

  const addLr = useCallback((lr: LorryReceipt) => {
    setLrs((prev) => [lr, ...prev]);
  }, []);

  const openEdit = (lr: LorryReceipt) => {
    setEditRecord(lr);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditRecord(null);
    setEditOpen(false);
  };

  // Detail view
  if (
    activeView.module === "lorry-receipts" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return (
      <LRDetail
        lrId={activeView.id}
        lrs={lrs}
        onEdit={openEdit}
        onUpdate={handleUpdate}
        editOpen={editOpen}
        editRecord={editRecord}
        onCloseEdit={closeEdit}
      />
    );
  }

  // The Add Consignment drawer overlays the list only in "create" mode (the
  // focused EditLRDrawer handles edits from the list row action).
  const drawerOpen =
    activeView.module === "lorry-receipts" && activeView.view === "create";

  const closeDrawer = () => {
    if (activeView.module === "lorry-receipts" && activeView.view === "create") {
      navigate("lorry-receipts");
    }
  };

  return (
    <>
      <LorryReceiptsList
        lrs={lrs}
        onCreate={() => navigate("lorry-receipts", "create")}
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


"use client";
import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { VendorsList } from "./vendors-list";
import { VendorDetail } from "./vendor-detail";
import { AddVendorDrawer } from "./add-vendor-drawer";
import { VENDORS } from "@/lib/mock-data";
import type { Vendor } from "@/lib/types";

export function VendorsModule() {
  const { activeView, navigate } = useAppStore();
  // Lift VENDORS into state so in-session edits persist across list ↔ detail.
  const [vendors, setVendors] = useState<Vendor[]>(VENDORS);

  const updateVendor = useCallback((id: string, data: Partial<Vendor>) => {
    setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, ...data } : v)));
  }, []);

  const addVendor = useCallback((v: Vendor) => {
    setVendors((prev) => [v, ...prev]);
  }, []);

  // Detail view
  if (activeView.module === "vendors" && activeView.view === "detail" && activeView.id) {
    return (
      <VendorDetail
        vendorId={activeView.id}
        vendors={vendors}
        onUpdate={updateVendor}
      />
    );
  }

  const drawerOpen =
    activeView.module === "vendors" && activeView.view === "create";
  const closeDrawer = () => {
    if (activeView.module === "vendors" && activeView.view === "create") {
      navigate("vendors");
    }
  };

  return (
    <>
      <VendorsList
        vendors={vendors}
        onCreate={() => navigate("vendors", "create")}
        onUpdate={updateVendor}
        onAdd={addVendor}
      />
      <AddVendorDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addVendor} />
    </>
  );
}

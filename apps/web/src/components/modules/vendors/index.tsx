"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import { resolveModuleView, type ModuleRouteState } from "@/lib/navigation/module-route-state";
import { VendorsList } from "./vendors-list";
import { VendorDetail } from "./vendor-detail";
import { AddVendorDrawer } from "./add-vendor-drawer";
import type { Vendor } from "@/lib/types";
import { toast } from "sonner";

export function VendorsModule({ route }: { route?: ModuleRouteState } = {}) {
  const { activeView } = useAppStore();
  const { navigateCompat } = useNavigateCompat();
  const view = resolveModuleView(route, activeView, "vendors");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/vendors")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(({ vendors }) => setVendors(vendors))
      .catch(() => toast.error("Couldn't load vendors", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

  const updateVendor = useCallback(async (id: string, data: Partial<Vendor>): Promise<boolean> => {
    setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, ...data } : v)));
    const res = await fetch(`/api/vendors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't save vendor", { description: body.error || "Try again." });
      return false;
    }
    const { vendor } = await res.json();
    setVendors((prev) => prev.map((v) => (v.id === id ? vendor : v)));
    return true;
  }, []);

  const addVendor = useCallback(async (v: Vendor): Promise<boolean> => {
    const { id: _clientId, ...payload } = v;
    const res = await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't add vendor", { description: body.error || "Try again." });
      return false;
    }
    const { vendor } = await res.json();
    setVendors((prev) => [vendor, ...prev]);
    return true;
  }, []);

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading vendors…</div>;
  }

  if (view.view === "detail" && view.id) {
    return (
      <VendorDetail
        vendorId={view.id}
        vendors={vendors}
        onUpdate={updateVendor}
      />
    );
  }

  const drawerOpen = view.view === "create";
  const closeDrawer = () => {
    if (view.view === "create") {
      navigateCompat("vendors");
    }
  };

  return (
    <>
      <VendorsList
        vendors={vendors}
        onCreate={() => navigateCompat("vendors", "create")}
        onUpdate={updateVendor}
        onAdd={addVendor}
      />
      <AddVendorDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addVendor} />
    </>
  );
}

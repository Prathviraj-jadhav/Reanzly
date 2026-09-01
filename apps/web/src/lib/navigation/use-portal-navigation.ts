"use client";

import { useRouter } from "next/navigation";
import {
  adminViewToPath,
  brokerViewToPath,
  driverTabToPath,
  vendorViewToPath,
  warehouseTabToPath,
  type AdminView,
  type BrokerView,
  type DriverFieldTab,
  type VendorView,
  type WarehouseFieldTab,
} from "./portal-paths";

export function useAdminPortalNavigation(activeView: AdminView) {
  const router = useRouter();
  return {
    activeView,
    onNavigate: (view: AdminView) => router.push(adminViewToPath(view)),
  };
}

export function useBrokerPortalNavigation(activeView: BrokerView) {
  const router = useRouter();
  return {
    activeView,
    onNavigate: (view: BrokerView) => router.push(brokerViewToPath(view)),
  };
}

export function useVendorPortalNavigation(activeView: VendorView) {
  const router = useRouter();
  return {
    activeView,
    onNavigate: (view: VendorView) => router.push(vendorViewToPath(view)),
  };
}

export function useDriverFieldNavigation(activeTab: DriverFieldTab) {
  const router = useRouter();
  return {
    activeTab,
    onNavigate: (tab: DriverFieldTab) => router.push(driverTabToPath(tab)),
  };
}

export function useWarehouseFieldNavigation(activeTab: WarehouseFieldTab) {
  const router = useRouter();
  return {
    activeTab,
    onNavigate: (tab: WarehouseFieldTab) => router.push(warehouseTabToPath(tab)),
  };
}

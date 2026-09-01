import { describe, expect, it } from "vitest";
import {
  ADMIN_BASE_PATH,
  ADMIN_DEFAULT_VIEW,
  ADMIN_VIEWS,
  BROKER_DEFAULT_VIEW,
  BROKER_PORTAL_BASE_PATH,
  BROKER_VIEWS,
  DRIVER_DEFAULT_TAB,
  DRIVER_FIELD_BASE_PATH,
  DRIVER_FIELD_TABS,
  VENDOR_BASE_PATH,
  VENDOR_DEFAULT_VIEW,
  VENDOR_VIEWS,
  WAREHOUSE_DEFAULT_TAB,
  WAREHOUSE_FIELD_BASE_PATH,
  WAREHOUSE_FIELD_TABS,
  adminViewToPath,
  brokerViewToPath,
  driverTabToPath,
  isPortalPath,
  pathToAdminView,
  pathToBrokerView,
  pathToDriverFieldTab,
  pathToVendorView,
  pathToWarehouseFieldTab,
  vendorViewToPath,
  warehouseTabToPath,
} from "@/lib/navigation/portal-paths";

describe("portal path registry (B0R-7)", () => {
  it("defines complete admin view inventory", () => {
    expect(ADMIN_VIEWS).toHaveLength(20);
    expect(ADMIN_VIEWS[0]).toBe(ADMIN_DEFAULT_VIEW);
  });

  it("defines complete broker portal view inventory", () => {
    expect(BROKER_VIEWS).toHaveLength(18);
    expect(BROKER_VIEWS[0]).toBe(BROKER_DEFAULT_VIEW);
  });

  it("defines complete vendor view inventory", () => {
    expect(VENDOR_VIEWS).toHaveLength(12);
  });

  it("defines driver and warehouse field tabs", () => {
    expect(DRIVER_FIELD_TABS).toHaveLength(6);
    expect(WAREHOUSE_FIELD_TABS).toHaveLength(5);
  });

  it("adminViewToPath round-trips", () => {
    for (const view of ADMIN_VIEWS) {
      const path = adminViewToPath(view);
      expect(pathToAdminView(path)).toBe(view);
    }
    expect(adminViewToPath(ADMIN_DEFAULT_VIEW)).toBe(ADMIN_BASE_PATH);
  });

  it("brokerViewToPath round-trips", () => {
    for (const view of BROKER_VIEWS) {
      const path = brokerViewToPath(view);
      expect(pathToBrokerView(path)).toBe(view);
    }
    expect(brokerViewToPath(BROKER_DEFAULT_VIEW)).toBe(BROKER_PORTAL_BASE_PATH);
  });

  it("vendorViewToPath round-trips", () => {
    for (const view of VENDOR_VIEWS) {
      const path = vendorViewToPath(view);
      expect(pathToVendorView(path)).toBe(view);
    }
    expect(vendorViewToPath(VENDOR_DEFAULT_VIEW)).toBe(VENDOR_BASE_PATH);
  });

  it("driver and warehouse tab paths round-trip", () => {
    for (const tab of DRIVER_FIELD_TABS) {
      expect(pathToDriverFieldTab(driverTabToPath(tab))).toBe(tab);
    }
    for (const tab of WAREHOUSE_FIELD_TABS) {
      expect(pathToWarehouseFieldTab(warehouseTabToPath(tab))).toBe(tab);
    }
    expect(driverTabToPath(DRIVER_DEFAULT_TAB)).toBe(DRIVER_FIELD_BASE_PATH);
    expect(warehouseTabToPath(WAREHOUSE_DEFAULT_TAB)).toBe(WAREHOUSE_FIELD_BASE_PATH);
  });

  it("isPortalPath recognizes portal prefixes only", () => {
    expect(isPortalPath("/admin")).toBe(true);
    expect(isPortalPath("/broker/marketplace")).toBe(true);
    expect(isPortalPath("/app/broker/marketplace")).toBe(false);
    expect(isPortalPath("/app/dashboard")).toBe(false);
  });
});

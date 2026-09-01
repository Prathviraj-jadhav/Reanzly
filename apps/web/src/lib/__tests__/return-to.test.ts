import { describe, expect, it } from "vitest";
import { validateReturnTo, resolvePostLoginRoute } from "@/lib/navigation/return-to";
import { DASHBOARD_ROUTE } from "@/lib/navigation/routing-config";
import {
  ADMIN_BASE_PATH,
  BROKER_PORTAL_BASE_PATH,
  DRIVER_FIELD_BASE_PATH,
  VENDOR_BASE_PATH,
  WAREHOUSE_FIELD_BASE_PATH,
} from "@/lib/navigation/portal-paths";

describe("validateReturnTo", () => {
  it("returns fallback for empty values", () => {
    expect(validateReturnTo(null)).toBe(DASHBOARD_ROUTE);
    expect(validateReturnTo(undefined)).toBe(DASHBOARD_ROUTE);
    expect(validateReturnTo("")).toBe(DASHBOARD_ROUTE);
  });

  it("allows safe internal paths for tenant users", () => {
    expect(validateReturnTo("/app/dashboard", DASHBOARD_ROUTE, "app", "owner")).toBe(
      "/app/dashboard",
    );
    expect(validateReturnTo("/app/trips?status=open", DASHBOARD_ROUTE, "app", "owner")).toBe(
      "/app/trips?status=open",
    );
  });

  it("rejects open redirects", () => {
    expect(validateReturnTo("//evil.com")).toBe(DASHBOARD_ROUTE);
    expect(validateReturnTo("https://evil.com")).toBe(DASHBOARD_ROUTE);
    expect(validateReturnTo("/\\evil.com")).toBe(DASHBOARD_ROUTE);
    expect(validateReturnTo("/app@evil.com")).toBe(DASHBOARD_ROUTE);
    expect(validateReturnTo("javascript:alert(1)")).toBe(DASHBOARD_ROUTE);
  });

  it("rejects cross-portal returnTo for broker users", () => {
    expect(validateReturnTo("/admin", DASHBOARD_ROUTE, "broker", "broker")).toBe(
      BROKER_PORTAL_BASE_PATH,
    );
    expect(validateReturnTo("/vendor", DASHBOARD_ROUTE, "broker", "broker")).toBe(
      BROKER_PORTAL_BASE_PATH,
    );
  });

  it("rejects cross-portal returnTo for superadmin users", () => {
    expect(validateReturnTo("/app/dashboard", DASHBOARD_ROUTE, "superadmin", "superadmin")).toBe(
      ADMIN_BASE_PATH,
    );
    expect(validateReturnTo("/broker", DASHBOARD_ROUTE, "superadmin", "superadmin")).toBe(
      ADMIN_BASE_PATH,
    );
  });

  it("allows portal-authorized returnTo", () => {
    expect(validateReturnTo("/admin/tickets", DASHBOARD_ROUTE, "superadmin", "superadmin")).toBe(
      "/admin/tickets",
    );
    expect(validateReturnTo("/broker/settlements", DASHBOARD_ROUTE, "broker", "broker")).toBe(
      "/broker/settlements",
    );
    expect(validateReturnTo("/field/driver/trips", DASHBOARD_ROUTE, "app", "driver")).toBe(
      "/field/driver/trips",
    );
    expect(
      validateReturnTo("/field/warehouse/tasks", DASHBOARD_ROUTE, "app", "warehouse-crew"),
    ).toBe("/field/warehouse/tasks");
    expect(validateReturnTo("/vendor/invoices", DASHBOARD_ROUTE, "vendor", "customer")).toBe(
      "/vendor/invoices",
    );
  });
});

describe("resolvePostLoginRoute", () => {
  it("lands superadmin on /admin", () => {
    expect(resolvePostLoginRoute("superadmin", "superadmin", null)).toBe(ADMIN_BASE_PATH);
  });

  it("lands broker on /broker", () => {
    expect(resolvePostLoginRoute("broker", "broker", null)).toBe(BROKER_PORTAL_BASE_PATH);
  });

  it("lands vendor on /vendor", () => {
    expect(resolvePostLoginRoute("vendor", "customer", null)).toBe(VENDOR_BASE_PATH);
  });

  it("lands driver and warehouse crew on field apps", () => {
    expect(resolvePostLoginRoute("app", "driver", null)).toBe(DRIVER_FIELD_BASE_PATH);
    expect(resolvePostLoginRoute("app", "warehouse-crew", null)).toBe(WAREHOUSE_FIELD_BASE_PATH);
  });

  it("lands tenant users on dashboard", () => {
    expect(resolvePostLoginRoute("app", "owner", null)).toBe(DASHBOARD_ROUTE);
  });
});

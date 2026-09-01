import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useAppStore } from "@/lib/store/app-store";
import { moduleToPath } from "@/lib/navigation/module-paths";
import {
  isModuleMigrated,
  isRoutingMigrationEnabled,
  MIGRATED_MODULES,
} from "@/lib/navigation/routing-config";
import { navigateCompatStatic } from "@/lib/navigation/navigate-compat";

describe("routing migration config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("MIGRATED_MODULES contains B0R-2…6 desktop modules (excludes superadmin)", () => {
    expect([...MIGRATED_MODULES].sort()).toEqual(
      [
        "access-matrix",
        "app-store",
        "approvals",
        "automation",
        "broker-console",
        "broker-marketplace",
        "broker-settlements",
        "chat",
        "compliance",
        "crm",
        "customers",
        "dashboard",
        "document-studio",
        "documents",
        "drivers-staff",
        "expenses",
        "field-service",
        "financial-ops",
        "financial-services",
        "fleet-map",
        "fuel-energy",
        "helpdesk",
        "hr",
        "inspection",
        "integrations",
        "invoice",
        "issues",
        "knowledge",
        "ledger",
        "lorry-receipts",
        "maintenance",
        "marketing",
        "operations-hub",
        "partner-programme",
        "payments",
        "payroll",
        "planning",
        "pod",
        "purchase",
        "quality",
        "rate-cards",
        "reminders",
        "reports",
        "services",
        "settings",
        "subscriptions",
        "surveys",
        "system-design",
        "trips",
        "vehicles",
        "vendors",
        "warehouse",
        "workshop",
      ].sort(),
    );
    expect(MIGRATED_MODULES.has("superadmin")).toBe(false);
  });

  it("isRoutingMigrationEnabled respects env flag", () => {
    vi.stubEnv("NEXT_PUBLIC_ROUTING_MIGRATION", "");
    expect(isRoutingMigrationEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_ROUTING_MIGRATION", "1");
    expect(isRoutingMigrationEnabled()).toBe(true);
  });

  it("isModuleMigrated requires flag and set membership", () => {
    vi.stubEnv("NEXT_PUBLIC_ROUTING_MIGRATION", "");
    expect(isModuleMigrated("dashboard")).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_ROUTING_MIGRATION", "1");
    expect(isModuleMigrated("dashboard")).toBe(true);
    expect(isModuleMigrated("trips")).toBe(true);
    expect(isModuleMigrated("vehicles")).toBe(true);
    expect(isModuleMigrated("invoice")).toBe(true);
    expect(isModuleMigrated("ledger")).toBe(true);
    expect(isModuleMigrated("financial-ops")).toBe(true);
    expect(isModuleMigrated("customers")).toBe(true);
    expect(isModuleMigrated("crm")).toBe(true);
    expect(isModuleMigrated("document-studio")).toBe(true);
    expect(isModuleMigrated("settings")).toBe(true);
    expect(isModuleMigrated("warehouse")).toBe(true);
    expect(isModuleMigrated("superadmin")).toBe(false);
  });
});

describe("navigateCompat dual-write (store)", () => {
  beforeEach(() => {
    useAppStore.setState({
      activeView: {
        module: "trips",
        view: "list",
        breadcrumb: [{ label: "Trips", module: "trips" }],
      },
      history: [{ module: "dashboard", view: "list", breadcrumb: [] }],
    });
    vi.stubEnv("NEXT_PUBLIC_ROUTING_MIGRATION", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("syncActiveView updates activeView without history push", () => {
    useAppStore.getState().syncActiveView("dashboard");
    expect(useAppStore.getState().activeView.module).toBe("dashboard");
    expect(useAppStore.getState().history).toHaveLength(1);
  });

  it("legacy navigate still pushes history stack", () => {
    useAppStore.getState().navigate("dashboard");
    expect(useAppStore.getState().activeView.module).toBe("dashboard");
    expect(useAppStore.getState().history.length).toBeGreaterThan(1);
  });

  it("navigateCompatStatic uses legacy navigate when flag off", () => {
    const navigateSpy = vi.spyOn(useAppStore.getState(), "navigate");
    navigateCompatStatic("trips");
    expect(navigateSpy).toHaveBeenCalledWith("trips", "list", undefined, undefined);
  });

  it("navigateCompatStatic syncs trips without history when migrated", () => {
    vi.stubEnv("NEXT_PUBLIC_ROUTING_MIGRATION", "1");
    const historyBefore = useAppStore.getState().history.length;
    navigateCompatStatic("trips", "detail", "TX-1");
    expect(useAppStore.getState().activeView.module).toBe("trips");
    expect(useAppStore.getState().activeView.id).toBe("TX-1");
    expect(useAppStore.getState().history.length).toBe(historyBefore);
    expect(moduleToPath("trips", "detail", "TX-1")).toBe("/app/trips/TX-1");
  });

  it("navigateCompatStatic syncs activeView without history when migrated", () => {
    vi.stubEnv("NEXT_PUBLIC_ROUTING_MIGRATION", "1");
    const historyBefore = useAppStore.getState().history.length;
    navigateCompatStatic("dashboard");
    expect(useAppStore.getState().activeView.module).toBe("dashboard");
    expect(useAppStore.getState().history.length).toBe(historyBefore);
    expect(moduleToPath("dashboard")).toBe("/app/dashboard");
  });
});

describe("activeView URL sync contract", () => {
  it("pathToModule dashboard matches activeView list state shape", async () => {
    const { pathToModule } = await import("@/lib/navigation/module-paths");
    const parsed = pathToModule("/app/dashboard");
    expect(parsed).toEqual({ module: "dashboard", view: "list" });
  });
});

describe("navigation loop guards (B0R-1V)", () => {
  beforeEach(() => {
    useAppStore.setState({
      activeView: {
        module: "dashboard",
        view: "list",
        breadcrumb: [{ label: "Dashboard", module: "dashboard" }],
      },
      history: [],
    });
    vi.stubEnv("NEXT_PUBLIC_ROUTING_MIGRATION", "1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("syncActiveView is idempotent for matching dashboard state", () => {
    const before = useAppStore.getState().activeView;
    useAppStore.getState().syncActiveView("dashboard", "list");
    const after = useAppStore.getState().activeView;
    expect(after.module).toBe(before.module);
    expect(after.view).toBe(before.view);
    expect(useAppStore.getState().history).toHaveLength(0);
  });

  it("navigateCompatStatic does not push history when already on dashboard path", () => {
    const historyBefore = useAppStore.getState().history.length;
    vi.stubGlobal("window", { location: { pathname: "/app/dashboard" } });
    navigateCompatStatic("dashboard");
    expect(useAppStore.getState().history.length).toBe(historyBefore);
    expect(useAppStore.getState().activeView.module).toBe("dashboard");
    vi.unstubAllGlobals();
  });

  it("legacy navigate still adds history while syncActiveView does not", () => {
    useAppStore.getState().navigate("trips");
    expect(useAppStore.getState().history.length).toBe(1);
    const histLen = useAppStore.getState().history.length;
    useAppStore.getState().syncActiveView("trips", "list");
    expect(useAppStore.getState().history.length).toBe(histLen);
  });
});

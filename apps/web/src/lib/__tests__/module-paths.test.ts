import { describe, expect, it } from "vitest";
import {
  ALL_MODULE_IDS,
  MODULE_BASE_PATH,
  moduleToPath,
  pathToModule,
  resolveModuleAlias,
} from "@/lib/navigation/module-paths";

describe("module path registry", () => {
  it("defines base paths for all 54 ModuleIds", () => {
    expect(ALL_MODULE_IDS).toHaveLength(54);
    for (const id of ALL_MODULE_IDS) {
      expect(MODULE_BASE_PATH[id]).toMatch(/^\/app\//);
    }
  });

  it("moduleToPath list route for every ModuleId", () => {
    for (const id of ALL_MODULE_IDS) {
      const path = moduleToPath(id);
      expect(path).toBe(MODULE_BASE_PATH[id]);
    }
  });

  it("resolves navigation aliases", () => {
    expect(resolveModuleAlias("financial-ops")).toBe("ledger");
    expect(resolveModuleAlias("app-store")).toBe("integrations");
    expect(moduleToPath("financial-ops")).toBe("/app/ledger/treasury");
    expect(moduleToPath("app-store")).toBe("/app/integrations");
  });

  it("round-trips list paths for canonical modules", () => {
    const skipRoundTrip = new Set(["financial-ops", "app-store"]);
    for (const id of ALL_MODULE_IDS) {
      if (skipRoundTrip.has(id)) continue;
      const path = moduleToPath(id);
      const parsed = pathToModule(path);
      expect(parsed, `round-trip failed for ${id}`).not.toBeNull();
      expect(parsed!.module).toBe(resolveModuleAlias(id));
      expect(parsed!.view).toBe("list");
    }
  });

  it("pathToModule alias: financial-ops treasury path", () => {
    const parsed = pathToModule("/app/ledger/treasury");
    expect(parsed).toEqual({ module: "ledger", view: "list", tab: "treasury-ops" });
  });

  it("moduleToPath ledger sub-views", () => {
    expect(moduleToPath("ledger", "list", undefined, "coa")).toBe("/app/ledger/coa");
    expect(moduleToPath("ledger", "list", undefined, "treasury-ops")).toBe("/app/ledger/treasury");
    expect(moduleToPath("ledger", "list", undefined, "dashboard")).toBe("/app/ledger");
    expect(pathToModule("/app/ledger/journal")).toEqual({
      module: "ledger",
      view: "list",
      tab: "journal",
    });
    expect(pathToModule("/app/ledger/not-a-view")).toBeNull();
  });

  it("moduleToPath approvals detail tab query", () => {
    expect(moduleToPath("approvals", "detail", "APR-1", "decision")).toBe(
      "/app/approvals/APR-1?tab=decision",
    );
    expect(
      pathToModule("/app/approvals/APR-1", new URLSearchParams("tab=decision")),
    ).toEqual({
      module: "approvals",
      view: "detail",
      id: "APR-1",
      tab: "decision",
    });
  });

  it("pathToModule alias: integrations accepts app-store target", () => {
    const parsed = pathToModule("/app/integrations");
    expect(parsed).toEqual({ module: "integrations", view: "list" });
  });

  it("pathToModule returns null for invalid paths", () => {
    expect(pathToModule("/dashboard")).toBeNull();
    expect(pathToModule("/app/unknown-module-xyz")).toBeNull();
    expect(pathToModule("/login")).toBeNull();
  });

  it("moduleToPath detail and create segments", () => {
    expect(moduleToPath("trips", "create")).toBe("/app/trips/new");
    expect(moduleToPath("trips", "detail", "TX-1")).toBe("/app/trips/TX-1");
    expect(moduleToPath("trips", "detail", "TX-1", "execution")).toBe(
      "/app/trips/TX-1/execution",
    );
    expect(moduleToPath("operations-hub", "detail", "task-1")).toBe(
      "/app/operations/tasks/task-1",
    );
    expect(moduleToPath("warehouse", "list", undefined, "inbound")).toBe(
      "/app/warehouse/inbound",
    );
    expect(moduleToPath("vehicles", "detail", "V-1", "fuel")).toBe(
      "/app/vehicles/V-1?tab=fuel",
    );
    expect(moduleToPath("inspection", "detail", "INSP-1", "issues")).toBe(
      "/app/inspection/INSP-1?tab=issues",
    );
    expect(moduleToPath("fuel-energy", "detail", "F-1")).toBe("/app/fuel/F-1");
    expect(moduleToPath("fuel-energy", "create")).toBe("/app/fuel/new");
    expect(moduleToPath("compliance", "list", undefined, "filings")).toBe(
      "/app/compliance/filings",
    );
    expect(moduleToPath("compliance", "list", undefined, "calendar")).toBe(
      "/app/compliance",
    );
    expect(moduleToPath("fleet-map", "list", "veh-42")).toBe(
      "/app/fleet-map?vehicle=veh-42",
    );
    expect(moduleToPath("settings", "list", undefined, "billing")).toBe(
      "/app/settings/billing",
    );
  });

  it("pathToModule parses dashboard and nested routes", () => {
    expect(pathToModule("/app/dashboard")).toEqual({
      module: "dashboard",
      view: "list",
    });
    expect(pathToModule("/app/trips/new")).toEqual({
      module: "trips",
      view: "create",
    });
    expect(pathToModule("/app/trips/TX-99")).toEqual({
      module: "trips",
      view: "detail",
      id: "TX-99",
    });
    expect(
      pathToModule("/app/vehicles/V-1", new URLSearchParams("tab=fuel")),
    ).toEqual({
      module: "vehicles",
      view: "detail",
      id: "V-1",
      tab: "fuel",
    });
    expect(
      pathToModule("/app/inspection/INSP-1", new URLSearchParams("tab=issues")),
    ).toEqual({
      module: "inspection",
      view: "detail",
      id: "INSP-1",
      tab: "issues",
    });
    expect(pathToModule("/app/fuel/FE-1")).toEqual({
      module: "fuel-energy",
      view: "detail",
      id: "FE-1",
    });
    expect(pathToModule("/app/compliance/filings")).toEqual({
      module: "compliance",
      view: "list",
      tab: "filings",
    });
    expect(
      pathToModule("/app/fleet-map", new URLSearchParams("vehicle=veh-42")),
    ).toEqual({
      module: "fleet-map",
      view: "list",
      id: "veh-42",
    });
    expect(pathToModule("/app/settings/access-matrix")).toEqual({
      module: "access-matrix",
      view: "list",
    });
  });
});

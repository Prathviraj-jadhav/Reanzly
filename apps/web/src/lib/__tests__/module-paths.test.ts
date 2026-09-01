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
    expect(parsed).toEqual({ module: "ledger", view: "list", tab: "treasury" });
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
    expect(pathToModule("/app/settings/access-matrix")).toEqual({
      module: "access-matrix",
      view: "list",
    });
  });
});

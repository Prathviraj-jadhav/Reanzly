import { describe, expect, it } from "vitest";
import { warehouseCreateMappers } from "@/lib/warehouse/create-fields";

describe("warehouse create fields", () => {
  it("inbound mapper cannot override companyId", () => {
    const data = warehouseCreateMappers.inbound(
      { grn: "G1", refNo: "R1", companyId: "attacker-co" },
      "tenant-a",
    );
    expect(data.companyId).toBe("tenant-a");
    expect(data.grn).toBe("G1");
  });

  it("sku mapper ignores unknown fields", () => {
    const data = warehouseCreateMappers.sku(
      { skuCode: "SKU-1", name: "Widget", admin: true, companyId: "x" },
      "tenant-b",
    );
    expect(data.companyId).toBe("tenant-b");
    expect(data.skuCode).toBe("SKU-1");
    expect(data).not.toHaveProperty("admin");
  });
});

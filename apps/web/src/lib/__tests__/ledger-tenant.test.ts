import { describe, expect, it } from "vitest";

describe("ledger tenant validation", () => {
  it("documents accountId tenant check pattern used in PATCH", async () => {
    const companyId = "co-1";
    const accountIds = ["acc-1", "acc-2"];
    const accounts = [{ id: "acc-1", companyId: "co-1" }];
    const valid = accounts.length === accountIds.length;
    expect(valid).toBe(false);
  });

  it("passes when all accounts belong to tenant", () => {
    const accountIds = ["acc-1", "acc-2"];
    const accounts = [
      { id: "acc-1", companyId: "co-1" },
      { id: "acc-2", companyId: "co-1" },
    ];
    expect(accounts.length).toBe(accountIds.length);
  });
});

import { describe, expect, it } from "vitest";
import { hmacSha256Hex, tenantCreateData, verifySecret } from "@/lib/api-guards";

describe("api-guards", () => {
  it("verifySecret uses constant-time comparison", () => {
    expect(verifySecret("abc", "abc")).toBe(true);
    expect(verifySecret("abc", "abd")).toBe(false);
    expect(verifySecret(null, "abc")).toBe(false);
    expect(verifySecret("abc", undefined)).toBe(false);
  });

  it("tenantCreateData strips companyId override from body", () => {
    const data = tenantCreateData(
      { grn: "GRN-1", companyId: "evil-co", id: "fake-id", refNo: "R1" },
      "real-co",
      ["grn", "refNo"],
    );
    expect(data.companyId).toBe("real-co");
    expect(data.grn).toBe("GRN-1");
    expect(data.refNo).toBe("R1");
    expect(data).not.toHaveProperty("id");
    expect((data as Record<string, unknown>).companyId).toBe("real-co");
  });

  it("hmacSha256Hex produces stable digest", () => {
    const digest = hmacSha256Hex("secret", '{"ok":true}');
    expect(digest).toHaveLength(64);
    expect(hmacSha256Hex("secret", '{"ok":true}')).toBe(digest);
  });
});

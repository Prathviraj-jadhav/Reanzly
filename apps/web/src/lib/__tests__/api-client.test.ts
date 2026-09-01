import { describe, expect, it } from "vitest";
import { checkApiHealth } from "@/lib/api-client";

describe("api client health routing", () => {
  it("resolves v1 health path for the health domain", async () => {
    const originalFetch = globalThis.fetch;
    const calls: string[] = [];

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      calls.push(url);
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    try {
      await expect(checkApiHealth()).resolves.toEqual({ status: "ok" });
      expect(calls).toEqual(["/api/v1/health"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

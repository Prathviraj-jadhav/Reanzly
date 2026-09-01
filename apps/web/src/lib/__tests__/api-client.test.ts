import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { checkApiHealth } from "@/lib/api-client";
import { api } from "@reanzly/shared";

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

describe("api client auth routing", () => {
  const originalFetch = globalThis.fetch;
  const originalAuthFlag = process.env.NEXT_PUBLIC_AUTH_API_VERSION;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_AUTH_API_VERSION = "v1";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalAuthFlag === undefined) {
      delete process.env.NEXT_PUBLIC_AUTH_API_VERSION;
    } else {
      process.env.NEXT_PUBLIC_AUTH_API_VERSION = originalAuthFlag;
    }
  });

  it("resolves v1 auth path by default", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calls.push(typeof input === "string" ? input : input.toString());
      return new Response(JSON.stringify({ user: null }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    await expect(api("auth/me", { domain: "auth" })).rejects.toBeDefined();
    expect(calls).toEqual(["/api/v1/auth/me"]);
  });

  it("falls back to legacy auth when flag is legacy", async () => {
    process.env.NEXT_PUBLIC_AUTH_API_VERSION = "legacy";
    const calls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calls.push(typeof input === "string" ? input : input.toString());
      return new Response(JSON.stringify({ user: null }), { status: 401 });
    }) as typeof fetch;

    await expect(api("auth/me", { domain: "auth" })).rejects.toBeDefined();
    expect(calls).toEqual(["/api/auth/me"]);
  });
});

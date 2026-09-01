import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { api } from "@reanzly/shared";

describe("api client pilot domain routing", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_REMINDERS_API_VERSION;
    delete process.env.NEXT_PUBLIC_KNOWLEDGE_API_VERSION;
    delete process.env.NEXT_PUBLIC_HELPDESK_API_VERSION;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("routes reminders to v1 by default", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calls.push(typeof input === "string" ? input : input.toString());
      return new Response(JSON.stringify({ reminders: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    await api("reminders", { domain: "reminders" });
    expect(calls).toEqual(["/api/v1/reminders"]);
  });

  it("routes knowledge to legacy when flag set", async () => {
    process.env.NEXT_PUBLIC_KNOWLEDGE_API_VERSION = "legacy";
    const calls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calls.push(typeof input === "string" ? input : input.toString());
      return new Response(JSON.stringify({ articles: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    await api("knowledge", { domain: "knowledge" });
    expect(calls).toEqual(["/api/knowledge"]);
  });

  it("routes helpdesk detail to v1 by default", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calls.push(typeof input === "string" ? input : input.toString());
      return new Response(JSON.stringify({ ticket: { id: "1" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    await api("helpdesk/TKT-2841", { domain: "helpdesk" });
    expect(calls).toEqual(["/api/v1/helpdesk/TKT-2841"]);
  });
});

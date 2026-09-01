import { describe, expect, it } from "vitest";
import { HealthResponseSchema } from "@reanzly/contracts";
import { buildApp } from "../src/server.js";

describe("GET /v1/health", () => {
  it(
    "returns 200 with contract-valid body and no leakage",
    async () => {
      const { app } = await buildApp();
      const response = await app.inject({
        method: "GET",
        url: "/v1/health",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(HealthResponseSchema.parse(body)).toEqual({ status: "ok" });
      expect(Object.keys(body)).toEqual(["status"]);
      await app.close();
    },
    15_000,
  );
});

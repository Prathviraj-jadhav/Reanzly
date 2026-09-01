import type { FastifyInstance } from "fastify";
import { HealthResponseSchema } from "@reanzly/contracts";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/v1/health", async () => {
    return HealthResponseSchema.parse({ status: "ok" });
  });
}

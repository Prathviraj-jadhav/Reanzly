import Fastify from "fastify";
import cors from "@fastify/cors";
import { loadApiEnv } from "./env.js";
import { registerErrorHandler } from "./plugins/error-handler.js";
import { resolveRequestAuth } from "./plugins/auth.js";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { remindersRoutes } from "./modules/reminders/routes.js";
import { knowledgeRoutes } from "./modules/knowledge/routes.js";
import { helpdeskRoutes } from "./modules/helpdesk/routes.js";
import { warehouseRoutes } from "./modules/warehouse/routes.js";

export async function buildApp() {
  const env = loadApiEnv();
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
    },
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN ?? true,
    credentials: true,
  });

  registerErrorHandler(app);

  app.addHook("preHandler", async (request) => {
    request.auth = await resolveRequestAuth(request);
  });

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(remindersRoutes);
  await app.register(knowledgeRoutes);
  await app.register(helpdeskRoutes);
  await app.register(warehouseRoutes);

  return { app, env };
}

export async function startServer() {
  const { app, env } = await buildApp();

  await app.listen({ host: env.API_HOST, port: env.API_PORT });
  app.log.info({ host: env.API_HOST, port: env.API_PORT }, "Reanzly API listening");

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "shutting down API");
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  return app;
}

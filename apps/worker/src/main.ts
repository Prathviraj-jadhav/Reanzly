import { checkWorkerHealth } from "./health.js";

const POLL_MS = 30_000;

export async function startWorkerProcess() {
  const health = await checkWorkerHealth();
  console.log("[worker] started", health);

  const interval = setInterval(() => {
    void checkWorkerHealth().then((next) => {
      console.log("[worker] health", next);
    });
  }, POLL_MS);

  const shutdown = async (signal: string) => {
    console.log("[worker] shutting down", { signal });
    clearInterval(interval);
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

import { db } from "@reanzly/database";

export type WorkerHealth = {
  status: "ok" | "degraded";
  database: "connected" | "disconnected";
};

export async function checkWorkerHealth(): Promise<WorkerHealth> {
  try {
    await db.$queryRaw`SELECT 1`;
    return { status: "ok", database: "connected" };
  } catch {
    return { status: "degraded", database: "disconnected" };
  }
}

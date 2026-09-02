import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PORT = process.env.PLAYWRIGHT_PORT ?? "3099";
const PORT_FLAG_OFF = process.env.PLAYWRIGHT_PORT_FLAG_OFF ?? "3110";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const baseURLFlagOff =
  process.env.PLAYWRIGHT_BASE_URL_FLAG_OFF ?? `http://127.0.0.1:${PORT_FLAG_OFF}`;

/** Load DATABASE_URL (and peers) from repo root for real-session E2E. */
function loadRootEnvFile(name: string): void {
  const filePath = resolve(__dirname, "../..", name);
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadRootEnvFile(".env");
loadRootEnvFile(".env.production");

// Prisma + Supabase transaction pooler (6543) breaks prepared statements in dev;
// prefer the direct session URL for deterministic E2E auth.
if (process.env.DIRECT_URL && process.env.PLAYWRIGHT_USE_POOLER !== "1") {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const migrationFlag = process.env.NEXT_PUBLIC_ROUTING_MIGRATION ?? "1";
const flagOffMode = migrationFlag !== "1";
const effectivePort = flagOffMode ? PORT_FLAG_OFF : PORT;
const effectiveBaseURL = flagOffMode ? baseURLFlagOff : baseURL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: effectiveBaseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: flagOffMode ? "chromium-flag-off" : "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: `npx next dev -p ${effectivePort}`,
        url: effectiveBaseURL,
        reuseExistingServer: false,
        timeout: 180_000,
        env: {
          ...process.env,
          E2E_TEST_MODE: "1",
          NEXT_PUBLIC_ROUTING_MIGRATION: migrationFlag,
          // Keep auth on Next.js route handlers during E2E (Fastify not started).
          NEXT_PUBLIC_AUTH_API_VERSION: "legacy",
          REANZLY_AUTH_API_VERSION: "legacy",
        },
      },
});

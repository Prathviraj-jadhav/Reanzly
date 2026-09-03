import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PORT = process.env.PLAYWRIGHT_PORT ?? "3099";
const PORT_FLAG_OFF = process.env.PLAYWRIGHT_PORT_FLAG_OFF ?? "3110";
const PORT_PROD = process.env.PLAYWRIGHT_PORT_PROD ?? "3120";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const baseURLFlagOff =
  process.env.PLAYWRIGHT_BASE_URL_FLAG_OFF ?? `http://127.0.0.1:${PORT_FLAG_OFF}`;
const baseURLProd =
  process.env.PLAYWRIGHT_BASE_URL_PROD ?? `http://127.0.0.1:${PORT_PROD}`;

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

if (process.env.DIRECT_URL && process.env.PLAYWRIGHT_USE_POOLER !== "1") {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const migrationFlag = process.env.NEXT_PUBLIC_ROUTING_MIGRATION ?? "1";
const flagOffMode = migrationFlag !== "1";
const prodMode = process.env.PLAYWRIGHT_PROD_MODE === "1";
const effectivePort = prodMode ? PORT_PROD : flagOffMode ? PORT_FLAG_OFF : PORT;
const effectiveBaseURL = prodMode ? baseURLProd : flagOffMode ? baseURLFlagOff : baseURL;
const distDir = flagOffMode ? ".next-flag-off" : prodMode ? ".next" : ".next-e2e-flag-on";

/**
 * Runtime env for Playwright-owned servers.
 * NOTE: `NEXT_PUBLIC_*` is inlined at `next build` time for production —
 * prod E2E must rebuild with the same public flags (see build:web command used
 * before PLAYWRIGHT_PROD_MODE=1).
 */
const webServerEnvBase = {
  E2E_TEST_MODE: "1",
  NEXT_PUBLIC_AUTH_API_VERSION: "legacy",
  REANZLY_AUTH_API_VERSION: "legacy",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  reporter: process.env.PLAYWRIGHT_JSON
    ? [["list"], ["json", { outputFile: "playwright-report.json" }]]
    : [["list"]],
  use: {
    baseURL: effectiveBaseURL,
    trace: "on-first-retry",
  },
  projects: prodMode
    ? [
        { name: "setup", testMatch: /auth\.setup\.ts/, use: { baseURL: baseURLProd } },
        {
          name: "chromium-prod",
          use: { ...devices["Desktop Chrome"], actionTimeout: 30_000 },
          dependencies: ["setup"],
          testMatch: /routing-b0r8p\.spec\.ts/,
          grep: /30[1-9]\.|31[0-9]\.|320\./,
          timeout: 120_000,
        },
      ]
    : [
        { name: "setup", testMatch: /auth\.setup\.ts/ },
        {
          name: flagOffMode ? "chromium-flag-off" : "chromium",
          use: { ...devices["Desktop Chrome"] },
          dependencies: ["setup"],
          grep: flagOffMode ? /@flag-off/ : undefined,
          grepInvert: flagOffMode ? undefined : /@flag-off/,
          testIgnore: /auth\.setup\.ts/,
        },
      ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : prodMode
      ? {
          command: "node server.js",
          url: baseURLProd,
          reuseExistingServer: false,
          timeout: 180_000,
          cwd: resolve(__dirname, ".next/standalone/apps/web"),
          env: {
            ...process.env,
            ...webServerEnvBase,
            NODE_ENV: "production",
            PORT: PORT_PROD,
            HOSTNAME: "127.0.0.1",
            NEXT_PUBLIC_ROUTING_MIGRATION: "1",
          },
        }
      : {
          command: `npx next dev -p ${effectivePort}`,
          url: effectiveBaseURL,
          reuseExistingServer: false,
          timeout: 180_000,
          env: {
            ...process.env,
            ...webServerEnvBase,
            NEXT_PUBLIC_ROUTING_MIGRATION: migrationFlag,
            NEXT_DIST_DIR: distDir,
          },
        },
});

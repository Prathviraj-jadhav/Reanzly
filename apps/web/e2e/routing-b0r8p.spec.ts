import { test, expect } from "@playwright/test";
import {
  test as authTest,
  expect as authExpect,
  E2E_OWNER_EMAIL,
  E2E_OWNER_PASSWORD,
  loginViaApi,
} from "./fixtures/auth";

const migrationOff = (process.env.NEXT_PUBLIC_ROUTING_MIGRATION ?? "1") !== "1";

async function loginOwner(page: import("@playwright/test").Page) {
  await loginViaApi(page.request, E2E_OWNER_EMAIL, E2E_OWNER_PASSWORD);
  await page.goto("/app/dashboard");
  await expect(page).toHaveURL(/\/app\/dashboard/);
}

test.describe("B0R-8P — decommission-critical (flag ON)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(migrationOff, "Requires NEXT_PUBLIC_ROUTING_MIGRATION=1");
    await loginOwner(page);
  });

  test("301. sidebar trips nav updates URL", async ({ page }) => {
    await page.getByRole("button", { name: "Trips", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/trips$/);
  });

  test("302. sidebar vehicles nav updates URL", async ({ page }) => {
    await page.getByRole("button", { name: "Vehicles", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/vehicles$/);
  });

  test("303. command palette opens and navigates to settings", async ({ page }) => {
    await page.keyboard.press("Control+k");
    await page.getByRole("option", { name: /^Settings$/ }).click();
    await expect(page).toHaveURL(/\/app\/settings/);
  });

  test("304. fleet cluster tab inspection URL", async ({ page }) => {
    await page.goto("/app/vehicles");
    await page.getByRole("button", { name: "Inspection" }).click();
    await expect(page).toHaveURL(/\/app\/inspection$/);
  });

  test("305. trips list deep link refresh", async ({ page }) => {
    await page.goto("/app/trips");
    await page.reload({ waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/app\/trips$/);
  });

  test("306. settings tab URL segment", async ({ page }) => {
    await page.goto("/app/settings/notifications");
    await expect(page).toHaveURL(/\/app\/settings\/notifications/);
  });

  test("307. financial-ops alias redirects to ledger treasury", async ({ page }) => {
    await page.goto("/app/financial-ops");
    await expect(page).toHaveURL(/\/app\/ledger\/treasury/);
  });

  test("308. app-store alias redirects to integrations", async ({ page }) => {
    await page.goto("/app/app-store");
    await expect(page).toHaveURL(/\/app\/integrations/);
  });

  test("309. legacy /dashboard redirects to /app/dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/app\/dashboard/);
  });

  test("310. /app index redirects to dashboard", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/app\/dashboard/);
  });

  test("311. back from trip detail returns to list URL", async ({ page }) => {
    await page.goto("/app/trips");
    const firstRow = page.locator("table tbody tr").first();
    if (await firstRow.count()) {
      await firstRow.click();
      await expect(page).toHaveURL(/\/app\/trips\/.+/);
      await page.getByRole("button", { name: /go back/i }).click();
      await expect(page).toHaveURL(/\/app\/trips$/);
    }
  });

  test("312. invoice module list URL", async ({ page }) => {
    await page.goto("/app/invoice");
    await expect(page).toHaveURL(/\/app\/invoice$/);
  });

  test("313. CRM cluster customers tab", async ({ page }) => {
    await page.goto("/app/crm");
    await page.getByRole("button", { name: "Customers" }).click();
    await expect(page).toHaveURL(/\/app\/customers$/);
  });

  test("314. documents cluster knowledge tab", async ({ page }) => {
    await page.goto("/app/documents");
    await page.getByRole("button", { name: "Knowledge Base" }).click();
    await expect(page).toHaveURL(/\/app\/knowledge$/);
  });

  test("315. chat module URL", async ({ page }) => {
    await page.goto("/app/chat");
    await expect(page).toHaveURL(/\/app\/chat$/);
  });

  test("316. warehouse module URL", async ({ page }) => {
    await page.goto("/app/warehouse");
    await expect(page).toHaveURL(/\/app\/warehouse$/);
  });

  test("317. operations hub URL", async ({ page }) => {
    await page.goto("/app/operations");
    await expect(page).toHaveURL(/\/app\/operations$/);
  });

  test("318. ledger module URL", async ({ page }) => {
    await page.goto("/app/ledger");
    await expect(page).toHaveURL(/\/app\/ledger$/);
  });

  test("319. reports module URL", async ({ page }) => {
    await page.goto("/app/reports");
    await expect(page).toHaveURL(/\/app\/reports$/);
  });

  test("320. hard refresh on /app/vehicles preserves URL", async ({ page }) => {
    await page.goto("/app/vehicles");
    await page.reload({ waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/app\/vehicles$/);
  });
});

test.describe("B0R-8P — rollback (flag OFF)", () => {
  test("321. legacy /dashboard SPA when migration OFF", async ({ page }) => {
    test.skip(!migrationOff, "Requires NEXT_PUBLIC_ROUTING_MIGRATION=0");
    await loginViaApi(page.request, E2E_OWNER_EMAIL, E2E_OWNER_PASSWORD);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("body")).toBeVisible();
  });
});

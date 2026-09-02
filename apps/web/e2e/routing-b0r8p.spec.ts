import { test, expect } from "@playwright/test";
import {
  test as authTest,
  expect as authExpect,
  loginViaApi,
} from "./fixtures/auth";

const migrationOff = (process.env.NEXT_PUBLIC_ROUTING_MIGRATION ?? "1") !== "1";

function sidebarNav(page: import("@playwright/test").Page, label: string) {
  return page.getByRole("complementary").getByRole("button", { name: label, exact: true });
}

async function openCommandPalette(page: import("@playwright/test").Page) {
  await page.locator("header button").filter({ has: page.locator("kbd") }).click();
  await authExpect(page.getByPlaceholder(/search across reanzly/i)).toBeVisible({ timeout: 10_000 });
}

authTest.describe("B0R-8P — decommission-critical (flag ON)", () => {
  authTest.beforeEach(async ({ authenticatedPage: page }) => {
    authTest.skip(migrationOff, "Requires NEXT_PUBLIC_ROUTING_MIGRATION=1");
    await page.goto("/app/dashboard");
    await authExpect(page).toHaveURL(/\/app\/dashboard/);
  });

  authTest("301. sidebar trips nav updates URL", async ({ authenticatedPage: page }) => {
    await sidebarNav(page, "Trips").click();
    await authExpect(page).toHaveURL(/\/app\/trips$/);
  });

  authTest("302. sidebar vehicles nav updates URL", async ({ authenticatedPage: page }) => {
    await sidebarNav(page, "Vehicles").click();
    await authExpect(page).toHaveURL(/\/app\/vehicles$/);
  });

  authTest("303. command palette opens and navigates to settings", async ({ authenticatedPage: page }) => {
    await openCommandPalette(page);
    await page.getByPlaceholder(/search across reanzly/i).fill("Settings");
    await page.getByRole("option", { name: /^Settings$/ }).click();
    await authExpect(page).toHaveURL(/\/app\/settings/);
  });

  authTest("304. fleet cluster tab inspection URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/vehicles");
    await page.getByRole("button", { name: "Inspection" }).click();
    await authExpect(page).toHaveURL(/\/app\/inspection$/);
  });

  authTest("305. trips list deep link refresh", async ({ authenticatedPage: page }) => {
    await page.goto("/app/trips");
    await page.reload({ waitUntil: "networkidle" });
    await authExpect(page).toHaveURL(/\/app\/trips$/);
  });

  authTest("306. settings tab URL segment", async ({ authenticatedPage: page }) => {
    await page.goto("/app/settings/notifications");
    await authExpect(page).toHaveURL(/\/app\/settings\/notifications/);
  });

  authTest("307. financial-ops alias redirects to ledger treasury", async ({ authenticatedPage: page }) => {
    await page.goto("/app/financial-ops");
    await authExpect(page).toHaveURL(/\/app\/ledger\/treasury/);
  });

  authTest("308. app-store alias redirects to integrations", async ({ authenticatedPage: page }) => {
    await page.goto("/app/app-store");
    await authExpect(page).toHaveURL(/\/app\/integrations/);
  });

  authTest("309. legacy /dashboard redirects to /app/dashboard", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");
    await authExpect(page).toHaveURL(/\/app\/dashboard/);
  });

  authTest("310. /app index redirects to dashboard", async ({ authenticatedPage: page }) => {
    await page.goto("/app");
    await authExpect(page).toHaveURL(/\/app\/dashboard/);
  });

  authTest("311. back from trip detail returns to list URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/trips");
    const firstRow = page.locator("table tbody tr").first();
    if (await firstRow.count()) {
      await firstRow.click();
      await authExpect(page).toHaveURL(/\/app\/trips\/.+/);
      await page.getByRole("button", { name: /go back/i }).click();
      await authExpect(page).toHaveURL(/\/app\/trips$/);
    }
  });

  authTest("312. invoice module list URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/invoice");
    await authExpect(page).toHaveURL(/\/app\/invoice$/);
  });

  authTest("313. CRM cluster customers tab", async ({ authenticatedPage: page }) => {
    await page.goto("/app/crm");
    await page.getByRole("button", { name: "Customers" }).click();
    await authExpect(page).toHaveURL(/\/app\/customers$/);
  });

  authTest("314. documents cluster knowledge tab", async ({ authenticatedPage: page }) => {
    await page.goto("/app/documents");
    await page.getByRole("button", { name: "Knowledge Base" }).click();
    await authExpect(page).toHaveURL(/\/app\/knowledge$/);
  });

  authTest("315. chat module URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/chat");
    await authExpect(page).toHaveURL(/\/app\/chat$/);
  });

  authTest("316. warehouse module URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/warehouse");
    await authExpect(page).toHaveURL(/\/app\/warehouse$/);
  });

  authTest("317. operations hub URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/operations");
    await authExpect(page).toHaveURL(/\/app\/operations$/);
  });

  authTest("318. ledger module URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/ledger");
    await authExpect(page).toHaveURL(/\/app\/ledger$/);
  });

  authTest("319. reports module URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/reports");
    await authExpect(page).toHaveURL(/\/app\/reports$/);
  });

  authTest("320. hard refresh on /app/vehicles preserves URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/vehicles");
    await page.reload({ waitUntil: "networkidle" });
    await authExpect(page).toHaveURL(/\/app\/vehicles$/);
  });
});

test.describe("B0R-8P — rollback (flag OFF)", () => {
  test("321. legacy /dashboard SPA when migration OFF", async ({ browser }) => {
    test.skip(!migrationOff, "Requires NEXT_PUBLIC_ROUTING_MIGRATION=0");
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    await loginViaApi(page.request);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("body")).toBeVisible();
    await context.close();
  });
});

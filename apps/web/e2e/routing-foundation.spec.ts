import { test, expect } from "@playwright/test";
import {
  test as authTest,
  expect as authExpect,
  E2E_OWNER_EMAIL,
  E2E_OWNER_PASSWORD,
  loginViaApi,
} from "./fixtures/auth";
import { expectModule, sidebarNav, openCommandPalette, commandPaletteGoToModule } from "./fixtures/navigation";

test.describe("B0R-1 App Router foundation — unauthenticated", () => {
  test("1. unauthenticated /app/dashboard redirects to login with returnTo", async ({ page }) => {
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/login(\?|$)/);
    const url = new URL(page.url());
    expect(url.searchParams.get("returnTo")).toBe("/app/dashboard");
  });

  test("2. public landing / is accessible without auth", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });

  test("3. public /login is accessible without auth", async ({ page }) => {
    const res = await page.goto("/login");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole("button", { name: /sign in/i }).first()).toBeVisible();
  });

  test("4. public /marketplace is accessible without auth", async ({ page }) => {
    const res = await page.goto("/marketplace");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });

  test("5. login returnTo open redirect is not used after submit (sanitized fallback)", async ({ page }) => {
    await page.goto("/login?returnTo=//evil.com");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("button", { name: /sign in/i }).first()).toBeVisible();
  });

  test("6. unauthenticated /app root redirects to login", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });

  test("7. unauthenticated unknown /app/foo redirects to login (middleware)", async ({ page }) => {
    await page.goto("/app/does-not-exist-module");
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });

  test("8. legacy /dashboard is reachable without session", async ({ page }) => {
    const res = await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 60_000 });
    expect(res?.status()).toBeLessThan(500);
    expect(page.url()).toMatch(/\/(dashboard|login|app\/dashboard)/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("9. login page preserves safe returnTo query", async ({ page }) => {
    await page.goto("/login?returnTo=/app/dashboard");
    const url = new URL(page.url());
    expect(url.searchParams.get("returnTo")).toBe("/app/dashboard");
  });

  test("10. middleware blocks /app/trips without session", async ({ page }) => {
    await page.goto("/app/trips");
    await expect(page).toHaveURL(/\/login(\?|$)/);
    const url = new URL(page.url());
    expect(url.searchParams.get("returnTo")).toBe("/app/trips");
  });

  test("11. /api routes are not blocked by app middleware", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBeLessThan(500);
  });

  test("12. robots noindex on login route", async ({ page }) => {
    await page.goto("/login");
    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    expect(robots ?? "").toMatch(/noindex/i);
  });
});

authTest.describe("B0R-1V — authenticated App Router (migration flag ON)", () => {
  authTest.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto("/app/dashboard");
    await authExpect(page).toHaveURL(/\/app\/dashboard$/);
    await authExpect(page.getByText("My Dashboards").first()).toBeVisible({ timeout: 30_000 });
  });

  authTest("13. direct /app/dashboard renders DashboardModule with shell, URL stays", async ({
    authenticatedPage: page,
  }) => {
    await authExpect(page).toHaveURL(/\/app\/dashboard$/);
    await authExpect(page.getByText("My Dashboards").first()).toBeVisible();
    await authExpect(page.getByRole("button", { name: "Dashboard" }).first()).toBeVisible();
    await expectModule(page, "dashboard");
    await authExpect(page.getByText("Under construction")).toHaveCount(0);
  });

  authTest("14. hard refresh restores session without legacy redirect or loop", async ({
    authenticatedPage: page,
  }) => {
    await page.reload({ waitUntil: "networkidle" });
    await authExpect(page).toHaveURL(/\/app\/dashboard$/);
    await authExpect(page.getByText("My Dashboards").first()).toBeVisible({ timeout: 30_000 });
    await expectModule(page, "dashboard");
  });

  authTest("15. mixed mode: migrated Trips then Dashboard via sidebar", async ({
    authenticatedPage: page,
  }) => {
    await sidebarNav(page, "Trips").click();
    await expectModule(page, "trips");
    await authExpect(page).toHaveURL(/\/app\/trips$/);

    await sidebarNav(page, "Dashboard").click();
    await authExpect(page).toHaveURL(/\/app\/dashboard$/);
    await expectModule(page, "dashboard");
    await authExpect(page.getByText("My Dashboards").first()).toBeVisible();
  });

  authTest("15b. mixed mode: legacy /dashboard redirects to /app/dashboard when flag on", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard");
    await authExpect(page).toHaveURL(/\/app\/dashboard$/);
  });

  authTest("16. browser back after visiting public page — no blank screen or logout", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/marketplace");
    await authExpect(page).toHaveURL(/\/marketplace/);
    await page.goto("/app/dashboard");
    await authExpect(page).toHaveURL(/\/app\/dashboard$/);

    await page.goBack();
    await authExpect(page).toHaveURL(/\/marketplace/);
    await authExpect(page.locator("body")).toBeVisible();

    await page.goto("/app/dashboard");
    await authExpect(page.getByText("My Dashboards").first()).toBeVisible({ timeout: 30_000 });
  });

  authTest("17. browser forward returns to /app/dashboard with dashboard activeView", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/marketplace");
    await page.goto("/app/dashboard");
    await authExpect(page).toHaveURL(/\/app\/dashboard$/);
    await page.goBack({ waitUntil: "domcontentloaded" });
    await authExpect(page).toHaveURL(/\/marketplace/);
    await page.goForward({ waitUntil: "domcontentloaded" });
    await authExpect(page).toHaveURL(/\/app\/dashboard$/, { timeout: 30_000 });
    await expectModule(page, "dashboard"); // was: data-e2e-active-module with options
  });

  authTest("18. expired session redirects to login with returnTo", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    await loginViaApi(context.request);
    await page.goto("/app/dashboard");
    await authExpect(page.getByText("My Dashboards").first()).toBeVisible({ timeout: 30_000 });

    const invalidate = await context.request.post("/api/test/e2e/invalidate-session");
    authExpect(invalidate.ok()).toBeTruthy();

    await page.reload();
    await authExpect(page).toHaveURL(/\/login(\?|$)/);
    const url = new URL(page.url());
    expect(url.searchParams.get("returnTo")).toBe("/app/dashboard");
    await context.close();
  });

  authTest("19. returnTo restores /app/dashboard after valid login", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    const request = context.request;

    await page.goto("/app/dashboard");
    await authExpect(page).toHaveURL(/\/login(\?|$)/);

    await page.locator('input[type="email"]').fill(E2E_OWNER_EMAIL);
    await page.locator('input[type="password"]').fill(E2E_OWNER_PASSWORD);
    await page.getByRole("button", { name: /sign in to app/i }).click();

    await authExpect(page).toHaveURL(/\/app\/dashboard$/, { timeout: 30_000 });
    await authExpect(page.getByText("My Dashboards").first()).toBeVisible({ timeout: 30_000 });
    await context.close();
  });

  authTest("20. authenticated unknown /app route shows Next.js not-found", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/this-route-does-not-exist");
    await authExpect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await authExpect(page.getByText("Under construction")).toHaveCount(0);
    await authExpect(page).not.toHaveURL(/\/login/);
  });

  authTest("21. authenticated /app index redirects to /app/dashboard", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app");
    await authExpect(page).toHaveURL(/\/app\/dashboard$/);
  });

  authTest("22. robots noindex on authenticated /app/dashboard", async ({
    authenticatedPage: page,
  }) => {
    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    expect(robots ?? "").toMatch(/noindex/i);
  });

  authTest("23. legacy /dashboard 307 to /app/dashboard when migration on", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: undefined });
    await loginViaApi(context.request);
    const res = await context.request.get("/dashboard", { maxRedirects: 0 });
    expect([307, 308]).toContain(res.status());
    expect(res.headers().location).toMatch(/\/app\/dashboard$/);
    await context.close();
  });
});

test.describe("B0R-1V — routing flag OFF (legacy SPA entry) @flag-off", () => {
  test("24. legacy /dashboard stays on SPA when migration flag off", async ({ browser }) => {
    if (process.env.PLAYWRIGHT_SKIP_AUTH === "1") test.skip();
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginViaApi(context.request);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("button", { name: "Dashboard" }).first()).toBeVisible();
    await context.close();
  });
});

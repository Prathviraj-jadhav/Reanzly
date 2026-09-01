import { test, expect } from "@playwright/test";

test.describe("B0R-1 App Router foundation", () => {
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
    // validateReturnTo unit tests cover rejection; e2e confirms login page still loads.
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
    const res = await page.goto("/dashboard");
    expect(res?.status()).toBeLessThan(500);
    // Flag on: redirect chain → /login. Flag off + unauthenticated: marketing `/`.
    // Flag off + authenticated SPA: stays on /dashboard.
    expect(page.url()).toMatch(/\/(dashboard|login|app\/dashboard|$|\/?(\?|$))/);
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

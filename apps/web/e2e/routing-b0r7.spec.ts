import { test, expect } from "@playwright/test";
import { expectModule } from "./fixtures/navigation";
import { loginPortalUserOnPage, PORTAL_USERS } from "./fixtures/portal-auth";

test.describe("B0R-7 — portal App Router (migration flag ON)", () => {
  test.describe("Superadmin /admin", () => {
    test.beforeEach(async ({ page }) => {
      await loginPortalUserOnPage(page, "superadmin");
    });

    test("209. direct /admin renders overview", async ({ page }) => {
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/admin$/);
      await expect(page.locator("[data-e2e-portal='admin']")).toBeVisible();
      await expect(page.locator("[data-e2e-portal-view='overview']")).toBeVisible();
    });

    test("210. /admin/tickets deep link", async ({ page }) => {
      await page.goto("/admin/tickets");
      await expect(page).toHaveURL(/\/admin\/tickets$/);
      await expect(page.locator("[data-e2e-portal-view='tickets']")).toBeVisible();
    });

    test("211. admin nav click updates URL", async ({ page }) => {
      await page.goto("/admin");
      await page.locator("[data-e2e-portal-nav='billing']").click();
      await expect(page).toHaveURL(/\/admin\/billing$/);
      await expect(page.locator("[data-e2e-portal-view='billing']")).toBeVisible();
    });

    test("212. invalid admin view message", async ({ page }) => {
      await page.goto("/admin/not-a-view");
      await expect(page.getByText(/unknown admin view/i)).toBeVisible();
    });

    test("213. hard refresh on /admin/billing", async ({ page }) => {
      await page.goto("/admin/billing");
      await page.reload({ waitUntil: "networkidle" });
      await expect(page).toHaveURL(/\/admin\/billing$/);
      await expect(page.locator("[data-e2e-portal-view='billing']")).toBeVisible();
    });

    test("214. /app/superadmin redirects to /admin", async ({ page }) => {
      await page.goto("/app/superadmin");
      await expect(page).toHaveURL(/\/admin$/);
    });
  });

  test.describe("Broker portal /broker", () => {
    test.beforeEach(async ({ page }) => {
      await loginPortalUserOnPage(page, "broker");
    });

    test("215. direct /broker overview", async ({ page }) => {
      await page.goto("/broker");
      await expect(page).toHaveURL(/\/broker$/);
      await expect(page.locator("[data-e2e-portal='broker']")).toBeVisible();
    });

    test("216. /broker/settlements deep link", async ({ page }) => {
      await page.goto("/broker/settlements");
      await expect(page).toHaveURL(/\/broker\/settlements$/);
      await expect(page.locator("[data-e2e-portal-view='settlements']")).toBeVisible();
    });

    test("217. broker nav updates URL", async ({ page }) => {
      await page.goto("/broker");
      await page.locator("[data-e2e-portal-nav='marketplace']").click();
      await expect(page).toHaveURL(/\/broker\/marketplace$/);
    });

    test("218. invalid broker portal view", async ({ page }) => {
      await page.goto("/broker/not-a-view");
      await expect(page.getByText(/unknown broker portal view/i)).toBeVisible();
    });

    test("219. broker portal distinct from desktop /app/broker/console", async ({ page }) => {
      await page.goto("/broker");
      await expect(page.locator("[data-e2e-portal='broker']")).toBeVisible();
      await page.goto("/app/broker/console");
      await expect(page).not.toHaveURL(/\/broker$/);
      await expect(page.locator("[data-e2e-portal='broker']")).not.toBeVisible();
    });
  });

  test.describe("Vendor /vendor", () => {
    test.beforeEach(async ({ page }) => {
      await loginPortalUserOnPage(page, "vendor");
    });

    test("220. direct /vendor overview", async ({ page }) => {
      await page.goto("/vendor");
      await expect(page).toHaveURL(/\/vendor$/);
      await expect(page.locator("[data-e2e-portal='vendor']")).toBeVisible();
    });

    test("221. /vendor/invoices deep link", async ({ page }) => {
      await page.goto("/vendor/invoices");
      await expect(page).toHaveURL(/\/vendor\/invoices$/);
      await expect(page.locator("[data-e2e-portal-view='invoices']")).toBeVisible();
    });

    test("222. vendor nav updates URL", async ({ page }) => {
      await page.goto("/vendor");
      await page.locator("[data-e2e-portal-nav='shipments']").click();
      await expect(page).toHaveURL(/\/vendor\/shipments$/);
    });

    test("223. invalid vendor view", async ({ page }) => {
      await page.goto("/vendor/not-a-view");
      await expect(page.getByText(/unknown vendor portal view/i)).toBeVisible();
    });

    test("224. vendor hard refresh /vendor/ledger", async ({ page }) => {
      await page.goto("/vendor/ledger");
      await page.reload({ waitUntil: "networkidle" });
      await expect(page).toHaveURL(/\/vendor\/ledger$/);
    });
  });

  test.describe("Driver field /field/driver", () => {
    test.beforeEach(async ({ page }) => {
      await loginPortalUserOnPage(page, "driver");
    });

    test("225. direct /field/driver home", async ({ page }) => {
      await page.goto("/field/driver");
      await expect(page).toHaveURL(/\/field\/driver$/);
      await expect(page.locator("[data-e2e-portal='driver']")).toBeVisible();
      await expect(page.locator("[data-e2e-portal-tab='home']")).toBeVisible();
    });

    test("226. /field/driver/trips deep link", async ({ page }) => {
      await page.goto("/field/driver/trips");
      await expect(page).toHaveURL(/\/field\/driver\/trips$/);
      await expect(page.locator("[data-e2e-portal-tab='trips']")).toBeVisible();
    });

    test("227. driver bottom nav updates URL", async ({ page }) => {
      await page.goto("/field/driver");
      await page.getByRole("button", { name: "Trips", exact: true }).click();
      await expect(page).toHaveURL(/\/field\/driver\/trips$/);
    });

    test("228. invalid driver tab", async ({ page }) => {
      await page.goto("/field/driver/not-a-tab");
      await expect(page.getByText(/unknown driver tab/i)).toBeVisible();
    });

    test("229. driver /app/dashboard redirects to field app", async ({ page }) => {
      await page.goto("/app/dashboard");
      await expect(page).toHaveURL(/\/field\/driver/);
    });
  });

  test.describe("Warehouse field /field/warehouse", () => {
    test.beforeEach(async ({ page }) => {
      await loginPortalUserOnPage(page, "warehouse");
    });

    test("230. direct /field/warehouse home", async ({ page }) => {
      await page.goto("/field/warehouse");
      await expect(page).toHaveURL(/\/field\/warehouse$/);
      await expect(page.locator("[data-e2e-portal='warehouse']")).toBeVisible();
    });

    test("231. /field/warehouse/tasks deep link", async ({ page }) => {
      await page.goto("/field/warehouse/tasks");
      await expect(page).toHaveURL(/\/field\/warehouse\/tasks$/);
      await expect(page.locator("[data-e2e-portal-tab='tasks']")).toBeVisible();
    });

    test("232. warehouse bottom nav updates URL", async ({ page }) => {
      await page.goto("/field/warehouse");
      await page.getByRole("button", { name: "Tasks", exact: true }).click();
      await expect(page).toHaveURL(/\/field\/warehouse\/tasks$/);
    });

    test("233. invalid warehouse field tab", async ({ page }) => {
      await page.goto("/field/warehouse/not-a-tab");
      await expect(page.getByText(/unknown warehouse field tab/i)).toBeVisible();
    });

    test("234. warehouse crew /app redirect", async ({ page }) => {
      await page.goto("/app/dashboard");
      await expect(page).toHaveURL(/\/field\/warehouse/);
    });
  });

  test.describe("Login landing & returnTo", () => {
    test("235. superadmin login lands on /admin", async ({ page }) => {
      await page.goto("/login");
      await page.getByRole("button", { name: /^Admin$/i }).click();
      await page.getByRole("button", { name: /Continue to admin sign-in/i }).click();
      await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    });

    test("236. broker login lands on /broker", async ({ page }) => {
      await page.goto("/login");
      await page.getByRole("button", { name: /^Freight$/i }).click();
      await page.getByRole("button", { name: /BRK Faisal/i }).dblclick();
      await expect(page).toHaveURL(/\/broker/, { timeout: 15_000 });
    });

    test("237. vendor login lands on /vendor", async ({ page }) => {
      await page.goto("/login");
      await page.getByRole("button", { name: /^Freight$/i }).click();
      await page.getByRole("button", { name: /VND Anjali/i }).dblclick();
      await expect(page).toHaveURL(/\/vendor/, { timeout: 15_000 });
    });

    test("238. driver quick login lands on /field/driver", async ({ page }) => {
      await page.goto("/login");
      await page.getByRole("button", { name: /TRK Kuldeep/i }).dblclick();
      await expect(page).toHaveURL(/\/field\/driver/, { timeout: 15_000 });
    });

    test("239. warehouse crew quick login lands on /field/warehouse", async ({ page }) => {
      await page.goto("/login");
      await page.getByRole("button", { name: /WHC Deepak/i }).dblclick();
      await expect(page).toHaveURL(/\/field\/warehouse/, { timeout: 15_000 });
    });

    test("240. cross-portal returnTo rejected for broker", async ({ page }) => {
      await page.context().clearCookies();
      await page.goto("/login?returnTo=%2Fadmin");
      await page.getByRole("button", { name: /^Freight$/i }).click();
      await page.getByLabel(/work email/i).fill(PORTAL_USERS.broker.email);
      await page.getByLabel(/^password$/i).fill("Reanzly@Demo2026");
      await page.getByRole("button", { name: /sign in to freight/i }).click();
      await expect(page).toHaveURL(/\/broker/, { timeout: 15_000 });
    });

    test("241. owner login with returnTo preserves /app path", async ({ page }) => {
      await page.goto("/login?returnTo=%2Fapp%2Ftrips");
      await page.getByLabel(/work email/i).fill(PORTAL_USERS.owner.email);
      await page.getByLabel(/^password$/i).fill("Reanzly@Demo2026");
      await page.getByRole("button", { name: /sign in to app/i }).click();
      await expect(page).toHaveURL(/\/app\/trips$/, { timeout: 15_000 });
    });
  });

  test.describe("Desktop broker modules (tenant shell)", () => {
    test.beforeEach(async ({ page }) => {
      await loginPortalUserOnPage(page, "owner");
    });

    test("242. owner /app/broker/console desktop module", async ({ page }) => {
      await page.goto("/app/broker/console");
      await expect(page).toHaveURL(/\/app\/broker\/console$/);
      await expectModule(page, "broker-console");
    });

    test("243. owner /app/broker/marketplace desktop module", async ({ page }) => {
      await page.goto("/app/broker/marketplace");
      await expect(page).toHaveURL(/\/app\/broker\/marketplace$/);
      await expectModule(page, "broker-marketplace");
    });

    test("244. owner /app/broker/settlements desktop module", async ({ page }) => {
      await page.goto("/app/broker/settlements");
      await expect(page).toHaveURL(/\/app\/broker\/settlements$/);
      await expectModule(page, "broker-settlements");
    });
  });

  test.describe("Portal access gates", () => {
    test("245. owner blocked from /admin", async ({ page, request }) => {
      await loginPortalUserOnPage(page, "owner");
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/app\/dashboard/);
    });

    test("246. driver blocked from /broker", async ({ page, request }) => {
      await loginPortalUserOnPage(page, "driver");
      await page.goto("/broker");
      await expect(page).toHaveURL(/\/field\/driver/);
    });

    test("247. vendor blocked from /field/driver", async ({ page, request }) => {
      await loginPortalUserOnPage(page, "vendor");
      await page.goto("/field/driver");
      await expect(page).toHaveURL(/\/vendor/);
    });

    test("248. unauthenticated /admin redirects to login", async ({ page }) => {
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/login\?returnTo=%2Fadmin/);
    });
  });

  test.describe("Browser history", () => {
    test.beforeEach(async ({ page }) => {
      await loginPortalUserOnPage(page, "broker");
    });

    test("249. broker back button after nav", async ({ page }) => {
      await page.goto("/broker");
      await page.locator("[data-e2e-portal-nav='quotes']").click();
      await expect(page).toHaveURL(/\/broker\/quotes$/);
      await page.goBack();
      await expect(page).toHaveURL(/\/broker$/);
    });

    test("250. broker forward button", async ({ page }) => {
      await page.goto("/broker");
      await page.locator("[data-e2e-portal-nav='quotes']").click();
      await expect(page).toHaveURL(/\/broker\/quotes$/);
      await page.goBack();
      await expect(page).toHaveURL(/\/broker$/);
      await page.goForward();
      await expect(page).toHaveURL(/\/broker\/quotes$/, { timeout: 10_000 });
    });
  });
});

test.describe("B0R-7 — legacy /dashboard portal redirect (flag ON)", () => {
  test("251. superadmin /dashboard redirects to /admin", async ({ page }) => {
    await loginPortalUserOnPage(page, "superadmin");
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/admin/);
  });
});

test.describe("B0R-7 — routing flag OFF rollback @flag-off", () => {
  test("252. flag OFF keeps broker on legacy /dashboard desktop shell", async ({ page }) => {
    await loginPortalUserOnPage(page, "broker");
    await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Broker Console", exact: true })).toBeVisible({
      timeout: 15_000,
    });
  });
});

import {
  test as authTest,
  expect as authExpect,
} from "./fixtures/auth";
import { loadOperationsFixture } from "./fixtures/operations";

authTest.describe("B0R-2 — core operations App Router (migration flag ON)", () => {
  authTest.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto("/app/dashboard");
    await authExpect(page).toHaveURL(/\/app\/dashboard$/);
  });

  authTest("25. sidebar Trips navigates to /app/trips", async ({ authenticatedPage: page }) => {
    await page.getByRole("button", { name: "Trips", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/trips$/);
    await authExpect(page.locator("main[data-e2e-active-module='trips']")).toBeVisible();
  });

  authTest("26. sidebar Fleet Map navigates to /app/fleet-map", async ({ authenticatedPage: page }) => {
    await page.getByRole("button", { name: "Fleet Map", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/fleet-map$/);
    await authExpect(page.locator("main[data-e2e-active-module='fleet-map']")).toBeVisible();
  });

  authTest("27. sidebar Vehicles navigates to /app/vehicles with cluster tabs", async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole("button", { name: "Vehicles", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/vehicles$/);
    await authExpect(page.getByRole("button", { name: "Overview" })).toBeVisible();
    await authExpect(page.getByRole("button", { name: "Inspection" })).toBeVisible();
  });

  authTest("28. sidebar POD navigates to /app/pod", async ({ authenticatedPage: page }) => {
    await page.getByRole("button", { name: "POD", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/pod$/);
    await authExpect(page.locator("main[data-e2e-active-module='pod']")).toBeVisible();
  });

  authTest("29. sidebar Lorry Receipts navigates to /app/lorry-receipts", async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole("button", { name: "Lorry Receipts", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/lorry-receipts$/);
    await authExpect(page.locator("main[data-e2e-active-module='lorry-receipts']")).toBeVisible();
  });

  authTest("30. trips list row opens detail URL", async ({ authenticatedPage: page, request }) => {
    const fixture = await loadOperationsFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto("/app/trips");
    await page.getByText(fixture!.tripBusinessId).first().click();
    await authExpect(page).toHaveURL(new RegExp(`/app/trips/${fixture!.tripBusinessId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  });

  authTest("31. hard refresh on trip detail keeps URL and module", async ({
    authenticatedPage: page,
    request,
  }) => {
    const fixture = await loadOperationsFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto(`/app/trips/${fixture!.tripBusinessId}`);
    await authExpect(page.locator("main[data-e2e-active-module='trips']")).toBeVisible();
    await page.reload({ waitUntil: "networkidle" });
    await authExpect(page).toHaveURL(new RegExp(`/app/trips/${fixture!.tripBusinessId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
    await authExpect(page.locator("main[data-e2e-active-module='trips']")).toBeVisible();
  });

  authTest("32. /app/trips/new opens create flow", async ({ authenticatedPage: page }) => {
    await page.goto("/app/trips/new");
    await authExpect(page).toHaveURL(/\/app\/trips\/new$/);
    await authExpect(page.locator("main[data-e2e-active-module='trips']")).toBeVisible();
  });

  authTest("33. fleet-map ?vehicle= syncs selection", async ({ authenticatedPage: page, request }) => {
    const fixture = await loadOperationsFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto(`/app/fleet-map?vehicle=${encodeURIComponent(fixture!.vehicleId)}`);
    await authExpect(page).toHaveURL(/vehicle=/);
    await authExpect(page.locator("main[data-e2e-active-module='fleet-map']")).toBeVisible();
  });

  authTest("34. vehicles detail ?tab= deep link", async ({ authenticatedPage: page, request }) => {
    const fixture = await loadOperationsFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto(`/app/vehicles/${fixture!.vehicleId}?tab=fuel`);
    await authExpect(page).toHaveURL(/tab=fuel/);
    await authExpect(page.locator("main[data-e2e-active-module='vehicles']")).toBeVisible();
  });

  authTest("35. cluster Inspection tab falls back to legacy SPA", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/vehicles");
    await page.getByRole("button", { name: "Inspection", exact: true }).click();
    await authExpect(page).toHaveURL(/\/dashboard\?legacy=1$/);
    await authExpect(page.getByRole("heading", { name: /inspection/i }).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  authTest("36. browser back from trip detail returns to list", async ({
    authenticatedPage: page,
    request,
  }) => {
    const fixture = await loadOperationsFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto("/app/trips");
    await page.getByText(fixture!.tripBusinessId).first().click();
    await authExpect(page).toHaveURL(/\/app\/trips\//);
    await page.goBack();
    await authExpect(page).toHaveURL(/\/app\/trips$/);
  });

  authTest("37. browser forward restores trip detail", async ({ authenticatedPage: page, request }) => {
    const fixture = await loadOperationsFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto("/app/trips");
    await page.getByText(fixture!.tripBusinessId).first().click();
    await authExpect(page).toHaveURL(/\/app\/trips\//);
    await page.goBack();
    await page.goForward();
    await authExpect(page).toHaveURL(new RegExp(`/app/trips/${fixture!.tripBusinessId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  });

  authTest("38. invalid trip id shows not-found state", async ({ authenticatedPage: page }) => {
    await page.goto("/app/trips/INVALID-TRIP-ID-99999");
    await authExpect(page.getByText(/not found/i).first()).toBeVisible({ timeout: 30_000 });
  });

  authTest("39. dashboard Active Trips widget navigates to /app/trips", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/dashboard");
    await authExpect(page.getByText("My Dashboards").first()).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /Active Trips/i }).click();
    await authExpect(page).toHaveURL(/\/app\/trips$/, { timeout: 15_000 });
  });

  authTest("40. command palette trip entity opens detail URL", async ({
    authenticatedPage: page,
    request,
  }) => {
    const fixture = await loadOperationsFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto("/app/dashboard");
    await page.keyboard.press("Control+k");
    await page.getByPlaceholder(/search across reanzly/i).fill(fixture!.tripBusinessId);
    await page.getByText(fixture!.tripBusinessId).first().click();
    await authExpect(page).toHaveURL(new RegExp(`/app/trips/${fixture!.tripBusinessId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  });

  authTest("41. pod detail deep link", async ({ authenticatedPage: page, request }) => {
    const fixture = await loadOperationsFixture(request);
    authTest.skip(!fixture || fixture.podId === "missing-pod", "pod seed unavailable");

    await page.goto(`/app/pod/${fixture!.podId}`);
    await authExpect(page.locator("main[data-e2e-active-module='pod']")).toBeVisible();
  });

  authTest("42. lorry receipt detail deep link", async ({ authenticatedPage: page, request }) => {
    const fixture = await loadOperationsFixture(request);
    authTest.skip(!fixture || fixture.lrId === "missing-lr", "lr seed unavailable");

    await page.goto(`/app/lorry-receipts/${fixture!.lrId}`);
    await authExpect(page.locator("main[data-e2e-active-module='lorry-receipts']")).toBeVisible();
  });

  authTest("43. mixed mode dashboard after trips keeps real URL", async ({ authenticatedPage: page }) => {
    await page.getByRole("button", { name: "Trips", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/trips$/);
    await page.getByRole("button", { name: "Dashboard", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/dashboard$/);
  });

  authTest("44. activeView syncs on /app/vehicles refresh", async ({ authenticatedPage: page }) => {
    await page.goto("/app/vehicles");
    await page.reload({ waitUntil: "networkidle" });
    await authExpect(page).toHaveURL(/\/app\/vehicles$/);
    await authExpect(page.locator("main[data-e2e-active-module='vehicles']")).toBeVisible();
  });

  authTest("45. no navigation loop on repeated sidebar trips clicks", async ({
    authenticatedPage: page,
  }) => {
    const trips = page.getByRole("button", { name: "Trips", exact: true });
    await trips.click();
    await authExpect(page).toHaveURL(/\/app\/trips$/);
    await trips.click();
    await authExpect(page).toHaveURL(/\/app\/trips$/);
    await authExpect(page.locator("main[data-e2e-active-module='trips']")).toBeVisible();
  });

  authTest("46. /app/lorry-receipts/new opens create drawer route", async ({ authenticatedPage: page }) => {
    await page.goto("/app/lorry-receipts/new");
    await authExpect(page).toHaveURL(/\/app\/lorry-receipts\/new$/);
    await authExpect(page.locator("main[data-e2e-active-module='lorry-receipts']")).toBeVisible();
  });
});

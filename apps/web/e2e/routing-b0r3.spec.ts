import {
  test as authTest,
  expect as authExpect,
} from "./fixtures/auth";
import { expectModule, sidebarNav, openCommandPalette, commandPaletteGoToModule , expectModuleShell, clusterTab } from "./fixtures/navigation";
import { loadFleetClusterFixture } from "./fixtures/fleet-cluster";

function escRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

authTest.describe("B0R-3 — fleet cluster App Router (migration flag ON)", () => {
  authTest.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto("/app/dashboard");
    await authExpect(page).toHaveURL(/\/app\/dashboard$/);
  });

  authTest("47. cluster Issues tab navigates to /app/issues", async ({ authenticatedPage: page }) => {
    await page.goto("/app/vehicles");
    await clusterTab(page, "Issues").click();
    await authExpect(page).toHaveURL(/\/app\/issues$/);
    await expectModule(page, "issues");
  });

  authTest("48. cluster Maintenance tab navigates to /app/maintenance", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/vehicles");
    await clusterTab(page, "Maintenance").click();
    await authExpect(page).toHaveURL(/\/app\/maintenance$/);
    await expectModule(page, "maintenance");
  });

  authTest("49. cluster Workshop tab navigates to /app/workshop", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/vehicles");
    await clusterTab(page, "Workshop").click();
    await authExpect(page).toHaveURL(/\/app\/workshop$/);
    await expectModule(page, "workshop");
  });

  authTest("50. cluster Services tab navigates to /app/services", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/vehicles");
    await clusterTab(page, "Services").click();
    await authExpect(page).toHaveURL(/\/app\/services$/);
    await expectModule(page, "services");
  });

  authTest("51. cluster Fuel & Energy tab navigates to /app/fuel", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/vehicles");
    await clusterTab(page, "Fuel & Energy").click();
    await authExpect(page).toHaveURL(/\/app\/fuel$/);
    await expectModule(page, "fuel-energy");
  });

  authTest("52. cluster Compliance tab navigates to /app/compliance", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/vehicles");
    await clusterTab(page, "Compliance").click();
    await authExpect(page).toHaveURL(/\/app\/compliance$/);
    await expectModule(page, "compliance");
  });

  authTest("53. cluster Quality tab navigates to /app/quality", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/vehicles");
    await clusterTab(page, "Quality").click();
    await authExpect(page).toHaveURL(/\/app\/quality$/);
    await expectModule(page, "quality");
  });

  authTest("54. direct /app/inspection list URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/inspection");
    await authExpect(page).toHaveURL(/\/app\/inspection$/);
    await expectModule(page, "inspection");
  });

  authTest("55. inspection detail deep link", async ({ authenticatedPage: page, request }) => {
    const fixture = await loadFleetClusterFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto(`/app/inspection/${fixture!.inspectionId}`);
    await authExpect(page).toHaveURL(new RegExp(`/app/inspection/${escRegex(fixture!.inspectionId)}$`));
    await expectModule(page, "inspection");
  });

  authTest("56. inspection detail ?tab=issues deep link", async ({
    authenticatedPage: page,
    request,
  }) => {
    const fixture = await loadFleetClusterFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto(`/app/inspection/${fixture!.inspectionId}?tab=issues`);
    await authExpect(page).toHaveURL(/tab=issues/);
    await expectModule(page, "inspection");
  });

  authTest("57. /app/inspection/new opens create drawer route", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/inspection/new");
    await authExpect(page).toHaveURL(/\/app\/inspection\/new$/);
    await expectModuleShell(page);
  });

  authTest("58. issues detail deep link", async ({ authenticatedPage: page, request }) => {
    const fixture = await loadFleetClusterFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto(`/app/issues/${fixture!.issueId}`);
    await authExpect(page).toHaveURL(new RegExp(`/app/issues/${escRegex(fixture!.issueId)}$`));
    await expectModule(page, "issues");
  });

  authTest("59. /app/issues/new opens create drawer route", async ({ authenticatedPage: page }) => {
    await page.goto("/app/issues/new");
    await authExpect(page).toHaveURL(/\/app\/issues\/new$/);
    await expectModuleShell(page);
  });

  authTest("60. maintenance detail deep link", async ({ authenticatedPage: page, request }) => {
    const fixture = await loadFleetClusterFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto(`/app/maintenance/${fixture!.workOrderId}`);
    await authExpect(page).toHaveURL(new RegExp(`/app/maintenance/${escRegex(fixture!.workOrderId)}$`));
    await expectModule(page, "maintenance");
  });

  authTest("61. /app/maintenance/new opens create drawer route", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/maintenance/new");
    await authExpect(page).toHaveURL(/\/app\/maintenance\/new$/);
    await expectModuleShell(page);
  });

  authTest("62. fuel detail deep link", async ({ authenticatedPage: page, request }) => {
    const fixture = await loadFleetClusterFixture(request);
    authTest.skip(!fixture || fixture.fuelId === "missing-fuel", "fuel seed unavailable");

    await page.goto(`/app/fuel/${fixture!.fuelId}`);
    await authExpect(page).toHaveURL(new RegExp(`/app/fuel/${escRegex(fixture!.fuelId)}$`));
    await expectModule(page, "fuel-energy");
  });

  authTest("63. /app/fuel/new opens create drawer route", async ({ authenticatedPage: page }) => {
    await page.goto("/app/fuel/new");
    await authExpect(page).toHaveURL(/\/app\/fuel\/new$/);
    await expectModuleShell(page);
  });

  authTest("64. quality detail deep link", async ({ authenticatedPage: page, request }) => {
    const fixture = await loadFleetClusterFixture(request);
    authTest.skip(!fixture || fixture.qualityId === "missing-quality", "quality seed unavailable");

    await page.goto(`/app/quality/${fixture!.qualityId}`);
    await authExpect(page).toHaveURL(new RegExp(`/app/quality/${escRegex(fixture!.qualityId)}$`));
    await expectModule(page, "quality");
  });

  authTest("65. /app/quality/new opens create drawer route", async ({ authenticatedPage: page }) => {
    await page.goto("/app/quality/new");
    await authExpect(page).toHaveURL(/\/app\/quality\/new$/);
    await expectModuleShell(page);
  });

  authTest("66. compliance filings tab deep link", async ({ authenticatedPage: page }) => {
    await page.goto("/app/compliance/filings");
    await authExpect(page).toHaveURL(/\/app\/compliance\/filings$/);
    await expectModule(page, "compliance");
  });

  authTest("67. cluster back/forward vehicles→inspection→issues", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/vehicles");
    await clusterTab(page, "Inspection").click();
    await authExpect(page).toHaveURL(/\/app\/inspection$/);
    await clusterTab(page, "Issues").click();
    await authExpect(page).toHaveURL(/\/app\/issues$/);
    await page.goBack();
    await authExpect(page).toHaveURL(/\/app\/inspection$/);
    await page.goBack();
    await authExpect(page).toHaveURL(/\/app\/vehicles$/);
    await page.goForward();
    await authExpect(page).toHaveURL(/\/app\/inspection$/);
  });

  authTest("68. hard refresh on inspection detail keeps URL", async ({
    authenticatedPage: page,
    request,
  }) => {
    const fixture = await loadFleetClusterFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto(`/app/inspection/${fixture!.inspectionId}`);
    await page.reload({ waitUntil: "networkidle" });
    await authExpect(page).toHaveURL(new RegExp(`/app/inspection/${escRegex(fixture!.inspectionId)}$`));
    await expectModule(page, "inspection");
  });

  authTest("69. invalid inspection id shows not-found state", async ({ authenticatedPage: page }) => {
    await page.goto("/app/inspection/INVALID-INSP-99999");
    await authExpect(page.getByText(/not found/i).first()).toBeVisible({ timeout: 30_000 });
  });

  authTest("70. invalid issue id shows not-found state", async ({ authenticatedPage: page }) => {
    await page.goto("/app/issues/INVALID-ISSUE-99999");
    await authExpect(page.getByText(/not found/i).first()).toBeVisible({ timeout: 30_000 });
  });

  authTest("71. invalid inspection tab still renders detail", async ({
    authenticatedPage: page,
    request,
  }) => {
    const fixture = await loadFleetClusterFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto(`/app/inspection/${fixture!.inspectionId}?tab=not-a-real-tab`);
    await authExpect(page).toHaveURL(/tab=not-a-real-tab/);
    await expectModule(page, "inspection");
  });

  authTest("72. dashboard Open Issues widget navigates to /app/issues", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/dashboard");
    await authExpect(page.getByText("My Dashboards").first()).toBeVisible({ timeout: 30_000 });
    const openIssues = page.getByRole("button", { name: "Open Issues" });
    await authExpect(openIssues.first()).toBeVisible({ timeout: 15_000 });
    await openIssues.first().click();
    await authExpect(page).toHaveURL(/\/app\/issues$/, { timeout: 15_000 });
  });

  authTest("73. command palette Inspection module opens /app/inspection", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/dashboard");
    await page.locator("header button").filter({ has: page.locator("kbd") }).click();
    await authExpect(page.getByPlaceholder(/search across reanzly/i)).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder(/search across reanzly/i).fill("Inspection");
    await page.getByRole("option", { name: /^Inspection$/ }).click();
    await authExpect(page).toHaveURL(/\/app\/inspection$/);
  });

  authTest("74. command palette issue entity opens detail URL", async ({
    authenticatedPage: page,
  }) => {
    const mockIssueId = "RZ-ISS-0107";

    await page.goto("/app/dashboard");
    await page.locator("header button").filter({ has: page.locator("kbd") }).click();
    await authExpect(page.getByPlaceholder(/search across reanzly/i)).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder(/search across reanzly/i).fill(mockIssueId);
    await page.getByText(mockIssueId).first().click();
    await authExpect(page).toHaveURL(new RegExp(`/app/issues/${escRegex(mockIssueId)}$`));
  });

  authTest("75. /app/services/new opens create drawer route", async ({ authenticatedPage: page }) => {
    await page.goto("/app/services/new");
    await authExpect(page).toHaveURL(/\/app\/services\/new$/);
    await expectModuleShell(page);
  });

  authTest("76. no legacy /dashboard fallback when switching cluster tabs", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/vehicles");
    await clusterTab(page, "Fuel & Energy").click();
    await authExpect(page).toHaveURL(/\/app\/fuel$/);
    await clusterTab(page, "Overview").click();
    await authExpect(page).toHaveURL(/\/app\/vehicles$/);
    await authExpect(page).not.toHaveURL(/\/dashboard/);
  });
});

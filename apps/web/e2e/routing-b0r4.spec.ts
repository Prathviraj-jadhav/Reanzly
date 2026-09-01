import {
  test as authTest,
  expect as authExpect,
} from "./fixtures/auth";
import { loadFinanceClusterFixture } from "./fixtures/finance-cluster";

function escRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

authTest.describe("B0R-4 — finance cluster App Router (migration flag ON)", () => {
  authTest.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto("/app/dashboard");
    await authExpect(page).toHaveURL(/\/app\/dashboard$/);
  });

  authTest("77. cluster Rate Cards tab navigates to /app/rate-cards", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/invoice");
    await page.getByRole("button", { name: "Rate Cards", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/rate-cards$/);
    await authExpect(page.locator("main[data-e2e-active-module='rate-cards']")).toBeVisible();
  });

  authTest("78. cluster Approvals tab navigates to /app/approvals", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/expenses");
    await page.getByRole("button", { name: "Approvals", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/approvals$/);
    await authExpect(page.locator("main[data-e2e-active-module='approvals']")).toBeVisible();
  });

  authTest("79. direct /app/invoice list URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/invoice");
    await authExpect(page).toHaveURL(/\/app\/invoice$/);
    await authExpect(page.locator("main[data-e2e-active-module='invoice']")).toBeVisible();
  });

  authTest("80. invoice detail deep link uses invoiceNumber", async ({
    authenticatedPage: page,
    request,
  }) => {
    const fixture = await loadFinanceClusterFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto(`/app/invoice/${fixture!.invoiceNumber}`);
    await authExpect(page).toHaveURL(
      new RegExp(`/app/invoice/${escRegex(fixture!.invoiceNumber)}$`),
    );
    await authExpect(page.locator("main[data-e2e-active-module='invoice']")).toBeVisible();
  });

  authTest("81. /app/invoice/new opens create route", async ({ authenticatedPage: page }) => {
    await page.goto("/app/invoice/new");
    await authExpect(page).toHaveURL(/\/app\/invoice\/new$/);
    await authExpect(page.locator("main[data-e2e-active-module='invoice']")).toBeVisible();
  });

  authTest("82. direct /app/rate-cards list URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/rate-cards");
    await authExpect(page).toHaveURL(/\/app\/rate-cards$/);
    await authExpect(page.locator("main[data-e2e-active-module='rate-cards']")).toBeVisible();
  });

  authTest("83. rate card detail deep link", async ({ authenticatedPage: page, request }) => {
    const fixture = await loadFinanceClusterFixture(request);
    authTest.skip(!fixture || fixture.rateCardId === "missing-rate-card", "seed data unavailable");

    await page.goto(`/app/rate-cards/${fixture!.rateCardId}`);
    await authExpect(page).toHaveURL(
      new RegExp(`/app/rate-cards/${escRegex(fixture!.rateCardId)}$`),
    );
    await authExpect(page.locator("main[data-e2e-active-module='rate-cards']")).toBeVisible();
  });

  authTest("84. /app/rate-cards/new opens create route", async ({ authenticatedPage: page }) => {
    await page.goto("/app/rate-cards/new");
    await authExpect(page).toHaveURL(/\/app\/rate-cards\/new$/);
    await authExpect(page.locator("main[data-e2e-active-module='rate-cards']")).toBeVisible();
  });

  authTest("85. direct /app/expenses list URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/expenses");
    await authExpect(page).toHaveURL(/\/app\/expenses$/);
    await authExpect(page.locator("main[data-e2e-active-module='expenses']")).toBeVisible();
  });

  authTest("86. expense detail deep link", async ({ authenticatedPage: page, request }) => {
    const fixture = await loadFinanceClusterFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto(`/app/expenses/${fixture!.expenseId}`);
    await authExpect(page).toHaveURL(
      new RegExp(`/app/expenses/${escRegex(fixture!.expenseId)}$`),
    );
    await authExpect(page.locator("main[data-e2e-active-module='expenses']")).toBeVisible();
  });

  authTest("87. /app/expenses/new opens create route", async ({ authenticatedPage: page }) => {
    await page.goto("/app/expenses/new");
    await authExpect(page).toHaveURL(/\/app\/expenses\/new$/);
    await authExpect(page.locator("main[data-e2e-active-module='expenses']")).toBeVisible();
  });

  authTest("88. direct /app/approvals list URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/approvals");
    await authExpect(page).toHaveURL(/\/app\/approvals$/);
    await authExpect(page.locator("main[data-e2e-active-module='approvals']")).toBeVisible();
  });

  authTest("89. approval detail deep link", async ({ authenticatedPage: page, request }) => {
    const fixture = await loadFinanceClusterFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto(`/app/approvals/${fixture!.approvalId}`);
    await authExpect(page).toHaveURL(
      new RegExp(`/app/approvals/${escRegex(fixture!.approvalId)}$`),
    );
    await authExpect(page.locator("main[data-e2e-active-module='approvals']")).toBeVisible();
  });

  authTest("90. approval detail ?tab=decision deep link", async ({
    authenticatedPage: page,
    request,
  }) => {
    const fixture = await loadFinanceClusterFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto(`/app/approvals/${fixture!.approvalId}?tab=decision`);
    await authExpect(page).toHaveURL(/tab=decision/);
    await authExpect(page.locator("main[data-e2e-active-module='approvals']")).toBeVisible();
  });

  authTest("91. direct /app/payments list URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/payments");
    await authExpect(page).toHaveURL(/\/app\/payments$/);
    await authExpect(page.locator("main[data-e2e-active-module='payments']")).toBeVisible();
  });

  authTest("92. payment detail deep link", async ({ authenticatedPage: page, request }) => {
    const fixture = await loadFinanceClusterFixture(request);
    authTest.skip(!fixture || fixture.paymentId === "missing-payment", "seed data unavailable");

    await page.goto(`/app/payments/${fixture!.paymentId}`);
    await authExpect(page).toHaveURL(
      new RegExp(`/app/payments/${escRegex(fixture!.paymentId)}$`),
    );
    await authExpect(page.locator("main[data-e2e-active-module='payments']")).toBeVisible();
  });

  authTest("93. /app/payments/new opens create route", async ({ authenticatedPage: page }) => {
    await page.goto("/app/payments/new");
    await authExpect(page).toHaveURL(/\/app\/payments\/new$/);
    await authExpect(page.locator("main[data-e2e-active-module='payments']")).toBeVisible();
  });

  authTest("94. direct /app/ledger default dashboard subview", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/ledger");
    await authExpect(page).toHaveURL(/\/app\/ledger$/);
    await authExpect(page.locator("main[data-e2e-active-module='ledger']")).toBeVisible();
    await authExpect(page.locator("main").getByRole("button", { name: "Dashboard", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  authTest("95. ledger journal subview URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/ledger/journal");
    await authExpect(page).toHaveURL(/\/app\/ledger\/journal$/);
    await authExpect(page.getByRole("button", { name: "Journal", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  authTest("96. financial-ops alias redirects to treasury subview", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/financial-ops");
    await authExpect(page).toHaveURL(/\/app\/ledger\/treasury$/);
    await authExpect(page.getByRole("button", { name: "Treasury Ops", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  authTest("97. ledger tab click updates URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/ledger");
    await page.getByRole("button", { name: "Chart of Accounts", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/ledger\/coa$/);
    await page.getByRole("button", { name: "Statements", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/ledger\/statements$/);
  });

  authTest("98. hard refresh on invoice detail preserves URL", async ({
    authenticatedPage: page,
    request,
  }) => {
    const fixture = await loadFinanceClusterFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto(`/app/invoice/${fixture!.invoiceNumber}`);
    await page.reload({ waitUntil: "networkidle" });
    await authExpect(page).toHaveURL(
      new RegExp(`/app/invoice/${escRegex(fixture!.invoiceNumber)}$`),
    );
    await authExpect(page.locator("main[data-e2e-active-module='invoice']")).toBeVisible();
  });

  authTest("99. browser back from invoice detail returns to list", async ({
    authenticatedPage: page,
    request,
  }) => {
    const fixture = await loadFinanceClusterFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto("/app/invoice");
    await page.goto(`/app/invoice/${fixture!.invoiceNumber}`);
    await page.goBack();
    await authExpect(page).toHaveURL(/\/app\/invoice$/);
  });

  authTest("100. browser forward from invoice list returns to detail", async ({
    authenticatedPage: page,
    request,
  }) => {
    const fixture = await loadFinanceClusterFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto("/app/invoice");
    await page.goto(`/app/invoice/${fixture!.invoiceNumber}`);
    await page.goBack();
    await page.goForward();
    await authExpect(page).toHaveURL(
      new RegExp(`/app/invoice/${escRegex(fixture!.invoiceNumber)}$`),
    );
  });

  authTest("101. invalid invoice id shows not-found state", async ({ authenticatedPage: page }) => {
    await page.goto("/app/invoice/INVALID-INV-99999");
    await authExpect(page.getByText(/not found/i).first()).toBeVisible({ timeout: 30_000 });
  });

  authTest("102. invalid ledger view shows app not-found", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/ledger/not-a-real-view");
    await authExpect(page.getByText(/page not found/i).first()).toBeVisible({ timeout: 15_000 });
  });

  authTest("103. command palette Invoice module opens /app/invoice", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/dashboard");
    await page.locator("header button").filter({ has: page.locator("kbd") }).click();
    await authExpect(page.getByPlaceholder(/search across reanzly/i)).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder(/search across reanzly/i).fill("Invoice");
    await page.getByRole("option", { name: /^Invoice$/ }).click();
    await authExpect(page).toHaveURL(/\/app\/invoice$/);
  });

  authTest("104. command palette invoice entity opens detail URL", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/dashboard");
    await page.locator("header button").filter({ has: page.locator("kbd") }).click();
    await authExpect(page.getByPlaceholder(/search across reanzly/i)).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder(/search across reanzly/i).fill("RZ-INV");
    await page.getByRole("option").filter({ hasText: /RZ-INV-/ }).first().click();
    await authExpect(page).toHaveURL(/\/app\/invoice\/RZ-INV-/);
  });

  authTest("105. finance cluster tabs avoid legacy /dashboard fallback", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/invoice");
    await page.getByRole("button", { name: "Rate Cards", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/rate-cards$/);
    await page.getByRole("button", { name: "Overview", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/invoice$/);
    await authExpect(page).not.toHaveURL(/\/dashboard/);
  });

  authTest("106. ledger hard refresh preserves subview URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/ledger/gst-returns");
    await page.reload({ waitUntil: "networkidle" });
    await authExpect(page).toHaveURL(/\/app\/ledger\/gst-returns$/);
    await authExpect(page.getByRole("button", { name: "GST Returns", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  authTest("107. invalid expense id shows not-found state", async ({ authenticatedPage: page }) => {
    await page.goto("/app/expenses/INVALID-EXP-99999");
    await authExpect(page.getByText(/not found/i).first()).toBeVisible({ timeout: 30_000 });
  });

  authTest("108. invalid rate card id shows not-found state", async ({ authenticatedPage: page }) => {
    await page.goto("/app/rate-cards/INVALID-RC-99999");
    await authExpect(page.getByText(/not found/i).first()).toBeVisible({ timeout: 30_000 });
  });
});

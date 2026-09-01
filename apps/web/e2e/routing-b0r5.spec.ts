import {
  test as authTest,
  expect as authExpect,
} from "./fixtures/auth";
import { loadPeopleDocsClusterFixture } from "./fixtures/people-docs-cluster";

function escRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

authTest.describe("B0R-5 — people & documents App Router (migration flag ON)", () => {
  authTest.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto("/app/dashboard");
    await authExpect(page).toHaveURL(/\/app\/dashboard$/);
  });

  authTest("109. CRM cluster Customers tab navigates to /app/customers", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/crm");
    await page.getByRole("button", { name: "Customers", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/customers$/);
    await authExpect(page.locator("main[data-e2e-active-module='customers']")).toBeVisible();
  });

  authTest("110. CRM cluster Vendors tab navigates to /app/vendors", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/crm");
    await page.getByRole("button", { name: "Vendors", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/vendors$/);
    await authExpect(page.locator("main[data-e2e-active-module='vendors']")).toBeVisible();
  });

  authTest("111. CRM cluster Purchase tab navigates to /app/purchase", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/crm");
    await page.getByRole("button", { name: "Purchase", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/purchase$/);
    await authExpect(page.locator("main[data-e2e-active-module='purchase']")).toBeVisible();
  });

  authTest("112. CRM cluster Helpdesk tab navigates to /app/helpdesk", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/crm");
    await page.getByRole("button", { name: "Helpdesk", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/helpdesk$/);
    await authExpect(page.locator("main[data-e2e-active-module='helpdesk']")).toBeVisible();
  });

  authTest("113. CRM cluster Marketing tab navigates to /app/marketing", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/crm");
    await page.getByRole("button", { name: "Marketing", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/marketing$/);
    await authExpect(page.locator("main[data-e2e-active-module='marketing']")).toBeVisible();
  });

  authTest("114. CRM cluster Surveys tab navigates to /app/surveys", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/crm");
    await page.getByRole("button", { name: "Surveys", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/surveys$/);
    await authExpect(page.locator("main[data-e2e-active-module='surveys']")).toBeVisible();
  });

  authTest("115. direct /app/crm list URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/crm");
    await authExpect(page).toHaveURL(/\/app\/crm$/);
    await authExpect(page.locator("main[data-e2e-active-module='crm']")).toBeVisible();
  });

  authTest("116. /app/crm/leads tab deep link", async ({ authenticatedPage: page }) => {
    await page.goto("/app/crm/leads");
    await authExpect(page).toHaveURL(/\/app\/crm\/leads$/);
    await authExpect(page.locator("main[data-e2e-active-module='crm']")).toBeVisible();
  });

  authTest("117. direct /app/customers list URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/customers");
    await authExpect(page).toHaveURL(/\/app\/customers$/);
    await authExpect(page.locator("main[data-e2e-active-module='customers']")).toBeVisible();
  });

  authTest("118. customer detail deep link", async ({ authenticatedPage: page, request }) => {
    const fixture = await loadPeopleDocsClusterFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto(`/app/customers/${fixture!.customerId}`);
    await authExpect(page).toHaveURL(
      new RegExp(`/app/customers/${escRegex(fixture!.customerId)}$`),
    );
    await authExpect(page.locator("main[data-e2e-active-module='customers']")).toBeVisible();
  });

  authTest("119. /app/customers/new opens create route", async ({ authenticatedPage: page }) => {
    await page.goto("/app/customers/new");
    await authExpect(page).toHaveURL(/\/app\/customers\/new$/);
    await authExpect(page.locator("main[data-e2e-active-module='customers']")).toBeVisible();
  });

  authTest("120. direct /app/vendors list URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/vendors");
    await authExpect(page).toHaveURL(/\/app\/vendors$/);
    await authExpect(page.locator("main[data-e2e-active-module='vendors']")).toBeVisible();
  });

  authTest("121. vendor detail deep link", async ({ authenticatedPage: page, request }) => {
    const fixture = await loadPeopleDocsClusterFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto(`/app/vendors/${fixture!.vendorId}`);
    await authExpect(page).toHaveURL(
      new RegExp(`/app/vendors/${escRegex(fixture!.vendorId)}$`),
    );
    await authExpect(page.locator("main[data-e2e-active-module='vendors']")).toBeVisible();
  });

  authTest("122. /app/vendors/new opens create route", async ({ authenticatedPage: page }) => {
    await page.goto("/app/vendors/new");
    await authExpect(page).toHaveURL(/\/app\/vendors\/new$/);
    await authExpect(page.locator("main[data-e2e-active-module='vendors']")).toBeVisible();
  });

  authTest("123. direct /app/purchase list URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/purchase");
    await authExpect(page).toHaveURL(/\/app\/purchase$/);
    await authExpect(page.locator("main[data-e2e-active-module='purchase']")).toBeVisible();
  });

  authTest("124. /app/purchase/new opens create route", async ({ authenticatedPage: page }) => {
    await page.goto("/app/purchase/new");
    await authExpect(page).toHaveURL(/\/app\/purchase\/new$/);
    await authExpect(page.locator("main[data-e2e-active-module='purchase']")).toBeVisible();
  });

  authTest("125. direct /app/helpdesk list URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/helpdesk");
    await authExpect(page).toHaveURL(/\/app\/helpdesk$/);
    await authExpect(page.locator("main[data-e2e-active-module='helpdesk']")).toBeVisible();
  });

  authTest("126. /app/helpdesk/new opens create route", async ({ authenticatedPage: page }) => {
    await page.goto("/app/helpdesk/new");
    await authExpect(page).toHaveURL(/\/app\/helpdesk\/new$/);
    await authExpect(page.locator("main[data-e2e-active-module='helpdesk']")).toBeVisible();
  });

  authTest("127. direct /app/marketing list URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/marketing");
    await authExpect(page).toHaveURL(/\/app\/marketing$/);
    await authExpect(page.locator("main[data-e2e-active-module='marketing']")).toBeVisible();
  });

  authTest("128. marketing campaign detail deep link", async ({ authenticatedPage: page }) => {
    await page.goto("/app/marketing/cmp-001");
    await authExpect(page).toHaveURL(/\/app\/marketing\/cmp-001$/);
    await authExpect(page.locator("main[data-e2e-active-module='marketing']")).toBeVisible();
  });

  authTest("129. direct /app/surveys list URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/surveys");
    await authExpect(page).toHaveURL(/\/app\/surveys$/);
    await authExpect(page.locator("main[data-e2e-active-module='surveys']")).toBeVisible();
  });

  authTest("130. survey detail deep link", async ({ authenticatedPage: page }) => {
    await page.goto("/app/surveys/srv-001");
    await authExpect(page).toHaveURL(/\/app\/surveys\/srv-001$/);
    await authExpect(page.locator("main[data-e2e-active-module='surveys']")).toBeVisible();
  });

  authTest("131. HR cluster Drivers tab navigates to /app/drivers", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/payroll");
    await page.getByRole("button", { name: "Drivers & Staff", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/drivers$/);
    await authExpect(page.locator("main[data-e2e-active-module='drivers-staff']")).toBeVisible();
  });

  authTest("132. HR cluster Payroll tab navigates to /app/payroll", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/drivers");
    await page.getByRole("button", { name: "Payroll", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/payroll$/);
    await authExpect(page.locator("main[data-e2e-active-module='payroll']")).toBeVisible();
  });

  authTest("133. direct /app/hr list URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/hr");
    await authExpect(page).toHaveURL(/\/app\/hr$/);
    await authExpect(page.locator("main[data-e2e-active-module='hr']")).toBeVisible();
  });

  authTest("134. /app/hr/attendance tab deep link", async ({ authenticatedPage: page }) => {
    await page.goto("/app/hr/attendance");
    await authExpect(page).toHaveURL(/\/app\/hr\/attendance$/);
    await authExpect(page.locator("main[data-e2e-active-module='hr']")).toBeVisible();
  });

  authTest("135. direct /app/drivers list URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/drivers");
    await authExpect(page).toHaveURL(/\/app\/drivers$/);
    await authExpect(page.locator("main[data-e2e-active-module='drivers-staff']")).toBeVisible();
  });

  authTest("136. driver detail deep link", async ({ authenticatedPage: page, request }) => {
    const fixture = await loadPeopleDocsClusterFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto(`/app/drivers/${fixture!.driverId}`);
    await authExpect(page).toHaveURL(
      new RegExp(`/app/drivers/${escRegex(fixture!.driverId)}$`),
    );
    await authExpect(page.locator("main[data-e2e-active-module='drivers-staff']")).toBeVisible();
  });

  authTest("137. /app/drivers/new opens create route", async ({ authenticatedPage: page }) => {
    await page.goto("/app/drivers/new");
    await authExpect(page).toHaveURL(/\/app\/drivers\/new$/);
    await authExpect(page.locator("main[data-e2e-active-module='drivers-staff']")).toBeVisible();
  });

  authTest("138. direct /app/payroll list URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/payroll");
    await authExpect(page).toHaveURL(/\/app\/payroll$/);
    await authExpect(page.locator("main[data-e2e-active-module='payroll']")).toBeVisible();
  });

  authTest("139. /app/payroll/payslips tab deep link", async ({ authenticatedPage: page }) => {
    await page.goto("/app/payroll/payslips");
    await authExpect(page).toHaveURL(/\/app\/payroll\/payslips$/);
    await authExpect(page.locator("main[data-e2e-active-module='payroll']")).toBeVisible();
  });

  authTest("140. documents cluster Studio tab navigates to /app/document-studio", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/documents");
    await page.getByRole("button", { name: "Studio", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/document-studio$/);
    await authExpect(page.locator("main[data-e2e-active-module='document-studio']")).toBeVisible();
  });

  authTest("141. documents cluster Knowledge tab navigates to /app/knowledge", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/documents");
    await page.getByRole("button", { name: "Knowledge Base", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/knowledge$/);
    await authExpect(page.locator("main[data-e2e-active-module='knowledge']")).toBeVisible();
  });

  authTest("142. documents cluster Reminders tab navigates to /app/reminders", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/documents");
    await page.getByRole("button", { name: "Reminders", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/reminders$/);
    await authExpect(page.locator("main[data-e2e-active-module='reminders']")).toBeVisible();
  });

  authTest("143. direct /app/documents list URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/documents");
    await authExpect(page).toHaveURL(/\/app\/documents$/);
    await authExpect(page.locator("main[data-e2e-active-module='documents']")).toBeVisible();
  });

  authTest("144. document detail deep link", async ({ authenticatedPage: page, request }) => {
    const fixture = await loadPeopleDocsClusterFixture(request);
    authTest.skip(!fixture || fixture.documentId === "missing-document", "seed data unavailable");

    await page.goto(`/app/documents/${fixture!.documentId}`);
    await authExpect(page).toHaveURL(
      new RegExp(`/app/documents/${escRegex(fixture!.documentId)}$`),
    );
    await authExpect(page.locator("main[data-e2e-active-module='documents']")).toBeVisible();
  });

  authTest("145. /app/documents/new opens create route", async ({ authenticatedPage: page }) => {
    await page.goto("/app/documents/new");
    await authExpect(page).toHaveURL(/\/app\/documents\/new$/);
    await authExpect(page.locator("main[data-e2e-active-module='documents']")).toBeVisible();
  });

  authTest("146. direct /app/document-studio list URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/document-studio");
    await authExpect(page).toHaveURL(/\/app\/document-studio$/);
    await authExpect(page.locator("main[data-e2e-active-module='document-studio']")).toBeVisible();
  });

  authTest("147. /app/document-studio/new opens create route", async ({ authenticatedPage: page }) => {
    await page.goto("/app/document-studio/new");
    await authExpect(page).toHaveURL(/\/app\/document-studio\/new$/);
    await authExpect(page.locator("main[data-e2e-active-module='document-studio']")).toBeVisible();
  });

  authTest("148. direct /app/knowledge list URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/knowledge");
    await authExpect(page).toHaveURL(/\/app\/knowledge$/);
    await authExpect(page.locator("main[data-e2e-active-module='knowledge']")).toBeVisible();
  });

  authTest("149. /app/knowledge/new opens create route", async ({ authenticatedPage: page }) => {
    await page.goto("/app/knowledge/new");
    await authExpect(page).toHaveURL(/\/app\/knowledge\/new$/);
    await authExpect(page.locator("main[data-e2e-active-module='knowledge']")).toBeVisible();
  });

  authTest("150. direct /app/reminders list URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/reminders");
    await authExpect(page).toHaveURL(/\/app\/reminders$/);
    await authExpect(page.locator("main[data-e2e-active-module='reminders']")).toBeVisible();
  });

  authTest("151. /app/reminders/new opens create route", async ({ authenticatedPage: page }) => {
    await page.goto("/app/reminders/new");
    await authExpect(page).toHaveURL(/\/app\/reminders\/new$/);
    await authExpect(page.locator("main[data-e2e-active-module='reminders']")).toBeVisible();
  });

  authTest("152. CRM cluster tabs avoid legacy /dashboard fallback", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/crm");
    await page.getByRole("button", { name: "Customers", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/customers$/);
    await page.getByRole("button", { name: "Overview", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/crm$/);
    await authExpect(page).not.toHaveURL(/\/dashboard/);
  });

  authTest("153. documents cluster tabs avoid legacy /dashboard fallback", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/documents");
    await page.getByRole("button", { name: "Studio", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/document-studio$/);
    await page.getByRole("button", { name: "Vault", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/documents$/);
    await authExpect(page).not.toHaveURL(/\/dashboard/);
  });

  authTest("154. hard refresh on customer detail preserves URL", async ({
    authenticatedPage: page,
    request,
  }) => {
    const fixture = await loadPeopleDocsClusterFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto(`/app/customers/${fixture!.customerId}`);
    await page.reload({ waitUntil: "networkidle" });
    await authExpect(page).toHaveURL(
      new RegExp(`/app/customers/${escRegex(fixture!.customerId)}$`),
    );
    await authExpect(page.locator("main[data-e2e-active-module='customers']")).toBeVisible();
  });

  authTest("155. browser back from HR drivers returns to HR", async ({ authenticatedPage: page }) => {
    await page.goto("/app/hr");
    await page.goto("/app/drivers");
    await page.goBack();
    await authExpect(page).toHaveURL(/\/app\/hr$/);
  });

  authTest("156. browser forward from HR to drivers", async ({ authenticatedPage: page }) => {
    await page.goto("/app/hr");
    await page.goto("/app/drivers");
    await page.goBack();
    await page.goForward();
    await authExpect(page).toHaveURL(/\/app\/drivers$/);
  });

  authTest("157. invalid customer id shows not-found state", async ({ authenticatedPage: page }) => {
    await page.goto("/app/customers/INVALID-CUST-99999");
    await authExpect(page.getByText(/not found/i).first()).toBeVisible({ timeout: 30_000 });
  });

  authTest("158. invalid CRM tab still renders CRM module", async ({ authenticatedPage: page }) => {
    await page.goto("/app/crm/not-a-real-tab");
    await authExpect(page.locator("main[data-e2e-active-module='crm']")).toBeVisible();
  });

  authTest("159. invalid payroll tab still renders payroll module", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/payroll/not-a-real-tab");
    await authExpect(page.locator("main[data-e2e-active-module='payroll']")).toBeVisible();
  });

  authTest("160. command palette Customers module opens /app/customers", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/app/dashboard");
    await page.locator("header button").filter({ has: page.locator("kbd") }).click();
    await authExpect(page.getByPlaceholder(/search across reanzly/i)).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder(/search across reanzly/i).fill("Customers");
    await page.getByRole("option", { name: /^Customers$/ }).click();
    await authExpect(page).toHaveURL(/\/app\/customers$/);
  });

  authTest("161. command palette customer entity opens detail URL", async ({
    authenticatedPage: page,
    request,
  }) => {
    const fixture = await loadPeopleDocsClusterFixture(request);
    authTest.skip(!fixture, "seed data unavailable");

    await page.goto("/app/dashboard");
    await page.locator("header button").filter({ has: page.locator("kbd") }).click();
    await authExpect(page.getByPlaceholder(/search across reanzly/i)).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder(/search across reanzly/i).fill(fixture!.customerId.slice(0, 8));
    await page.getByRole("option").filter({ hasText: new RegExp(escRegex(fixture!.customerId.slice(0, 6))) }).first().click();
    await authExpect(page).toHaveURL(new RegExp(`/app/customers/${escRegex(fixture!.customerId)}`));
  });

  authTest("162. invoice Customize in Studio navigates to /app/document-studio", async ({
    authenticatedPage: page,
    request,
  }) => {
    const res = await request.get("/api/invoices");
    authTest.skip(!res.ok(), "seed data unavailable");
    const body = (await res.json()) as { invoices?: { invoiceNumber: string }[] };
    const invoiceNumber = body.invoices?.[0]?.invoiceNumber;
    authTest.skip(!invoiceNumber, "seed data unavailable");

    await page.goto(`/app/invoice/${invoiceNumber}`);
    await page.getByRole("button", { name: "Customize in Studio" }).click();
    await authExpect(page).toHaveURL(/\/app\/document-studio$/);
  });

  authTest("163. CRM intra-tab Leads updates URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/crm");
    await page.getByRole("button", { name: "Leads", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/crm\/leads$/);
  });

  authTest("164. payroll intra-tab Cycles updates URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/payroll");
    await page.getByRole("button", { name: "Pay Cycles", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/payroll\/cycles$/);
  });
});

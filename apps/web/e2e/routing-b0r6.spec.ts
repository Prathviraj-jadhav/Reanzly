import {
  test as authTest,
  expect as authExpect,
} from "./fixtures/auth";

function escRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

authTest.describe("B0R-6 — platform & remaining desktop App Router (migration flag ON)", () => {
  authTest.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto("/app/dashboard");
    await authExpect(page).toHaveURL(/\/app\/dashboard$/);
  });

  authTest("165. direct /app/warehouse defaults to inventory", async ({ authenticatedPage: page }) => {
    await page.goto("/app/warehouse");
    await authExpect(page).toHaveURL(/\/app\/warehouse$/);
    await authExpect(page.locator("main[data-e2e-active-module='warehouse']")).toBeVisible();
    await authExpect(page.getByRole("button", { name: "Inventory", exact: true })).toBeVisible();
  });

  authTest("166. /app/warehouse/inbound tab deep link", async ({ authenticatedPage: page }) => {
    await page.goto("/app/warehouse/inbound");
    await authExpect(page).toHaveURL(/\/app\/warehouse\/inbound$/);
    await authExpect(page.locator("main[data-e2e-active-module='warehouse']")).toBeVisible();
  });

  authTest("167. warehouse tab click updates URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/warehouse");
    await page.getByRole("button", { name: "Outbound", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/warehouse\/outbound$/);
  });

  authTest("168. invalid warehouse tab shows message", async ({ authenticatedPage: page }) => {
    await page.goto("/app/warehouse/not-a-tab");
    await authExpect(page.getByText(/unknown warehouse tab/i)).toBeVisible();
  });

  authTest("169. direct /app/reports library", async ({ authenticatedPage: page }) => {
    await page.goto("/app/reports");
    await authExpect(page).toHaveURL(/\/app\/reports$/);
    await authExpect(page.locator("main[data-e2e-active-module='reports']")).toBeVisible();
  });

  authTest("170. /app/reports/scheduled tab deep link", async ({ authenticatedPage: page }) => {
    await page.goto("/app/reports/scheduled");
    await authExpect(page).toHaveURL(/\/app\/reports\/scheduled$/);
    await authExpect(page.getByRole("tab", { name: /Scheduled/i })).toHaveAttribute("data-state", "active");
  });

  authTest("171. reports tab click updates URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/reports");
    await page.getByRole("tab", { name: /Data Explorer/i }).click();
    await authExpect(page).toHaveURL(/\/app\/reports\/data$/);
  });

  authTest("172. direct /app/operations board", async ({ authenticatedPage: page }) => {
    await page.goto("/app/operations");
    await authExpect(page).toHaveURL(/\/app\/operations$/);
    await authExpect(page.locator("main[data-e2e-active-module='operations-hub']")).toBeVisible();
  });

  authTest("173. operations cluster Field Service tab", async ({ authenticatedPage: page }) => {
    await page.goto("/app/operations");
    await page.getByRole("button", { name: "Field Service", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/field-service$/);
    await authExpect(page.locator("main[data-e2e-active-module='field-service']")).toBeVisible();
  });

  authTest("174. operations cluster Planning tab", async ({ authenticatedPage: page }) => {
    await page.goto("/app/operations");
    await page.getByRole("button", { name: "Planning", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/planning$/);
    await authExpect(page.locator("main[data-e2e-active-module='planning']")).toBeVisible();
  });

  authTest("175. /app/operations/reports tab deep link", async ({ authenticatedPage: page }) => {
    await page.goto("/app/operations/reports");
    await authExpect(page).toHaveURL(/\/app\/operations\/reports$/);
    await authExpect(page.locator("main[data-e2e-active-module='operations-hub']")).toBeVisible();
  });

  authTest("176. direct /app/field-service list", async ({ authenticatedPage: page }) => {
    await page.goto("/app/field-service");
    await authExpect(page).toHaveURL(/\/app\/field-service$/);
    await authExpect(page.locator("main[data-e2e-active-module='field-service']")).toBeVisible();
  });

  authTest("177. /app/field-service/new opens create route", async ({ authenticatedPage: page }) => {
    await page.goto("/app/field-service/new");
    await authExpect(page).toHaveURL(/\/app\/field-service\/new$/);
    await authExpect(page.getByText(/new field task|add task|create/i).first()).toBeVisible();
  });

  authTest("178. field-service detail deep link", async ({ authenticatedPage: page, request }) => {
    const res = await request.get("/api/field-service");
    authTest.skip(!res.ok(), "seed data unavailable");
    const body = (await res.json()) as { tasks?: { id: string }[] };
    const id = body.tasks?.[0]?.id;
    authTest.skip(!id, "seed data unavailable");

    await page.goto(`/app/field-service/${id!}`);
    await authExpect(page).toHaveURL(new RegExp(`/app/field-service/${escRegex(id!)}`));
    await authExpect(page.locator("main[data-e2e-active-module='field-service']")).toBeVisible();
  });

  authTest("179. direct /app/planning week view", async ({ authenticatedPage: page }) => {
    await page.goto("/app/planning");
    await authExpect(page).toHaveURL(/\/app\/planning$/);
    await authExpect(page.locator("main[data-e2e-active-module='planning']")).toBeVisible();
  });

  authTest("180. /app/planning/resources tab deep link", async ({ authenticatedPage: page }) => {
    await page.goto("/app/planning/resources");
    await authExpect(page).toHaveURL(/\/app\/planning\/resources$/);
    await authExpect(page.getByRole("button", { name: "Resources", exact: true })).toBeVisible();
  });

  authTest("181. direct /app/settings profile", async ({ authenticatedPage: page }) => {
    await page.goto("/app/settings");
    await authExpect(page).toHaveURL(/\/app\/settings$/);
    await authExpect(page.locator("main[data-e2e-active-module='settings']")).toBeVisible();
    await authExpect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  authTest("182. /app/settings/billing tab deep link", async ({ authenticatedPage: page }) => {
    await page.goto("/app/settings/billing");
    await authExpect(page).toHaveURL(/\/app\/settings\/billing$/);
    await authExpect(page.getByRole("button", { name: /Billing & Plan/i })).toBeVisible();
  });

  authTest("183. settings cluster Subscriptions tab", async ({ authenticatedPage: page }) => {
    await page.goto("/app/settings");
    await page.getByRole("button", { name: "Subscriptions", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/settings\/subscriptions$/);
    await authExpect(page.locator("main[data-e2e-active-module='subscriptions']")).toBeVisible();
  });

  authTest("184. settings cluster Access Matrix tab", async ({ authenticatedPage: page }) => {
    await page.goto("/app/settings");
    await page.getByRole("button", { name: "Access Matrix", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/settings\/access-matrix$/);
    await authExpect(page.locator("main[data-e2e-active-module='access-matrix']")).toBeVisible();
  });

  authTest("185. settings cluster Automation tab", async ({ authenticatedPage: page }) => {
    await page.goto("/app/settings");
    await page.getByRole("button", { name: "Automation", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/automation$/);
    await authExpect(page.locator("main[data-e2e-active-module='automation']")).toBeVisible();
  });

  authTest("186. settings cluster System Design tab", async ({ authenticatedPage: page }) => {
    await page.goto("/app/settings");
    await page.getByRole("button", { name: "System Design", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/system-design$/);
    await authExpect(page.locator("main[data-e2e-active-module='system-design']")).toBeVisible();
  });

  authTest("187. direct /app/chat list", async ({ authenticatedPage: page }) => {
    await page.goto("/app/chat");
    await authExpect(page).toHaveURL(/\/app\/chat$/);
    await authExpect(page.locator("main[data-e2e-active-module='chat']")).toBeVisible();
  });

  authTest("188. chat conversation selection updates URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/chat");
    await authExpect(page.locator("main[data-e2e-active-module='chat']")).toBeVisible();
    const convButtons = page.locator("div.scrollbar-thin button").filter({ has: page.locator("span") });
    authTest.skip((await convButtons.count()) < 2, "no conversations loaded");
    await convButtons.nth(1).click();
    await authExpect(page).toHaveURL(/\/app\/chat\/.+/);
  });

  authTest("189. direct /app/integrations", async ({ authenticatedPage: page }) => {
    await page.goto("/app/integrations");
    await authExpect(page).toHaveURL(/\/app\/integrations$/);
    await authExpect(page.locator("main[data-e2e-active-module='integrations']")).toBeVisible();
  });

  authTest("190. /app/app-store redirects to integrations", async ({ authenticatedPage: page }) => {
    await page.goto("/app/app-store");
    await authExpect(page).toHaveURL(/\/app\/integrations$/);
  });

  authTest("191. direct /app/automation", async ({ authenticatedPage: page }) => {
    await page.goto("/app/automation");
    await authExpect(page).toHaveURL(/\/app\/automation$/);
    await authExpect(page.locator("main[data-e2e-active-module='automation']")).toBeVisible();
  });

  authTest("192. direct /app/system-design", async ({ authenticatedPage: page }) => {
    await page.goto("/app/system-design");
    await authExpect(page).toHaveURL(/\/app\/system-design$/);
    await authExpect(page.locator("main[data-e2e-active-module='system-design']")).toBeVisible();
  });

  authTest("193. direct /app/partner-programme", async ({ authenticatedPage: page }) => {
    await page.goto("/app/partner-programme");
    await authExpect(page).toHaveURL(/\/app\/partner-programme$/);
    await authExpect(page.locator("main[data-e2e-active-module='partner-programme']")).toBeVisible();
  });

  authTest("194. direct /app/financial-services", async ({ authenticatedPage: page }) => {
    await page.goto("/app/financial-services");
    await authExpect(page).toHaveURL(/\/app\/financial-services$/);
    await authExpect(page.locator("main[data-e2e-active-module='financial-services']")).toBeVisible();
  });

  authTest("195. direct /app/broker/console", async ({ authenticatedPage: page }) => {
    await page.goto("/app/broker/console");
    await authExpect(page).toHaveURL(/\/app\/broker\/console$/);
    await authExpect(page.locator("main[data-e2e-active-module='broker-console']")).toBeVisible();
  });

  authTest("196. direct /app/broker/marketplace", async ({ authenticatedPage: page }) => {
    await page.goto("/app/broker/marketplace");
    await authExpect(page).toHaveURL(/\/app\/broker\/marketplace$/);
    await authExpect(page.locator("main[data-e2e-active-module='broker-marketplace']")).toBeVisible();
  });

  authTest("197. direct /app/broker/settlements", async ({ authenticatedPage: page }) => {
    await page.goto("/app/broker/settlements");
    await authExpect(page).toHaveURL(/\/app\/broker\/settlements$/);
    await authExpect(page.locator("main[data-e2e-active-module='broker-settlements']")).toBeVisible();
  });

  authTest("198. warehouse hard refresh preserves tab", async ({ authenticatedPage: page }) => {
    await page.goto("/app/warehouse/pick-pack");
    await page.reload();
    await authExpect(page).toHaveURL(/\/app\/warehouse\/pick-pack$/);
    await authExpect(page.locator("main[data-e2e-active-module='warehouse']")).toBeVisible();
  });

  authTest("199. settings hard refresh preserves billing tab", async ({ authenticatedPage: page }) => {
    await page.goto("/app/settings/billing");
    await page.reload();
    await authExpect(page).toHaveURL(/\/app\/settings\/billing$/);
    await authExpect(page.locator("main[data-e2e-active-module='settings']")).toBeVisible();
  });

  authTest("200. browser back from field-service detail to list", async ({ authenticatedPage: page, request }) => {
    const res = await request.get("/api/field-service");
    authTest.skip(!res.ok(), "seed data unavailable");
    const body = (await res.json()) as { tasks?: { id: string }[] };
    const id = body.tasks?.[0]?.id;
    authTest.skip(!id, "seed data unavailable");

    await page.goto(`/app/field-service/${id}`);
    await page.goBack();
    await authExpect(page).toHaveURL(/\/app\/field-service$/);
  });

  authTest("201. command palette Reports navigates to /app/reports", async ({ authenticatedPage: page }) => {
    await page.goto("/app/dashboard");
    await page.locator("header button").filter({ has: page.locator("kbd") }).click();
    await authExpect(page.getByPlaceholder(/search across reanzly/i)).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder(/search across reanzly/i).fill("Reports");
    await page.getByRole("option", { name: /^Reports$/ }).click();
    await authExpect(page).toHaveURL(/\/app\/reports$/);
  });

  authTest("202. command palette Settings navigates to /app/settings", async ({ authenticatedPage: page }) => {
    await page.goto("/app/dashboard");
    await page.locator("header button").filter({ has: page.locator("kbd") }).click();
    await authExpect(page.getByPlaceholder(/search across reanzly/i)).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder(/search across reanzly/i).fill("Settings");
    await page.getByRole("option", { name: /^Settings$/ }).click();
    await authExpect(page).toHaveURL(/\/app\/settings$/);
  });

  authTest("203. command palette Integrations navigates to /app/integrations", async ({ authenticatedPage: page }) => {
    await page.goto("/app/dashboard");
    await page.locator("header button").filter({ has: page.locator("kbd") }).click();
    await authExpect(page.getByPlaceholder(/search across reanzly/i)).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder(/search across reanzly/i).fill("Integrations");
    await page.getByRole("option", { name: /^Integrations$/ }).click();
    await authExpect(page).toHaveURL(/\/app\/integrations$/);
  });

  authTest("204. command palette Warehouse navigates to /app/warehouse", async ({ authenticatedPage: page }) => {
    await page.goto("/app/dashboard");
    await page.locator("header button").filter({ has: page.locator("kbd") }).click();
    await authExpect(page.getByPlaceholder(/search across reanzly/i)).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder(/search across reanzly/i).fill("Warehouse");
    await page.getByRole("option", { name: /^Warehouse$/ }).click();
    await authExpect(page).toHaveURL(/\/app\/warehouse$/);
  });

  authTest("205. command palette Chat navigates to /app/chat", async ({ authenticatedPage: page }) => {
    await page.goto("/app/dashboard");
    await page.locator("header button").filter({ has: page.locator("kbd") }).click();
    await authExpect(page.getByPlaceholder(/search across reanzly/i)).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder(/search across reanzly/i).fill("Chat");
    await page.getByRole("option", { name: /^Chat$/ }).click();
    await authExpect(page).toHaveURL(/\/app\/chat$/);
  });

  authTest("206. /app/settings/subscriptions/new create route", async ({ authenticatedPage: page }) => {
    await page.goto("/app/settings/subscriptions/new");
    await authExpect(page).toHaveURL(/\/app\/settings\/subscriptions\/new$/);
    await authExpect(page.locator("main[data-e2e-active-module='subscriptions']")).toBeVisible();
  });

  authTest("207. invalid settings tab shows message", async ({ authenticatedPage: page }) => {
    await page.goto("/app/settings/not-a-section");
    await authExpect(page.getByText(/unknown settings section/i)).toBeVisible();
  });

  authTest("208. planning tab click updates URL", async ({ authenticatedPage: page }) => {
    await page.goto("/app/planning");
    await page.getByRole("button", { name: "Day View", exact: true }).click();
    await authExpect(page).toHaveURL(/\/app\/planning\/day$/);
  });
});

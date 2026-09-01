import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "Reanzly@Demo2026";

export const PORTAL_USERS = {
  superadmin: { email: "reanzly.staff@reanzly.in", roleId: "superadmin" },
  broker: { email: "faisal.ahmed@reanzly.in", roleId: "broker" },
  vendor: { email: "anjali.mehta@reanzly.in", roleId: "customer" },
  driver: { email: "kuldeep.singh@reanzly.in", roleId: "driver" },
  warehouse: { email: "deepak.yadav@reanzly.in", roleId: "warehouse-crew" },
  owner: { email: "vikram.deshmukh@reanzly.in", roleId: "owner" },
} as const;

export type PortalUserKey = keyof typeof PORTAL_USERS;

export async function loginPortalUser(
  request: APIRequestContext,
  key: PortalUserKey,
): Promise<void> {
  const user = PORTAL_USERS[key];
  const response = await request.post("/api/auth/login", {
    data: { email: user.email, password: DEMO_PASSWORD },
  });
  expect(
    response.ok(),
    `portal login failed for ${key}: ${response.status()} ${await response.text()}`,
  ).toBeTruthy();
}

/** Login via the page-bound request context so session cookies apply to navigation. */
export async function loginPortalUserOnPage(
  page: Page,
  key: PortalUserKey,
): Promise<void> {
  await loginPortalUser(page.request, key);
}

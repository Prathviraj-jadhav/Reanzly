/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixture `use`, not React */
import { test as base, expect, type Page } from "@playwright/test";
import { AUTH_FILE } from "./paths";

export const E2E_OWNER_EMAIL =
  process.env.PLAYWRIGHT_E2E_EMAIL ?? "vikram.deshmukh@reanzly.in";
export const E2E_OWNER_PASSWORD =
  process.env.PLAYWRIGHT_E2E_PASSWORD ?? "Reanzly@Demo2026";

export const SESSION_COOKIE = "reanzly_session";

export async function loginViaApi(
  request: {
    post: (
      url: string,
      options: object,
    ) => Promise<{
      ok: () => boolean;
      status: () => number;
      text: () => Promise<string>;
      headers: () => Record<string, string>;
    }>;
  },
): Promise<void> {
  const response = await request.post("/api/auth/login", {
    data: { email: E2E_OWNER_EMAIL, password: E2E_OWNER_PASSWORD },
  });
  expect(
    response.ok(),
    `login failed: ${response.status()} ${await response.text()}`,
  ).toBeTruthy();
}

export async function readActiveViewModule(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.querySelector("[data-e2e-active-module]");
    return el?.getAttribute("data-e2e-active-module") ?? null;
  });
}

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  storageState: async ({}, use, testInfo) => {
    if (process.env.PLAYWRIGHT_SKIP_AUTH === "1") {
      testInfo.skip();
      return;
    }
    await use(AUTH_FILE);
  },

  authenticatedPage: async ({ page }, use) => {
    await use(page);
  },
});

export { expect } from "@playwright/test";

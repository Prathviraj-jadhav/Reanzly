import { test as setup, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { E2E_OWNER_EMAIL, E2E_OWNER_PASSWORD, SESSION_COOKIE } from "./fixtures/auth";
import { AUTH_FILE } from "./fixtures/paths";

setup("authenticate owner session", async ({ request }) => {
  mkdirSync(dirname(AUTH_FILE), { recursive: true });
  const response = await request.post("/api/auth/login", {
    data: { email: E2E_OWNER_EMAIL, password: E2E_OWNER_PASSWORD },
  });
  expect(response.ok(), `setup login failed: ${await response.text()}`).toBeTruthy();
  expect(response.headers()["set-cookie"] ?? "").toContain(`${SESSION_COOKIE}=`);
  await request.storageState({ path: AUTH_FILE });
});

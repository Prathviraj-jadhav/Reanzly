/**
 * Guards test-only API routes used by Playwright E2E.
 * Disabled in production — never expose session mutation in prod builds.
 */
export function isE2eTestModeEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.E2E_TEST_MODE === "1";
}

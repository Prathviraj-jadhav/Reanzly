import { describe, expect, it } from "vitest";
import { validateReturnTo, buildLoginUrl } from "@/lib/navigation/return-to";
import { DASHBOARD_ROUTE } from "@/lib/navigation/routing-config";

describe("validateReturnTo", () => {
  it("returns fallback for empty values", () => {
    expect(validateReturnTo(null)).toBe(DASHBOARD_ROUTE);
    expect(validateReturnTo(undefined)).toBe(DASHBOARD_ROUTE);
    expect(validateReturnTo("")).toBe(DASHBOARD_ROUTE);
  });

  it("allows safe internal paths", () => {
    expect(validateReturnTo("/app/dashboard")).toBe("/app/dashboard");
    expect(validateReturnTo("/app/trips?status=open")).toBe("/app/trips?status=open");
    expect(validateReturnTo("/dashboard")).toBe("/dashboard");
  });

  it("rejects open redirects", () => {
    expect(validateReturnTo("//evil.com")).toBe(DASHBOARD_ROUTE);
    expect(validateReturnTo("https://evil.com")).toBe(DASHBOARD_ROUTE);
    expect(validateReturnTo("/\\evil.com")).toBe(DASHBOARD_ROUTE);
    expect(validateReturnTo("/app@evil.com")).toBe(DASHBOARD_ROUTE);
    expect(validateReturnTo("javascript:alert(1)")).toBe(DASHBOARD_ROUTE);
  });

  it("buildLoginUrl encodes validated returnTo", () => {
    expect(buildLoginUrl("/app/dashboard")).toBe(
      `/login?returnTo=${encodeURIComponent("/app/dashboard")}`,
    );
    expect(buildLoginUrl("//evil.com")).toContain("returnTo=");
    expect(buildLoginUrl("//evil.com")).not.toContain("evil.com");
  });
});

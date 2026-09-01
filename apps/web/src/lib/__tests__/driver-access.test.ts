import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { resolveDriverScope } from "@/lib/driver-access";

vi.mock("@/lib/db", () => ({
  db: {
    driver: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/driver-session", () => ({
  isDriverRole: (role: string) => role === "driver",
  findDriverForSession: vi.fn(),
}));

import { db } from "@/lib/db";
import { findDriverForSession } from "@/lib/driver-session";

const session = {
  id: "user-1",
  companyId: "co-a",
  email: "d@test.com",
  name: "Driver One",
  role: "driver",
};

describe("resolveDriverScope", () => {
  beforeEach(() => {
    vi.mocked(findDriverForSession).mockReset();
    vi.mocked(db.driver.findFirst).mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    const result = await resolveDriverScope(null, "drv-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("allows driver to access own activity", async () => {
    vi.mocked(findDriverForSession).mockResolvedValue({ id: "drv-me", name: "Me" } as never);
    const result = await resolveDriverScope(session, "drv-me");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.driverId).toBe("drv-me");
  });

  it("denies driver cross-driver access", async () => {
    vi.mocked(findDriverForSession).mockResolvedValue({ id: "drv-me", name: "Me" } as never);
    const result = await resolveDriverScope(session, "drv-other");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("allows fleet role same-company driver access", async () => {
    const fleetUser = { ...session, role: "owner" };
    vi.mocked(db.driver.findFirst).mockResolvedValue({ id: "drv-2" } as never);
    const result = await resolveDriverScope(fleetUser, "drv-2");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.driverId).toBe("drv-2");
  });

  it("denies fleet role cross-company driver", async () => {
    const fleetUser = { ...session, role: "owner" };
    vi.mocked(db.driver.findFirst).mockResolvedValue(null);
    const result = await resolveDriverScope(fleetUser, "drv-other-co");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response).toBeInstanceOf(NextResponse);
  });
});

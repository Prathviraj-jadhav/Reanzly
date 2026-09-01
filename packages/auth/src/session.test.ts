import { describe, expect, it, vi, beforeEach } from "vitest";
import { getSessionUserByToken, createSessionRecord, destroySessionByToken } from "./session";

const mockDb = {
  session: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  driver: {
    findFirst: vi.fn(),
  },
};

describe("@reanzly/auth session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for missing session", async () => {
    mockDb.session.findUnique.mockResolvedValue(null);
    const user = await getSessionUserByToken(mockDb as never, "missing");
    expect(user).toBeNull();
  });

  it("returns user for valid non-expired session (chat-compatible lookup)", async () => {
    const future = new Date(Date.now() + 60_000);
    mockDb.session.findUnique.mockResolvedValue({
      id: "sess-1",
      expiresAt: future,
      user: {
        id: "user-1",
        companyId: "co-1",
        email: "owner@reanzly.in",
        name: "Owner",
        role: "owner",
      },
    });
    const user = await getSessionUserByToken(mockDb as never, "opaque-token");
    expect(user).toEqual({
      id: "user-1",
      companyId: "co-1",
      email: "owner@reanzly.in",
      name: "Owner",
      role: "owner",
    });
  });

  it("deletes expired sessions eagerly", async () => {
    mockDb.session.findUnique.mockResolvedValue({
      id: "sess-expired",
      expiresAt: new Date(Date.now() - 1000),
      user: { id: "u", companyId: "c", email: "e@e.com", name: "N", role: "owner" },
    });
    mockDb.session.delete.mockResolvedValue({});
    const user = await getSessionUserByToken(mockDb as never, "expired");
    expect(user).toBeNull();
    expect(mockDb.session.delete).toHaveBeenCalledWith({ where: { id: "sess-expired" } });
  });

  it("createSessionRecord stores opaque token with 30-day TTL", async () => {
    mockDb.session.create.mockResolvedValue({});
    const result = await createSessionRecord(mockDb as never, "user-1");
    expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60 * 1000);
    expect(mockDb.session.create).toHaveBeenCalled();
  });

  it("destroySessionByToken is idempotent", async () => {
    mockDb.session.deleteMany.mockResolvedValue({ count: 1 });
    await destroySessionByToken(mockDb as never, "tok");
    expect(mockDb.session.deleteMany).toHaveBeenCalledWith({ where: { token: "tok" } });
  });
});

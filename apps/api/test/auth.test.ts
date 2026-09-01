import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildApp } from "../src/server.js";
import { hashPassword } from "@reanzly/auth";

const userRow = {
  id: "owner",
  companyId: "co-demo",
  email: "owner@reanzly.in",
  name: "Demo Owner",
  role: "owner",
  status: "Active",
  passwordHash: "",
  salt: "",
  branchId: null,
};

const { hash, salt } = hashPassword("demo1234");
userRow.passwordHash = hash;
userRow.salt = salt;

const sessions = new Map<string, { userId: string; expiresAt: Date }>();

vi.mock("@reanzly/database", () => ({
  db: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email?: string; id?: string } }) => {
        if (where.email === userRow.email) return { ...userRow };
        if (where.id === userRow.id) return { ...userRow };
        if (where.id === "driver") {
          return {
            id: "driver",
            companyId: "co-demo",
            email: "driver@reanzly.in",
            name: "Driver",
            role: "driver",
            status: "Active",
          };
        }
        return null;
      }),
      update: vi.fn(async () => userRow),
      create: vi.fn(),
    },
    session: {
      create: vi.fn(async ({ data }: { data: { token: string; userId: string; expiresAt: Date } }) => {
        sessions.set(data.token, { userId: data.userId, expiresAt: data.expiresAt });
        return { id: "sess", ...data };
      }),
      findUnique: vi.fn(async ({ where }: { where: { token: string } }) => {
        const row = sessions.get(where.token);
        if (!row) return null;
        const user = await (await import("@reanzly/database")).db.user.findUnique({
          where: { id: row.userId },
        });
        return {
          id: "sess",
          token: where.token,
          userId: row.userId,
          expiresAt: row.expiresAt,
          user: {
            ...user,
            customer: null,
            brokerProfile: null,
          },
        };
      }),
      deleteMany: vi.fn(async ({ where }: { where: { token: string } }) => {
        sessions.delete(where.token);
        return { count: 1 };
      }),
      delete: vi.fn(),
    },
    driver: { findFirst: vi.fn(async () => null) },
    company: { create: vi.fn() },
    vehicle: { findUnique: vi.fn(), create: vi.fn() },
    customer: { create: vi.fn() },
    brokerProfile: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

describe("v1 auth routes", () => {
  beforeEach(() => {
    sessions.clear();
  });

  async function app() {
    const built = await buildApp();
    return built.app;
  }

  it("1. login success sets HttpOnly cookie and returns user without secrets", async () => {
    const server = await app();
    const response = await server.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@reanzly.in", password: "demo1234" },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.user).toMatchObject({
      id: "owner",
      email: "owner@reanzly.in",
      role: "owner",
    });
    expect(body.user.passwordHash).toBeUndefined();
    expect(body.user.salt).toBeUndefined();
    const setCookie = response.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    expect(String(setCookie)).toContain("reanzly_session=");
    expect(String(setCookie)).toContain("HttpOnly");
    expect(String(setCookie)).toContain("SameSite=Lax");
    await server.close();
  });

  it("2. login failure returns INVALID_CREDENTIALS without email enumeration", async () => {
    const server = await app();
    const response = await server.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@reanzly.in", password: "wrong" },
    });
    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
    expect(body.error.message).toBe("Invalid email or password.");
    await server.close();
  });

  it("3. GET /me without cookie returns 401 with user null", async () => {
    const server = await app();
    const response = await server.inject({ method: "GET", url: "/v1/auth/me" });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ user: null });
    await server.close();
  });

  it("4. GET /me with valid session cookie returns user fields", async () => {
    const server = await app();
    const login = await server.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@reanzly.in", password: "demo1234" },
    });
    const cookie = login.headers["set-cookie"];
    const response = await server.inject({
      method: "GET",
      url: "/v1/auth/me",
      headers: { cookie: String(cookie).split(";")[0] },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().user).toMatchObject({
      id: "owner",
      companyId: "co-demo",
      role: "owner",
    });
    await server.close();
  });

  it("5. logout revokes session server-side and clears cookie", async () => {
    const server = await app();
    const login = await server.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@reanzly.in", password: "demo1234" },
    });
    const cookie = String(login.headers["set-cookie"]).split(";")[0];
    const logout = await server.inject({
      method: "POST",
      url: "/v1/auth/logout",
      headers: { cookie },
    });
    expect(logout.statusCode).toBe(200);
    expect(logout.json()).toEqual({ ok: true });
    const me = await server.inject({ method: "GET", url: "/v1/auth/me", headers: { cookie } });
    expect(me.statusCode).toBe(401);
    await server.close();
  });

  it("6. profile GET requires auth", async () => {
    const server = await app();
    const response = await server.inject({ method: "GET", url: "/v1/auth/profile" });
    expect(response.statusCode).toBe(401);
    await server.close();
  });

  it("7. switch-role rejects unauthenticated callers", async () => {
    const server = await app();
    const response = await server.inject({
      method: "POST",
      url: "/v1/auth/switch-role",
      payload: { roleId: "driver" },
    });
    expect(response.statusCode).toBe(401);
    await server.close();
  });

  it("8. switch-role blocks cross-company targets", async () => {
    const server = await app();
    const login = await server.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@reanzly.in", password: "demo1234" },
    });
    const cookie = String(login.headers["set-cookie"]).split(";")[0];
    const { db } = await import("@reanzly/database");
    vi.mocked(db.user.findUnique).mockImplementation((async ({ where }: { where: { id?: string; email?: string } }) => {
      if (where.id === "other-co-user") {
        return {
          id: "other-co-user",
          companyId: "other-co",
          email: "x@y.com",
          name: "X",
          role: "driver",
          status: "Active",
        } as never;
      }
      if (where.id === "owner") return { ...userRow } as never;
      if (where.email === userRow.email) return { ...userRow } as never;
      return null;
    }) as never);
    const response = await server.inject({
      method: "POST",
      url: "/v1/auth/switch-role",
      headers: { cookie },
      payload: { roleId: "other-co-user" },
    });
    expect(response.statusCode).toBe(404);
    await server.close();
  });

  it("9. login validation error for empty body", async () => {
    const server = await app();
    const response = await server.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "", password: "" },
    });
    expect(response.statusCode).toBe(400);
    await server.close();
  });

  it("10. inactive account returns ACCOUNT_INACTIVE", async () => {
    const server = await app();
    const { db } = await import("@reanzly/database");
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      ...userRow,
      status: "Inactive",
    } as never);
    const response = await server.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@reanzly.in", password: "demo1234" },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe("ACCOUNT_INACTIVE");
    await server.close();
  });

  it("11. rate limit returns 429 on repeated login attempts", async () => {
    const server = await app();
    const payload = { email: "owner@reanzly.in", password: "wrong" };
    let lastStatus = 0;
    for (let i = 0; i < 12; i++) {
      const res = await server.inject({
        method: "POST",
        url: "/v1/auth/login",
        payload,
        headers: { "x-forwarded-for": "203.0.113.50" },
      });
      lastStatus = res.statusCode;
    }
    expect(lastStatus).toBe(429);
    await server.close();
  });

  it("12. session token from Fastify is readable via getSessionUserByToken", async () => {
    const server = await app();
    const login = await server.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@reanzly.in", password: "demo1234" },
    });
    const cookieHeader = String(login.headers["set-cookie"]);
    const token = decodeURIComponent(cookieHeader.split("reanzly_session=")[1].split(";")[0]);
    const { getSessionUserByToken } = await import("@reanzly/auth");
    const { db } = await import("@reanzly/database");
    const user = await getSessionUserByToken(db, token);
    expect(user?.id).toBe("owner");
    await server.close();
  });
});

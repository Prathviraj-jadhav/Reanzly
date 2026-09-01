import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildApp } from "../src/server.js";
import { SESSION_COOKIE } from "@reanzly/auth";

const CO_A = "co-a";
const CO_B = "co-b";

const ownerA = {
  id: "owner-a",
  companyId: CO_A,
  email: "owner-a@test.in",
  name: "Owner A",
  role: "owner",
  status: "Active",
  branchId: null,
};

const dispatcherB = {
  id: "disp-b",
  companyId: CO_B,
  email: "disp-b@test.in",
  name: "Dispatcher B",
  role: "dispatcher",
  status: "Active",
  branchId: null,
};

const sessions = new Map<string, { userId: string; expiresAt: Date }>();
const skus = new Map<string, Record<string, unknown>>();
const returns = new Map<string, Record<string, unknown>>();
let skuSeq = 0;
let returnSeq = 0;

function authHeaders(token: string) {
  return { cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` };
}

async function createSession(userId: string) {
  const token = `tok-${userId}-${Date.now()}`;
  sessions.set(token, { userId, expiresAt: new Date(Date.now() + 3600000) });
  return token;
}

vi.mock("@reanzly/database", () => ({
  db: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string } }) => {
        if (where.id === ownerA.id) return { ...ownerA };
        if (where.id === dispatcherB.id) return { ...dispatcherB };
        return null;
      }),
    },
    session: {
      findUnique: vi.fn(async ({ where }: { where: { token: string } }) => {
        const row = sessions.get(where.token);
        if (!row) return null;
        const user =
          row.userId === ownerA.id
            ? { ...ownerA, customer: null, brokerProfile: null }
            : row.userId === dispatcherB.id
              ? { ...dispatcherB, customer: null, brokerProfile: null }
              : null;
        if (!user) return null;
        return {
          id: "sess",
          token: where.token,
          userId: row.userId,
          expiresAt: row.expiresAt,
          user,
        };
      }),
    },
    warehouseSku: {
      findMany: vi.fn(async ({ where }: { where: { companyId: string } }) =>
        [...skus.values()].filter((r) => r.companyId === where.companyId),
      ),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => skus.get(where.id) ?? null),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = `sku-${++skuSeq}`;
        const now = new Date("2026-09-01T10:00:00.000Z");
        const row = {
          id,
          stock: 0,
          reserved: 0,
          minLevel: 0,
          reorderQty: 0,
          unitCost: 0,
          gstRate: 0,
          category: "",
          hsn: "",
          unit: "",
          location: "",
          godown: "",
          supplier: "",
          ...data,
          createdAt: now,
          updatedAt: now,
        };
        skus.set(id, row);
        return row;
      }),
      update: vi.fn(async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        const existing = skus.get(args.where.id);
        if (!existing) throw new Error("missing");
        const updated = { ...existing, ...args.data, updatedAt: new Date("2026-09-01T11:00:00.000Z") };
        skus.set(args.where.id, updated);
        return updated;
      }),
    },
    warehouseInbound: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
    },
    warehouseOutbound: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
    },
    warehouseStorageLocation: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
    },
    warehousePodReceive: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
    },
    warehousePickList: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
      delete: vi.fn(async () => ({})),
    },
    warehouseCycleCount: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
    },
    warehouseCrossDock: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
    },
    warehouseReturn: {
      findMany: vi.fn(async ({ where }: { where: { companyId: string } }) =>
        [...returns.values()].filter((r) => r.companyId === where.companyId),
      ),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = `ret-${++returnSeq}`;
        const now = new Date("2026-09-01T10:00:00.000Z");
        const row = { id, qty: 0, unitValue: 0, ...data, createdAt: now, updatedAt: now };
        returns.set(id, row);
        return row;
      }),
      update: vi.fn(async (args: { where: { id: string; companyId: string }; data: Record<string, unknown> }) => {
        const existing = returns.get(args.where.id);
        if (!existing || existing.companyId !== args.where.companyId) throw new Error("missing");
        const updated = { ...existing, ...args.data };
        returns.set(args.where.id, updated);
        return updated;
      }),
      delete: vi.fn(async (args: { where: { id: string; companyId: string } }) => {
        const existing = returns.get(args.where.id);
        if (!existing || existing.companyId !== args.where.companyId) throw new Error("missing");
        returns.delete(args.where.id);
        return existing;
      }),
    },
    warehouseYard: {
      findMany: vi.fn(async () => []),
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
      delete: vi.fn(async () => ({})),
    },
    warehouseDockAppt: {
      findMany: vi.fn(async () => []),
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
      delete: vi.fn(async () => ({})),
    },
  },
}));

describe("v1 warehouse domains", () => {
  beforeEach(() => {
    sessions.clear();
    skus.clear();
    returns.clear();
    skuSeq = 0;
    returnSeq = 0;
  });

  async function app() {
    return (await buildApp()).app;
  }

  describe("sku security", () => {
    it("1. unauthenticated list returns AUTH_REQUIRED", async () => {
      const server = await app();
      const res = await server.inject({ method: "GET", url: "/v1/warehouse/skus" });
      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe("AUTH_REQUIRED");
    }, 15000);

    it("2. module denial returns FORBIDDEN", async () => {
      const server = await app();
      const token = await createSession(dispatcherB.id);
      const res = await server.inject({
        method: "GET",
        url: "/v1/warehouse/skus",
        headers: authHeaders(token),
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe("FORBIDDEN");
    });

    it("3. cross-tenant PATCH returns NOT_FOUND", async () => {
      skus.set("sku-other", {
        id: "sku-other",
        companyId: CO_B,
        skuCode: "X",
        name: "Other",
      });
      const server = await app();
      const token = await createSession(ownerA.id);
      const res = await server.inject({
        method: "PATCH",
        url: "/v1/warehouse/skus/sku-other",
        headers: authHeaders(token),
        payload: { name: "Hacked" },
      });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("NOT_FOUND");
    });

    it("4. companyId injection in POST rejected by Zod strict", async () => {
      const server = await app();
      const token = await createSession(ownerA.id);
      const res = await server.inject({
        method: "POST",
        url: "/v1/warehouse/skus",
        headers: authHeaders(token),
        payload: { skuCode: "SKU-1", name: "Widget", companyId: CO_B },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("VALIDATION_ERROR");
    });

    it("5. mass assignment id/status rejected on PATCH", async () => {
      skus.set("sku-a", {
        id: "sku-a",
        companyId: CO_A,
        skuCode: "SKU-A",
        name: "A",
        stock: 1,
        reserved: 0,
        minLevel: 0,
        reorderQty: 0,
        unitCost: 0,
        category: "",
        hsn: "",
        unit: "",
        location: "",
        godown: "",
        supplier: "",
        gstRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const server = await app();
      const token = await createSession(ownerA.id);
      const res = await server.inject({
        method: "PATCH",
        url: "/v1/warehouse/skus/sku-a",
        headers: authHeaders(token),
        payload: { id: "evil", companyId: CO_B, name: "Updated" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("6. same-company CRUD happy path", async () => {
      const server = await app();
      const token = await createSession(ownerA.id);
      const createRes = await server.inject({
        method: "POST",
        url: "/v1/warehouse/skus",
        headers: authHeaders(token),
        payload: { skuCode: "SKU-NEW", name: "New SKU" },
      });
      expect(createRes.statusCode).toBe(201);
      const { sku } = createRes.json();
      expect(sku.companyId).toBe(CO_A);
      expect(sku.skuCode).toBe("SKU-NEW");

      const listRes = await server.inject({
        method: "GET",
        url: "/v1/warehouse/skus",
        headers: authHeaders(token),
      });
      expect(listRes.statusCode).toBe(200);
      expect(listRes.json().skus).toHaveLength(1);

      const patchRes = await server.inject({
        method: "PATCH",
        url: `/v1/warehouse/skus/${sku.id}`,
        headers: authHeaders(token),
        payload: { stock: 42 },
      });
      expect(patchRes.statusCode).toBe(200);
      expect(patchRes.json().sku.stock).toBe(42);
    });
  });

  describe("returns parity", () => {
    it("GET returns raw array and DELETE returns success", async () => {
      const server = await app();
      const token = await createSession(ownerA.id);
      const createRes = await server.inject({
        method: "POST",
        url: "/v1/warehouse/returns",
        headers: authHeaders(token),
        payload: { rmaId: "RMA-1", customer: "Acme" },
      });
      expect(createRes.statusCode).toBe(200);
      const row = createRes.json();
      expect(row.companyId).toBe(CO_A);

      const listRes = await server.inject({
        method: "GET",
        url: "/v1/warehouse/returns",
        headers: authHeaders(token),
      });
      expect(Array.isArray(listRes.json())).toBe(true);

      const delRes = await server.inject({
        method: "DELETE",
        url: `/v1/warehouse/returns/${row.id}`,
        headers: authHeaders(token),
      });
      expect(delRes.statusCode).toBe(200);
      expect(delRes.json().success).toBe(true);
    });
  });

  describe("inbound list parity", () => {
    it("returns wrapped shipments key", async () => {
      const server = await app();
      const token = await createSession(ownerA.id);
      const res = await server.inject({
        method: "GET",
        url: "/v1/warehouse/inbound",
        headers: authHeaders(token),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveProperty("shipments");
    });
  });
});

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

const reminders = new Map<string, Record<string, unknown>>();
const articles = new Map<string, Record<string, unknown>>();
const tickets = new Map<string, Record<string, unknown>>();

let reminderSeq = 0;
let articleSeq = 0;
let ticketSeq = 0;

function sessionUser(userId: string) {
  if (userId === ownerA.id) {
    return { ...ownerA, customer: null, brokerProfile: null };
  }
  if (userId === dispatcherB.id) {
    return { ...dispatcherB, customer: null, brokerProfile: null };
  }
  return null;
}

function authHeaders(token: string) {
  return { cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` };
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
        const user = sessionUser(row.userId);
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
    auditLog: {
      create: vi.fn(async () => ({ id: "audit-1" })),
    },
    vehicle: {
      findFirst: vi.fn(async ({ where }: { where: { companyId: string; name: string } }) => {
        if (where.companyId === CO_A && where.name === "Truck A") {
          return { id: "veh-a", companyId: CO_A, name: "Truck A" };
        }
        if (where.companyId === CO_B && where.name === "Truck B") {
          return { id: "veh-b", companyId: CO_B, name: "Truck B" };
        }
        return null;
      }),
    },
    driver: {
      findFirst: vi.fn(async ({ where }: { where: { companyId: string; name: string } }) => {
        if (where.companyId === CO_A && where.name === "Driver A") {
          return { id: "drv-a", companyId: CO_A, name: "Driver A" };
        }
        return null;
      }),
    },
    reminder: {
      findMany: vi.fn(async ({ where }: { where: { companyId: string } }) =>
        [...reminders.values()].filter((r) => r.companyId === where.companyId),
      ),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => reminders.get(where.id) ?? null),
      create: vi.fn(async ({ data, include }: { data: Record<string, unknown>; include?: unknown }) => {
        const id = `rem-${++reminderSeq}`;
        const row = {
          id,
          ...data,
          vehicle: null as { name: string } | null,
          driver: null as { name: string } | null,
        };
        if (data.vehicleId === "veh-a") row.vehicle = { name: "Truck A" };
        if (data.driverId === "drv-a") row.driver = { name: "Driver A" };
        reminders.set(id, row);
        return row;
      }),
      update: vi.fn(async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        const existing = reminders.get(args.where.id);
        if (!existing) throw new Error("missing");
        const updated = { ...existing, ...args.data };
        reminders.set(args.where.id, updated);
        return updated;
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        reminders.delete(where.id);
        return { id: where.id };
      }),
    },
    knowledgeArticle: {
      findMany: vi.fn(async ({ where }: { where: { companyId: string; id?: { not: string } } }) => {
        let rows = [...articles.values()].filter((a) => a.companyId === where.companyId);
        const excludeId = where.id?.not;
        if (excludeId) rows = rows.filter((a) => a.id !== excludeId);
        return rows;
      }),
      findFirst: vi.fn(async ({ where }: { where: { companyId: string; id?: string } }) => {
        const row = where.id ? articles.get(where.id) : null;
        if (!row || row.companyId !== where.companyId) return null;
        return row;
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = `art-${++articleSeq}`;
        const now = new Date();
        const row = {
          id,
          tagsJson: "[]",
          contentJson: "[]",
          attachmentsJson: "[]",
          feedbackJson: "[]",
          revisionsJson: "[]",
          views: 0,
          helpfulCount: 0,
          notHelpfulCount: 0,
          readingTimeMin: 2,
          authorRole: "",
          visibility: "Internal",
          status: "Draft",
          publishedOn: now,
          updatedOn: now,
          ...data,
        };
        articles.set(id, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const existing = articles.get(where.id);
        if (!existing) throw new Error("missing");
        const updated = { ...existing, ...data };
        articles.set(where.id, updated);
        return updated;
      }),
    },
    helpdeskTicket: {
      findMany: vi.fn(async ({ where }: { where: { companyId: string } }) =>
        [...tickets.values()].filter((t) => t.companyId === where.companyId),
      ),
      findFirst: vi.fn(
        async ({
          where,
        }: {
          where: { companyId: string; id?: string; OR?: Array<{ id: string } | { ticketId: string }> };
        }) => {
          if (where.id) {
            const row = tickets.get(where.id);
            if (!row || row.companyId !== where.companyId) return null;
            return row;
          }
          for (const t of tickets.values()) {
            if (t.companyId !== where.companyId) continue;
            for (const clause of where.OR ?? []) {
              if ("id" in clause && t.id === clause.id) return t;
              if ("ticketId" in clause && t.ticketId === clause.ticketId) return t;
            }
          }
          return null;
        },
      ),
      count: vi.fn(async ({ where }: { where: { companyId: string } }) =>
        [...tickets.values()].filter((t) => t.companyId === where.companyId).length,
      ),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = `tkt-${++ticketSeq}`;
        const now = new Date();
        const row = {
          id,
          createdAt: now,
          updatedAt: now,
          customerCode: null,
          resolvedAt: null,
          relatedRef: null,
          slaJson: "{}",
          messagesJson: "[]",
          activityJson: "[]",
          assignee: "Unassigned",
          requesterEmail: "-",
          status: "New",
          priority: "Medium",
          channel: "Email",
          team: "Operations",
          category: "Documentation",
          ...data,
        };
        tickets.set(id, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const existing = tickets.get(where.id);
        if (!existing) throw new Error("missing");
        const updated = { ...existing, ...data };
        tickets.set(where.id, updated);
        return updated;
      }),
    },
  },
}));

async function createSession(userId: string) {
  const token = `tok-${userId}-${Date.now()}`;
  sessions.set(token, { userId, expiresAt: new Date(Date.now() + 86400000) });
  return token;
}

describe("v1 pilot domains", () => {
  beforeEach(() => {
    sessions.clear();
    reminders.clear();
    articles.clear();
    tickets.clear();
    reminderSeq = 0;
    articleSeq = 0;
    ticketSeq = 0;
  });

  async function app() {
    return (await buildApp()).app;
  }

  describe("reminders security", () => {
    it("1. unauthenticated list returns AUTH_REQUIRED", async () => {
      const server = await app();
      const res = await server.inject({ method: "GET", url: "/v1/reminders" });
      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe("AUTH_REQUIRED");
    });

    it("2. module denial returns FORBIDDEN", async () => {
      const server = await app();
      const token = await createSession(dispatcherB.id);
      const res = await server.inject({
        method: "GET",
        url: "/v1/reminders",
        headers: authHeaders(token),
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe("FORBIDDEN");
    });

    it("3. cross-tenant GET patch target returns NOT_FOUND", async () => {
      reminders.set("rem-other", {
        id: "rem-other",
        companyId: CO_B,
        category: "Custom",
        title: "Other",
        dueDate: new Date("2026-12-01"),
        vehicle: null,
        driver: null,
      });
      const server = await app();
      const token = await createSession(ownerA.id);
      const res = await server.inject({
        method: "PATCH",
        url: "/v1/reminders/rem-other",
        headers: authHeaders(token),
        payload: { name: "Hacked" },
      });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("NOT_FOUND");
    });

    it("4. cross-tenant DELETE returns NOT_FOUND", async () => {
      reminders.set("rem-del", {
        id: "rem-del",
        companyId: CO_B,
        category: "Custom",
        title: "Del",
        dueDate: new Date("2026-12-01"),
        vehicle: null,
        driver: null,
      });
      const server = await app();
      const token = await createSession(ownerA.id);
      const res = await server.inject({
        method: "DELETE",
        url: "/v1/reminders/rem-del",
        headers: authHeaders(token),
      });
      expect(res.statusCode).toBe(404);
    });

    it("5. companyId injection in POST is stripped by Zod strict", async () => {
      const server = await app();
      const token = await createSession(ownerA.id);
      const res = await server.inject({
        method: "POST",
        url: "/v1/reminders",
        headers: authHeaders(token),
        payload: {
          name: "Insurance",
          dueDate: "2026-12-15T00:00:00.000Z",
          companyId: CO_B,
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("VALIDATION_ERROR");
    });

    it("6. cross-tenant vehicle FK is not linked on create", async () => {
      const server = await app();
      const token = await createSession(ownerA.id);
      const res = await server.inject({
        method: "POST",
        url: "/v1/reminders",
        headers: authHeaders(token),
        payload: {
          name: "Service",
          dueDate: "2026-12-15T00:00:00.000Z",
          entity: "Truck B",
          entityType: "Vehicle",
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().reminder.entity).toBe("");
    });

    it("7. tenant vehicle FK resolves entity name", async () => {
      const server = await app();
      const token = await createSession(ownerA.id);
      const res = await server.inject({
        method: "POST",
        url: "/v1/reminders",
        headers: authHeaders(token),
        payload: {
          name: "Service",
          dueDate: "2026-12-15T00:00:00.000Z",
          entity: "Truck A",
          entityType: "Vehicle",
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().reminder.entity).toBe("Truck A");
    });

    it("8. CRUD happy path for authorized tenant", async () => {
      const server = await app();
      const token = await createSession(ownerA.id);
      const created = await server.inject({
        method: "POST",
        url: "/v1/reminders",
        headers: authHeaders(token),
        payload: { name: "PUC", dueDate: "2026-06-01T00:00:00.000Z" },
      });
      expect(created.statusCode).toBe(201);
      const id = created.json().reminder.id;

      const listed = await server.inject({
        method: "GET",
        url: "/v1/reminders",
        headers: authHeaders(token),
      });
      expect(listed.json().reminders).toHaveLength(1);

      const patched = await server.inject({
        method: "PATCH",
        url: `/v1/reminders/${id}`,
        headers: authHeaders(token),
        payload: { status: "Done" },
      });
      expect(patched.statusCode).toBe(200);

      const deleted = await server.inject({
        method: "DELETE",
        url: `/v1/reminders/${id}`,
        headers: authHeaders(token),
      });
      expect(deleted.statusCode).toBe(200);
      expect(deleted.json().ok).toBe(true);
    });
  });

  describe("knowledge security", () => {
    it("cross-tenant article GET returns NOT_FOUND", async () => {
      articles.set("art-b", {
        id: "art-b",
        companyId: CO_B,
        slug: "secret",
        title: "Secret",
        category: "SOPs",
        tagsJson: "[]",
        summary: "x",
        author: "B",
        authorRole: "",
        publishedOn: new Date(),
        updatedOn: new Date(),
        views: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        status: "Draft",
        visibility: "Internal",
        readingTimeMin: 2,
        contentJson: "[]",
        attachmentsJson: "[]",
        feedbackJson: "[]",
        revisionsJson: "[]",
      });
      const server = await app();
      const token = await createSession(ownerA.id);
      const res = await server.inject({
        method: "GET",
        url: "/v1/knowledge/art-b",
        headers: authHeaders(token),
      });
      expect(res.statusCode).toBe(404);
    });

    it("module denial and CRUD with audit on create", async () => {
      const server = await app();
      const denied = await server.inject({
        method: "GET",
        url: "/v1/knowledge",
        headers: authHeaders(await createSession(dispatcherB.id)),
      });
      expect(denied.statusCode).toBe(403);

      const token = await createSession(ownerA.id);
      const created = await server.inject({
        method: "POST",
        url: "/v1/knowledge",
        headers: authHeaders(token),
        payload: { title: "Safety SOP", summary: "Wear PPE" },
      });
      expect(created.statusCode).toBe(201);
      const { db } = await import("@reanzly/database");
      expect(db.auditLog.create).toHaveBeenCalled();
    });

    it("companyId injection rejected on create", async () => {
      const server = await app();
      const token = await createSession(ownerA.id);
      const res = await server.inject({
        method: "POST",
        url: "/v1/knowledge",
        headers: authHeaders(token),
        payload: { title: "X", summary: "Y", companyId: CO_B },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("helpdesk security", () => {
    it("cross-tenant ticket GET returns NOT_FOUND", async () => {
      tickets.set("tkt-b", {
        id: "tkt-b",
        companyId: CO_B,
        ticketId: "TKT-9999",
        subject: "Secret",
        description: "d",
        customer: "C",
        customerCode: "",
        priority: "Medium",
        status: "New",
        channel: "Email",
        team: "Ops",
        assignee: "Unassigned",
        requester: "R",
        requesterEmail: "-",
        category: "Doc",
        slaJson: "{}",
        messagesJson: "[]",
        activityJson: "[]",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const server = await app();
      const token = await createSession(ownerA.id);
      const res = await server.inject({
        method: "GET",
        url: "/v1/helpdesk/tkt-b",
        headers: authHeaders(token),
      });
      expect(res.statusCode).toBe(404);
    });

    it("assignee patch scoped to tenant ticket", async () => {
      const server = await app();
      const token = await createSession(ownerA.id);
      const created = await server.inject({
        method: "POST",
        url: "/v1/helpdesk",
        headers: authHeaders(token),
        payload: {
          subject: "Need help",
          customer: "Acme",
          requester: "Jane",
          description: "Issue details",
        },
      });
      const id = created.json().ticket.id;
      const patched = await server.inject({
        method: "PATCH",
        url: `/v1/helpdesk/${id}`,
        headers: authHeaders(token),
        payload: { assignee: "Agent Smith" },
      });
      expect(patched.statusCode).toBe(200);
      expect(patched.json().ticket.assignee).toBe("Agent Smith");
    });

    it("companyId injection rejected on create", async () => {
      const server = await app();
      const token = await createSession(ownerA.id);
      const res = await server.inject({
        method: "POST",
        url: "/v1/helpdesk",
        headers: authHeaders(token),
        payload: {
          subject: "X",
          customer: "C",
          requester: "R",
          description: "D",
          companyId: CO_B,
        },
      });
      expect(res.statusCode).toBe(400);
    });
  });
});

import { describe, expect, it } from "vitest";
import { hasModuleAccess } from "@reanzly/shared";
import {
  ReminderDtoSchema,
  KnowledgeArticleDtoSchema,
  HelpdeskTicketDtoSchema,
  WarehouseSkuDtoSchema,
} from "@reanzly/contracts";

function statusForDays(days: number): string {
  if (days < 0) return "Overdue";
  if (days <= 7) return "Due Soon";
  return "Upcoming";
}

describe("pilot domain parity helpers", () => {
  it("module gates match legacy permission names", () => {
    expect(hasModuleAccess("owner", "reminders")).toBe(true);
    expect(hasModuleAccess("dispatcher", "reminders")).toBe(false);
    expect(hasModuleAccess("hr-manager", "knowledge")).toBe(true);
    expect(hasModuleAccess("branch-manager", "helpdesk")).toBe(true);
    expect(hasModuleAccess("finance-manager", "helpdesk")).toBe(false);
    expect(hasModuleAccess("warehouse-manager", "warehouse")).toBe(true);
    expect(hasModuleAccess("dispatcher", "warehouse")).toBe(false);
  });

  it("reminder response schema matches legacy field set", () => {
    const dto = ReminderDtoSchema.parse({
      id: "r1",
      type: "Service",
      entity: "Truck A",
      entityType: "Vehicle",
      name: "Oil change",
      dueDate: "2026-06-01T00:00:00.000Z",
      daysRemaining: 10,
      status: "Upcoming",
    });
    expect(Object.keys(dto).sort()).toEqual(
      ["daysRemaining", "dueDate", "entity", "entityType", "id", "name", "status", "type"].sort(),
    );
    expect(statusForDays(-1)).toBe("Overdue");
  });

  it("knowledge response schema excludes prisma internals", () => {
    const dto = KnowledgeArticleDtoSchema.parse({
      id: "a1",
      slug: "safety",
      title: "Safety",
      category: "SOPs",
      tags: ["safety"],
      summary: "Summary",
      author: "Author",
      authorRole: "Ops",
      publishedOn: "2026-01-01T00:00:00.000Z",
      updatedOn: "2026-01-01T00:00:00.000Z",
      views: 1,
      helpfulCount: 0,
      notHelpfulCount: 0,
      status: "Draft",
      visibility: "Internal",
      readingTimeMin: 3,
      content: [],
      attachments: [],
      related: [],
      feedback: [],
      revisions: [],
    });
    expect(dto).not.toHaveProperty("companyId");
    expect(dto).not.toHaveProperty("tagsJson");
  });

  it("helpdesk response schema preserves ticketId", () => {
    const dto = HelpdeskTicketDtoSchema.parse({
      id: "cuid-1",
      ticketId: "TKT-2841",
      subject: "Help",
      description: "Details",
      customer: "Acme",
      customerCode: "",
      priority: "Medium",
      status: "New",
      channel: "Email",
      team: "Operations",
      assignee: "Unassigned",
      requester: "Jane",
      requesterEmail: "j@acme.in",
      category: "Documentation",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      sla: {},
      messages: [],
      activity: [],
    });
    expect(dto.ticketId).toBe("TKT-2841");
    expect(dto).not.toHaveProperty("companyId");
  });

  it("warehouse sku schema preserves tenant fields for legacy parity", () => {
    const dto = WarehouseSkuDtoSchema.parse({
      id: "sku-1",
      companyId: "co-a",
      skuCode: "SKU-1",
      name: "Widget",
      category: "General",
      hsn: "1234",
      unit: "EA",
      stock: 10,
      reserved: 0,
      minLevel: 2,
      reorderQty: 5,
      unitCost: 100,
      location: "A-1",
      godown: "Main",
      supplier: "Acme",
      gstRate: 18,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(dto.skuCode).toBe("SKU-1");
    expect(dto.companyId).toBe("co-a");
  });
});

// Rean's scoped database-query tool: lets Rean answer questions against
// real business tables and propose real writes, with two hard limits:
//   1. Only an explicit allowlist of models is ever touched - no security/
//      auth tables (User passwords, Session, PlatformUser, audit logs,
//      integration credentials), no raw/arbitrary Prisma access.
//   2. Every write is confirm-before-execute: proposeWrite() only ever
//      writes a pending RagAction row - nothing changes in the actual
//      business table until confirmAction() is called for that specific
//      pending action, by the same user who proposed it.
// All reads are scoped to companyId (tenant isolation) and capped at 25 rows.
import { db } from "@/lib/db";

interface ModelConfig {
  label: string;
  prismaKey: string;
  aliases: string[];
  // Columns shown in table output - deliberately curated, not "all fields",
  // even though none of these models hold anything sensitive today. Keeping
  // an explicit allowlist here means a future field addition to the schema
  // doesn't silently start appearing in Rean's answers.
  columns: { field: string; header: string; format?: (v: any) => string }[];
  statusField?: string;
  // The field a human would naturally type to point at one row, e.g.
  // "RZ-INV-21444" for an invoice - used to resolve a write command's
  // target record.
  identifierField: string;
  // Fields Rean is allowed to propose changing via proposeWrite(), and the
  // values considered valid for each - anything else is rejected before a
  // RagAction is even created, not just before execution.
  writableFields?: Record<string, string[]>;
  orderBy?: Record<string, "asc" | "desc">;
}

const inr = (n: number) => `Rs ${Number(n ?? 0).toLocaleString("en-IN")}`;
const dt = (v: any) => (v ? new Date(v).toISOString().slice(0, 10) : "—");

export const ALLOWED_MODELS: Record<string, ModelConfig> = {
  vehicle: {
    label: "Vehicle", prismaKey: "vehicle",
    aliases: ["vehicle", "vehicles", "truck", "trucks", "fleet"],
    columns: [
      { field: "name", header: "Vehicle" }, { field: "licensePlate", header: "Plate" },
      { field: "status", header: "Status" }, { field: "location", header: "Location" },
    ],
    statusField: "status",
    identifierField: "licensePlate",
    writableFields: { status: ["Active", "Idle", "In Maintenance", "Offline"] },
    orderBy: { createdAt: "desc" },
  },
  driver: {
    label: "Driver", prismaKey: "driver",
    aliases: ["driver", "drivers"],
    columns: [
      { field: "name", header: "Driver" }, { field: "status", header: "Status" },
      { field: "city", header: "City" }, { field: "rating", header: "Rating" },
      { field: "onTimeRate", header: "On-time", format: (v) => `${Math.round((v ?? 0) * 100)}%` },
    ],
    statusField: "status",
    identifierField: "name",
    writableFields: { status: ["Active", "On Leave", "Inactive"] },
    orderBy: { createdAt: "desc" },
  },
  customer: {
    label: "Customer", prismaKey: "customer",
    aliases: ["customer", "customers", "client", "clients"],
    columns: [
      { field: "companyName", header: "Customer" }, { field: "city", header: "City" },
      { field: "outstandingBalance", header: "Outstanding", format: inr },
      { field: "status", header: "Status" },
    ],
    statusField: "status",
    identifierField: "companyName",
    orderBy: { createdAt: "desc" },
  },
  vendor: {
    label: "Vendor", prismaKey: "vendor",
    aliases: ["vendor", "vendors", "supplier", "suppliers"],
    columns: [
      { field: "companyName", header: "Vendor" }, { field: "type", header: "Type" },
      { field: "city", header: "City" }, { field: "status", header: "Status" },
    ],
    statusField: "status",
    identifierField: "companyName",
    orderBy: { createdAt: "desc" },
  },
  trip: {
    label: "Trip", prismaKey: "trip",
    aliases: ["trip", "trips", "shipment", "shipments"],
    columns: [
      { field: "tripId", header: "Trip" }, { field: "origin", header: "From" },
      { field: "destination", header: "To" }, { field: "status", header: "Status" },
      { field: "freightAmount", header: "Freight", format: inr },
    ],
    statusField: "status",
    identifierField: "tripId",
    writableFields: { status: ["Planned", "Active", "In Transit", "Delivered", "Cancelled", "Breakdown"] },
    orderBy: { createdAt: "desc" },
  },
  invoice: {
    label: "Invoice", prismaKey: "invoice",
    aliases: ["invoice", "invoices", "bill", "bills"],
    columns: [
      { field: "invoiceNumber", header: "Invoice" }, { field: "customer", header: "Customer" },
      { field: "totalAmount", header: "Amount", format: inr }, { field: "status", header: "Status" },
      { field: "dueDate", header: "Due", format: dt },
    ],
    statusField: "status",
    identifierField: "invoiceNumber",
    writableFields: { status: ["Draft", "Sent", "Partially Paid", "Paid", "Overdue", "Cancelled", "Credit Note"] },
    orderBy: { createdAt: "desc" },
  },
  expense: {
    label: "Expense", prismaKey: "expense",
    aliases: ["expense", "expenses"],
    columns: [
      { field: "category", header: "Category" }, { field: "amount", header: "Amount", format: inr },
      { field: "status", header: "Status" },
    ],
    statusField: "status",
    identifierField: "id",
    orderBy: { createdAt: "desc" },
  },
  issue: {
    label: "Issue", prismaKey: "issue",
    aliases: ["issue", "issues", "breakdown", "breakdowns", "defect", "defects"],
    columns: [
      { field: "title", header: "Issue" }, { field: "severity", header: "Severity" },
      { field: "status", header: "Status" },
    ],
    statusField: "status",
    identifierField: "id",
    orderBy: { createdAt: "desc" },
  },
};

export function findModelByText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [key, cfg] of Object.entries(ALLOWED_MODELS)) {
    if (cfg.aliases.some((a) => new RegExp(`\\b${a}\\b`).test(lower))) return key;
  }
  return null;
}

export interface QueryResult {
  modelKey: string;
  label: string;
  rows: Record<string, any>[];
  total: number;
  columns: ModelConfig["columns"];
}

// Every status value in the schema follows Title Case ("Active", "In
// Maintenance", "Partially Paid", "Credit Note"), but a status word lifted
// out of natural language is whatever case the operator typed. SQLite's `=`
// is case-sensitive (no COLLATE NOCASE on these columns, and Prisma's
// `mode: "insensitive"` is Postgres-only - not available on this provider),
// so a naive pass-through silently matched zero rows against real data.
function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

/** Real read: allowlisted models only, tenant-scoped, capped at 25 rows. */
export async function queryTable(
  modelKey: string,
  companyId: string,
  opts: { status?: string; limit?: number } = {}
): Promise<QueryResult | null> {
  const cfg = ALLOWED_MODELS[modelKey];
  if (!cfg) return null;

  const where: Record<string, any> = { companyId };
  if (opts.status && cfg.statusField) where[cfg.statusField] = titleCase(opts.status);

  const take = Math.min(Math.max(opts.limit ?? 8, 1), 25);
  const model = (db as any)[cfg.prismaKey];
  const [rows, total] = await Promise.all([
    model.findMany({ where, take, orderBy: cfg.orderBy }),
    model.count({ where }),
  ]);

  return { modelKey, label: cfg.label, rows, total, columns: cfg.columns };
}

/**
 * Picks whichever presentation reads clearer for the shape of the result,
 * rather than always rendering a markdown table. A single record read as a
 * table row forces the reader to cross-reference a header for every field;
 * the same record as a plain sentence reads in one pass. Multiple records
 * genuinely benefit from a table - that's exactly the case tables exist
 * for: comparing the same columns across rows.
 */
export function formatQueryResult(result: QueryResult): string {
  const { rows, columns, label } = result;
  if (rows.length === 0) return `No ${label.toLowerCase()} records found.`;

  if (rows.length === 1) {
    const row = rows[0];
    const parts = columns.map(
      (c) => `${c.header}: ${c.format ? c.format(row[c.field]) : String(row[c.field] ?? "—")}`
    );
    return `${label} — ${parts.join(" · ")}.`;
  }

  return formatAsMarkdownTable(result);
}

export function formatAsMarkdownTable(result: QueryResult): string {
  const { columns, rows, label, total } = result;
  if (rows.length === 0) return `No ${result.label.toLowerCase()} records found.`;

  const header = `| ${columns.map((c) => c.header).join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows
    .map((row) => `| ${columns.map((c) => (c.format ? c.format(row[c.field]) : String(row[c.field] ?? "—"))).join(" | ")} |`)
    .join("\n");

  const truncNote = total > rows.length ? `\n\n_Showing ${rows.length} of ${total} ${label.toLowerCase()} records._` : "";
  return `${header}\n${divider}\n${body}${truncNote}`;
}

// ===== Confirm-before-write =====

export interface ProposedWrite {
  actionId: string;
  summary: string;
}

/** Validates the field/value against the model's writable allowlist, then logs a PENDING action - nothing in the real table changes yet. */
export async function proposeWrite(opts: {
  companyId: string;
  userId: string;
  modelKey: string;
  recordMatch: { field: string; value: string }; // e.g. { field: "invoiceNumber", value: "RZ-INV-21444" }
  updateField: string;
  updateValue: string;
}): Promise<{ ok: true; proposal: ProposedWrite } | { ok: false; error: string }> {
  const cfg = ALLOWED_MODELS[opts.modelKey];
  if (!cfg) return { ok: false, error: "That table isn't one I can write to." };
  const allowedValues = cfg.writableFields?.[opts.updateField];
  if (!allowedValues) return { ok: false, error: `I can't change "${opts.updateField}" on ${cfg.label}.` };
  if (!allowedValues.includes(opts.updateValue)) {
    return { ok: false, error: `"${opts.updateValue}" isn't a valid ${opts.updateField} for ${cfg.label}. Valid values: ${allowedValues.join(", ")}.` };
  }

  const model = (db as any)[cfg.prismaKey];
  const record = await model.findFirst({ where: { companyId: opts.companyId, [opts.recordMatch.field]: opts.recordMatch.value } });
  if (!record) return { ok: false, error: `Couldn't find a ${cfg.label.toLowerCase()} matching "${opts.recordMatch.value}".` };

  const summary = `Set ${cfg.label} ${opts.recordMatch.value}'s ${opts.updateField} to "${opts.updateValue}"`;
  const action = await db.ragAction.create({
    data: {
      companyId: opts.companyId,
      userId: opts.userId,
      operation: "update",
      model: opts.modelKey,
      recordId: record.id,
      argsJson: JSON.stringify({ [opts.updateField]: opts.updateValue }),
      summary,
      status: "pending",
    },
  });

  return { ok: true, proposal: { actionId: action.id, summary } };
}

/** Executes a pending action - only if it's still pending and belongs to this user. */
export async function confirmAction(actionId: string, userId: string): Promise<{ ok: boolean; message: string }> {
  const action = await db.ragAction.findUnique({ where: { id: actionId } });
  if (!action || action.userId !== userId) return { ok: false, message: "I don't have a pending action like that for you." };
  if (action.status !== "pending") return { ok: false, message: `That action was already ${action.status}.` };

  const cfg = ALLOWED_MODELS[action.model];
  if (!cfg) return { ok: false, message: "That table is no longer writable." };

  try {
    const data = JSON.parse(action.argsJson);
    await (db as any)[cfg.prismaKey].update({ where: { id: action.recordId! }, data });
    await db.ragAction.update({ where: { id: action.id }, data: { status: "executed", executedAt: new Date(), decidedAt: new Date() } });
    return { ok: true, message: `Done — ${action.summary}.` };
  } catch (e) {
    await db.ragAction.update({ where: { id: action.id }, data: { status: "failed", errorMessage: String(e), decidedAt: new Date() } });
    return { ok: false, message: "That update failed on my end. Nothing was changed." };
  }
}

export async function rejectAction(actionId: string, userId: string): Promise<void> {
  const action = await db.ragAction.findUnique({ where: { id: actionId } });
  if (!action || action.userId !== userId || action.status !== "pending") return;
  await db.ragAction.update({ where: { id: actionId }, data: { status: "rejected", decidedAt: new Date() } });
}

/** The most recent pending action for a user, if any - used to interpret a bare "yes"/"confirm" reply. */
export async function getPendingAction(userId: string, companyId: string) {
  return db.ragAction.findFirst({
    where: { userId, companyId, status: "pending" },
    orderBy: { createdAt: "desc" },
  });
}

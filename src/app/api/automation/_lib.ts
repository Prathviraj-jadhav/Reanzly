import { db } from "@/lib/db";

// Shared helpers for the Automation module's real API routes. Not a route
// file itself (no route.ts filename) so Next.js doesn't treat it as an
// endpoint.

export type ConditionRow = { field: string; operator: string; value: string };
export type ActionRow = { type: string; config: string };

export function parseRows(json: string | null | undefined): { field?: string; operator?: string; value?: string; type?: string; config?: string }[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function toAutomationDTO(a: {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  triggerCategory: string;
  conditions: string;
  actions: string;
  status: string;
  lastRun: Date | null;
  runCount: number;
  createdBy: string | null;
}) {
  return {
    id: a.id,
    name: a.name,
    description: a.description ?? "",
    trigger: a.trigger,
    triggerCategory: a.triggerCategory,
    conditions: parseRows(a.conditions) as ConditionRow[],
    actions: parseRows(a.actions) as ActionRow[],
    status: a.status,
    lastRun: a.lastRun ? a.lastRun.toISOString() : undefined,
    runCount: a.runCount,
    createdBy: a.createdBy ?? "",
  };
}

export function toRunLogDTO(l: {
  id: string;
  automationName: string;
  triggerEntity: string | null;
  conditionsEvaluated: string | null;
  result: string;
  error: string | null;
  durationMs: number;
  createdAt: Date;
}) {
  return {
    id: l.id,
    automationName: l.automationName,
    timestamp: l.createdAt.toISOString(),
    triggerEntity: l.triggerEntity ?? "-",
    conditionsEvaluated: l.conditionsEvaluated ?? "-",
    result: l.result,
    error: l.error ?? undefined,
    durationMs: l.durationMs,
  };
}

// ===== Real trigger evaluation =====
// Runs a real, targeted Prisma query for the well-defined trigger events
// below - not a general condition-tree interpreter. Anything outside this
// list is honestly reported as unsupported rather than faking a plausible
// match count, matching the standing "flag, don't fake" convention used
// elsewhere in this codebase's mock-to-real conversions.

export interface EvalMatch {
  id: string;
  label: string;
}

export interface EvalResult {
  supported: boolean;
  totalMatched: number;
  matches: EvalMatch[]; // capped sample, used for the run-log label and (optionally) task creation
}

const UNSUPPORTED: EvalResult = { supported: false, totalMatched: 0, matches: [] };
const SAMPLE_CAP = 5;

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}
function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 86_400_000);
}

export async function evaluateTrigger(companyId: string, triggerCategory: string, trigger: string): Promise<EvalResult> {
  // Invoice overdue by N days
  if (triggerCategory === "Invoice") {
    const m = /overdue by (\d+) days/.exec(trigger);
    if (m) {
      const days = Number(m[1]);
      const rows = await db.invoice.findMany({
        where: { companyId, paymentStatus: { not: "Paid" }, dueDate: { lte: daysAgo(days) } },
        select: { id: true, invoiceNumber: true },
        take: SAMPLE_CAP,
      });
      const total = await db.invoice.count({
        where: { companyId, paymentStatus: { not: "Paid" }, dueDate: { lte: daysAgo(days) } },
      });
      return { supported: true, totalMatched: total, matches: rows.map((r) => ({ id: r.id, label: `Invoice ${r.invoiceNumber}` })) };
    }
  }

  // Document expiry approaching (Nd) / Document expired
  if (triggerCategory === "Document") {
    const approaching = /expiry approaching \((\d+)d\)/.exec(trigger);
    if (approaching) {
      const days = Number(approaching[1]);
      const where = { companyId, expiryDate: { gte: new Date(), lte: daysFromNow(days) } };
      const rows = await db.document.findMany({ where, select: { id: true, name: true, type: true }, take: SAMPLE_CAP });
      const total = await db.document.count({ where });
      return { supported: true, totalMatched: total, matches: rows.map((r) => ({ id: r.id, label: `${r.type} · ${r.name}` })) };
    }
    if (trigger === "Document expired") {
      const where = { companyId, OR: [{ status: "Expired" }, { expiryDate: { lt: new Date() } }] };
      const rows = await db.document.findMany({ where, select: { id: true, name: true, type: true }, take: SAMPLE_CAP });
      const total = await db.document.count({ where });
      return { supported: true, totalMatched: total, matches: rows.map((r) => ({ id: r.id, label: `${r.type} · ${r.name}` })) };
    }
  }

  // Inspection result = X
  if (triggerCategory === "Inspection") {
    const m = /result = (\w+)/.exec(trigger);
    if (m) {
      const result = m[1];
      const rows = await db.inspection.findMany({
        where: { companyId, result },
        select: { id: true, inspectionId: true },
        take: SAMPLE_CAP,
        orderBy: { date: "desc" },
      });
      const total = await db.inspection.count({ where: { companyId, result } });
      return { supported: true, totalMatched: total, matches: rows.map((r) => ({ id: r.id, label: `Inspection ${r.inspectionId}` })) };
    }
  }

  // Trip delayed > N hours
  if (triggerCategory === "Trip") {
    const m = /delayed > (\d+) hours/.exec(trigger);
    if (m) {
      const hours = Number(m[1]);
      const cutoff = new Date(Date.now() - hours * 3_600_000);
      const where = {
        companyId,
        status: { notIn: ["Delivered", "Cancelled"] },
        expectedDelivery: { lt: cutoff },
      };
      const rows = await db.trip.findMany({ where, select: { id: true, tripId: true }, take: SAMPLE_CAP });
      const total = await db.trip.count({ where });
      return { supported: true, totalMatched: total, matches: rows.map((r) => ({ id: r.id, label: `Trip ${r.tripId}` })) };
    }
    // POD accepted - real analog is Pod.submissionStatus = "Approved" (Pod has no literal "Accepted" status).
    if (trigger === "POD accepted") {
      const where = { companyId, submissionStatus: "Approved" };
      const rows = await db.pod.findMany({ where, select: { id: true, voucherNumber: true }, take: SAMPLE_CAP });
      const total = await db.pod.count({ where });
      return { supported: true, totalMatched: total, matches: rows.map((r) => ({ id: r.id, label: `POD ${r.voucherNumber}` })) };
    }
  }

  return UNSUPPORTED;
}

// ===== Real action execution (Create Task only) =====
// The other action types (Send Notification/Email/SMS, Generate Invoice
// Draft, Trigger Rean Analysis) would each need a live integration this app
// deliberately doesn't build (third-party API keys are off-limits, and
// invoice-draft generation is its own real subsystem) - those are honestly
// logged as "queued" rather than faked as sent. "Create Task" already has
// real backing (the Operations Hub Task model), so it's wired for real.

export async function executeCreateTaskAction(
  companyId: string,
  automationName: string,
  trigger: string,
  triggerCategory: string,
  config: string,
  matches: EvalMatch[],
): Promise<number> {
  const DEPT_BY_CATEGORY: Record<string, string> = {
    Invoice: "Finance",
    Document: "Operations",
    Inspection: "Maintenance",
    Trip: "Dispatch",
    Vehicle: "Fleet",
    Fuel: "Fleet",
    Issue: "Operations",
    "Rean Alert": "Operations",
  };
  // No real matches -> nothing to act on. Skip entirely rather than
  // creating a placeholder task about "no matches" (that's exactly the
  // kind of fake-looking busywork this conversion is meant to eliminate).
  let created = 0;
  for (const target of matches.slice(0, SAMPLE_CAP)) {
    await db.task.create({
      data: {
        companyId,
        title: `${automationName}: ${target.label}`,
        description: `Auto-created by automation "${automationName}" (trigger: ${trigger}).`,
        assignee: config.trim() || "Unassigned",
        priority: "Medium",
        department: DEPT_BY_CATEGORY[triggerCategory] ?? "Operations",
        status: "Backlog",
        isRean: true,
        createdBy: `Automation: ${automationName}`,
      },
    });
    created++;
  }
  return created;
}

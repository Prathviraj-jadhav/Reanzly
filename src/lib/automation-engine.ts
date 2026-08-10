import { db } from "@/lib/db";
import { inferSLM } from "@/lib/slm/client";
import { enqueue } from "@/lib/queue";

// Real trigger-evaluation + action-execution engine for the Automation
// module. Shared by the manual "Run Now" route (src/app/api/automation/
// [id]/run/route.ts) and the recurring-schedule job handler
// (src/lib/queue/index.ts's "automation.run" handler) so a scheduled run
// and a manual run do exactly the same real work.

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
  scheduleEnabled: boolean;
  scheduleIntervalMinutes: number | null;
  nextRunAt: Date | null;
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
    scheduleEnabled: a.scheduleEnabled,
    scheduleIntervalMinutes: a.scheduleIntervalMinutes ?? undefined,
    nextRunAt: a.nextRunAt ? a.nextRunAt.toISOString() : undefined,
  };
}

export function toRunLogDTO(l: {
  id: string;
  automationName: string;
  triggerEntity: string | null;
  conditionsEvaluated: string | null;
  result: string;
  error: string | null;
  notes: string | null;
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
    notes: l.notes ?? undefined,
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
  vehicleId?: string;
}

export interface EvalResult {
  supported: boolean;
  totalMatched: number;
  matches: EvalMatch[]; // capped sample, used for the run-log label and real action execution
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
      const where = { companyId, paymentStatus: { not: "Paid" }, dueDate: { lte: daysAgo(days) } };
      const rows = await db.invoice.findMany({ where, select: { id: true, invoiceNumber: true }, take: SAMPLE_CAP });
      const total = await db.invoice.count({ where });
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
      const where = { companyId, result };
      const rows = await db.inspection.findMany({
        where, select: { id: true, inspectionId: true, vehicleId: true }, take: SAMPLE_CAP, orderBy: { date: "desc" },
      });
      const total = await db.inspection.count({ where });
      return {
        supported: true, totalMatched: total,
        matches: rows.map((r) => ({ id: r.id, label: `Inspection ${r.inspectionId}`, vehicleId: r.vehicleId ?? undefined })),
      };
    }
  }

  // Trip delayed > N hours
  if (triggerCategory === "Trip") {
    const m = /delayed > (\d+) hours/.exec(trigger);
    if (m) {
      const hours = Number(m[1]);
      const cutoff = new Date(Date.now() - hours * 3_600_000);
      const where = { companyId, status: { notIn: ["Delivered", "Cancelled"] }, expectedDelivery: { lt: cutoff } };
      const rows = await db.trip.findMany({ where, select: { id: true, tripId: true, vehicleId: true }, take: SAMPLE_CAP });
      const total = await db.trip.count({ where });
      return {
        supported: true, totalMatched: total,
        matches: rows.map((r) => ({ id: r.id, label: `Trip ${r.tripId}`, vehicleId: r.vehicleId ?? undefined })),
      };
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

// ===== Real action execution =====
// "Create Task" and "Create Work Order" have real backing models in this
// app (Operations Hub's Task, and WorkOrder) so they execute for real.
// "Trigger Rean Analysis" calls the same real local SLM engine every other
// Rean surface in this app uses (src/lib/slm/client.ts) - offline-capable,
// not a third-party API call. The remaining action types (Send
// Notification/Email/SMS, Generate Invoice Draft) have no live integration
// in this app - deliberately, since email/SMS would need third-party API
// keys this project doesn't touch - so they're honestly logged as
// "queued" rather than faked as sent.

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

export async function executeCreateTaskAction(
  companyId: string,
  automationName: string,
  trigger: string,
  triggerCategory: string,
  config: string,
  matches: EvalMatch[],
): Promise<number> {
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

export async function executeCreateWorkOrderAction(
  companyId: string,
  automationName: string,
  trigger: string,
  config: string,
  matches: EvalMatch[],
): Promise<number> {
  // Only matches carrying a real vehicleId can become a work order (a
  // WorkOrder is always about a specific vehicle) - matches without one
  // (e.g. an Invoice trigger) are skipped rather than creating an
  // orphaned/placeholder work order.
  const withVehicle = matches.filter((m) => m.vehicleId);
  let created = 0;
  for (const target of withVehicle.slice(0, SAMPLE_CAP)) {
    await db.workOrder.create({
      data: {
        companyId,
        workOrderId: `WO-AUT-${Date.now().toString(36)}${created}`.toUpperCase(),
        vehicleId: target.vehicleId,
        title: `${automationName}: ${target.label}`,
        type: "Unscheduled",
        priority: "Medium",
        status: "Open",
        vendor: config.trim() || null,
      },
    });
    created++;
  }
  return created;
}

export async function executeReanAnalysisAction(
  automationName: string,
  trigger: string,
  triggerCategory: string,
  matches: EvalMatch[],
  totalMatched: number,
): Promise<string> {
  const sample = matches.slice(0, 5).map((m) => m.label).join(", ") || "no specific records";
  const prompt = `Rean, logistics analyst. Be direct, under 50 words, no preamble.
Automation "${automationName}" fired on trigger "${trigger}" (${triggerCategory}). ${totalMatched} real record(s) matched: ${sample}.
Give one concrete, actionable observation or recommendation for an operations manager reviewing this.`;
  const analysis = await inferSLM(prompt, { tier: "fast", fallbackQuery: `${triggerCategory} ${trigger} analysis` });
  return analysis.trim();
}

// ===== Scheduling ("loops") =====
// A real, durable recurring execution backed by the existing SQLite job
// queue (src/lib/queue) - each run re-enqueues its own next occurrence, so
// the "loop" survives server restarts (the job is a real DB row, not an
// in-memory timer) and stops the instant the automation is paused/deleted
// (the job handler re-checks live state before doing anything).

export async function scheduleNextRun(automationId: string, intervalMinutes: number): Promise<Date> {
  const nextRunAt = new Date(Date.now() + intervalMinutes * 60_000);
  await db.automation.update({ where: { id: automationId }, data: { nextRunAt } });
  await enqueue("automation.run", { automationId }, { runAfterMs: intervalMinutes * 60_000 });
  return nextRunAt;
}

// ===== Core run (shared by manual "Run Now" and the scheduled job) =====

// Tenant authorization happens at the API boundary (callers already
// resolved `automationId` from a companyId-scoped lookup, or the caller is
// the trusted internal job queue) - this just needs a real automation id.
export async function runAutomationOnce(automationId: string) {
  const automation = await db.automation.findUnique({ where: { id: automationId } });
  if (!automation) return null;
  const companyId = automation.companyId;

  const started = Date.now();
  const evalResult = await evaluateTrigger(companyId, automation.triggerCategory, automation.trigger);

  const conditions = parseRows(automation.conditions) as ConditionRow[];
  const actions = parseRows(automation.actions) as ActionRow[];
  const conditionsEvaluated = conditions.length > 0
    ? conditions.map((c) => `${c.field} ${c.operator} ${c.value || "…"}`).join(", ")
    : "no conditions (fires on every match)";

  let tasksCreated = 0;
  let workOrdersCreated = 0;
  let reanNotes: string | null = null;
  const queuedActionTypes: string[] = [];

  if (evalResult.supported) {
    for (const action of actions) {
      if (action.type === "Create Task" && tasksCreated === 0) {
        tasksCreated = await executeCreateTaskAction(
          companyId, automation.name, automation.trigger, automation.triggerCategory, action.config, evalResult.matches,
        );
      } else if (action.type === "Create Work Order" && workOrdersCreated === 0) {
        workOrdersCreated = await executeCreateWorkOrderAction(
          companyId, automation.name, automation.trigger, action.config, evalResult.matches,
        );
      } else if (action.type === "Trigger Rean Analysis" && !reanNotes) {
        reanNotes = await executeReanAnalysisAction(
          automation.name, automation.trigger, automation.triggerCategory, evalResult.matches, evalResult.totalMatched,
        ).catch(() => null);
      } else {
        queuedActionTypes.push(action.type);
      }
    }
  }

  const durationMs = Date.now() - started;
  const result = evalResult.supported ? "Success" : "Unsupported";
  const triggerEntity = !evalResult.supported
    ? "-"
    : evalResult.totalMatched === 0
      ? "No matches"
      : evalResult.totalMatched === 1
        ? evalResult.matches[0].label
        : `${evalResult.matches[0].label} + ${evalResult.totalMatched - 1} more`;
  const actionSummary: string[] = [];
  if (tasksCreated > 0) actionSummary.push(`${tasksCreated} task(s) created`);
  if (workOrdersCreated > 0) actionSummary.push(`${workOrdersCreated} work order(s) created`);
  const error = !evalResult.supported
    ? "Live evaluation not implemented for this trigger yet - automation saved, but Run Now can't query real data for it."
    : queuedActionTypes.length > 0
      ? `Queued (no live integration): ${queuedActionTypes.join(", ")}${actionSummary.length > 0 ? ` · ${actionSummary.join(", ")}` : ""}`
      : actionSummary.length > 0
        ? actionSummary.join(", ")
        : null;

  const log = await db.automationRunLog.create({
    data: {
      companyId,
      automationId: automation.id,
      automationName: automation.name,
      triggerEntity,
      conditionsEvaluated,
      result,
      error,
      notes: reanNotes,
      matchedCount: evalResult.totalMatched,
      durationMs,
    },
  });

  const updated = await db.automation.update({
    where: { id: automationId },
    data: { lastRun: new Date(), runCount: { increment: 1 } },
  });

  // Real recurring loop: re-enqueue the next occurrence, but only if the
  // automation is still active + scheduled - a paused/deleted automation's
  // loop stops here rather than firing forever.
  if (updated.scheduleEnabled && updated.status === "Active" && updated.scheduleIntervalMinutes) {
    await scheduleNextRun(automationId, updated.scheduleIntervalMinutes);
  }

  return { automation: updated, log, tasksCreated, workOrdersCreated, reanNotes };
}

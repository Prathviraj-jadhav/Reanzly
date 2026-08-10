import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { toAutomationDTO, toRunLogDTO, parseRows, evaluateTrigger, executeCreateTaskAction, type ActionRow, type ConditionRow } from "../../_lib";

// "Run Now" / "Test Now" - runs a real, targeted query against the trigger's
// real data (see evaluateTrigger in ../../_lib.ts) instead of simulating a
// result. For triggers with a well-defined real query, a real
// AutomationRunLog row is written reflecting the actual match count. Any
// "Create Task" action then really creates Task rows in Operations Hub for
// the matched entities - the other action types (notifications, email/SMS,
// invoice drafts) have no live integration in this app, so they're honestly
// logged as queued rather than faked as sent.

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "automation");
  if (denied) return denied;
  const { id } = await params;

  const automation = await db.automation.findFirst({ where: { id, companyId: sessionUser.companyId } });
  if (!automation) return NextResponse.json({ error: "Automation not found." }, { status: 404 });

  const started = Date.now();
  const evalResult = await evaluateTrigger(sessionUser.companyId, automation.triggerCategory, automation.trigger);

  const conditions = parseRows(automation.conditions) as ConditionRow[];
  const actions = parseRows(automation.actions) as ActionRow[];
  const conditionsEvaluated = conditions.length > 0
    ? conditions.map((c) => `${c.field} ${c.operator} ${c.value || "…"}`).join(", ")
    : "no conditions (fires on every match)";

  let tasksCreated = 0;
  const queuedActionTypes: string[] = [];
  if (evalResult.supported) {
    for (const action of actions) {
      if (action.type === "Create Task" && tasksCreated === 0) {
        tasksCreated = await executeCreateTaskAction(
          sessionUser.companyId,
          automation.name,
          automation.trigger,
          automation.triggerCategory,
          action.config,
          evalResult.matches,
        );
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
  const error = !evalResult.supported
    ? "Live evaluation not implemented for this trigger yet - automation saved, but Run Now can't query real data for it."
    : queuedActionTypes.length > 0
      ? `Queued (no live integration): ${queuedActionTypes.join(", ")}`
      : null;

  const log = await db.automationRunLog.create({
    data: {
      companyId: sessionUser.companyId,
      automationId: automation.id,
      automationName: automation.name,
      triggerEntity,
      conditionsEvaluated,
      result,
      error,
      matchedCount: evalResult.totalMatched,
      durationMs,
    },
  });

  const updated = await db.automation.update({
    where: { id },
    data: { lastRun: new Date(), runCount: { increment: 1 } },
  });

  return NextResponse.json({
    automation: toAutomationDTO(updated),
    log: toRunLogDTO(log),
    tasksCreated,
  });
}

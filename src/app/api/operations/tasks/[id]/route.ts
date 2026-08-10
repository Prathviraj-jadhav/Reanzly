import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { taskInclude, toTaskDTO } from "../../_lib";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "operations-hub");
  if (denied) return denied;
  const { id } = await params;

  const task = await db.task.findFirst({
    where: { id, companyId: sessionUser.companyId },
    include: taskInclude,
  });
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  return NextResponse.json({ task: toTaskDTO(task) });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "operations-hub");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.task.findFirst({ where: { id, companyId: sessionUser.companyId } });
  if (!existing) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.description !== undefined) data.description = body.description || null;
  if (body.assignee !== undefined) data.assignee = String(body.assignee).trim();
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.department !== undefined) data.department = body.department;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.sprintId !== undefined) data.sprintId = body.sprintId || null;
  if (body.isRean !== undefined) data.isRean = Boolean(body.isRean);
  if (body.checklist !== undefined) {
    data.checklistJson = Array.isArray(body.checklist) && body.checklist.length > 0 ? JSON.stringify(body.checklist) : null;
  }
  if (body.subtasks !== undefined) {
    data.subtasksJson = Array.isArray(body.subtasks) && body.subtasks.length > 0 ? JSON.stringify(body.subtasks) : null;
  }
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === "Completed" && !existing.completedAt) data.completedAt = new Date();
    if (body.status !== "Completed") data.completedAt = null;
  }

  try {
    const updated = await db.task.update({ where: { id }, data, include: taskInclude });
    return NextResponse.json({ task: toTaskDTO(updated) });
  } catch (e) {
    console.error("PATCH /api/operations/tasks/[id] error:", e);
    return NextResponse.json({ error: "Could not update task." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "operations-hub");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.task.findFirst({ where: { id, companyId: sessionUser.companyId } });
  if (!existing) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  await db.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

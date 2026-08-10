import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { taskInclude, toTaskDTO } from "../_lib";

// Real CRUD for the Operations Hub task board, replacing pure client-side
// state seeded from mock-data.ts's TASKS array plus a deterministic
// hash-derived fake enrichment (deriveTaskExtras) for sprint/checklist/
// comments/attachments. Department-based role scoping stays a client-side
// filter (unchanged) - this route returns every task in the company and the
// UI narrows it, matching the original module's behavior.

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "operations-hub");
  if (denied) return denied;

  const tasks = await db.task.findMany({
    where: { companyId: sessionUser.companyId },
    include: taskInclude,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ tasks: tasks.map(toTaskDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "operations-hub");
  if (denied) return denied;

  const body = await req.json();
  const title = String(body.title || "").trim();
  if (!title) return NextResponse.json({ error: "title is required." }, { status: 400 });
  const assignee = String(body.assignee || "").trim();
  if (!assignee) return NextResponse.json({ error: "assignee is required." }, { status: 400 });

  const checklist = Array.isArray(body.checklist) ? body.checklist : [];
  const hasLink = body.linkedEntityType && body.linkedEntityType !== "None" && body.linkedEntityName;

  try {
    const created = await db.task.create({
      data: {
        companyId: sessionUser.companyId,
        title,
        description: body.description || null,
        assignee,
        priority: body.priority || "Medium",
        department: body.department || "Operations",
        status: body.status || "Backlog",
        isRean: false,
        linkedEntityType: hasLink ? body.linkedEntityType : null,
        linkedEntityId: hasLink ? body.linkedEntityId || null : null,
        linkedEntityName: hasLink ? body.linkedEntityName : null,
        checklistJson: checklist.length > 0 ? JSON.stringify(checklist) : null,
        sprintId: body.sprintId || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        createdBy: sessionUser.name,
        completedAt: body.status === "Completed" ? new Date() : null,
      },
      include: taskInclude,
    });
    return NextResponse.json({ task: toTaskDTO(created) }, { status: 201 });
  } catch (e) {
    console.error("POST /api/operations/tasks error:", e);
    return NextResponse.json({ error: "Could not create task." }, { status: 500 });
  }
}

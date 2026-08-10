import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { taskInclude, toTaskDTO } from "../../../_lib";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "operations-hub");
  if (denied) return denied;
  const { id } = await params;

  const task = await db.task.findFirst({ where: { id, companyId: sessionUser.companyId } });
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  const body = await req.json();
  const text = String(body.text || "").trim();
  if (!text) return NextResponse.json({ error: "text is required." }, { status: 400 });

  await db.taskComment.create({
    data: { taskId: id, authorName: sessionUser.name, body: text },
  });

  const updated = await db.task.findFirst({ where: { id }, include: taskInclude });
  return NextResponse.json({ task: toTaskDTO(updated!) }, { status: 201 });
}

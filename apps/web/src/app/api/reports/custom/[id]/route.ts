import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { toCustomReportDTO } from "../_lib";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "reports");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.customReport.findFirst({ where: { id, companyId: sessionUser.companyId } });
  if (!existing) return NextResponse.json({ error: "Custom report not found." }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.description !== undefined) data.description = body.description || null;
  if (body.filters !== undefined) data.filters = JSON.stringify(body.filters ?? {});

  try {
    const updated = await db.customReport.update({ where: { id }, data });
    return NextResponse.json({ report: toCustomReportDTO(updated) });
  } catch (e) {
    console.error("PATCH /api/reports/custom/[id] error:", e);
    return NextResponse.json({ error: "Could not update custom report." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "reports");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.customReport.findFirst({ where: { id, companyId: sessionUser.companyId } });
  if (!existing) return NextResponse.json({ error: "Custom report not found." }, { status: 404 });

  await db.customReport.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

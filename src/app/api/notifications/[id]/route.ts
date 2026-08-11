import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// PATCH { read: true } marks one notification read; DELETE dismisses it.
// Both scoped to the signed-in user's own notifications - a user can only
// ever touch their own row, verified by userId match, not just id.

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const existing = await db.notification.findUnique({ where: { id } });
  if (!existing || existing.userId !== sessionUser.id) {
    return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  }

  const body = await req.json();
  await db.notification.update({ where: { id }, data: { read: Boolean(body.read) } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const existing = await db.notification.findUnique({ where: { id } });
  if (!existing || existing.userId !== sessionUser.id) {
    return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  }

  await db.notification.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

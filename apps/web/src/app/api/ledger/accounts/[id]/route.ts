import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

const EDITABLE_FIELDS = ["code", "name", "group", "subgroup", "openingBalance", "openingNature"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "ledger");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.ledgerAccount.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = field === "openingBalance" ? Math.round(Number(body[field]) || 0) : body[field];
  }

  const updated = await db.ledgerAccount.update({ where: { id }, data });
  return NextResponse.json({
    account: {
      id: updated.id, code: updated.code, name: updated.name, group: updated.group,
      subgroup: updated.subgroup, openingBalance: updated.openingBalance,
      openingNature: updated.openingNature, system: updated.isSystem,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "ledger");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.ledgerAccount.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
  if (existing.isSystem) {
    return NextResponse.json({ error: "System accounts cannot be deleted." }, { status: 400 });
  }
  const inUse = await db.ledgerJournalLine.findFirst({ where: { accountId: id } });
  if (inUse) {
    return NextResponse.json({ error: "This account has posted journal lines and cannot be deleted." }, { status: 400 });
  }

  await db.ledgerAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

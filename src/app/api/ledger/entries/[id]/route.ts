import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "ledger");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.ledgerJournalEntry.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Journal entry not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ("narration" in body) data.narration = String(body.narration || "").trim();
  if ("date" in body && body.date) data.date = new Date(body.date);
  if ("status" in body) data.status = body.status === "Draft" ? "Draft" : "Posted";

  if (Array.isArray(body.lines)) {
    const dr = body.lines.reduce((s: number, l: { debit?: number }) => s + Math.round(l.debit || 0), 0);
    const cr = body.lines.reduce((s: number, l: { credit?: number }) => s + Math.round(l.credit || 0), 0);
    if (Math.abs(dr - cr) > 0.5) {
      return NextResponse.json({ error: `Entry is not balanced: debit ${dr} != credit ${cr}.` }, { status: 400 });
    }
    const accountIds = [...new Set(body.lines.map((l: { accountId: string }) => l.accountId))];
    const accounts = await db.ledgerAccount.findMany({
      where: { id: { in: accountIds }, companyId: sessionUser.companyId },
    });
    if (accounts.length !== accountIds.length) {
      return NextResponse.json({ error: "One or more accounts were not found." }, { status: 400 });
    }
    await db.ledgerJournalLine.deleteMany({ where: { entryId: id } });
    data.lines = {
      create: body.lines.map((l: { accountId: string; debit?: number; credit?: number }) => ({
        accountId: l.accountId,
        debit: Math.round(l.debit || 0),
        credit: Math.round(l.credit || 0),
      })),
    };
  }

  const updated = await db.ledgerJournalEntry.update({
    where: { id },
    data,
    include: { lines: { select: { accountId: true, debit: true, credit: true } } },
  });

  return NextResponse.json({
    entry: {
      id: updated.id,
      voucherNo: updated.voucherNo,
      date: updated.date.toISOString().slice(0, 10),
      narration: updated.narration,
      status: updated.status,
      createdBy: updated.createdBy,
      createdAt: updated.createdAt.toISOString(),
      lines: updated.lines.map((l) => ({ accountId: l.accountId, debit: l.debit, credit: l.credit })),
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "ledger");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.ledgerJournalEntry.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Journal entry not found." }, { status: 404 });
  }

  await db.ledgerJournalEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

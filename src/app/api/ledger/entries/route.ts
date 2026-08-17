import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { nextVoucherNo } from "../_lib";

function toDTO(e: {
  id: string; voucherNo: string; date: Date; narration: string; status: string;
  createdBy: string; createdAt: Date;
  lines: { accountId: string; debit: number; credit: number }[];
}) {
  return {
    id: e.id,
    voucherNo: e.voucherNo,
    date: e.date.toISOString().slice(0, 10),
    narration: e.narration,
    status: e.status,
    createdBy: e.createdBy,
    createdAt: e.createdAt.toISOString(),
    lines: e.lines.map((l) => ({ accountId: l.accountId, debit: l.debit, credit: l.credit })),
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "ledger");
  if (denied) return denied;

  const entries = await db.ledgerJournalEntry.findMany({
    where: { companyId: sessionUser.companyId },
    include: { lines: { select: { accountId: true, debit: true, credit: true } } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ entries: entries.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "ledger");
  if (denied) return denied;

  const body = await req.json();
  const narration = String(body.narration || "").trim();
  const date = body.date ? new Date(body.date) : null;
  const lines: { accountId: string; debit?: number; credit?: number }[] = Array.isArray(body.lines) ? body.lines : [];
  if (!narration || !date || lines.length < 2) {
    return NextResponse.json({ error: "narration, date, and at least 2 journal lines are required." }, { status: 400 });
  }

  const dr = lines.reduce((s, l) => s + Math.round(l.debit || 0), 0);
  const cr = lines.reduce((s, l) => s + Math.round(l.credit || 0), 0);
  if (Math.abs(dr - cr) > 0.5) {
    return NextResponse.json({ error: `Entry is not balanced: debit ${dr} != credit ${cr}.` }, { status: 400 });
  }

  const accountIds = [...new Set(lines.map((l) => l.accountId))];
  const accounts = await db.ledgerAccount.findMany({ where: { id: { in: accountIds }, companyId: sessionUser.companyId } });
  if (accounts.length !== accountIds.length) {
    return NextResponse.json({ error: "One or more accounts were not found." }, { status: 400 });
  }

  const voucherNo = await nextVoucherNo(sessionUser.companyId);

  const created = await db.ledgerJournalEntry.create({
    data: {
      companyId: sessionUser.companyId,
      voucherNo,
      date,
      narration,
      status: body.status === "Draft" ? "Draft" : "Posted",
      createdBy: sessionUser.name,
      lines: {
        create: lines.map((l) => ({
          accountId: l.accountId,
          debit: Math.round(l.debit || 0),
          credit: Math.round(l.credit || 0),
        })),
      },
    },
    include: { lines: { select: { accountId: true, debit: true, credit: true } } },
  });

  return NextResponse.json({ entry: toDTO(created) }, { status: 201 });
}

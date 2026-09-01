import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

function toDTO(a: {
  id: string; code: string; name: string; group: string; subgroup: string;
  openingBalance: number; openingNature: string; isSystem: boolean;
}) {
  return {
    id: a.id,
    code: a.code,
    name: a.name,
    group: a.group,
    subgroup: a.subgroup,
    openingBalance: a.openingBalance,
    openingNature: a.openingNature,
    system: a.isSystem,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "ledger");
  if (denied) return denied;

  const accounts = await db.ledgerAccount.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { code: "asc" },
  });
  return NextResponse.json({ accounts: accounts.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "ledger");
  if (denied) return denied;

  const body = await req.json();
  const code = String(body.code || "").trim();
  const name = String(body.name || "").trim();
  const group = String(body.group || "").trim();
  const subgroup = String(body.subgroup || "").trim();
  if (!code || !name || !group || !subgroup) {
    return NextResponse.json({ error: "code, name, group, and subgroup are required." }, { status: 400 });
  }

  const existing = await db.ledgerAccount.findFirst({ where: { companyId: sessionUser.companyId, code } });
  if (existing) {
    return NextResponse.json({ error: `Account code ${code} already exists.` }, { status: 409 });
  }

  const created = await db.ledgerAccount.create({
    data: {
      companyId: sessionUser.companyId,
      code,
      name,
      group,
      subgroup,
      openingBalance: Number.isFinite(body.openingBalance) ? Math.round(body.openingBalance) : 0,
      openingNature: body.openingNature === "Cr" ? "Cr" : "Dr",
      isSystem: false,
    },
  });
  return NextResponse.json({ account: toDTO(created) }, { status: 201 });
}

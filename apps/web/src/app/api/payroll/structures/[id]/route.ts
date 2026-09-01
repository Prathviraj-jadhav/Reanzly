import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

const INCLUDE = { _count: { select: { employees: true } } } as const;
import type { Prisma } from "@prisma/client";
type Row = Prisma.SalaryStructureGetPayload<{ include: typeof INCLUDE }>;

function toDTO(s: NonNullable<Row>) {
  return {
    id: s.id, name: s.name, department: s.department ?? "Operations",
    ctcAnnual: Math.round(s.ctcAnnual / 100), basicPct: s.basicPct, daPct: s.daPct, hraPct: s.hraPct,
    specialAllowance: Math.round(s.specialAllowance / 100), conveyance: Math.round(s.conveyance / 100),
    medicalAllowance: Math.round(s.medicalAllowance / 100), statutoryBonus: Math.round(s.statutoryBonus / 100),
    pfPct: s.pfPct, esiApplicable: s.esiApplicable, ptApplicable: s.ptApplicable, tdsApplicable: s.tdsApplicable,
    activeHeadcount: s._count.employees,
  };
}

const PAISE_FIELDS = new Set(["ctcAnnual", "specialAllowance", "conveyance", "medicalAllowance", "statutoryBonus"]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "payroll");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.salaryStructure.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Structure not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === "activeHeadcount" || key === "id") continue;
    data[key] = PAISE_FIELDS.has(key) ? Math.round((Number(value) || 0) * 100) : value;
  }

  const updated = await db.salaryStructure.update({ where: { id }, data, include: INCLUDE });
  return NextResponse.json({ structure: toDTO(updated) });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

const INCLUDE = { _count: { select: { employees: true } } } as const;
type Row = Awaited<ReturnType<typeof db.salaryStructure.findFirst<{ include: typeof INCLUDE }>>>;

function toDTO(s: NonNullable<Row>) {
  return {
    id: s.id,
    name: s.name,
    department: s.department ?? "Operations",
    ctcAnnual: Math.round(s.ctcAnnual / 100),
    basicPct: s.basicPct,
    daPct: s.daPct,
    hraPct: s.hraPct,
    specialAllowance: Math.round(s.specialAllowance / 100),
    conveyance: Math.round(s.conveyance / 100),
    medicalAllowance: Math.round(s.medicalAllowance / 100),
    statutoryBonus: Math.round(s.statutoryBonus / 100),
    pfPct: s.pfPct,
    esiApplicable: s.esiApplicable,
    ptApplicable: s.ptApplicable,
    tdsApplicable: s.tdsApplicable,
    activeHeadcount: s._count.employees,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "payroll");
  if (denied) return denied;
  const structures = await db.salaryStructure.findMany({
    where: { companyId: sessionUser.companyId },
    include: INCLUDE,
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ structures: structures.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "payroll");
  if (denied) return denied;

  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "name is required." }, { status: 400 });

  const created = await db.salaryStructure.create({
    data: {
      companyId: sessionUser.companyId,
      name,
      department: body.department || null,
      ctcAnnual: Math.round((Number(body.ctcAnnual) || 0) * 100),
      basicPct: Number.isFinite(body.basicPct) ? body.basicPct : 40,
      daPct: Number.isFinite(body.daPct) ? body.daPct : 0,
      hraPct: Number.isFinite(body.hraPct) ? body.hraPct : 40,
      specialAllowance: Math.round((Number(body.specialAllowance) || 0) * 100),
      conveyance: Math.round((Number(body.conveyance) || 0) * 100),
      medicalAllowance: Math.round((Number(body.medicalAllowance) || 0) * 100),
      statutoryBonus: Math.round((Number(body.statutoryBonus) || 0) * 100),
      pfPct: Number.isFinite(body.pfPct) ? body.pfPct : 12,
      esiApplicable: Boolean(body.esiApplicable),
      ptApplicable: body.ptApplicable !== undefined ? Boolean(body.ptApplicable) : true,
      tdsApplicable: Boolean(body.tdsApplicable),
    },
    include: INCLUDE,
  });
  return NextResponse.json({ structure: toDTO(created) }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

// Real CRUD for the Statutory Returns tab, replacing the client-only
// STATUTORY_RETURNS mock array. Company-level (no employee FK) - matches
// PayrollStatutoryFiling in schema.prisma. Money stored as paise (Int).

type Row = Awaited<ReturnType<typeof db.payrollStatutoryFiling.findFirstOrThrow>>;

function toDTO(r: Row) {
  return {
    id: r.id,
    type: r.type,
    period: r.period,
    dueDate: r.dueDate.toISOString(),
    filedDate: r.filedDate ? r.filedDate.toISOString() : undefined,
    status: r.status as "Filed" | "Pending" | "Overdue",
    amount: Math.round(r.amount / 100),
    challanNo: r.challanNo ?? undefined,
    filedBy: r.filedBy ?? undefined,
    filingPortal: r.filingPortal ?? undefined,
    acknowledgementNo: r.acknowledgementNo ?? undefined,
    remarks: r.remarks ?? undefined,
  };
}

const SAMPLE_AMOUNT: Record<string, number> = { PF: 4320000, ESI: 1860000, TDS: 9840000, "Professional Tax": 280000 };
const PORTAL: Record<string, string> = {
  PF: "EPFO Unified Portal",
  ESI: "ESIC Employer Portal",
  TDS: "TRACES / NSDL",
  "Professional Tax": "Maharashtra GST PT Portal",
};

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "payroll");
  if (denied) return denied;
  const rows = await db.payrollStatutoryFiling.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { dueDate: "asc" },
  });
  return NextResponse.json({ returns: rows.map(toDTO) });
}

// "Generate Challan" - creates a Pending return for a statutory type,
// pre-filled with a due date and sample liability amount, same as the
// mock UI's generateChallan() used to fabricate client-side.
export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "payroll");
  if (denied) return denied;

  const body = await req.json();
  const type = String(body.type || "").trim();
  if (!["PF", "ESI", "TDS", "Professional Tax"].includes(type)) {
    return NextResponse.json({ error: "type must be one of PF, ESI, TDS, Professional Tax." }, { status: 400 });
  }
  const period = body.period ? String(body.period) : (type === "TDS" ? "Q2 FY25-26" : new Date().toISOString().slice(0, 7));
  const dueDate = body.dueDate ? new Date(body.dueDate) : new Date(Date.now() + 14 * 86400000);
  const amount = Number.isFinite(body.amount) ? Math.round(Number(body.amount) * 100) : SAMPLE_AMOUNT[type];

  const created = await db.payrollStatutoryFiling.create({
    data: {
      companyId: sessionUser.companyId,
      type,
      period,
      dueDate,
      status: "Pending",
      amount,
      filingPortal: PORTAL[type],
      remarks: "Generated challan pending payment",
    },
  });
  await logAudit({
    sessionUser,
    action: "CREATE",
    entity: "PayrollStatutoryFiling",
    entityId: created.id,
    description: `Generated ${type} challan for ${period}`,
  });
  return NextResponse.json({ return: toDTO(created) }, { status: 201 });
}

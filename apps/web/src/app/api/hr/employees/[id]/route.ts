import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

type EmployeeRow = Awaited<ReturnType<typeof db.employee.findFirstOrThrow>>;

function toDTO(e: EmployeeRow) {
  return {
    id: e.id, empCode: e.code, name: e.name, designation: e.designation,
    department: e.department ?? "", branch: e.branchName ?? "",
    employmentType: e.employmentType, status: e.status,
    doj: e.doj.toISOString().slice(0, 10),
    phone: e.phone ?? "", email: e.email ?? "", city: e.city ?? "",
    gender: e.gender ?? "Male", dob: e.dob ? e.dob.toISOString().slice(0, 10) : "",
    bloodGroup: e.bloodGroup ?? "", address: e.address ?? "", emergencyContact: e.emergencyContact ?? "",
    esiEnrolled: e.esiEnrolled, pfEnrolled: e.pfEnrolled,
    uan: e.uan ?? undefined, esiNo: e.esiNumber ?? undefined,
    aadhaar: e.aadhaar ?? "", pan: e.pan ?? "",
    bankName: e.bankName ?? "", bankAccount: e.bankAccount ?? "", bankIfsc: e.bankIfsc ?? "",
    ctcAnnual: Math.round(e.ctcAnnual / 100),
    basicMonthly: Math.round((e.basicMonthly ?? 0) / 100),
    hraMonthly: Math.round((e.hraMonthly ?? 0) / 100),
    documents: e.documentsJson ? JSON.parse(e.documentsJson) : [],
    leaveBalance: { cl: e.leaveBalanceCl, sl: e.leaveBalanceSl, pl: e.leaveBalancePl, ml: e.leaveBalanceMl },
    reportingTo: e.reportingTo ?? "", managerId: e.managerId ?? undefined, buddy: e.buddy ?? undefined,
    probationEndDate: e.probationEndDate ? e.probationEndDate.toISOString().slice(0, 10) : undefined,
    confirmDate: e.confirmDate ? e.confirmDate.toISOString().slice(0, 10) : undefined,
    lastIncrementDate: e.lastIncrementDate ? e.lastIncrementDate.toISOString().slice(0, 10) : undefined,
    lastIncrementPct: e.lastIncrementPct ?? undefined, lastRating: e.lastRating ?? undefined,
    skills: e.skills ? e.skills.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    assetsAssigned: e.assetsJson ? JSON.parse(e.assetsJson) : undefined,
  };
}

const NUMERIC_PAISE_FIELDS = new Set(["ctcAnnual", "basicMonthly", "hraMonthly"]);
const DATE_FIELDS = new Set(["doj", "dob", "probationEndDate", "confirmDate", "lastIncrementDate"]);
const FIELD_MAP: Record<string, string> = {
  empCode: "code", branch: "branchName", esiNo: "esiNumber",
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "hr");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.employee.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === "id") continue;
    if (key === "skills") { data.skills = Array.isArray(value) ? value.join(", ") : (value || null); continue; }
    if (key === "documents") { data.documentsJson = value ? JSON.stringify(value) : null; continue; }
    if (key === "assetsAssigned") { data.assetsJson = value ? JSON.stringify(value) : null; continue; }
    if (key === "leaveBalance" && value && typeof value === "object") {
      const lb = value as Record<string, number>;
      if (lb.cl !== undefined) data.leaveBalanceCl = lb.cl;
      if (lb.sl !== undefined) data.leaveBalanceSl = lb.sl;
      if (lb.pl !== undefined) data.leaveBalancePl = lb.pl;
      if (lb.ml !== undefined) data.leaveBalanceMl = lb.ml;
      continue;
    }
    const field = FIELD_MAP[key] || key;
    if (NUMERIC_PAISE_FIELDS.has(key)) { data[field] = Math.round((Number(value) || 0) * 100); continue; }
    if (DATE_FIELDS.has(key)) { data[field] = value ? new Date(value as string) : null; continue; }
    data[field] = value;
  }

  const updated = await db.employee.update({ where: { id }, data });
  return NextResponse.json({ employee: toDTO(updated) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "hr");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.employee.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }
  await db.employee.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

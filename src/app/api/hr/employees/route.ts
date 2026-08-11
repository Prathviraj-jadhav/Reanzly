import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { notifyRole } from "@/lib/notify";

// Real CRUD for HR Employees, replacing the Zustand+localStorage
// `reanzly-hr` store's employees slice. `documents`/`assetsAssigned` are
// lightweight per-employee lists (not independently queried elsewhere) -
// stored as real JSON text columns rather than a full relation, still real
// persisted data, not discarded like before. ctcAnnual/basicMonthly/
// hraMonthly follow the paise-storage convention used across this schema.

type EmployeeRow = Awaited<ReturnType<typeof db.employee.findFirstOrThrow>>;

function toDTO(e: EmployeeRow) {
  return {
    id: e.id,
    empCode: e.code,
    name: e.name,
    designation: e.designation,
    department: e.department ?? "",
    branch: e.branchName ?? "",
    employmentType: e.employmentType,
    status: e.status,
    doj: e.doj.toISOString().slice(0, 10),
    phone: e.phone ?? "",
    email: e.email ?? "",
    city: e.city ?? "",
    gender: e.gender ?? "Male",
    dob: e.dob ? e.dob.toISOString().slice(0, 10) : "",
    bloodGroup: e.bloodGroup ?? "",
    address: e.address ?? "",
    emergencyContact: e.emergencyContact ?? "",
    esiEnrolled: e.esiEnrolled,
    pfEnrolled: e.pfEnrolled,
    uan: e.uan ?? undefined,
    esiNo: e.esiNumber ?? undefined,
    aadhaar: e.aadhaar ?? "",
    pan: e.pan ?? "",
    bankName: e.bankName ?? "",
    bankAccount: e.bankAccount ?? "",
    bankIfsc: e.bankIfsc ?? "",
    ctcAnnual: Math.round(e.ctcAnnual / 100),
    basicMonthly: Math.round((e.basicMonthly ?? 0) / 100),
    hraMonthly: Math.round((e.hraMonthly ?? 0) / 100),
    documents: e.documentsJson ? JSON.parse(e.documentsJson) : [],
    leaveBalance: { cl: e.leaveBalanceCl, sl: e.leaveBalanceSl, pl: e.leaveBalancePl, ml: e.leaveBalanceMl },
    reportingTo: e.reportingTo ?? "",
    managerId: e.managerId ?? undefined,
    buddy: e.buddy ?? undefined,
    probationEndDate: e.probationEndDate ? e.probationEndDate.toISOString().slice(0, 10) : undefined,
    confirmDate: e.confirmDate ? e.confirmDate.toISOString().slice(0, 10) : undefined,
    lastIncrementDate: e.lastIncrementDate ? e.lastIncrementDate.toISOString().slice(0, 10) : undefined,
    lastIncrementPct: e.lastIncrementPct ?? undefined,
    lastRating: e.lastRating ?? undefined,
    skills: e.skills ? e.skills.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    assetsAssigned: e.assetsJson ? JSON.parse(e.assetsJson) : undefined,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "hr");
  if (denied) return denied;
  const employees = await db.employee.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ employees: employees.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "hr");
  if (denied) return denied;

  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "name is required." }, { status: 400 });

  try {
    const created = await db.employee.create({
      data: {
        companyId: sessionUser.companyId,
        code: body.empCode || `EMP-${Date.now().toString(36).toUpperCase()}`,
        name,
        designation: body.designation || "Staff",
        department: body.department || null,
        branchName: body.branch || null,
        employmentType: body.employmentType || "Permanent",
        doj: body.doj ? new Date(body.doj) : new Date(),
        status: body.status || "Active",
        ctcAnnual: Math.round((Number(body.ctcAnnual) || 0) * 100),
        basicMonthly: Math.round((Number(body.basicMonthly) || 0) * 100),
        hraMonthly: Math.round((Number(body.hraMonthly) || 0) * 100),
        esiEnrolled: Boolean(body.esiEnrolled),
        pfEnrolled: Boolean(body.pfEnrolled),
        uan: body.uan || null,
        esiNumber: body.esiNo || null,
        aadhaar: body.aadhaar || null,
        pan: body.pan || null,
        bankName: body.bankName || null,
        bankAccount: body.bankAccount || null,
        bankIfsc: body.bankIfsc || null,
        phone: body.phone || null,
        email: body.email || null,
        city: body.city || null,
        gender: body.gender || null,
        dob: body.dob ? new Date(body.dob) : null,
        bloodGroup: body.bloodGroup || null,
        address: body.address || null,
        emergencyContact: body.emergencyContact || null,
        reportingTo: body.reportingTo || null,
        managerId: body.managerId || null,
        buddy: body.buddy || null,
        skills: Array.isArray(body.skills) ? body.skills.join(", ") : (body.skills || null),
        documentsJson: body.documents ? JSON.stringify(body.documents) : null,
        assetsJson: body.assetsAssigned ? JSON.stringify(body.assetsAssigned) : null,
      },
    });
    await logAudit({
      sessionUser,
      action: "CREATE",
      entity: "Employee",
      entityId: created.code,
      description: `Added new employee record: ${created.name} (${created.designation})`,
    });
    if (sessionUser.role !== "owner") {
      await notifyRole({
        companyId: sessionUser.companyId,
        roleId: "owner",
        category: "HR",
        title: "New employee added",
        description: `${created.name} joined as ${created.designation}.`,
        severity: "info",
        link: { module: "hr", id: created.id },
      });
    }
    return NextResponse.json({ employee: toDTO(created) }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "An employee with that code already exists." }, { status: 409 });
    }
    console.error("POST /api/hr/employees error:", e);
    return NextResponse.json({ error: "Could not create employee." }, { status: 500 });
  }
}

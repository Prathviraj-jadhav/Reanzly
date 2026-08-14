import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

// Lightweight employee picker for the standalone Payroll module's own
// sub-areas (Reimbursements, Bonuses, Loans) - gated on "payroll" module
// access rather than "hr", so a Payroll-only role can still pick an
// employee without needing HR access. Deliberately thin: just enough to
// populate a Select and let the mutation routes resolve the rest
// server-side from the real Employee row.
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "payroll");
  if (denied) return denied;

  const employees = await db.employee.findMany({
    where: { companyId: sessionUser.companyId, status: { in: ["Active", "On Leave"] } },
    select: { id: true, code: true, name: true, designation: true, department: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    employees: employees.map((e) => ({
      id: e.id,
      code: e.code,
      name: e.name,
      designation: e.designation,
      department: e.department ?? "Operations",
    })),
  });
}

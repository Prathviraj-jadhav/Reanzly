import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const INCLUDE = { employee: { select: { code: true, name: true, designation: true } } } as const;
type Row = Awaited<ReturnType<typeof db.attendanceRecord.findFirst<{ include: typeof INCLUDE }>>>;

function toDTO(r: NonNullable<Row>) {
  return {
    id: r.id,
    empId: r.employeeId,
    empCode: r.employee.code,
    empName: r.employee.name,
    designation: r.employee.designation,
    date: r.date.toISOString().slice(0, 10),
    mark: r.mark,
    inTime: r.inTime ? r.inTime.toISOString() : undefined,
    outTime: r.outTime ? r.outTime.toISOString() : undefined,
    lateIn: r.lateIn,
    earlyOut: r.earlyOut,
    otHours: r.overtimeHrs,
    tripId: r.tripId ?? undefined,
  };
}

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const month = req.nextUrl.searchParams.get("month"); // YYYY-MM, optional filter
  const where: Record<string, unknown> = { companyId: sessionUser.companyId };
  if (month) {
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    where.date = { gte: start, lt: end };
  }
  const records = await db.attendanceRecord.findMany({ where, include: INCLUDE, orderBy: { date: "desc" }, take: 2000 });
  return NextResponse.json({ attendance: records.map(toDTO) });
}

// Marks (or re-marks) attendance for one employee/date - the real
// {employeeId, date} uniqueness in the schema means this is naturally an
// upsert, not a blind create.
export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json();
  const empId = String(body.empId || "");
  const emp = await db.employee.findUnique({ where: { id: empId } });
  if (!emp || emp.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Employee not found." }, { status: 400 });
  }
  const date = body.date ? new Date(body.date) : new Date();

  const record = await db.attendanceRecord.upsert({
    where: { employeeId_date: { employeeId: empId, date } },
    create: {
      companyId: sessionUser.companyId,
      employeeId: empId,
      date,
      mark: body.mark || "P",
      inTime: body.inTime ? new Date(body.inTime) : null,
      outTime: body.outTime ? new Date(body.outTime) : null,
      overtimeHrs: Number.isFinite(body.otHours) ? body.otHours : 0,
      lateIn: Boolean(body.lateIn),
      earlyOut: Boolean(body.earlyOut),
      tripId: body.tripId || null,
    },
    update: {
      mark: body.mark || "P",
      inTime: body.inTime ? new Date(body.inTime) : null,
      outTime: body.outTime ? new Date(body.outTime) : null,
      overtimeHrs: Number.isFinite(body.otHours) ? body.otHours : 0,
      lateIn: Boolean(body.lateIn),
      earlyOut: Boolean(body.earlyOut),
    },
    include: INCLUDE,
  });
  return NextResponse.json({ record: toDTO(record) }, { status: 201 });
}

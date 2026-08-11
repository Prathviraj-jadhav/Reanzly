// Expands the HR module with a real staff roster, attendance history, leave
// requests, open positions, and candidates. The Employee table had exactly
// one real user-created row ("Anita Sharma") - this script adds real
// employees alongside it (never touching or duplicating that row), including
// linking Employee rows to the real seeded Driver roster via driverId so the
// "driver" role's HR record and the fleet's Driver record are the same
// person, matching the real schema's intent (Employee.driverId).
//
// Idempotent: skips if Employee already has more than 1 row (the one
// pre-existing real record) for this company.
// Run with: bun run src/scripts/seed-hr-full.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}
function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 86_400_000);
}
function empCode(seed: number): string {
  return `EMP-RZ${String(2000 + seed)}`;
}

const STAFF_NAMES = [
  ["Rohit", "Sharma", "Dispatcher"], ["Sukhbir", "Gill", "Fleet Supervisor"],
  ["Vikram", "Deshmukh", "Operations Manager"], ["Reena", "Mehta", "Accountant"],
  ["Anil", "Reddy", "Branch Manager"], ["Kavita", "Nair", "HR Executive"],
  ["Manoj", "Patil", "Mechanic"], ["Sanjay", "Kulkarni", "Warehouse Supervisor"],
  ["Farhan", "Khan", "Mechanic"], ["Pooja", "Iyer", "Safety Officer"],
  ["Arjun", "Menon", "Helper"], ["Deepika", "Rao", "Accountant"],
];
const CITIES = ["Mumbai", "Pune", "Nashik", "Delhi", "Bengaluru", "Chennai"];

async function main() {
  const existing = await db.employee.count({ where: { companyId: COMPANY_ID } });
  if (existing > 1) {
    console.log(`[seed-hr-full] already seeded (${existing} employees found) - skipping.`);
    return;
  }

  const drivers = await db.driver.findMany({ where: { companyId: COMPANY_ID } });
  if (drivers.length === 0) {
    console.log("[seed-hr-full] no Driver rows found - run seed-business-data.ts first. Skipping.");
    return;
  }

  console.log("[seed-hr-full] seeding salary structures...");
  const driverStructure = await db.salaryStructure.create({
    data: {
      companyId: COMPANY_ID, name: "Driver (Permanent)", department: "Fleet",
      ctcAnnual: 36000000, basicPct: 45, daPct: 5, hraPct: 20,
      conveyance: 0, medicalAllowance: 100000, pfPct: 12, esiApplicable: true, ptApplicable: true,
    },
  });
  const fieldStructure = await db.salaryStructure.create({
    data: {
      companyId: COMPANY_ID, name: "Field Staff", department: "Operations",
      ctcAnnual: 30000000, basicPct: 45, daPct: 5, hraPct: 20,
      conveyance: 100000, medicalAllowance: 80000, pfPct: 12, esiApplicable: true, ptApplicable: true,
    },
  });
  const officeStructure = await db.salaryStructure.findFirst({ where: { companyId: COMPANY_ID, name: "Office Staff" } });

  console.log("[seed-hr-full] seeding driver employee records...");
  const employees: Awaited<ReturnType<typeof db.employee.create>>[] = [];
  for (let i = 0; i < drivers.length; i++) {
    const driver = drivers[i];
    const seed = i + 1;
    const e = await db.employee.create({
      data: {
        companyId: COMPANY_ID,
        code: empCode(seed),
        name: driver.name,
        designation: "Driver",
        department: "Fleet",
        branchName: pick(CITIES, seed),
        employmentType: "Permanent",
        doj: daysAgo(180 + seed * 20),
        status: driver.status === "On Leave" ? "On Leave" : "Active",
        ctcAnnual: driverStructure.ctcAnnual,
        pfEnrolled: true,
        esiEnrolled: true,
        driverId: driver.id,
        phone: driver.phone,
        email: driver.email,
        city: driver.city,
        basicMonthly: Math.round((driverStructure.ctcAnnual * driverStructure.basicPct) / 100 / 12),
        hraMonthly: Math.round((driverStructure.ctcAnnual * driverStructure.hraPct) / 100 / 12),
        structureId: driverStructure.id,
      },
    });
    employees.push(e);
  }

  console.log("[seed-hr-full] seeding office/field staff employee records...");
  for (let i = 0; i < STAFF_NAMES.length; i++) {
    const [first, last, designation] = STAFF_NAMES[i];
    const seed = drivers.length + i + 1;
    const isField = ["Mechanic", "Warehouse Supervisor", "Fleet Supervisor", "Helper", "Safety Officer"].includes(designation);
    const structure = isField ? fieldStructure : (officeStructure ?? fieldStructure);
    const e = await db.employee.create({
      data: {
        companyId: COMPANY_ID,
        code: empCode(seed),
        name: `${first} ${last}`,
        designation,
        department: isField ? "Operations" : designation === "Accountant" ? "Finance" : designation === "HR Executive" ? "HR" : "Management",
        branchName: pick(CITIES, seed),
        employmentType: "Permanent",
        doj: daysAgo(200 + seed * 15),
        status: "Active",
        ctcAnnual: structure.ctcAnnual,
        pfEnrolled: true,
        esiEnrolled: isField,
        phone: `98${(20000000 + seed * 6113) % 80000000}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}@reanzly.in`,
        city: pick(CITIES, seed),
        basicMonthly: Math.round((structure.ctcAnnual * structure.basicPct) / 100 / 12),
        hraMonthly: Math.round((structure.ctcAnnual * structure.hraPct) / 100 / 12),
        structureId: structure.id,
      },
    });
    employees.push(e);
  }

  console.log(`[seed-hr-full] seeding attendance for ${employees.length} employees over the last 30 days...`);
  for (let e = 0; e < employees.length; e++) {
    const emp = employees[e];
    for (let d = 0; d < 30; d++) {
      const date = daysAgo(d);
      date.setHours(0, 0, 0, 0);
      const dow = date.getDay();
      const seed = e * 31 + d;
      let mark: string;
      if (dow === 0) mark = "W";
      else if (seed % 23 === 0) mark = "A";
      else if (seed % 17 === 0) mark = "L";
      else if (seed % 13 === 0) mark = "H";
      else mark = "P";
      await db.attendanceRecord.create({
        data: {
          companyId: COMPANY_ID,
          employeeId: emp.id,
          date,
          mark,
          inTime: mark === "P" ? new Date(date.getTime() + 9.5 * 3_600_000) : null,
          outTime: mark === "P" ? new Date(date.getTime() + 19 * 3_600_000) : null,
          lateIn: mark === "P" && seed % 9 === 0,
        },
      });
    }
  }

  console.log("[seed-hr-full] seeding leave requests...");
  const leaveTypes = ["CL", "SL", "PL"];
  for (let i = 0; i < 10; i++) {
    const seed = i + 1301;
    const emp = pick(employees, seed);
    const days = 1 + (seed % 3);
    const from = daysFromNow((seed % 14) - 4);
    const to = new Date(from.getTime() + (days - 1) * 86_400_000);
    await db.leaveRequest.create({
      data: {
        companyId: COMPANY_ID,
        employeeId: emp.id,
        type: pick(leaveTypes, seed),
        fromDate: from,
        toDate: to,
        days,
        reason: pick(["Family function", "Not well", "Personal work", "Festival"], seed),
        status: pick(["Pending", "Approved", "Approved", "Rejected"], seed),
      },
    });
  }

  console.log("[seed-hr-full] seeding open positions + candidates...");
  const positions = [
    { title: "Heavy Vehicle Driver", branch: "Mumbai HQ", min: 25000000, max: 35000000 },
    { title: "Fleet Dispatcher", branch: "Pune", min: 22000000, max: 30000000 },
    { title: "Warehouse Executive", branch: "Delhi", min: 20000000, max: 28000000 },
  ];
  const candidateNames = ["Ramesh Yadav", "Suresh Naik", "Vinay Kumar", "Ajay Chauhan", "Prakash Jadhav"];
  for (let p = 0; p < positions.length; p++) {
    const pos = positions[p];
    const position = await db.hrPosition.create({
      data: {
        companyId: COMPANY_ID,
        positionId: `RZ-POS-${String(1001 + p)}`,
        title: pos.title,
        branchId: pos.branch,
        description: `Open role for ${pos.title} at ${pos.branch}.`,
        openings: 1 + (p % 2),
        budgetMin: pos.min,
        budgetMax: pos.max,
        status: "Open",
        postedAt: daysAgo(10 + p * 5),
      },
    });
    for (let c = 0; c < 3; c++) {
      const seed = p * 3 + c + 1401;
      await db.candidate.create({
        data: {
          companyId: COMPANY_ID,
          positionId: position.id,
          name: pick(candidateNames, seed),
          email: `candidate${seed}@example.in`,
          phone: `97${(10000000 + seed * 6337) % 90000000}`,
          experience: 2 + (seed % 8),
          currentCtc: pos.min - 2000000,
          expectedCtc: pos.min + (seed % 3) * 1000000,
          source: pick(["Referral", "Naukri", "LinkedIn", "Walk-in"], seed),
          stage: pick(["Applied", "Screening", "Interview", "Offer"], seed),
          rating: 3 + (seed % 3),
        },
      });
    }
  }

  console.log(`[seed-hr-full] done - ${employees.length} employees added, 30-day attendance, leave, positions, candidates seeded.`);
}

main()
  .catch((e) => {
    console.error("[seed-hr-full] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

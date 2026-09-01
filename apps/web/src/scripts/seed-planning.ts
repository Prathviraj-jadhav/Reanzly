// Seeds real PlanningResource + PlanningAllocation rows - the real
// counterpart to the old planning/_helpers.tsx mock generator
// (buildResources/buildAllocations). Same realistic content (15 resources:
// 6 drivers + 6 vehicles + 3 workshop bays; ~5-7 allocations each across the
// current real week, with 2 deliberate conflicts), but as persisted rows
// anchored to the ACTUAL current week (via new Date()) instead of a
// synthetic day-offset, so "Today"/week-nav always shows live-relevant data.
//
// Idempotent: reuses existing resources; only seeds allocations when the
// current week has none (so a resources-only first run can be completed).
// Run with: bunx tsx src/scripts/seed-planning.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

function startOfWeek(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const DRIVER_NAMES = ["Anil Kumar", "Rajesh Sharma", "Sunil Yadav", "Mahesh Patil", "Suresh Reddy", "Imran Khan"];
const VEHICLE_MODELS = ["Tata LPT 3118", "Ashok Leyland 3116", "BharatBenz 3123", "Eicher Pro 6049", "Volvo FM 400", "Tata Prima 4928"];
const VEHICLE_CODES = ["MH 12 JK 4521", "MH 04 MN 7820", "GJ 01 XY 9931", "KA 05 GH 1199", "TS 09 KL 4488", "MH 14 AB 1234"];
const BAY_CODES = ["BAY-A1 (Heavy)", "BAY-B1 (Light)", "BAY-C1 (Wash)"];
const HUBS = ["Bhiwandi Hub", "Taloja Hub", "Pune Chakan DC", "Nagpur Hub"];
const LANES = ["Mumbai to Delhi", "Mumbai to Bengaluru", "Delhi to Kolkata", "Chennai to Hyderabad", "Pune to Ahmedabad", "Nagpur to Raipur"];

type ResourceRow = { id: string; type: string; homeBase: string; allocationsThisWeek: number };

function weekLoadFor(type: string, i: number): number {
  if (type === "Bay") return [6, 7, 5][i % 3];
  if (type === "Vehicle") return [4, 3, 1, 5, 2, 4][i % 6];
  return [5, 4, 3, 6, 3, 5][i % 6];
}

async function seedAllocations(createdResources: ResourceRow[], weekStart: Date) {
  let counter = 1;
  const createdAllocations: { id: string; resourceId: string; startAt: Date; durationHours: number }[] = [];

  for (let idx = 0; idx < createdResources.length; idx++) {
    const r = createdResources[idx];
    for (let i = 0; i < r.allocationsThisWeek; i++) {
      const day = (idx + i * 2) % 7;
      const startHour = (6 + i * 3 + idx) % 18;
      let duration = 4 + ((i + idx) % 5) * 2;
      if (r.type === "Vehicle" || r.type === "Bay") duration += 4;
      const type =
        r.type === "Driver"
          ? ["Trip", "Rest", "Trip", "Training", "Trip"][i % 5]
          : r.type === "Vehicle"
            ? ["Trip", "Loading", "Trip", "Unloading", "Trip"][i % 5]
            : ["Maintenance", "Inspection", "Maintenance", "Loading", "Maintenance"][i % 5];
      const status = day < 1 ? "Active" : day < 3 ? "Confirmed" : "Planned";
      const title =
        type === "Trip" ? LANES[(idx + i) % LANES.length]
        : type === "Rest" ? "Mandatory rest break"
        : type === "Training" ? "Safety training module"
        : type === "Loading" ? "Loading - dock 3"
        : type === "Unloading" ? "Unloading - dock 1"
        : type === "Inspection" ? "Periodic inspection"
        : "Scheduled servicing";
      const refNo =
        type === "Trip" ? `RZ-TRP-${String(4200 + counter).padStart(5, "0")}`
        : type === "Maintenance" || type === "Inspection" ? `WO-${String(1900 + counter).padStart(4, "0")}`
        : type === "Training" ? `TR-${String(120 + counter).padStart(3, "0")}`
        : `OPS-${String(5600 + counter).padStart(4, "0")}`;

      const startAt = new Date(weekStart.getTime() + day * 86400000 + startHour * 3600000);
      const created = await db.planningAllocation.create({
        data: {
          companyId: COMPANY_ID,
          resourceId: r.id,
          type,
          title,
          refNo,
          startAt,
          durationHours: duration,
          status,
          location: r.homeBase,
        },
      });
      createdAllocations.push({ id: created.id, resourceId: created.resourceId, startAt: created.startAt, durationHours: created.durationHours });
      counter++;
    }
  }

  // 2 deliberate overlapping conflicts, same as the mock: driver Anil Kumar
  // (resources[0]) and vehicle MH 14 AB 1234 (resources[11]).
  const conflictResA = createdResources[0];
  const conflictResB = createdResources[11];
  const firstAllocA = createdAllocations.find((a) => a.resourceId === conflictResA?.id);
  const firstAllocB = createdAllocations.find((a) => a.resourceId === conflictResB?.id && a.startAt.getTime() >= weekStart.getTime() + 2 * 86400000);
  let extra = 0;
  if (firstAllocA && conflictResA) {
    await db.planningAllocation.create({
      data: {
        companyId: COMPANY_ID,
        resourceId: conflictResA.id,
        type: "Training",
        title: "Rescheduled safety training (conflicts with active trip)",
        refNo: `TR-${String(180 + counter).padStart(3, "0")}`,
        startAt: new Date(firstAllocA.startAt.getTime() + 1 * 3600000),
        durationHours: 3,
        status: "Planned",
        location: conflictResA.homeBase,
      },
    });
    extra++;
  }
  if (firstAllocB && conflictResB) {
    await db.planningAllocation.create({
      data: {
        companyId: COMPANY_ID,
        resourceId: conflictResB.id,
        type: "Maintenance",
        title: "Unscheduled bay servicing (conflicts with allocated trip)",
        refNo: `WO-${String(1970 + counter).padStart(4, "0")}`,
        startAt: new Date(firstAllocB.startAt.getTime() + 2 * 3600000),
        durationHours: 5,
        status: "Planned",
        location: conflictResB.homeBase,
      },
    });
    extra++;
  }

  console.log(`[seed-planning] created ${createdAllocations.length + extra} allocations for the week of ${weekStart.toISOString().slice(0, 10)}.`);
}

async function main() {
  const existingResources = await db.planningResource.count({ where: { companyId: COMPANY_ID } });
  let createdResources: ResourceRow[] = [];

  if (existingResources > 0) {
    console.log(`[seed-planning] ${existingResources} resources already exist.`);
    const rows = await db.planningResource.findMany({ where: { companyId: COMPANY_ID }, orderBy: { createdAt: "asc" } });
    createdResources = rows.map((r, i) => ({
      id: r.id,
      type: r.type,
      homeBase: r.homeBase,
      allocationsThisWeek: weekLoadFor(r.type, i),
    }));
  } else {
    const [drivers, vehicles] = await Promise.all([
      db.driver.findMany({ where: { companyId: COMPANY_ID }, select: { id: true, name: true } }),
      db.vehicle.findMany({ where: { companyId: COMPANY_ID }, select: { id: true, name: true, licensePlate: true } }),
    ]);
    const driverByName = new Map(drivers.map((d) => [d.name, d.id]));
    const vehicleByPlate = new Map(vehicles.map((v) => [v.licensePlate, v.id]));

    type ResSeed = {
      code: string; name: string; type: "Driver" | "Vehicle" | "Bay"; designation?: string;
      homeBase: string; status: string; shiftStart: string; shiftEnd: string; skills: string;
      allocationsThisWeek: number; driverId?: string; vehicleId?: string;
    };
    const resources: ResSeed[] = [];

    DRIVER_NAMES.forEach((n, i) => {
      resources.push({
        code: `DRV-${String(101 + i).padStart(3, "0")}`,
        name: n,
        type: "Driver",
        designation: ["HMV", "HMV", "LMV", "HMV + Hazardous", "HMV", "HMV + Reefer"][i],
        homeBase: HUBS[i % HUBS.length],
        status: ["Allocated", "Available", "Off-duty", "Allocated", "Available", "Allocated"][i],
        shiftStart: ["06:00", "05:00", "08:00", "06:00", "07:00", "04:00"][i],
        shiftEnd: ["18:00", "17:00", "20:00", "18:00", "19:00", "16:00"][i],
        skills: [["HMV"], ["HMV", "Hazmat"], ["LMV"], ["HMV", "Hazmat", "Tanker"], ["HMV"], ["HMV", "Reefer"]][i].join(", "),
        allocationsThisWeek: [5, 4, 3, 6, 3, 5][i],
        driverId: driverByName.get(n),
      });
    });
    VEHICLE_CODES.forEach((c, i) => {
      resources.push({
        code: c,
        name: `${VEHICLE_MODELS[i]} - ${c}`,
        type: "Vehicle",
        homeBase: HUBS[i % HUBS.length],
        status: ["Allocated", "Available", "Maintenance", "Allocated", "Available", "Allocated"][i],
        shiftStart: "00:00",
        shiftEnd: "23:59",
        skills: [["32ft MXL"], ["32ft SXL"], ["Container"], ["Flatbed"], ["Trailer"], ["Tanker"]][i].join(", "),
        allocationsThisWeek: [4, 3, 1, 5, 2, 4][i],
        vehicleId: vehicleByPlate.get(c),
      });
    });
    BAY_CODES.forEach((b, i) => {
      resources.push({
        code: b.split(" ")[0],
        name: b,
        type: "Bay",
        designation: b.split("(")[1]?.replace(")", ""),
        homeBase: HUBS[i % HUBS.length],
        status: ["Allocated", "Available", "Allocated"][i],
        shiftStart: "08:00",
        shiftEnd: "20:00",
        skills: [["Heavy"], ["Light"], ["Wash"]][i].join(", "),
        allocationsThisWeek: [6, 7, 5][i],
      });
    });

    for (const r of resources) {
      const created = await db.planningResource.create({
        data: {
          companyId: COMPANY_ID,
          code: r.code,
          name: r.name,
          type: r.type,
          designation: r.designation ?? null,
          homeBase: r.homeBase,
          status: r.status,
          shiftStart: r.shiftStart,
          shiftEnd: r.shiftEnd,
          skills: r.skills,
          driverId: r.driverId ?? null,
          vehicleId: r.vehicleId ?? null,
        },
      });
      createdResources.push({ id: created.id, type: created.type, homeBase: created.homeBase, allocationsThisWeek: r.allocationsThisWeek });
    }
    console.log(`[seed-planning] created ${createdResources.length} resources.`);
  }

  const weekStart = startOfWeek();
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  const existingAllocs = await db.planningAllocation.count({
    where: { companyId: COMPANY_ID, startAt: { gte: weekStart, lt: weekEnd } },
  });
  if (existingAllocs > 0) {
    console.log(`[seed-planning] ${existingAllocs} allocations already exist for this week, skipping.`);
    return;
  }

  await seedAllocations(createdResources, weekStart);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

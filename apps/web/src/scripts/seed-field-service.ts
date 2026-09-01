// Seeds real Field Service tasks - the module previously ran entirely on a
// client-only FIELD_TASKS mock array (20 hand-written tasks that lived only
// in FieldServiceModule's useState and vanished on reload; TaskDetail
// separately re-derived its own record from that same static array, so a
// newly created task was "not found" the moment you clicked into it).
// Tied to real Customer/Vehicle rows where sensible, same convention as
// this session's other seed scripts.
//
// Idempotent: skips if this company already has FieldServiceTask rows.
// Run with: bun run src/scripts/seed-field-service.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}
function ago(mins: number): Date {
  return new Date(Date.now() - mins * 60_000);
}
function ahead(mins: number): Date {
  return new Date(Date.now() + mins * 60_000);
}

const TECHNICIANS = [
  "Rajesh Kumar", "Sunita Pillai", "Mohammed Faisal", "Geeta Sharma",
  "Arjun Reddy", "Prakash Nair", "Deepak Yadav", "Farhan Ahmed",
];

const TASK_TEMPLATES: {
  type: string;
  title: (vehicle: string) => string;
  description: string;
  checklist: string[];
  parts: { name: string; partNo: string; qty: number; unitCost: number }[];
}[] = [
  {
    type: "Repair", title: (v) => `Roadside clutch repair - ${v}`,
    description: "Clutch slave cylinder failure reported. Vehicle stranded. Replace slave cylinder and inspect clutch plate.",
    checklist: ["Arrive at vehicle location", "Diagnose clutch system", "Source replacement slave cylinder", "Replace slave cylinder", "Bleed clutch line", "Test clutch engagement", "Handover to driver"],
    parts: [{ name: "Clutch slave cylinder", partNo: "CLT-SC-5512", qty: 1, unitCost: 2850 }, { name: "Brake fluid (DOT 4) - 500ml", partNo: "BRK-FL-D4-500", qty: 1, unitCost: 320 }],
  },
  {
    type: "Repair", title: (v) => `Breakdown support - engine overheating ${v}`,
    description: "Engine overheating reported. Suspect coolant leak or thermostat failure. Carry coolant + thermostat assembly.",
    checklist: ["Arrive at vehicle location", "Coolant level check", "Thermostat inspection", "Radiator pressure test", "Replace faulty parts", "Top-up coolant", "Engine idle test"],
    parts: [{ name: "Coolant (green) - 5L", partNo: "CLT-GR-5L", qty: 2, unitCost: 680 }, { name: "Thermostat assembly", partNo: "THR-ASSY-5510", qty: 1, unitCost: 1850 }],
  },
  {
    type: "Inspection", title: (v) => `On-site vehicle inspection - ${v}`,
    description: "Quarterly safety inspection. Check brakes, tyres, lights, suspension, and emission compliance.",
    checklist: ["Verify RC + insurance + PUCC", "Inspect brake system", "Check tyre tread depth (min 1.6mm)", "Test all lights + indicators", "Inspect suspension + leaf springs", "Emission smoke test", "Submit inspection report"],
    parts: [],
  },
  {
    type: "Survey", title: () => "Vehicle survey - pre-purchase condition assessment",
    description: "Pre-purchase condition survey. Customer is buying from a third party and needs an independent assessment.",
    checklist: ["Photograph vehicle (exterior 360°)", "Engine bay inspection", "Chassis + frame check", "Odometer reading", "Service history review", "Tyre condition assessment", "Compile survey report"],
    parts: [],
  },
  {
    type: "Installation", title: (v) => `GPS tracker installation - ${v}`,
    description: "Install dual-sim GPS tracker with ignition cut-off relay. Configure geofence.",
    checklist: ["Mount tracker unit under dashboard", "Wire power + ignition cut-off", "Install GPS + GSM antennas", "Configure APN + heartbeat", "Verify live tracking", "Set geofence", "Handover + driver briefing"],
    parts: [{ name: "GPS tracker unit (dual-sim)", partNo: "GPS-DS-2200", qty: 1, unitCost: 4500 }, { name: "Ignition cut-off relay", partNo: "REL-IC-220", qty: 1, unitCost: 850 }, { name: "Wiring harness", partNo: "WRH-GPS-12V", qty: 1, unitCost: 420 }],
  },
  {
    type: "Maintenance", title: (v) => `Preventive maintenance - ${v}`,
    description: "20,000 km scheduled service. Engine oil + filter, fuel filter, air filter, gearbox oil, greasing all points.",
    checklist: ["Drain engine oil", "Replace oil filter", "Replace fuel filter", "Replace air filter", "Change gearbox oil", "Grease all nipples", "Final test drive"],
    parts: [{ name: "Engine oil 15W-40 - 12L", partNo: "OIL-15W40-12L", qty: 1, unitCost: 3600 }, { name: "Oil filter", partNo: "FLT-OIL-2210", qty: 1, unitCost: 380 }, { name: "Air filter", partNo: "FLT-AIR-4410", qty: 1, unitCost: 620 }],
  },
];

const LOCATIONS = [
  "NH48, near Manor, Palghar, Maharashtra", "Whitefield depot, Bengaluru, Karnataka",
  "Used vehicle yard, Nashik Road, Maharashtra", "Hosur hub, Tamil Nadu",
  "NH19, near Durgapur, West Bengal", "Sanand depot, Ahmedabad, Gujarat",
  "Okhla Industrial Area, Delhi", "Peenya Industrial Area, Bengaluru",
  "Transport Nagar, Kanpur, Uttar Pradesh", "Bhiwandi warehouse cluster, Maharashtra",
];

async function main() {
  console.log("[seed-field-service] starting...");

  const existing = await db.fieldServiceTask.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-field-service] already seeded (${existing} tasks found) - skipping.`);
    return;
  }

  const vehicles = await db.vehicle.findMany({ where: { companyId: COMPANY_ID } });
  const customers = await db.customer.findMany({ where: { companyId: COMPANY_ID } });
  if (vehicles.length === 0 || customers.length === 0) {
    console.log("[seed-field-service] no Vehicle/Customer rows found - run seed-business-data.ts first. Skipping.");
    return;
  }

  const STATUSES_BY_SLOT = [
    "In Progress", "Completed", "Scheduled", "Completed", "Assigned",
    "Scheduled", "Completed", "Cancelled", "En Route", "Completed",
    "Scheduled", "Completed", "Assigned", "In Progress", "Completed",
    "Scheduled", "Completed", "Cancelled",
  ];
  const PRIORITIES = ["Urgent", "High", "Medium", "Low"];

  let created = 0;
  for (let i = 0; i < STATUSES_BY_SLOT.length; i++) {
    const seed = i + 1;
    const tmpl = pick(TASK_TEMPLATES, seed);
    const vehicle = pick(vehicles, seed);
    const customer = pick(customers, seed + 3);
    const status = STATUSES_BY_SLOT[i];
    const technician = pick(TECHNICIANS, seed);
    const priority = pick(PRIORITIES, seed);
    const location = pick(LOCATIONS, seed);

    const scheduledMinsAgo = status === "Scheduled" ? -((seed % 10) * 60 + 30) : (seed % 20) * 60 + 15;
    const scheduledAt = scheduledMinsAgo < 0 ? ahead(-scheduledMinsAgo) : ago(scheduledMinsAgo);
    const isDone = status === "Completed" || status === "Cancelled";
    const completedAt = isDone ? ago(Math.max(scheduledMinsAgo - 60, 5)) : null;

    const checklistDoneCount = status === "Completed" ? tmpl.checklist.length
      : status === "In Progress" || status === "En Route" ? Math.ceil(tmpl.checklist.length / 2)
      : status === "Assigned" ? Math.min(1, tmpl.checklist.length)
      : 0;
    const checklist = tmpl.checklist.map((label, idx) => ({
      id: `c${idx + 1}`,
      label,
      done: idx < checklistDoneCount,
      ts: idx < checklistDoneCount ? ago(scheduledMinsAgo - idx * 5).toISOString() : undefined,
    }));

    const includeParts = tmpl.parts.length > 0 && (status === "Completed" || status === "In Progress");
    const parts = includeParts ? tmpl.parts.map((p, idx) => ({ id: `p${idx + 1}`, ...p })) : [];

    const timeEntries = status === "Scheduled" ? [] : [
      { id: "t1", label: "Travel to site", start: ago(scheduledMinsAgo).toISOString(), end: ago(Math.max(scheduledMinsAgo - 20, 0)).toISOString(), minutes: 20 },
      ...(status !== "Assigned" ? [{ id: "t2", label: "On-site work", start: ago(Math.max(scheduledMinsAgo - 20, 0)).toISOString(), end: isDone ? ago(Math.max(scheduledMinsAgo - 60, 0)).toISOString() : undefined, minutes: isDone ? 40 : 0 }] : []),
    ];

    await db.fieldServiceTask.create({
      data: {
        companyId: COMPANY_ID,
        taskId: `FS-${String(4001 + i)}`,
        title: tmpl.title(vehicle.name),
        type: tmpl.type,
        customer: customer.companyName,
        customerCode: `CR-${String(100 + (seed % 200)).padStart(4, "0")}`,
        technician,
        scheduledAt,
        completedAt,
        status,
        priority,
        location,
        vehicleRef: tmpl.type === "Survey" ? null : vehicle.licensePlate,
        contactName: customer.contactPerson || customer.companyName,
        contactPhone: customer.phone || "+91-90000-00000",
        description: tmpl.description,
        notes: status === "Completed" ? "Work completed as per checklist. No follow-up required." : null,
        checklistJson: JSON.stringify(checklist),
        partsJson: JSON.stringify(parts),
        timeEntriesJson: JSON.stringify(timeEntries),
        signatureCaptured: status === "Completed",
        customerFeedback: status === "Completed" && seed % 2 === 0 ? "Quick and professional service." : null,
        rating: status === "Completed" && seed % 2 === 0 ? 4 + (seed % 2) : null,
      },
    });
    created++;
  }

  console.log(`[seed-field-service] seeded ${created} real field service tasks.`);
}

main()
  .catch((e) => {
    console.error("[seed-field-service] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

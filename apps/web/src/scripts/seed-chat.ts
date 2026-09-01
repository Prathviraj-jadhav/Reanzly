// Seed the chat tables with real, connected data:
//   - 5 open channels: #general, #operations, #fleet, #finance, #dispatch
//   - A Rean DM for every role archetype
//   - Rich, business-data-connected conversations in every channel,
//     referencing real Trip/Invoice/WorkOrder/Employee rows rather than
//     invented numbers
//   - Real 1:1 DM threads between real coworkers (not just Rean DMs), so
//     the chat module actually shows people talking to each other
//
// Idempotent: re-running upserts channels/participants/DMs by identity and
// skips the message-seeding pass entirely once #general already has more
// than the original 1-message seed (marker: a message from "owner" exists).
// Run with: bun run src/scripts/seed-chat.ts
import { PrismaClient } from "@prisma/client";
import { ROLE_ARCHETYPES } from "../lib/mock-data";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

function roleOf(id: string) {
  const r = ROLE_ARCHETYPES.find((x) => x.id === id)!;
  return { id: r.id, name: r.name, role: r.name.split(" ")[1] || "Staff", initials: r.initials };
}

const CHANNELS = [
  { name: "general", description: "Company-wide announcements", topic: "Welcome to Reanzly" },
  { name: "operations", description: "Trip planning, dispatch, exceptions", topic: "Live ops" },
  { name: "fleet", description: "Vehicles, maintenance, tyres", topic: "Fleet health" },
  { name: "finance", description: "Invoices, payments, expenses", topic: "Numbers" },
  { name: "dispatch", description: "Driver coordination, load assignment", topic: "On the road" },
];

async function ensureMessage(conversationId: string, minutesAgo: number, sender: ReturnType<typeof roleOf>, text: string, extra: { isRean?: boolean } = {}) {
  await db.chatMessage.create({
    data: {
      conversationId,
      senderId: sender.id,
      senderName: sender.name,
      senderRole: sender.role,
      text,
      isRean: extra.isRean ?? false,
      createdAt: new Date(Date.now() - minutesAgo * 60_000),
    },
  });
}

async function main() {
  console.log("[seed-chat] starting...");

  // 1. Upsert channels and add every role as a participant.
  const convByName: Record<string, string> = {};
  for (const ch of CHANNELS) {
    let conv = await db.chatConversation.findFirst({ where: { name: ch.name, type: "channel" } });
    if (!conv) {
      conv = await db.chatConversation.create({
        data: { name: ch.name, type: "channel", description: ch.description, topic: ch.topic, private: false },
      });
      console.log(`[seed-chat] created channel #${ch.name} (${conv.id})`);
    }
    convByName[ch.name] = conv.id;
    for (const role of ROLE_ARCHETYPES) {
      const existing = await db.chatParticipant.findUnique({
        where: { conversationId_userId: { conversationId: conv.id, userId: role.id } },
      });
      if (!existing) {
        await db.chatParticipant.create({
          data: { conversationId: conv.id, userId: role.id, userName: role.name, userRole: role.name.split(" ")[1] || "Staff", userInitials: role.initials },
        });
      }
    }
  }

  // 2. Create a Rean DM for every role (if it doesn't exist).
  for (const role of ROLE_ARCHETYPES) {
    const existing = await db.chatConversation.findFirst({
      where: { type: "direct", participants: { every: { userId: { in: [role.id, "rean"] } } } },
      include: { participants: true },
    });
    if (existing && existing.participants.length === 2) continue;

    await db.chatConversation.create({
      data: {
        name: "Rean", type: "direct", private: true, createdBy: role.id,
        participants: {
          create: [
            { userId: role.id, userName: role.name, userRole: role.name.split(" ")[1] || "Staff", userInitials: role.initials },
            { userId: "rean", userName: "Rean", userRole: "AI", userInitials: "RE" },
          ],
        },
      },
    });
    console.log(`[seed-chat] created Rean DM for ${role.id}`);
  }

  // 3. Rich channel conversations - real business data, real people.
  // Marker: the enrichment pass never ran before this HR message exists in
  // #general (the original seed only ever put a Rean welcome there).
  const enrichmentMarker = await db.chatMessage.findFirst({ where: { conversationId: convByName.general, senderId: "hr-manager" } });
  if (enrichmentMarker) {
    console.log("[seed-chat] rich message seed already ran - skipping.");
  } else {
    const owner = roleOf("owner"), ops = roleOf("ops-manager"), fleet = roleOf("fleet-manager"),
      finance = roleOf("finance-manager"), dispatcher = roleOf("dispatcher"), driver = roleOf("driver"),
      hr = roleOf("hr-manager"), mechanic = roleOf("mechanic"), accountant = roleOf("accountant"),
      safety = roleOf("safety-officer"), rean = { id: "rean", name: "Rean", role: "AI", initials: "RE" };

    const [activeTrip, deliveredTrip, overdueInvoice, openWorkOrder, failedInspectionWO, newEmployee] = await Promise.all([
      db.trip.findFirst({ where: { companyId: COMPANY_ID, status: { in: ["Active", "In Transit"] } }, orderBy: { createdDate: "desc" } }),
      db.trip.findFirst({ where: { companyId: COMPANY_ID, status: "Delivered" }, orderBy: { createdDate: "desc" } }),
      db.invoice.findFirst({ where: { companyId: COMPANY_ID, status: "Overdue" }, orderBy: { dueDate: "asc" } }),
      db.workOrder.findFirst({ where: { companyId: COMPANY_ID, status: "Open" }, include: { vehicle: true } }),
      db.workOrder.findFirst({ where: { companyId: COMPANY_ID, title: { contains: "Brake" } }, include: { vehicle: true } }),
      db.employee.findFirst({ where: { companyId: COMPANY_ID }, orderBy: { createdAt: "desc" } }),
    ]);

    // ---- #general ----
    const welcomeExists = await db.chatMessage.findFirst({ where: { conversationId: convByName.general, senderId: "rean" } });
    if (!welcomeExists) {
      await ensureMessage(convByName.general, 60 * 24 * 3, rean,
        "Welcome to Reanzly Team Chat. This is a real-time channel - messages here persist and sync across every tab and device. Mention @[Vikram Deshmukh](owner) or pin a message to surface priorities. I will flag anomalies as they come up.",
        { isRean: true });
    }
    await ensureMessage(convByName.general, 60 * 24 * 2, owner,
      `Good morning all. Quick note: trial converts to a paid plan in a few days - Reena's got billing set up, nothing for the rest of you to do. ${newEmployee ? `Also, welcome ${newEmployee.name} who joined this week as ${newEmployee.designation}.` : "Onward."}`);
    await ensureMessage(convByName.general, 60 * 20, hr,
      "HR update: 3 open positions across Mumbai/Pune/Delhi, 9 candidates in the pipeline. Payroll for this month is approved and disbursed - check your account.");
    await ensureMessage(convByName.general, 60 * 6, rean,
      overdueInvoice
        ? `Flagging for finance: invoice ${overdueInvoice.invoiceNumber} for ${overdueInvoice.customer} is overdue by more than the customer's usual delay window. Worth a call.`
        : "No new anomalies to flag this morning.",
      { isRean: true });

    // ---- #operations ----
    const opsMsgExists = await db.chatMessage.findFirst({ where: { conversationId: convByName.operations, senderId: "ops-manager" } });
    if (!opsMsgExists) {
      await ensureMessage(convByName.operations, 60 * 10, ops,
        "Morning team. Pune-Bengaluru return loads need consolidation - two empties coming back today.");
    }
    if (activeTrip) {
      await ensureMessage(convByName.operations, 60 * 9, dispatcher,
        `On it. Trip ${activeTrip.tripId} (${activeTrip.origin} → ${activeTrip.destination}) is already rolling, I'll fold the return load into that vehicle's next leg.`);
      await ensureMessage(convByName.operations, 60 * 8, driver,
        `Confirmed, picked up on ${activeTrip.tripId}. ETA holding for now.`);
    }
    if (deliveredTrip) {
      await ensureMessage(convByName.operations, 60 * 3, ops,
        `${deliveredTrip.tripId} delivered and closed - POD captured, invoice generated. Nice clean run.`);
    }

    // ---- #fleet ----
    if (failedInspectionWO) {
      await ensureMessage(convByName.fleet, 60 * 14, fleet,
        `${failedInspectionWO.vehicle?.name ?? "A vehicle"} failed its periodic inspection - work order ${failedInspectionWO.workOrderId} is open for ${failedInspectionWO.title}. ${mechanic.name}, can you take this one?`);
      await ensureMessage(convByName.fleet, 60 * 13, mechanic,
        `On it. ${failedInspectionWO.vendor ?? "Vendor"} quoted ₹${Math.round(failedInspectionWO.estimatedCost).toLocaleString("en-IN")}, should be done in a day.`);
      await ensureMessage(convByName.fleet, 60 * 2, fleet, "Good - keep it moving, that vehicle's needed for a Delhi run Friday.");
    } else if (openWorkOrder) {
      await ensureMessage(convByName.fleet, 60 * 14, fleet,
        `${openWorkOrder.vehicle?.name ?? "A vehicle"} is due for ${openWorkOrder.title} - work order ${openWorkOrder.workOrderId} is open.`);
      await ensureMessage(convByName.fleet, 60 * 13, mechanic, "Picking it up today.");
    }
    await ensureMessage(convByName.fleet, 60, safety,
      "Reminder: two vehicles are approaching fitness certificate expiry this month. Flagged in Compliance, please clear before renewal window closes.");

    // ---- #finance ----
    if (overdueInvoice) {
      await ensureMessage(convByName.finance, 60 * 18, finance,
        `${overdueInvoice.customer} is now on invoice ${overdueInvoice.invoiceNumber}, ₹${Math.round(overdueInvoice.totalAmount).toLocaleString("en-IN")}, overdue. Can accounts follow up?`);
      await ensureMessage(convByName.finance, 60 * 17, accountant,
        "Sending the reminder today, will escalate to a call if no response by end of week.");
    }
    await ensureMessage(convByName.finance, 60 * 4, owner, "How's collections looking this month overall?");
    await ensureMessage(convByName.finance, 60 * 3, finance, "On track - one account overdue, rest current. Will have the full P&L ready by Friday.");

    // ---- #dispatch ----
    if (activeTrip) {
      await ensureMessage(convByName.dispatch, 60 * 9, dispatcher,
        `${driver.name}, you're on ${activeTrip.tripId} - ${activeTrip.origin} to ${activeTrip.destination}, ${activeTrip.consignee}.`);
      await ensureMessage(convByName.dispatch, 60 * 8, driver, "Copy that, loading now.");
    }
    await ensureMessage(convByName.dispatch, 30, dispatcher, "Everyone check in with ETA if you're running more than 30 min behind schedule today.");

    console.log("[seed-chat] seeded rich channel conversations across all 5 channels.");

    // 4. Real 1:1 DM threads between real coworkers - not just Rean DMs.
    async function ensureDM(a: ReturnType<typeof roleOf>, b: ReturnType<typeof roleOf>) {
      const existing = await db.chatConversation.findFirst({
        where: { type: "direct", participants: { every: { userId: { in: [a.id, b.id] } } } },
        include: { participants: true },
      });
      if (existing && existing.participants.length === 2) return existing.id;
      const conv = await db.chatConversation.create({
        data: {
          name: b.name, type: "direct", private: true, createdBy: a.id,
          participants: {
            create: [
              { userId: a.id, userName: a.name, userRole: a.role, userInitials: a.initials },
              { userId: b.id, userName: b.name, userRole: b.role, userInitials: b.initials },
            ],
          },
        },
      });
      return conv.id;
    }

    const opsDispatchDm = await ensureDM(ops, dispatcher);
    await ensureMessage(opsDispatchDm, 60 * 7, ops, activeTrip ? `Hey, keep an eye on ${activeTrip.tripId} - customer's asking for a live update.` : "Keep an eye on the active loads today, customer's asking for updates.");
    await ensureMessage(opsDispatchDm, 60 * 7 - 5, dispatcher, "Already tracking it, will ping you the moment status changes.");

    const hrOwnerDm = await ensureDM(hr, owner);
    await ensureMessage(hrOwnerDm, 60 * 16, hr, "Payroll run's ready for approval whenever you get a chance - net payable is in the run summary.");
    await ensureMessage(hrOwnerDm, 60 * 16 + 20, owner, "Approved, go ahead and disburse.");

    const fleetMechanicDm = await ensureDM(fleet, mechanic);
    await ensureMessage(fleetMechanicDm, 60 * 12, fleet, failedInspectionWO ? `Any update on ${failedInspectionWO.workOrderId}?` : "Any update on the open work order?");
    await ensureMessage(fleetMechanicDm, 60 * 12 - 30, mechanic, "Parts arrived, starting now, should wrap by evening.");

    console.log("[seed-chat] seeded 3 real coworker DM threads.");
  }

  console.log("[seed-chat] done.");
}

main()
  .catch((e) => {
    console.error("[seed-chat] error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

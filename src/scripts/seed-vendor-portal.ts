// One-off seed for the Vendor Portal's genuinely-new entities (LedgerEntry,
// Rfq, SupportTicket/TicketMessage, and a couple of Customer-scoped
// Documents) for the Customer linked to the "customer" demo role
// (see seed-business-data.ts's Customer.userId link). Idempotent: clears
// and re-creates its own rows for that customer, safe to re-run.
// Run with: bun run src/scripts/seed-vendor-portal.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

async function main() {
  const customer = await db.customer.findFirst({ where: { userId: "customer" } });
  if (!customer) {
    console.error("[seed-vendor-portal] no Customer linked to the 'customer' role - run seed-business-data.ts first.");
    process.exit(1);
  }
  console.log(`[seed-vendor-portal] seeding for ${customer.companyName} (${customer.id})`);

  await db.ledgerEntry.deleteMany({ where: { customerId: customer.id } });
  await db.rfq.deleteMany({ where: { customerId: customer.id } });
  await db.ticketMessage.deleteMany({ where: { ticket: { customerId: customer.id } } });
  await db.supportTicket.deleteMany({ where: { customerId: customer.id } });
  await db.document.deleteMany({ where: { companyId: COMPANY_ID, entityType: "Customer", entityId: customer.companyName } });

  const days = (n: number) => new Date(Date.now() - n * 86400000);
  const ahead = (n: number) => new Date(Date.now() + n * 86400000);

  // ===== Ledger =====
  await db.ledgerEntry.createMany({
    data: [
      { companyId: COMPANY_ID, customerId: customer.id, type: "OpeningBalance", description: "Opening balance carried forward from previous cycle", debit: 420000, credit: 0, date: days(75), reference: "OPN-2026-Q2" },
      { companyId: COMPANY_ID, customerId: customer.id, type: "Payment", description: "Payment received via RTGS", debit: 0, credit: 142800, date: days(60), reference: "PAY-2026-06-12" },
      { companyId: COMPANY_ID, customerId: customer.id, type: "Payment", description: "Payment received via UPI", debit: 0, credit: 96500, date: days(32), reference: "PAY-2026-07-03" },
      { companyId: COMPANY_ID, customerId: customer.id, type: "CreditNote", description: "Rate reconciliation - lane Mumbai to Bengaluru", debit: 0, credit: 8400, date: days(18), reference: "CN-2026-0042" },
      { companyId: COMPANY_ID, customerId: customer.id, type: "DebitNote", description: "Detention charges - unloading delay at destination DC", debit: 6200, credit: 0, date: days(6), reference: "DN-2026-0019" },
    ],
  });

  // ===== RFQs =====
  await db.rfq.createMany({
    data: [
      { companyId: COMPANY_ID, customerId: customer.id, lane: "Mumbai → Pune", origin: "Mumbai", destination: "Pune", vehicleType: "32ft Container", weightKg: 14200, packages: 18, distanceKm: 148, commodity: "FMCG - packed goods", requiredDate: ahead(3), receivedAt: days(2), expiresAt: ahead(7), status: "Quoted", quotedRatePerKm: 78, validityDays: 7, quotedAt: days(1), issuedBy: "Reanzly Logistics Pvt Ltd", notes: "Dock appointment 09:00 at destination DC." },
      { companyId: COMPANY_ID, customerId: customer.id, lane: "Mumbai → Nagpur", origin: "Mumbai", destination: "Nagpur", vehicleType: "20ft Container", weightKg: 8600, packages: 12, distanceKm: 824, commodity: "Industrial fasteners", requiredDate: ahead(5), receivedAt: days(1), expiresAt: ahead(6), status: "Pending", validityDays: 7, issuedBy: "Reanzly Logistics Pvt Ltd", notes: "Stack height max 1.6m; straps required." },
      { companyId: COMPANY_ID, customerId: customer.id, lane: "Mumbai → Delhi", origin: "Mumbai", destination: "Delhi", vehicleType: "32ft Container", weightKg: 18900, packages: 24, distanceKm: 1418, commodity: "Pharmaceuticals - temperature monitored", requiredDate: ahead(7), receivedAt: days(9), expiresAt: days(2), status: "Won", quotedRatePerKm: 92, validityDays: 10, quotedAt: days(9), issuedBy: "Reanzly Logistics Pvt Ltd", notes: "Reefer fallback required; GPS temp log every 15min." },
      { companyId: COMPANY_ID, customerId: customer.id, lane: "Pune → Bengaluru", origin: "Pune", destination: "Bengaluru", vehicleType: "Open Body", weightKg: 11400, packages: 16, distanceKm: 842, commodity: "Steel coils", requiredDate: ahead(4), receivedAt: days(6), expiresAt: days(1), status: "Lost", quotedRatePerKm: 71, validityDays: 7, quotedAt: days(6), issuedBy: "Reanzly Logistics Pvt Ltd", notes: "Crane offload at destination; vendor to arrange." },
    ],
  });

  // ===== Support tickets =====
  const t1 = await db.supportTicket.create({
    data: {
      companyId: COMPANY_ID, customerId: customer.id, ticketNumber: "TKT-04001",
      subject: `Invoice ${customer.companyName === "Pinnacle Trading Co" ? "RZ-INV-21440" : "amount"} mismatch`,
      category: "Invoice Dispute", priority: "High", status: "Awaiting Reply",
      linkedRef: "RZ-INV-21440",
      description: "The freight amount on this invoice doesn't match what was agreed on the rate card. Can you please review?",
      createdAt: days(3), updatedAt: days(1),
    },
  });
  await db.ticketMessage.createMany({
    data: [
      { ticketId: t1.id, fromName: customer.contactPerson || customer.companyName, fromRole: "customer", body: "The freight amount on this invoice doesn't match what was agreed on the rate card. Can you please review?", createdAt: days(3) },
      { ticketId: t1.id, fromName: "Reanzly Support", fromRole: "staff", body: "Thanks for flagging - we're checking the rate card applied to this trip and will confirm within 24 hours.", createdAt: days(2) },
      { ticketId: t1.id, fromName: "Reanzly Support", fromRole: "staff", body: "Confirmed a detention charge was added for the destination delay. We'll issue a credit note if you weren't notified in advance - can you confirm?", createdAt: days(1) },
    ],
  });

  const t2 = await db.supportTicket.create({
    data: {
      companyId: COMPANY_ID, customerId: customer.id, ticketNumber: "TKT-04002",
      subject: "Need updated POD copy for recent delivery",
      category: "POD Issue", priority: "Medium", status: "Resolved",
      description: "Could you resend the signed POD for our last delivery? Our copy is missing the receiver's signature page.",
      createdAt: days(10), updatedAt: days(8),
    },
  });
  await db.ticketMessage.createMany({
    data: [
      { ticketId: t2.id, fromName: customer.contactPerson || customer.companyName, fromRole: "customer", body: "Could you resend the signed POD for our last delivery? Our copy is missing the receiver's signature page.", createdAt: days(10) },
      { ticketId: t2.id, fromName: "Account Manager", fromRole: "staff", body: "Re-uploaded the full POD with signature to your Documents tab - let us know if anything's still missing.", createdAt: days(8) },
    ],
  });

  // ===== Documents (entityId stores the customer's name, no FK - see /api/documents) =====
  await db.document.createMany({
    data: [
      { companyId: COMPANY_ID, name: "Service Agreement 2026", type: "Contract", entityType: "Customer", entityId: customer.companyName, status: "Valid", uploadedBy: "Vikram Deshmukh", uploadDate: days(300) },
      { companyId: COMPANY_ID, name: "GST Certificate", type: "Compliance", entityType: "Customer", entityId: customer.companyName, issueDate: days(400), expiryDate: ahead(300), status: "Valid", uploadedBy: "Vikram Deshmukh", uploadDate: days(300) },
      { companyId: COMPANY_ID, name: "Signed POD - RZ-TRP-2200", type: "POD", entityType: "Customer", entityId: customer.companyName, status: "Valid", uploadedBy: "Reanzly Support", uploadDate: days(8) },
    ],
  });

  console.log("[seed-vendor-portal] done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

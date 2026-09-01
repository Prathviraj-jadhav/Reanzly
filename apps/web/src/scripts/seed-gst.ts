// Seeds real LedgerGstReturn + LedgerGstReconLine rows from the same
// realistic data already authored in _tally-data.ts (imported directly,
// not retyped).
//
// Idempotent: skips if rows already exist for this company.
// Run with: bunx tsx src/scripts/seed-gst.ts
import { PrismaClient } from "@prisma/client";
import { SEED_GST_RETURNS, SEED_GST_RECON_LINES } from "../components/modules/ledger/_tally-data";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

async function main() {
  const existingReturns = await db.ledgerGstReturn.count({ where: { companyId: COMPANY_ID } });
  if (existingReturns === 0) {
    let count = 0;
    for (const g of SEED_GST_RETURNS) {
      await db.ledgerGstReturn.create({
        data: {
          companyId: COMPANY_ID,
          type: g.type,
          period: g.period,
          dueDate: new Date(g.dueDate),
          filingDate: g.filingDate ? new Date(g.filingDate) : null,
          status: g.status,
          taxableValue: Math.round(g.taxableValue),
          outputTax: Math.round(g.outputTax),
          inputTaxCredit: Math.round(g.inputTaxCredit),
          netPayable: Math.round(g.netPayable),
          matched: g.matched ?? null,
          mismatched: g.mismatched ?? null,
          pending: g.pending ?? null,
          ackNo: g.ackNo || null,
        },
      });
      count++;
    }
    console.log(`[seed-gst] created ${count} GST returns.`);
  } else {
    console.log(`[seed-gst] ${existingReturns} returns already exist, skipping.`);
  }

  const existingRecon = await db.ledgerGstReconLine.count({ where: { companyId: COMPANY_ID } });
  if (existingRecon === 0) {
    let count = 0;
    for (const l of SEED_GST_RECON_LINES) {
      await db.ledgerGstReconLine.create({
        data: {
          companyId: COMPANY_ID,
          vendorGstin: l.vendorGstin,
          vendorName: l.vendorName,
          invoiceNo: l.invoiceNo,
          invoiceDate: new Date(l.invoiceDate),
          taxableValue: Math.round(l.taxableValue),
          itcClaimed: Math.round(l.itcClaimed),
          itcAsPer2B: Math.round(l.itcAsPer2B),
          status: l.status,
          reason: l.reason || null,
        },
      });
      count++;
    }
    console.log(`[seed-gst] created ${count} recon lines.`);
  } else {
    console.log(`[seed-gst] ${existingRecon} recon lines already exist, skipping.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

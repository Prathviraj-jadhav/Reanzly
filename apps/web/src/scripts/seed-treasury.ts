// Seeds real TreasuryVoucher rows from the same realistic voucher data
// already authored in financial-ops-store.ts's seedVouchers() (imported
// directly, not retyped).
//
// Idempotent: skips if TreasuryVoucher rows already exist for this company.
// Run with: bunx tsx src/scripts/seed-treasury.ts
import { PrismaClient } from "@prisma/client";
import { seedVouchers } from "../lib/store/financial-ops-store";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

async function main() {
  const existing = await db.treasuryVoucher.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-treasury] ${existing} vouchers already exist, skipping.`);
    return;
  }

  const vouchers = seedVouchers();
  let count = 0;
  for (const v of vouchers) {
    await db.treasuryVoucher.create({
      data: {
        companyId: COMPANY_ID,
        type: v.type,
        number: v.number,
        party: v.party,
        amount: Math.round(v.amount),
        mode: v.mode,
        reference: v.reference || null,
        date: new Date(v.date),
        status: v.status,
        against: v.against || null,
        fromAccount: v.fromAccount || null,
        toAccount: v.toAccount || null,
        vehicle: v.vehicle || null,
        vendor: v.vendor || null,
        lrNumber: v.lrNumber || null,
        fromCity: v.from || null,
        toCity: v.to || null,
        totalAdvance: v.totalAdvance != null ? Math.round(v.totalAdvance) : null,
        totalExpense: v.totalExpense != null ? Math.round(v.totalExpense) : null,
        netPayable: v.netPayable != null ? Math.round(v.netPayable) : null,
        settledAmount: v.settledAmount != null ? Math.round(v.settledAmount) : null,
        balance: v.balance != null ? Math.round(v.balance) : null,
        approvedBy: v.approvedBy || null,
        remarks: v.remarks || null,
        createdBy: v.createdBy,
        createdAt: new Date(v.createdAt),
      },
    });
    count++;
  }
  console.log(`[seed-treasury] created ${count} vouchers.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

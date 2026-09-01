// Seeds real LedgerAccount + LedgerJournalEntry/LedgerJournalLine rows from
// the same realistic Chart of Accounts + 26 double-entry vouchers already
// authored in components/modules/ledger/_data.ts (imported directly, not
// retyped, so the real data matches the original exactly).
//
// Idempotent: skips if LedgerAccount rows already exist for this company.
// Run with: bunx tsx src/scripts/seed-ledger.ts
import { PrismaClient } from "@prisma/client";
import { SEED_ACCOUNTS, SEED_ENTRIES } from "../components/modules/ledger/_data";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

async function main() {
  const existing = await db.ledgerAccount.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-ledger] ${existing} accounts already exist, skipping.`);
    return;
  }

  const idMap = new Map<string, string>(); // old mock id -> real cuid

  for (const acc of SEED_ACCOUNTS) {
    const created = await db.ledgerAccount.create({
      data: {
        companyId: COMPANY_ID,
        code: acc.code,
        name: acc.name,
        group: acc.group,
        subgroup: acc.subgroup,
        openingBalance: Math.round(acc.openingBalance),
        openingNature: acc.openingNature,
        isSystem: !!acc.system,
      },
    });
    idMap.set(acc.id, created.id);
  }
  console.log(`[seed-ledger] created ${SEED_ACCOUNTS.length} accounts.`);

  let entryCount = 0;
  for (const e of SEED_ENTRIES) {
    await db.ledgerJournalEntry.create({
      data: {
        companyId: COMPANY_ID,
        voucherNo: e.voucherNo,
        date: new Date(e.date),
        narration: e.narration,
        status: e.status,
        createdBy: e.createdBy,
        lines: {
          create: e.lines.map((l) => ({
            accountId: idMap.get(l.accountId)!,
            debit: Math.round(l.debit),
            credit: Math.round(l.credit),
          })),
        },
      },
    });
    entryCount++;
  }
  console.log(`[seed-ledger] created ${entryCount} journal entries.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

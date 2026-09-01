// Seeds real Plan rows + a real Subscription row for the demo tenant so
// Settings > Billing has genuine data to show instead of a dead end.
// Idempotent: upserts by code/companyId, safe to re-run.
// Run with: bun run src/scripts/seed-billing.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

async function main() {
  console.log("[seed-billing] starting...");

  const plans = [
    { code: "starter", name: "Starter", priceMonthly: 999900, priceAnnual: 9999900, vehicleCap: 10, userCap: 5, storageMb: 5000, features: JSON.stringify(["dashboard", "trips", "vehicles", "invoice"]) },
    { code: "growth", name: "Growth", priceMonthly: 2999900, priceAnnual: 29999900, vehicleCap: 50, userCap: 25, storageMb: 25000, features: JSON.stringify(["dashboard", "trips", "vehicles", "invoice", "crm", "hr", "ledger"]) },
    { code: "enterprise", name: "Enterprise", priceMonthly: 7999900, priceAnnual: 79999900, vehicleCap: 500, userCap: 200, storageMb: 100000, features: JSON.stringify(["*"]) },
  ];

  const planRows: Record<string, string> = {};
  for (const p of plans) {
    const row = await db.plan.upsert({
      where: { code: p.code },
      update: { name: p.name, priceMonthly: p.priceMonthly, priceAnnual: p.priceAnnual, vehicleCap: p.vehicleCap, userCap: p.userCap, storageMb: p.storageMb, features: p.features },
      create: p,
    });
    planRows[p.code] = row.id;
    console.log(`[seed-billing] plan ${p.code} ready`);
  }

  const trialEnd = new Date(Date.now() + 7 * 86_400_000);
  const existing = await db.subscription.findUnique({ where: { companyId: COMPANY_ID } });
  if (!existing) {
    await db.subscription.create({
      data: {
        companyId: COMPANY_ID,
        planId: planRows.growth,
        status: "Trial",
        billingCycle: "monthly",
        renewsAt: trialEnd,
        mrr: 0,
      },
    });
    console.log("[seed-billing] subscription created (Trial, Growth plan)");
  } else {
    console.log("[seed-billing] subscription already exists - skipping");
  }

  console.log("[seed-billing] done.");
}

main()
  .catch((e) => {
    console.error("[seed-billing] failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

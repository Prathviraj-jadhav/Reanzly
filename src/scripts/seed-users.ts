// Seed real, database-backed User accounts for every role archetype -
// replacing the old "pick a role, no password check" demo login with real
// accounts that have an actual hashed password verified server-side.
//
// User.id is deliberately set to the same string as its ROLE_ARCHETYPES id
// (e.g. "owner", "hr-manager") rather than a random cuid, so every existing
// row that already references these ids as a foreign key - ChatParticipant,
// ChatMessage.senderId, dashboard sharedWith lists, task assignees - keeps
// working with zero data migration.
//
// Idempotent: upserts by id, safe to re-run.
// Run with: bun run src/scripts/seed-users.ts
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";
import { ROLE_ARCHETYPES } from "../lib/mock-data";

const db = new PrismaClient();

const COMPANY_ID = "default-tenant";
// Demo-only password, the same for every seeded account, clearly labelled as
// such - this is a seeded demo environment, not a production credential.
const DEMO_PASSWORD = "Reanzly@Demo2026";

function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

async function main() {
  console.log("[seed-users] starting...");

  await db.company.upsert({
    where: { id: COMPANY_ID },
    update: {},
    create: {
      id: COMPANY_ID,
      legalName: "Reanzly Demo Logistics Pvt Ltd",
      tradeName: "Reanzly Demo",
      gstin: "27AADCR1234N1ZP",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
    },
  });
  console.log(`[seed-users] company ${COMPANY_ID} ready`);

  const { hash, salt } = hashPassword(DEMO_PASSWORD);

  for (const role of ROLE_ARCHETYPES) {
    const email = `${role.name.toLowerCase().replace(/\s+/g, ".")}@reanzly.in`;
    await db.user.upsert({
      where: { id: role.id },
      update: { email, name: role.name, role: role.id, department: role.branch, status: "Active" },
      create: {
        id: role.id,
        companyId: COMPANY_ID,
        email,
        name: role.name,
        role: role.id,
        department: role.branch,
        status: "Active",
        passwordHash: hash,
        salt,
      },
    });
    console.log(`[seed-users] user ${role.id} (${email}) ready`);
  }

  console.log(`\n[seed-users] done. ${ROLE_ARCHETYPES.length} accounts ready.`);
  console.log(`[seed-users] demo password for every account: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error("[seed-users] failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

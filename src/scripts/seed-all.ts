import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

const SCRIPTS_DIR = __dirname;
const SEED_FILES = [
  "seed-users.ts",
  "seed-vendors.ts",
  "seed-business-data.ts",
  "seed-audit-log.ts",
  "seed-automation.ts",
  "seed-billing.ts",
  "seed-broker.ts",
  "seed-chat.ts",
  "seed-field-service.ts",
  "seed-finance-ops.ts",
  "seed-financial-services.ts",
  "seed-fleet-ops.ts",
  "seed-hr-full.ts",
  "seed-notifications.ts",
  "seed-operations-hub.ts",
  "seed-reports.ts",
  "seed-vendor-portal.ts",
  "seed-helpdesk.ts",
  "seed-knowledge.ts",
  "seed-rate-cards.ts",
  "seed-approvals.ts",
  // Payroll sub-area seeds need real Employee rows - must run after
  // seed-hr-full.ts, which is why they're appended at the end.
  "seed-payroll-statutory.ts",
  "seed-payroll-bank-advice.ts",
  "seed-payroll-reimbursements.ts",
  "seed-payroll-bonuses.ts",
  "seed-payroll-loans.ts",
  // Real-data conversion for Ledger / Treasury / Planning / Superadmin / HR
  // recruitment extras. Planning needs Vehicle/Driver rows from
  // seed-business-data.ts; HR docs/interviews/offers need Employee/
  // HrPosition/Candidate rows from seed-hr-full.ts.
  "seed-ledger.ts",
  "seed-gst.ts",
  "seed-treasury.ts",
  "seed-planning.ts",
  "seed-hr-docs-recruitment.ts",
  "seed-backups.ts",
  "seed-superadmin-audit.ts",
];

async function main() {
  console.log("=== STARTING DATABASE SEED SEQUENCE ===");
  for (const file of SEED_FILES) {
    const filePath = path.join(SCRIPTS_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`[seed-all] Warning: File not found ${file}, skipping.`);
      continue;
    }
    console.log(`\nRunning ${file}...`);
    try {
      execSync(`npx tsx "${filePath}"`, { stdio: "inherit" });
    } catch (error) {
      console.error(`[seed-all] Error executing ${file}:`, error);
      process.exit(1);
    }
  }
  console.log("\n=== DATABASE SEED SEQUENCE COMPLETED SUCCESSFULLY ===");
}

main().catch((err) => {
  console.error("Master seed failed:", err);
  process.exit(1);
});

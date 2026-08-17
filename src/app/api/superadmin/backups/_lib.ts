import * as fs from "fs";
import * as path from "path";

// Tenant id for the demo single-tenant deploy. Access is gated by
// requireSuperadmin() on each route — this constant is only the data scope.
export const COMPANY_ID = "default-tenant";

export function getDbPath(): string {
  const url = process.env.DATABASE_URL || "";
  return url.replace(/^file:/, "");
}

export function backupsDir(): string {
  const dir = path.join(path.dirname(getDbPath()), "backups");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

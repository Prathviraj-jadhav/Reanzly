import { cpSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

/** Copy standalone static assets (cross-platform replacement for cp -r). */
const root = process.cwd();
const staticSrc = join(root, ".next", "static");
/** Monorepo standalone server runs from `.next/standalone/apps/web`. */
const standaloneAppDir = join(root, ".next", "standalone", "apps", "web");
const staticDest = join(standaloneAppDir, ".next", "static");
const publicSrc = join(root, "public");
const publicDest = join(standaloneAppDir, "public");

if (!existsSync(staticSrc)) {
  console.error("Missing .next/static — run next build first.");
  process.exit(1);
}

mkdirSync(join(standaloneAppDir, ".next"), { recursive: true });
cpSync(staticSrc, staticDest, { recursive: true });
if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true });
}

console.log("Standalone static assets copied to apps/web/.next/static and public.");

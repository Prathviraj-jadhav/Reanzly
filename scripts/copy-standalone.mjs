import { cpSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

/** Copy standalone static assets (cross-platform replacement for cp -r). */
const root = process.cwd();
const standaloneNext = join(root, ".next", "standalone", ".next");
const staticSrc = join(root, ".next", "static");
const staticDest = join(standaloneNext, "static");
const publicSrc = join(root, "public");
const publicDest = join(root, ".next", "standalone", "public");

if (!existsSync(staticSrc)) {
  console.error("Missing .next/static — run next build first.");
  process.exit(1);
}

mkdirSync(standaloneNext, { recursive: true });
cpSync(staticSrc, staticDest, { recursive: true });
if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true });
}

console.log("Standalone static assets copied.");

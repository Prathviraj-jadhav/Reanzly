/**
 * B0R-8P: bulk replace navigate-compat imports (scoped, with rollback exclusions).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, "../apps/web/src");

const SKIP_SUBSTRINGS = [
  "navigate-compat.ts",
  "module-cluster-tabs.tsx",
  "app-shell.tsx",
  "use-active-view-sync.ts",
  "routing-compat.test.ts",
];

const files = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== "node_modules") walk(p);
    else if (/\.(tsx?)$/.test(ent.name)) files.push(p);
  }
}
walk(srcRoot);

let updated = 0;
for (const file of files) {
  if (SKIP_SUBSTRINGS.some((s) => file.includes(s.replace(/\//g, path.sep)))) continue;

  let src = fs.readFileSync(file, "utf8");
  const original = src;

  src = src.replace(
    /import \{ useNavigateCompat \} from "@\/lib\/navigation\/navigate-compat";?\r?\n/g,
    'import { useAppNavigation } from "@/lib/navigation/use-app-navigation";\n',
  );
  src = src.replace(
    /import \{ useModuleNavigation \} from "@\/lib\/navigation\/navigate-compat";?\r?\n/g,
    'import { useAppNavigation } from "@/lib/navigation/use-app-navigation";\n',
  );
  src = src.replace(
    /import \{ navigateCompatStatic \} from "@\/lib\/navigation\/navigate-compat";?\r?\n/g,
    'import { pushModulePath } from "@/lib/navigation/use-app-navigation";\n',
  );

  // Dedupe duplicate useAppNavigation imports
  const lines = src.split("\n");
  let seenNavImport = false;
  const deduped = lines.filter((line) => {
    if (line.includes('from "@/lib/navigation/use-app-navigation"')) {
      if (seenNavImport) return false;
      seenNavImport = true;
    }
    return true;
  });
  src = deduped.join("\n");

  if (src !== original) {
    fs.writeFileSync(file, src);
    updated++;
  }
}
console.log(`Import swap: ${updated} files.`);

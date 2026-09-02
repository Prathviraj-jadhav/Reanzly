/**
 * B0R-8P: migrate production files from navigate-compat → use-app-navigation.
 * Skips rollback-only paths: navigate-compat.ts, use-active-view-sync.ts, app-shell.tsx,
 * module-cluster-tabs.tsx, routing-compat.test.ts
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, "../apps/web/src");

const SKIP = new Set([
  "navigate-compat.ts",
  "use-active-view-sync.ts",
  "app-shell.tsx",
  "module-cluster-tabs.tsx",
  "routing-compat.test.ts",
  "use-migrated-nav-back.ts",
]);

const files = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== "node_modules") walk(p);
    else if (/\.(tsx?)$/.test(ent.name) && !SKIP.has(ent.name)) files.push(p);
  }
}
walk(srcRoot);

let updated = 0;
for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  const original = src;
  if (!src.includes("navigate-compat") && !src.includes("useModuleNavigation") && !src.includes("isModuleMigrated")) continue;

  // Replace imports
  src = src.replace(
    /import \{ useNavigateCompat \} from "@\/lib\/navigation\/navigate-compat";?\n/g,
    'import { useAppNavigation } from "@/lib/navigation/use-app-navigation";\n',
  );
  src = src.replace(
    /import \{ useModuleNavigation \} from "@\/lib\/navigation\/navigate-compat";?\n/g,
    'import { useAppNavigation } from "@/lib/navigation/use-app-navigation";\n',
  );
  src = src.replace(
    /import \{ navigateCompatStatic \} from "@\/lib\/navigation\/navigate-compat";?\n/g,
    'import { pushModulePath } from "@/lib/navigation/use-app-navigation";\n',
  );
  src = src.replace(
    /import \{ isModuleMigrated \} from "@\/lib\/navigation\/routing-config";?\n/g,
    "",
  );

  // Hook destructuring
  src = src.replace(
    /const \{ navigateCompat, navigateDetailCompat \} = useNavigateCompat\(\);/g,
    "const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();",
  );
  src = src.replace(
    /const \{ navigateCompat \} = useNavigateCompat\(\);/g,
    "const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();",
  );
  src = src.replace(
    /const \{ navigate, navigateDetail \} = useModuleNavigation\(\);/g,
    "const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();",
  );

  // Function calls
  src = src.replace(/navigateCompat\(/g, "goToModule(");
  src = src.replace(/navigateDetailCompat\(/g, "goToDetail(");
  src = src.replace(/navigateCompatStatic\(/g, "pushModulePath(");

  // useModuleNavigation navigate/navigateDetail - only when we replaced the hook
  if (src.includes("useAppNavigation")) {
    // Replace standalone navigateDetail( that's not from store
    src = src.replace(/(?<![\w.])navigateDetail\(/g, "goToDetail(");
  }

  // Remove isModuleMigrated branches - simplified patterns
  src = src.replace(
    /if \(isModuleMigrated\([^)]+\)\) \{\s*goToModule\(/g,
    "goToModule(",
  );
  src = src.replace(
    /if \(isModuleMigrated\([^)]+\)\) \{\s*goToDetail\(/g,
    "goToDetail(",
  );

  if (src !== original) {
    fs.writeFileSync(file, src);
    updated++;
    console.log(path.relative(srcRoot, file));
  }
}
console.log(`Migrated ${updated} files.`);

/**
 * B0R-8P: aggressive fix for goToModule/goToDetail/useNavigateCompat errors.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, "../apps/web/src");

const SKIP = ["navigate-compat.ts", "module-cluster-tabs.tsx", "app-shell.tsx", "routing-compat.test.ts"];

const files = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== "node_modules") walk(p);
    else if (/\.tsx$/.test(ent.name)) files.push(p);
  }
}
walk(srcRoot);

const NAV_IMPORT = 'import { useAppNavigation } from "@/lib/navigation/use-app-navigation";\n';
const NAV_HOOK = "  const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();\n";

let updated = 0;
for (const file of files) {
  if (SKIP.some((s) => file.replace(/\\/g, "/").endsWith(s))) continue;

  let src = fs.readFileSync(file, "utf8");
  const original = src;

  const needsNav =
    /\bgoTo(Module|Detail|Create|Tab)\(/.test(src) ||
    /\bnavigateCompat\(/.test(src) ||
    /useNavigateCompat\(\)/.test(src) ||
    /useModuleNavigation\(\)/.test(src);

  if (!needsNav) continue;

  // Add import
  if (!src.includes("use-app-navigation")) {
    const idx = src.indexOf('"use client"');
    if (idx >= 0) {
      const lineEnd = src.indexOf("\n", idx) + 1;
      src = src.slice(0, lineEnd) + NAV_IMPORT + src.slice(lineEnd);
    } else {
      src = NAV_IMPORT + src;
    }
  }

  // Replace compat hooks (including aliases)
  src = src.replace(
    /const \{ navigateCompat: navigate, navigateDetailCompat: navigateDetail \} = useNavigateCompat\(\);\r?\n/g,
    "  const { goToModule: navigate, goToDetail: navigateDetail } = useAppNavigation();\n",
  );
  src = src.replace(
    /const \{ navigateDetailCompat: navigateDetail \} = useNavigateCompat\(\);\r?\n/g,
    "  const { goToDetail: navigateDetail } = useAppNavigation();\n",
  );
  src = src.replace(
    /const \{ navigateCompat: navigate \} = useNavigateCompat\(\);\r?\n/g,
    "  const { goToModule: navigate } = useAppNavigation();\n",
  );
  src = src.replace(
    /const \{ navigateDetailCompat, navigateCompat \} = useNavigateCompat\(\);\r?\n/g,
    NAV_HOOK,
  );
  src = src.replace(
    /const \{ navigateCompat, navigateDetailCompat \} = useNavigateCompat\(\);\r?\n/g,
    NAV_HOOK,
  );
  src = src.replace(
    /const \{ navigateDetailCompat \} = useNavigateCompat\(\);\r?\n/g,
    NAV_HOOK,
  );
  src = src.replace(
    /const \{ navigate, navigateDetail \} = useModuleNavigation\(\);\r?\n/g,
    "  const { goToModule: navigate, goToDetail: navigateDetail } = useAppNavigation();\n",
  );
  src = src.replace(
    /const \{ navigateDetail \} = useModuleNavigation\(\);\r?\n/g,
    "  const { goToDetail: navigateDetail } = useAppNavigation();\n",
  );
  src = src.replace(
    /const \{ navigate \} = useModuleNavigation\(\);\r?\n/g,
    "  const { goToModule: navigate } = useAppNavigation();\n",
  );

  // Fix dependency arrays
  src = src.replace(/\[navigateCompat,/g, "[goToModule,");
  src = src.replace(/, navigateCompat\]/g, ", goToModule]");
  src = src.replace(/\[navigateCompat\]/g, "[goToModule]");

  src = src.replace(/\bnavigateCompat\(/g, "goToModule(");
  src = src.replace(/\bnavigateDetailCompat\(/g, "goToDetail(");

  // For files that use goTo* but missing hook in each function - add at component level
  if (/\bgoTo(Module|Detail)\(/.test(src) && !/useAppNavigation\(\)/.test(src)) {
    src = src.replace(
      /(export function \w+[^{]*\{)\r?\n/,
      `$1\n${NAV_HOOK}`,
    );
  }

  // Remove stale compat imports
  src = src.replace(/import \{ useNavigateCompat \} from "@\/lib\/navigation\/navigate-compat";\r?\n/g, "");
  src = src.replace(/import \{ useModuleNavigation \} from "@\/lib\/navigation\/navigate-compat";\r?\n/g, "");

  // Dedupe nav imports
  const lines = src.split(/\r?\n/);
  let seen = false;
  src = lines
    .filter((line) => {
      if (line.includes('from "@/lib/navigation/use-app-navigation"')) {
        if (seen) return false;
        seen = true;
      }
      return true;
    })
    .join("\n");

  if (src !== original) {
    fs.writeFileSync(file, src);
    updated++;
    console.log(path.relative(srcRoot, file));
  }
}
console.log(`Done: ${updated}`);

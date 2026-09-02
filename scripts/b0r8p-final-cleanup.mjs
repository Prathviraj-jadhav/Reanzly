/**
 * B0R-8P: add missing useAppNavigation imports + final cleanup.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, "../apps/web/src");

const ROLLBACK_ONLY = new Set([
  path.normalize("lib/navigation/navigate-compat.ts"),
  path.normalize("lib/navigation/use-active-view-sync.ts"),
  path.normalize("components/layout/app-shell.tsx"),
  path.normalize("components/shared/module-cluster-tabs.tsx"),
  path.normalize("lib/__tests__/routing-compat.test.ts"),
]);

const files = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== "node_modules") walk(p);
    else if (/\.(tsx?)$/.test(ent.name)) files.push(p);
  }
}
walk(srcRoot);

const NAV_IMPORT = 'import { useAppNavigation } from "@/lib/navigation/use-app-navigation";\n';

let updated = 0;
for (const file of files) {
  const rel = path.relative(srcRoot, file).replace(/\\/g, "/");
  if (ROLLBACK_ONLY.has(rel)) continue;

  let src = fs.readFileSync(file, "utf8");
  const original = src;

  // Add missing useAppNavigation import
  if (
    (src.includes("goToModule") || src.includes("goToDetail") || src.includes("goToCreate")) &&
    !src.includes("use-app-navigation")
  ) {
    if (src.startsWith('"use client"')) {
      src = src.replace('"use client";\n', `"use client";\n${NAV_IMPORT}`);
    } else if (src.startsWith("'use client'")) {
      src = src.replace("'use client';\n", `'use client';\n${NAV_IMPORT}`);
    } else {
      src = NAV_IMPORT + src;
    }
  }

  // Remove stale navigate-compat imports
  src = src.replace(/import \{ useNavigateCompat \} from "@\/lib\/navigation\/navigate-compat";?\n/g, "");
  src = src.replace(/import \{ useModuleNavigation \} from "@\/lib\/navigation\/navigate-compat";?\n/g, "");

  // Replace remaining useNavigateCompat / useModuleNavigation hooks
  if (!ROLLBACK_ONLY.has(rel)) {
    src = src.replace(
      /const \{ navigateCompat(?:, navigateDetailCompat)? \} = useNavigateCompat\(\);/g,
      "const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();",
    );
    src = src.replace(
      /const \{ navigate, navigateDetail \} = useModuleNavigation\(\);/g,
      "const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();",
    );
    src = src.replace(/navigateCompat\(/g, "goToModule(");
    src = src.replace(/navigateDetailCompat\(/g, "goToDetail(");
  }

  // Fix resolveModuleView remnants in module indexes
  src = src.replace(
    /const routeView = resolveModuleView\(route, activeView, "[^"]+"\);/g,
    "const routeView = route;",
  );
  src = src.replace(
    /resolveModuleView\(route, activeView, "[^"]+"\)/g,
    "route",
  );
  src = src.replace(/\s*const \{ activeView \} = useAppStore\(\);\s*\n/g, (m) => {
    if (src.includes("activeView.")) return m;
    return "\n";
  });

  // Remove resolveModuleView import if unused
  if (!src.includes("resolveModuleView")) {
    src = src.replace(
      /import \{ resolveModuleView, type ModuleRouteState \} from "@\/lib\/navigation\/module-route-state";/g,
      'import type { ModuleRouteState } from "@/lib/navigation/module-route-state";',
    );
  }

  // Remove isModuleMigrated import if unused
  if (!src.includes("isModuleMigrated")) {
    src = src.replace(
      /import \{ isModuleMigrated \} from "@\/lib\/navigation\/routing-config";?\n/g,
      "",
    );
  }

  if (src !== original) {
    fs.writeFileSync(file, src);
    updated++;
  }
}
console.log(`Final cleanup: ${updated} files.`);

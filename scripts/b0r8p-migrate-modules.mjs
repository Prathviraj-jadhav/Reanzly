/**
 * B0R-8P one-shot migration: module index.tsx files → useAppNavigation + required route prop.
 * Run: node scripts/b0r8p-migrate-modules.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modulesDir = path.join(__dirname, "../apps/web/src/components/modules");

const indexFiles = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (ent.name === "index.tsx") indexFiles.push(p);
  }
}
walk(modulesDir);

let updated = 0;
for (const file of indexFiles) {
  let src = fs.readFileSync(file, "utf8");
  if (!src.includes("resolveModuleView")) continue;

  // Skip if already migrated
  if (src.includes("useAppNavigation") && !src.includes("resolveModuleView")) continue;

  src = src.replace(
    /import \{ useNavigateCompat \} from "@\/lib\/navigation\/navigate-compat";?\n/g,
    'import { useAppNavigation } from "@/lib/navigation/use-app-navigation";\n',
  );
  src = src.replace(
    /import \{ useModuleNavigation \} from "@\/lib\/navigation\/navigate-compat";?\n/g,
    'import { useAppNavigation } from "@/lib/navigation/use-app-navigation";\n',
  );
  src = src.replace(
    /import \{ resolveModuleView, type ModuleRouteState \} from "@\/lib\/navigation\/module-route-state";/g,
    'import type { ModuleRouteState } from "@/lib/navigation/module-route-state";',
  );
  src = src.replace(
    /import \{ resolveModuleView, type ModuleRouteState \} from '\@\/lib\/navigation\/module-route-state';/g,
    "import type { ModuleRouteState } from '@/lib/navigation/module-route-state';",
  );

  // Required route prop
  src = src.replace(
    /\{ route \}: \{ route\?: ModuleRouteState \} = \{\}/g,
    "{ route }: { route: ModuleRouteState }",
  );
  src = src.replace(
    /\{ route \}: \{ route\?: ModuleRouteState \}/g,
    "{ route }: { route: ModuleRouteState }",
  );

  // Remove activeView + resolveModuleView block
  src = src.replace(
    /const \{ activeView \} = useAppStore\(\);\n\s*const \{ navigateCompat(?:, navigateDetailCompat)? \} = useNavigateCompat\(\);\n\s*const view = resolveModuleView\(route, activeView, "[^"]+"\);/g,
    "const { goToModule, goToDetail, goToCreate } = useAppNavigation();\n  const view = route;",
  );
  src = src.replace(
    /const \{ activeView \} = useAppStore\(\);\n\s*const \{ navigateCompat \} = useNavigateCompat\(\);\n\s*const view = resolveModuleView\(route, activeView, "[^"]+"\);/g,
    "const { goToModule, goToDetail, goToCreate } = useAppNavigation();\n  const view = route;",
  );
  src = src.replace(
    /const \{ navigateCompat, navigateDetailCompat \} = useNavigateCompat\(\);\n\s*const \{ activeView \} = useAppStore\(\);\n\s*const view = resolveModuleView\(route, activeView, "[^"]+"\);/g,
    "const { goToModule, goToDetail, goToCreate } = useAppNavigation();\n  const view = route;",
  );
  src = src.replace(
    /const \{ navigateCompat \} = useNavigateCompat\(\);\n\s*const view = resolveModuleView\(route, activeView, "[^"]+"\);/g,
    "const { goToModule, goToDetail, goToCreate } = useAppNavigation();\n  const view = route;",
  );

  // useModuleNavigation variant
  src = src.replace(
    /const \{ navigate, navigateDetail \} = useModuleNavigation\(\);\n\s*const \{ activeView \} = useAppStore\(\);\n\s*const view = resolveModuleView\(route, activeView, "[^"]+"\);/g,
    "const { goToModule, goToDetail, goToCreate } = useAppNavigation();\n  const view = route;",
  );

  // navigateCompat calls
  src = src.replace(/navigateCompat\(/g, "goToModule(");
  src = src.replace(/navigateDetailCompat\(/g, "goToDetail(");

  // useModuleNavigation navigate calls in same file
  src = src.replace(/\bnavigateDetail\(/g, "goToDetail(");
  // Careful: don't replace navigate( in store context - only if we imported useModuleNavigation
  if (src.includes("useAppNavigation")) {
    src = src.replace(/(?<!goTo)(?<!set)navigate\(/g, (m, offset, s) => {
      // skip if it's useAppStore navigate
      const before = s.slice(Math.max(0, offset - 30), offset);
      if (before.includes("useAppStore") || before.includes("legacy.")) return m;
      return "goToModule(";
    });
  }

  // Remove unused useAppStore import if only activeView was used
  if (src.includes('import { useAppStore }') && !src.match(/useAppStore\(/)) {
    src = src.replace(/import \{ useAppStore \} from "@\/lib\/store\/app-store";\n/g, "");
  }

  if (src !== fs.readFileSync(file, "utf8")) {
    fs.writeFileSync(file, src);
    updated++;
    console.log("Updated:", path.relative(modulesDir, file));
  }
}
console.log(`Done. Updated ${updated} module index files.`);

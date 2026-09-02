/**
 * B0R-8P fix pass: complete module index.tsx migration.
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
  const original = src;

  if (!src.includes("export function") || !src.includes("ModuleRouteState")) continue;

  // Ensure useAppNavigation import
  if (src.includes("useNavigateCompat") || src.includes("useModuleNavigation")) {
    src = src.replace(
      /import \{ useNavigateCompat \} from "@\/lib\/navigation\/navigate-compat";?\n/g,
      'import { useAppNavigation } from "@/lib/navigation/use-app-navigation";\n',
    );
    src = src.replace(
      /import \{ useModuleNavigation \} from "@\/lib\/navigation\/navigate-compat";?\n/g,
      'import { useAppNavigation } from "@/lib/navigation/use-app-navigation";\n',
    );
  } else if (!src.includes("useAppNavigation") && (src.includes("goToModule") || src.includes("resolveModuleView"))) {
    const insertAfter = src.match(/^"use client";\n/);
    if (insertAfter) {
      src = src.replace(
        '"use client";\n',
        '"use client";\nimport { useAppNavigation } from "@/lib/navigation/use-app-navigation";\n',
      );
    }
  }

  // Clean resolveModuleView import
  src = src.replace(
    /import \{ resolveModuleView, type ModuleRouteState \} from "@\/lib\/navigation\/module-route-state";/g,
    'import type { ModuleRouteState } from "@/lib/navigation/module-route-state";',
  );

  // Required route prop
  src = src.replace(
    /\{ route \}: \{ route\?: ModuleRouteState \}(?: = \{\})?/g,
    "{ route }: { route: ModuleRouteState }",
  );

  // Replace activeView + resolve block (flexible)
  src = src.replace(
    /const \{ activeView \} = useAppStore\(\);\s*\n\s*const \{[^}]+\} = use(?:NavigateCompat|ModuleNavigation)\(\);\s*\n\s*const view = resolveModuleView\(route, activeView, "[^"]+"\);/g,
    "const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();\n  const view = route;",
  );
  src = src.replace(
    /const \{[^}]+\} = use(?:NavigateCompat|ModuleNavigation)\(\);\s*\n\s*const \{ activeView \} = useAppStore\(\);\s*\n\s*const view = resolveModuleView\(route, activeView, "[^"]+"\);/g,
    "const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();\n  const view = route;",
  );
  src = src.replace(
    /const view = resolveModuleView\(route, activeView, "[^"]+"\);/g,
    "const view = route;",
  );

  // If still has useNavigateCompat without hook setup
  if (src.includes("useNavigateCompat") && !src.includes("useAppNavigation")) {
    src = src.replace(
      /const \{ navigateCompat(?:, navigateDetailCompat)? \} = useNavigateCompat\(\);/g,
      "const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();",
    );
  }

  // navigateCompat -> goTo* (if not done)
  src = src.replace(/navigateCompat\(/g, "goToModule(");
  src = src.replace(/navigateDetailCompat\(/g, "goToDetail(");

  // Remove orphaned activeView if only used for resolveModuleView
  if (src.includes("const { activeView } = useAppStore()") && !src.includes("activeView.")) {
    src = src.replace(/\s*const \{ activeView \} = useAppStore\(\);\s*\n/g, "\n");
  }

  // Remove unused useAppStore import
  if (src.match(/import \{ useAppStore/) && !src.match(/useAppStore\(/)) {
    src = src.replace(/import \{ useAppStore \} from "@\/lib\/store\/app-store";\n/g, "");
    src = src.replace(/import \{ useAppStore, ([^}]+)\} from "@\/lib\/store\/app-store";\n/g, (m, rest) => {
      if (rest.includes("type ")) return `import { ${rest.trim()} } from "@/lib/store/app-store";\n`;
      return m;
    });
  }

  // Remove dangling useNavigateCompat import
  src = src.replace(/import \{ useNavigateCompat \} from "@\/lib\/navigation\/navigate-compat";?\n/g, "");

  if (src !== original) {
    fs.writeFileSync(file, src);
    updated++;
    console.log("Fixed:", path.relative(modulesDir, file));
  }
}
console.log(`Fixed ${updated} files.`);

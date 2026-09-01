import fs from "fs";
import path from "path";

const files = [
  "apps/web/src/components/modules/customers/customers-list.tsx",
  "apps/web/src/components/modules/customers/customer-detail.tsx",
  "apps/web/src/components/modules/vendors/vendors-list.tsx",
  "apps/web/src/components/modules/vendors/vendor-detail.tsx",
  "apps/web/src/components/modules/purchase/po-list.tsx",
  "apps/web/src/components/modules/purchase/po-detail.tsx",
  "apps/web/src/components/modules/helpdesk/tickets-list.tsx",
  "apps/web/src/components/modules/helpdesk/ticket-detail.tsx",
  "apps/web/src/components/modules/marketing/campaigns-list.tsx",
  "apps/web/src/components/modules/marketing/campaign-detail.tsx",
  "apps/web/src/components/modules/surveys/surveys-list.tsx",
  "apps/web/src/components/modules/surveys/survey-detail.tsx",
  "apps/web/src/components/modules/drivers-staff/drivers-staff-list.tsx",
  "apps/web/src/components/modules/drivers-staff/driver-detail.tsx",
  "apps/web/src/components/modules/drivers-staff/tabs/overview.tsx",
  "apps/web/src/components/modules/drivers-staff/tabs/vehicle-assignment.tsx",
  "apps/web/src/components/modules/documents/documents-list.tsx",
  "apps/web/src/components/modules/documents/document-detail.tsx",
  "apps/web/src/components/modules/knowledge/articles-list.tsx",
  "apps/web/src/components/modules/knowledge/article-detail.tsx",
  "apps/web/src/components/modules/reminders/reminders-list.tsx",
];

const importLine = 'import { useModuleNavigation } from "@/lib/navigation/navigate-compat";';

for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  if (!src.includes("useModuleNavigation")) {
    if (!src.includes(importLine)) {
      src = src.replace(
        /import \{ useAppStore \} from "@\/lib\/store\/app-store";/,
        `import { useAppStore } from "@/lib/store/app-store";\n${importLine}`,
      );
    }
    src = src.replace(
      /const \{ navigate, navigateDetail \} = useAppStore\(\);/g,
      "const { navigate, navigateDetail } = useModuleNavigation();",
    );
    src = src.replace(
      /const \{ navigateDetail \} = useAppStore\(\);/g,
      "const { navigateDetail } = useModuleNavigation();",
    );
    src = src.replace(
      /const \{ navigateDetail, currentRole \} = useAppStore\(\);/g,
      "const { currentRole } = useAppStore();\n  const { navigateDetail } = useModuleNavigation();",
    );
    src = src.replace(
      /const \{ navigate \} = useAppStore\(\);/g,
      "const { navigate } = useModuleNavigation();",
    );
    src = src.replace(
      /useAppStore\.getState\(\)\.navigate\("document-studio"\)/g,
      'useModuleNavigation().navigate("document-studio")',
    );
    // documents-list special case - use navigateCompat import at top level instead
    if (file.endsWith("documents-list.tsx")) {
      src = src.replace(
        'useModuleNavigation().navigate("document-studio")',
        'navigateCompat("document-studio")',
      );
      if (!src.includes("useNavigateCompat")) {
        src = src.replace(
          importLine,
          `${importLine}\nimport { useNavigateCompat } from "@/lib/navigation/navigate-compat";`,
        );
        src = src.replace(
          /export function DocumentsList/,
          'export function DocumentsList',
        );
        src = src.replace(
          /const \{ navigateDetail \} = useModuleNavigation\(\);/,
          'const { navigateDetail } = useModuleNavigation();\n  const { navigateCompat } = useNavigateCompat();',
        );
      }
    }
    fs.writeFileSync(file, src);
    console.log("updated", file);
  }
}

import fs from "fs";
import path from "path";

const base = "apps/web/src/app/(app)/app";

const crudModules = [
  {
    dir: "customers",
    module: "customers",
    component: "CustomersModule",
    importPath: "@/components/modules/customers",
    idParam: "customerId",
    layout: "CrmClusterLayout",
    layoutImport: "@/components/shared/people-cluster-layout",
  },
  {
    dir: "vendors",
    module: "vendors",
    component: "VendorsModule",
    importPath: "@/components/modules/vendors",
    idParam: "vendorId",
    layout: "CrmClusterLayout",
    layoutImport: "@/components/shared/people-cluster-layout",
  },
  {
    dir: "purchase",
    module: "purchase",
    component: "PurchaseModule",
    importPath: "@/components/modules/purchase",
    idParam: "purchaseId",
    layout: "CrmClusterLayout",
    layoutImport: "@/components/shared/people-cluster-layout",
  },
  {
    dir: "helpdesk",
    module: "helpdesk",
    component: "HelpdeskModule",
    importPath: "@/components/modules/helpdesk",
    idParam: "ticketId",
    layout: "CrmClusterLayout",
    layoutImport: "@/components/shared/people-cluster-layout",
  },
  {
    dir: "drivers",
    module: "drivers-staff",
    component: "DriversStaffModule",
    importPath: "@/components/modules/drivers-staff",
    idParam: "driverId",
    layout: "HrClusterLayout",
    layoutImport: "@/components/shared/people-cluster-layout",
  },
  {
    dir: "documents",
    module: "documents",
    component: "DocumentsModule",
    importPath: "@/components/modules/documents",
    idParam: "documentId",
    layout: "DocumentsClusterLayout",
    layoutImport: "@/components/shared/documents-cluster-layout",
  },
  {
    dir: "document-studio",
    module: "document-studio",
    component: "DocumentStudioModule",
    importPath: "@/components/modules/document-studio",
    idParam: "documentId",
    layout: "DocumentsClusterLayout",
    layoutImport: "@/components/shared/documents-cluster-layout",
  },
  {
    dir: "knowledge",
    module: "knowledge",
    component: "KnowledgeModule",
    importPath: "@/components/modules/knowledge",
    idParam: "articleId",
    layout: "DocumentsClusterLayout",
    layoutImport: "@/components/shared/documents-cluster-layout",
  },
];

function write(file, content) {
  const full = path.join(base, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function crudPages(m) {
  write(
    `${m.dir}/layout.tsx`,
    `"use client";

import { ${m.layout} } from "${m.layoutImport}";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <${m.layout}>{children}</${m.layout}>;
}
`,
  );

  write(
    `${m.dir}/page.tsx`,
    `"use client";

import { ${m.component} } from "${m.importPath}";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="${m.module}">
      <${m.component} route={{ module: "${m.module}", view: "list" }} />
    </ModulePageShell>
  );
}
`,
  );

  write(
    `${m.dir}/new/page.tsx`,
    `"use client";

import { ${m.component} } from "${m.importPath}";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="${m.module}">
      <${m.component} route={{ module: "${m.module}", view: "create" }} />
    </ModulePageShell>
  );
}
`,
  );

  write(
    `${m.dir}/[${m.idParam}]/page.tsx`,
    `"use client";

import { use } from "react";
import { ${m.component} } from "${m.importPath}";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page({ params }: { params: Promise<{ ${m.idParam}: string }> }) {
  const p = use(params);
  return (
    <ModulePageShell module="${m.module}">
      <${m.component} route={{ module: "${m.module}", view: "detail", id: p.${m.idParam} }} />
    </ModulePageShell>
  );
}
`,
  );
}

crudModules.forEach(crudPages);

write(
  "crm/layout.tsx",
  `"use client";

import { CrmClusterLayout } from "@/components/shared/people-cluster-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CrmClusterLayout>{children}</CrmClusterLayout>;
}
`,
);

write(
  "crm/page.tsx",
  `"use client";

import { CRMModule } from "@/components/modules/crm";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="crm">
      <CRMModule route={{ module: "crm", view: "list", tab: "pipeline" }} />
    </ModulePageShell>
  );
}
`,
);

write(
  "crm/[tab]/page.tsx",
  `"use client";

import { use } from "react";
import { CRMModule } from "@/components/modules/crm";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  return (
    <ModulePageShell module="crm">
      <CRMModule route={{ module: "crm", view: "list", tab }} />
    </ModulePageShell>
  );
}
`,
);

write(
  "marketing/layout.tsx",
  `"use client";

import { CrmClusterLayout } from "@/components/shared/people-cluster-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CrmClusterLayout>{children}</CrmClusterLayout>;
}
`,
);

write(
  "marketing/page.tsx",
  `"use client";

import { MarketingModule } from "@/components/modules/marketing";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="marketing">
      <MarketingModule route={{ module: "marketing", view: "list" }} />
    </ModulePageShell>
  );
}
`,
);

write(
  "marketing/[campaignId]/page.tsx",
  `"use client";

import { use } from "react";
import { MarketingModule } from "@/components/modules/marketing";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = use(params);
  return (
    <ModulePageShell module="marketing">
      <MarketingModule route={{ module: "marketing", view: "detail", id: campaignId }} />
    </ModulePageShell>
  );
}
`,
);

write(
  "surveys/layout.tsx",
  `"use client";

import { CrmClusterLayout } from "@/components/shared/people-cluster-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CrmClusterLayout>{children}</CrmClusterLayout>;
}
`,
);

write(
  "surveys/page.tsx",
  `"use client";

import { SurveysModule } from "@/components/modules/surveys";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="surveys">
      <SurveysModule route={{ module: "surveys", view: "list" }} />
    </ModulePageShell>
  );
}
`,
);

write(
  "surveys/[surveyId]/page.tsx",
  `"use client";

import { use } from "react";
import { SurveysModule } from "@/components/modules/surveys";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page({ params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = use(params);
  return (
    <ModulePageShell module="surveys">
      <SurveysModule route={{ module: "surveys", view: "detail", id: surveyId }} />
    </ModulePageShell>
  );
}
`,
);

write(
  "hr/layout.tsx",
  `"use client";

import { HrClusterLayout } from "@/components/shared/people-cluster-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <HrClusterLayout>{children}</HrClusterLayout>;
}
`,
);

write(
  "hr/page.tsx",
  `"use client";

import { HRModule } from "@/components/modules/hr";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="hr">
      <HRModule route={{ module: "hr", view: "list", tab: "overview" }} />
    </ModulePageShell>
  );
}
`,
);

write(
  "hr/[tab]/page.tsx",
  `"use client";

import { use } from "react";
import { HRModule } from "@/components/modules/hr";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  return (
    <ModulePageShell module="hr">
      <HRModule route={{ module: "hr", view: "list", tab }} />
    </ModulePageShell>
  );
}
`,
);

write(
  "payroll/layout.tsx",
  `"use client";

import { HrClusterLayout } from "@/components/shared/people-cluster-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <HrClusterLayout>{children}</HrClusterLayout>;
}
`,
);

write(
  "payroll/page.tsx",
  `"use client";

import { PayrollModule } from "@/components/modules/payroll";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="payroll">
      <PayrollModule route={{ module: "payroll", view: "list", tab: "overview" }} />
    </ModulePageShell>
  );
}
`,
);

write(
  "payroll/[tab]/page.tsx",
  `"use client";

import { use } from "react";
import { PayrollModule } from "@/components/modules/payroll";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  return (
    <ModulePageShell module="payroll">
      <PayrollModule route={{ module: "payroll", view: "list", tab }} />
    </ModulePageShell>
  );
}
`,
);

write(
  "reminders/layout.tsx",
  `"use client";

import { DocumentsClusterLayout } from "@/components/shared/documents-cluster-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DocumentsClusterLayout>{children}</DocumentsClusterLayout>;
}
`,
);

write(
  "reminders/page.tsx",
  `"use client";

import { RemindersModule } from "@/components/modules/reminders";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="reminders">
      <RemindersModule route={{ module: "reminders", view: "list" }} />
    </ModulePageShell>
  );
}
`,
);

write(
  "reminders/new/page.tsx",
  `"use client";

import { RemindersModule } from "@/components/modules/reminders";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="reminders">
      <RemindersModule route={{ module: "reminders", view: "create" }} />
    </ModulePageShell>
  );
}
`,
);

console.log("B0R-5 route pages generated");

import { expect, type Locator, type Page } from "@playwright/test";

/** Cluster tab strip scoped to sticky tab bar (avoids duplicate labels in module body). */
export function clusterTab(page: Page, label: string): Locator {
  return page
    .locator("div.sticky.top-0")
    .getByRole("button", { name: label, exact: true });
}

/** Sidebar nav scoped to the complementary region (avoids ambiguous page-wide matches). */
export function sidebarNav(page: Page, label: string): Locator {
  return page.getByRole("complementary").getByRole("button", { name: label, exact: true });
}

/** Click sidebar nav after shell hydration (production builds can be slower). */
export async function clickSidebarNav(page: Page, label: string): Promise<void> {
  const nav = sidebarNav(page, label);
  await expect(page.getByRole("complementary")).toBeVisible({ timeout: 30_000 });
  await expect(nav).toBeVisible({ timeout: 30_000 });
  await nav.click();
}

/** Open command palette via header search trigger (B0R-8P canonical pattern). */
export async function openCommandPalette(page: Page): Promise<void> {
  await expect(page.locator("header")).toBeVisible({ timeout: 30_000 });
  const trigger = page.locator("header button").filter({ has: page.locator("kbd") });
  await expect(trigger).toBeVisible({ timeout: 30_000 });
  await trigger.click();
  await expect(page.getByPlaceholder(/search across reanzly/i)).toBeVisible({ timeout: 15_000 });
}

/** Click a cluster tab after the sticky strip is visible. */
export async function clickClusterTab(page: Page, label: string): Promise<void> {
  const tab = clusterTab(page, label);
  await expect(tab).toBeVisible({ timeout: 30_000 });
  await tab.click();
}

/** Search command palette and select a module option by exact label. */
export async function commandPaletteGoToModule(page: Page, label: string): Promise<void> {
  await openCommandPalette(page);
  await page.getByPlaceholder(/search across reanzly/i).fill(label);
  await page.getByRole("option", { name: new RegExp(`^${escapeRegex(label)}$`) }).click();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type ModuleLandmark =
  | { kind: "heading"; name: string | RegExp }
  | { kind: "text"; name: string | RegExp };

/** Stable UI landmarks for flag-ON routing proof (URL + rendered module). */
const MODULE_LANDMARKS: Record<string, ModuleLandmark> = {
  dashboard: { kind: "text", name: "My Dashboards" },
  trips: { kind: "heading", name: "Trips" },
  "fleet-map": { kind: "heading", name: "Fleet Map" },
  vehicles: { kind: "heading", name: "Vehicles" },
  pod: { kind: "heading", name: "Proof of Delivery" },
  "lorry-receipts": { kind: "heading", name: "Lorry Receipts" },
  inspection: { kind: "heading", name: "Inspection" },
  issues: { kind: "heading", name: "Issues" },
  maintenance: { kind: "heading", name: "Maintenance" },
  workshop: { kind: "heading", name: "Workshop" },
  services: { kind: "heading", name: "Services" },
  "fuel-energy": { kind: "heading", name: "Fuel & Energy" },
  compliance: { kind: "heading", name: "Compliance" },
  quality: { kind: "heading", name: "Quality" },
  "rate-cards": { kind: "heading", name: "Rate Cards" },
  approvals: { kind: "heading", name: "Approvals" },
  invoice: { kind: "heading", name: "Invoice" },
  expenses: { kind: "heading", name: "Expenses" },
  payments: { kind: "heading", name: "Payments" },
  ledger: { kind: "heading", name: "Ledger" },
  customers: { kind: "heading", name: "Customers" },
  vendors: { kind: "heading", name: "Vendors" },
  purchase: { kind: "heading", name: "Purchase" },
  helpdesk: { kind: "heading", name: "Helpdesk" },
  marketing: { kind: "heading", name: "Marketing Automation" },
  surveys: { kind: "heading", name: "Surveys" },
  crm: { kind: "heading", name: "CRM" },
  "drivers-staff": { kind: "heading", name: "Drivers & Staff" },
  payroll: { kind: "heading", name: "Payroll" },
  hr: { kind: "heading", name: "HR" },
  "document-studio": { kind: "heading", name: "Document Studio" },
  knowledge: { kind: "heading", name: "Knowledge Base" },
  reminders: { kind: "heading", name: "Reminders" },
  documents: { kind: "heading", name: "Documents" },
  warehouse: { kind: "heading", name: "Warehouse" },
  reports: { kind: "heading", name: "Reports" },
  "operations-hub": { kind: "heading", name: "Operations Hub" },
  "field-service": { kind: "heading", name: "Field Service" },
  planning: { kind: "heading", name: "Planning & Scheduling" },
  settings: { kind: "heading", name: "Profile" },
  subscriptions: { kind: "heading", name: "Subscriptions" },
  "access-matrix": { kind: "heading", name: "Access Matrix" },
  automation: { kind: "heading", name: "Automation" },
  "system-design": { kind: "heading", name: "System Design" },
  chat: { kind: "text", name: "Team Chat" },
  integrations: { kind: "heading", name: "Integrations" },
  "partner-programme": { kind: "heading", name: "Partner Programme" },
  "financial-services": { kind: "heading", name: "Financial Services" },
  "broker-console": { kind: "heading", name: "Broker Console" },
  "broker-marketplace": { kind: "heading", name: "Broker Marketplace" },
  "broker-settlements": { kind: "heading", name: "Broker Settlements" },
};

function landmarkLocator(page: Page, moduleId: string): Locator {
  const landmark = MODULE_LANDMARKS[moduleId];
  if (!landmark) {
    throw new Error(`No E2E landmark configured for module "${moduleId}"`);
  }
  if (landmark.kind === "heading") {
    if (typeof landmark.name === "string") {
      return page.getByRole("heading", { name: landmark.name, exact: true });
    }
    return page.getByRole("heading", { name: landmark.name });
  }
  return page.getByText(landmark.name).first();
}

/** Assert canonical module UI is visible (URL-first routing proof companion). */
export async function expectModule(page: Page, moduleId: string): Promise<void> {
  await expect(page.locator("main[data-e2e-active-module]")).toBeVisible();
  await expect(landmarkLocator(page, moduleId)).toBeVisible({ timeout: 15_000 });
}

/** Lighter assertion for create/detail overlays where list heading may be absent. */
export async function expectModuleShell(page: Page): Promise<void> {
  await expect(page.locator("main[data-e2e-active-module]")).toBeVisible();
}

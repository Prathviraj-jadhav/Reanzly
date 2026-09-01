# Reanzly B0R-0 — Next.js Routing Migration Audit

**Audit date:** 2026-09-01  
**Auditor mode:** Read-only routing architecture audit (no code changes)  
**Repository:** `d:\Reanzly`  
**Branch:** `main`  
**Git HEAD:** `84516973e00737962d5357ddea120dcef26ac02e`  
**Working tree:** Clean (no staged/unstaged changes at audit time)  
**Prerequisites read:** `REANZLY-BACKEND-SEPARATION-AUDIT.md`, `REANZLY-B0A3-VERIFICATION-REPORT.md`, `REANZLY-B0A2-VERIFICATION-REPORT.md`

---

## Executive Summary

Reanzly's authenticated product UI is a **single-page application (SPA) mounted at `/dashboard`**. All 54 `ModuleId` values route through **Zustand `activeView` → `ModuleRouter`**, not through Next.js App Router segments. Navigation is centralized in `useAppStore().navigate()` / `navigateDetail()` with a client-side history stack — the browser URL stays at `/dashboard` (or `/` for marketing) regardless of module, detail, or tab state.

**Verdict:** Adopt **incremental Next.js App Router migration** with a **`navigateCompat` adapter** that maps `navigate(module, view, id, tab)` calls to `router.push()`. Keep `ModuleRouter` as fallback until each batch reaches decommission criteria. Fastify remains the security authority; route-level auth is a UX gate only.

| Metric | Value |
|--------|-------|
| Authenticated SPA entry | `/dashboard` → `<AppShell />` |
| Public entry | `/` → `<LandingSite />`, `/login` → `<LoginScreen />` |
| `ModuleId` union members | **54** |
| `ModuleRouter` switch cases | **54** (+ `default` → `PlaceholderModule`) |
| Module cluster groups | **7** (via `ModuleClusterTabs`) |
| `navigate(` call sites (lines) | **189** across **73** files |
| `navigateDetail(` call sites (lines) | **134** across **54** files |
| `activeView` references (lines) | **218** across **40** files |
| Next.js `useRouter` / `Link` usage in modules | **Minimal** (6 files, auth/error only) |
| Recommended migration batches | **8** (B0R-1 … B0R-8) |
| ModuleRouter removal phase | **B0R-8** (after ≥95% call-site migration) |

---

## Pre-flight Baseline

| Item | Value |
|------|-------|
| Branch | `main` |
| HEAD | `84516973e00737962d5357ddea120dcef26ac02e` |
| `git status --short` | *(empty — clean working tree)* |
| Primary SPA route | `/dashboard` |
| API routes (unchanged by B0R) | 236+ under `apps/web/src/app/api/` |

---

## A. Current Routing Architecture

### A.1 End-to-end flow

```
Sidebar / Header / CommandPalette / Widgets / Notifications
        │
        ▼
  useAppStore().navigate(module, view?, id?, tab?)
  useAppStore().navigateDetail(module, id, tab?)
  useAppStore().setSettingsTab(tab)          ← settings-only
        │
        ▼
  activeView: ViewState  +  history: ViewState[]  (max 20)
        │
        ▼
  AppShell (portal gate)
    ├─ unauthenticated → LandingSite / MarketplaceSite (marketingView)
    ├─ portal=driver|warehouse-crew → DriverFieldApp / WarehouseFieldApp
    ├─ portal=superadmin → SuperAdminShell (local sub-view state)
    ├─ portal=broker → BrokerShell (local BrokerSubView state)
    ├─ portal=vendor → VendorShell (local VendorSubView state)
    └─ portal=app → Sidebar + Header + ModuleRouter
        │
        ▼
  ModuleRouter
    ├─ CLUSTER_BY_MODULE hit → ModuleClusterTabs + renderModule()
    └─ else → renderModule(activeView.module)
        │
        ▼
  Module component (e.g. TripsModule)
    reads activeView.view / .id / .tab / .settingsTab
    renders list | detail | create | edit sub-views internally
```

### A.2 Key files

| Concern | File |
|---------|------|
| Navigation state & API | `apps/web/src/lib/store/app-store.ts` |
| Module switch | `apps/web/src/components/modules/router.tsx` |
| Auth + portal gate | `apps/web/src/components/layout/app-shell.tsx` |
| Primary nav | `apps/web/src/components/layout/sidebar.tsx` |
| Quick actions / profile | `apps/web/src/components/layout/header.tsx` |
| Cluster tab strip | `apps/web/src/components/shared/module-cluster-tabs.tsx` |
| SPA mount point | `apps/web/src/app/dashboard/page.tsx` |
| Public landing | `apps/web/src/app/page.tsx` |
| Login page | `apps/web/src/app/login/page.tsx` |

### A.3 `ViewState` shape

Defined in `apps/web/src/lib/store/app-store.ts`:

```typescript
interface ViewState {
  module: ModuleId;
  view: "list" | "detail" | "create" | "edit";
  id?: string;
  tab?: string;           // sub-tab within detail views (e.g. approvals "decision")
  settingsTab?: SettingsTab;
  breadcrumb: { label: string; module?: ModuleId; id?: string }[];
}
```

**Persisted in localStorage** (`reanzly-app` via Zustand `partialize`): auth, sidebar order, company, role — **not** `activeView` or `history`. On reload, users land on persisted auth state but `activeView` resets to `DEFAULT_VIEW` (dashboard) unless session restore changes landing module on login.

### A.4 Portal switching

`PortalType`: `"superadmin" | "app" | "driver" | "vendor" | "broker" | "freight"` (`app-store.ts`).

| Portal | Shell | Navigation mechanism |
|--------|-------|---------------------|
| `app` | Desktop: Sidebar + Header + ModuleRouter | Zustand `activeView` |
| `superadmin` | `SuperAdminShell` | Local `active: AdminSubView` state |
| `broker` | `BrokerShell` | Local `active: BrokerSubView` state |
| `vendor` | `VendorShell` | Local `active: VendorSubView` state |
| `driver` | `DriverFieldApp` | Local `useState<Tab>` |
| `warehouse-crew` | `WarehouseFieldApp` | Local `useState<Tab>` |

Landing modules on login (`app-store.ts` `login()`):
- `superadmin` → `"superadmin"`
- `broker` → `"broker-console"`
- `vendor` → `"fleet-map"`
- default → `"dashboard"`

### A.5 `marketingView` (unauthenticated)

Non-persisted flag: `"landing" | "auth" | "marketplace"`.

- Default: `"landing"` → `<LandingSite />` at `/` or unauthenticated AppShell path
- `"marketplace"` → `<MarketplaceSite />`
- `"auth"` → auth modal overlay inside `LandingSite` (not a separate route today)
- `selectedMarketplaceProvider`, `selectedModuleForPurchase` — transient signup preselect

### A.6 Module clusters (sidebar simplification)

Seven clusters in `router.tsx` `CLUSTERS` array wrap related modules with `ModuleClusterTabs`. Clicking a cluster tab calls `navigate(siblingModuleId)` — **changing `activeView.module`**, not a sub-tab within one module.

| Cluster anchor | Sibling modules (tabs) |
|----------------|------------------------|
| `vehicles` | inspection, issues, maintenance, workshop, services, fuel-energy, compliance, quality |
| `invoice` | rate-cards |
| `settings` | subscriptions, access-matrix, automation, system-design |
| `crm` | customers, vendors, purchase, helpdesk, marketing, surveys |
| `hr` | drivers-staff, payroll |
| `operations-hub` | field-service, planning |
| `expenses` | approvals |
| `documents` | document-studio, knowledge, reminders |

**Known collision fix (documented in code):** `purchase` was silently unreachable when it shared the `vendors` cluster key; folded into CRM cluster.

### A.7 Navigation aliases in `navigate()`

```typescript
// financial-ops → ledger (module id rewritten before setState)
const resolved = module === "financial-ops" ? "ledger" : module;
```

`ModuleRouter` still has explicit `case "financial-ops": return <LedgerModule />` for direct `activeView.module` hits (e.g. widgets calling `navigate("financial-ops")`).

---

## B. Navigation Global Search

### B.1 Pattern counts

| Pattern | Line matches | Files |
|---------|-------------|-------|
| `navigate(` | 189 | 73 |
| `navigateDetail(` | 134 | 54 |
| `activeView` | 218 | 40 |
| `setActiveView` | 0 | 0 |
| `ModuleRouter` | 4 | 2 |
| `router.push` / `useRouter` | 6 | 6 |
| `from "next/link"` / `<Link` | 0 | 0 |
| `window.location` | 4 | 4 |

### B.2 `useRouter` / `window.location` files (non-module navigation)

| File | Usage |
|------|-------|
| `components/auth/login-screen.tsx` | Post-login redirect |
| `components/auth/signup-screen.tsx` | Post-signup redirect |
| `components/shared/error-boundary.tsx` | Hard reload on retry |
| `lib/store/sync-store.ts` | Offline sync reload |
| `components/layout/header.tsx` | Role switch full reload |
| `lib/chat/socket-client.ts` | WebSocket origin |

**No module uses Next.js `<Link>` for in-app navigation today.**

### B.3 Navigation call-site table (representative)

| File | Component | Current Navigation | Target Route Type |
|------|-----------|-------------------|-------------------|
| `layout/sidebar.tsx` | `Sidebar`, `NavButton` | `navigate(moduleId)` | Primary segment `/[module]` |
| `layout/header.tsx` | `Header`, Quick Add | `navigate(m, view)` | `/[module]/new` or list |
| `layout/command-palette.tsx` | `CommandPalette` | `navigate`, `navigateDetail` | Search + deep links |
| `layout/notification-panel.tsx` | `NotificationPanel` | `navigate(n.link.module)` | Module + optional `[id]` |
| `layout/alert-banner.tsx` | `AlertBanner` | `navigate(actionModule)` | `/settings/billing` etc. |
| `layout/chat-panel.tsx` | `ChatPanel` | `navigate("chat")` | `/chat` |
| `shared/module-cluster-tabs.tsx` | `ModuleClusterTabs` | `navigate(t.id)` | Cluster sibling URL |
| `shared/page-header.tsx` | `PageHeader` | breadcrumb `navigate` | Parent module URL |
| `shared/detail-layout.tsx` | `DetailLayout` | breadcrumb `navigate` | Parent list URL |
| `modules/*/index.tsx` | `*Module` | `activeView` switch | `page.tsx` + parallel routes |
| `modules/*/*-list.tsx` | Data tables | `navigateDetail` | `/[module]/[id]` |
| `modules/*/*-detail.tsx` | Detail pages | `navigate` back | List URL |
| `modules/dashboard/widget-registry.tsx` | KPI widgets | `navigate`, `navigateDetail` | Deep links (47 calls) |
| `lib/store/app-store.ts` | `demoEnter` | `navigate(moduleId)` | Demo deep link |
| `lib/content/role-features.ts` | Featured modules | documents `navigate` target | Role landing URLs |

**Highest density:** `widget-registry.tsx` (47 `navigate`/`navigateDetail`), list/detail CRUD modules (10–15 calls each).

---

## C. ModuleRouter Inventory

### C.1 Complete switch-case table

| # | Module Key | Component | Views (via activeView) | IDs | Tabs | Portal | Proposed Route |
|---|------------|-----------|------------------------|-----|------|--------|----------------|
| 1 | `dashboard` | `DashboardModule` | list | — | widget drill-downs | app | `/dashboard` |
| 2 | `operations-hub` | `OperationsHubModule` | list + internal tabs | task ids in drawers | ops tabs (local) | app | `/operations` |
| 3 | `trips` | `TripsModule` | list, detail, create | `tripId` | execution vs standard | app | `/trips`, `/trips/[id]`, `/trips/new` |
| 4 | `fleet-map` | `FleetMapModule` | list | vehicle focus via store | — | app, vendor landing | `/fleet-map` |
| 5 | `vehicles` | `VehiclesModule` | list, detail, create | `id` | vehicle tabs (local) | app | `/vehicles`, `/vehicles/[id]` |
| 6 | `lorry-receipts` | `LorryReceiptsModule` | list, detail, create | `id` | — | app | `/lorry-receipts`, `/lorry-receipts/[id]` |
| 7 | `invoice` | `InvoiceModule` | list, detail, create | `invoiceNumber` | designer tab | app | `/invoice`, `/invoice/[id]` |
| 8 | `expenses` | `ExpensesModule` | list, detail, create | `id` | — | app | `/expenses`, `/expenses/[id]` |
| 9 | `payments` | `PaymentsModule` | list, detail, create | `id` | receivables sub-view | app | `/payments`, `/payments/[id]` |
| 10 | `customers` | `CustomersModule` | list, detail, create | `id` | — | app | `/customers`, `/customers/[id]` |
| 11 | `vendors` | `VendorsModule` | list, detail, create | `id` | — | app | `/vendors`, `/vendors/[id]` |
| 12 | `drivers-staff` | `DriversStaffModule` | list, detail, create | `id` | HR tabs (local) | app | `/drivers`, `/drivers/[id]` |
| 13 | `inspection` | `InspectionModule` | list, detail, create | `inspectionId` | issues tab | app | `/inspection`, `/inspection/[id]` |
| 14 | `issues` | `IssuesModule` | list, detail, create | `issueId` | — | app | `/issues`, `/issues/[id]` |
| 15 | `maintenance` | `MaintenanceModule` | list, detail, create | `workOrderId` | parts inventory toggle | app | `/maintenance`, `/maintenance/[id]` |
| 16 | `services` | `ServicesModule` | list, create | — | — | app | `/services`, `/services/new` |
| 17 | `fuel-energy` | `FuelEnergyModule` | list, detail, create | `id` | anomalies | app | `/fuel`, `/fuel/[id]` |
| 18 | `reminders` | `RemindersModule` | list, create | — | — | app | `/reminders` |
| 19 | `documents` | `DocumentsModule` | list, detail, create | `id` | — | app | `/documents`, `/documents/[id]` |
| 20 | `reports` | `ReportsModule` | list + generated | report type id | library/scheduled/custom | app | `/reports`, `/reports/[reportId]` |
| 21 | `settings` | `SettingsModule` | list + settingsTab | — | 11 settings sections | app | `/settings`, `/settings/[tab]` |
| 22 | `automation` | `AutomationModule` | internal tabs | — | — | app | `/settings/automation` or `/automation` |
| 23 | `system-design` | `SystemDesignModule` | internal views | — | — | app | `/settings/system-design` |
| 24 | `chat` | `ChatModule` | full module | conversation id in store | channels | app | `/chat`, `/chat/[conversationId]` |
| 25 | `access-matrix` | `AccessMatrixModule` | matrix view | — | — | app | `/settings/access-matrix` |
| 26 | `pod` | `PODModule` | list, detail, create | `id` | capture flow | app | `/pod`, `/pod/[id]` |
| 27 | `rate-cards` | `RateCardsModule` | list, detail, create | `id` | — | app | `/rate-cards`, `/rate-cards/[id]` |
| 28 | `financial-ops` | `LedgerModule` **alias** | treasury sub-view | — | ledger local tabs | app | `/ledger/treasury` (redirect) |
| 29 | `warehouse` | `WarehouseModule` | list + 11 local tabs | — | WAREHOUSE_TABS | app | `/warehouse`, `/warehouse/[tab]` |
| 30 | `compliance` | `ComplianceModule` | internal tabs | — | EHS, GST, etc. | app | `/compliance`, `/compliance/[tab]` |
| 31 | `payroll` | `PayrollModule` | 10 local tabs | — | PAYROLL_TABS | app | `/payroll`, `/payroll/[tab]` |
| 32 | `workshop` | `WorkshopModule` | internal views | — | — | app | `/workshop` |
| 33 | `superadmin` | `SuperadminModule` | sub-views | — | — | app sidebar **and** SuperAdminShell | `/admin/*` (portal) |
| 34 | `crm` | `CRMModule` | 6 local tabs | — | CRM_TABS | app | `/crm`, `/crm/[tab]` |
| 35 | `hr` | `HRModule` | internal tabs | employee ids in drawers | — | app | `/hr`, `/hr/[tab]` |
| 36 | `ledger` | `LedgerModule` | 10 local sub-views | account ids | statements tabs | app | `/ledger`, `/ledger/[view]` |
| 37 | `broker-console` | `BrokerConsoleModule` + `ProvisionedGate` | broker CRUD | — | — | app + broker portal | `/broker/console` |
| 38 | `broker-marketplace` | `BrokerMarketplaceModule` + gate | marketplace | load ids | — | app + broker portal | `/broker/marketplace` |
| 39 | `broker-settlements` | `BrokerSettlementsModule` + gate | settlements | — | — | app + broker portal | `/broker/settlements` |
| 40 | `document-studio` | `DocumentStudioModule` | list, detail, create | doc id | — | app | `/document-studio`, `/document-studio/[id]` |
| 41 | `integrations` | `IntegrationsModule` | connector list | provider id | — | app | `/integrations` |
| 42 | `helpdesk` | `HelpdeskModule` | list, detail, create | `id` | — | app | `/helpdesk`, `/helpdesk/[id]` |
| 43 | `field-service` | `FieldServiceModule` | list, detail, create | `id` | — | app | `/field-service`, `/field-service/[id]` |
| 44 | `approvals` | `ApprovalsModule` | list, detail | `id` | decision tab | app | `/approvals`, `/approvals/[id]` |
| 45 | `knowledge` | `KnowledgeModule` | list, detail, create | `id` | — | app | `/knowledge`, `/knowledge/[id]` |
| 46 | `planning` | `PlanningModule` | internal tabs | resource ids | — | app | `/planning`, `/planning/[tab]` |
| 47 | `purchase` | `PurchaseModule` | list, detail, create | `id` | — | app | `/purchase`, `/purchase/[id]` |
| 48 | `quality` | `QualityModule` | list, detail, create | `id` | cross-module ref | app | `/quality`, `/quality/[id]` |
| 49 | `subscriptions` | `SubscriptionsModule` | list, detail, create | `id` | — | app | `/settings/subscriptions` |
| 50 | `surveys` | `SurveysModule` | list, detail | `id` | — | app | `/surveys`, `/surveys/[id]` |
| 51 | `marketing` | `MarketingModule` | campaigns list, detail | campaign id | — | app | `/marketing`, `/marketing/[id]` |
| 52 | `app-store` | `IntegrationsModule` **alias** | same as integrations | — | — | app | `/integrations` (301) |
| 53 | `partner-programme` | `PartnerProgrammeModule` | apply drawer | — | — | app | `/partner-programme` |
| 54 | `financial-services` | `FinancialServicesModule` | apply drawer | — | — | app | `/financial-services` |
| — | `default` | `PlaceholderModule` | unknown module id | — | — | — | `/404` or unauthorized |

### C.2 Aliases, dead paths, bugs

| Issue | Severity | Detail |
|-------|----------|--------|
| `financial-ops` alias | LOW | Router renders `LedgerModule`; `navigate()` rewrites module to `ledger`. Widgets still call `navigate("financial-ops")` — URL mapper must accept both. |
| `app-store` alias | LOW | Maps to `IntegrationsModule`. Legacy deep links must 301 to `/integrations`. |
| `superadmin` dual path | MEDIUM | App sidebar can `navigate("superadmin")` → `SuperadminModule` inside desktop shell, while `portal=superadmin` uses `SuperAdminShell`. Different chrome for same domain. |
| Broker modules dual path | MEDIUM | `broker-console` et al. render in app shell (with `ProvisionedGate`) AND in `BrokerShell` with 18 local sub-views. |
| `access-matrix` dual embed | LOW | Standalone module + embedded in `SettingsModule` when `settingsTab=access-matrix`. |
| `default` placeholder | INFO | Any future `ModuleId` without a case shows `PlaceholderModule` — silent degradation vs 404. |
| No `setActiveView` export | INFO | All mutations go through `navigate` / `navigateDetail` / `setSettingsTab` — good for adapter interception. |
| History stack not URL-backed | HIGH | Browser back button exits SPA instead of module back; `navigateBack()` only used in some detail layouts. |

### C.3 Modules outside ModuleRouter

| Component | Mounted from | Notes |
|-----------|--------------|-------|
| `DriverFieldApp` | `AppShell` when driver portal | Local tab state, not `ModuleId` |
| `WarehouseFieldApp` | `AppShell` when warehouse-crew | Local tab state |
| `VendorShell` + 11 vendor components | `AppShell` when vendor portal | `VendorSubView` local state |
| `BrokerShell` + 18 broker sub-views | `AppShell` when broker portal | Overlaps 3 ModuleRouter broker modules |
| `SuperAdminShell` + 20 admin sub-views | `AppShell` when superadmin portal | Overlaps `SuperadminModule` in app shell |

---

## D. Module Classification (LEVEL A–E)

**LEVEL A** — Primary route (top-level segment)  
**LEVEL B** — Sub-route (nested segment or tab as path)  
**LEVEL C** — Detail `[id]` route  
**LEVEL D** — UI-only state (drawers, modals, local useState — stay client)  
**LEVEL E** — Search-param state (filters, pagination, sort)

| Module | Level A | Level B | Level C | Level D | Level E |
|--------|---------|---------|---------|---------|---------|
| dashboard | ✅ | — | — | widget layout | date range (global store) |
| operations-hub | ✅ | task/sprint tabs | task id (drawer) | drawer open | filter status |
| trips | ✅ | — | ✅ tripId | planning drawer | list filters |
| fleet-map | ✅ | — | — | selected vehicle panel | map bounds |
| vehicles | ✅ | detail tabs | ✅ id | create drawer | list filters |
| lorry-receipts | ✅ | — | ✅ id | create form | — |
| invoice | ✅ | designer | ✅ invoiceNumber | create | list filters |
| expenses | ✅ | — | ✅ id | create drawer | — |
| payments | ✅ | receivables | ✅ id | voucher create | — |
| customers | ✅ | — | ✅ id | create | — |
| vendors | ✅ | — | ✅ id | create | — |
| drivers-staff | ✅ | detail tabs | ✅ id | add drawer | — |
| inspection | ✅ | detail tabs | ✅ inspectionId | create | — |
| issues | ✅ | — | ✅ issueId | create | — |
| maintenance | ✅ | parts view | ✅ workOrderId | create | — |
| services | ✅ | — | — | create | — |
| fuel-energy | ✅ | anomalies | ✅ id | create | — |
| reminders | ✅ | — | — | create | — |
| documents | ✅ | — | ✅ id | create | — |
| reports | ✅ | library/scheduled/custom | generated report | config drawers | category filter |
| settings | ✅ | ✅ settingsTab | — | — | — |
| automation | ✅ (or settings child) | rules/logs | rule id | Rean drawer | — |
| system-design | ✅ | diagrams | — | — | — |
| chat | ✅ | channels | ✅ conversationId | call overlay | search |
| access-matrix | ✅ | — | — | — | — |
| pod | ✅ | capture | ✅ id | create flow | — |
| rate-cards | ✅ | — | ✅ id | create | — |
| financial-ops | redirect | treasury-ops | — | — | — |
| warehouse | ✅ | ✅ 11 tabs | future entity ids | — | tab= query fallback |
| compliance | ✅ | EHS/GST tabs | — | — | — |
| payroll | ✅ | ✅ 10 tabs | payslip id (future) | — | cycle filter |
| workshop | ✅ | bay views | work order refs | — | — |
| superadmin | portal root | ✅ 20 sub-views | org/user ids | dialogs | audit filters |
| crm | ✅ | ✅ 6 tabs | deal/lead ids (drawers) | — | pipeline stage |
| hr | ✅ | HR tabs | employee id | drawers | — |
| ledger | ✅ | ✅ 10 sub-views | entry/account id | COA drawer | company switcher |
| broker-console | ✅ | — | enquiry id | — | — |
| broker-marketplace | ✅ | — | load id | — | lane filter |
| broker-settlements | ✅ | — | settlement id | — | — |
| document-studio | ✅ | — | ✅ doc id | create | — |
| integrations | ✅ | provider detail | connection id | sync modal | — |
| helpdesk | ✅ | — | ✅ id | create | — |
| field-service | ✅ | — | ✅ id | create | — |
| approvals | ✅ | decision tab | ✅ id | — | status filter |
| knowledge | ✅ | — | ✅ id | create | search |
| planning | ✅ | resource/schedule tabs | allocation id | — | — |
| purchase | ✅ | — | ✅ id | create | — |
| quality | ✅ | — | ✅ id | create | — |
| subscriptions | ✅ | — | ✅ id | create | — |
| surveys | ✅ | builder | ✅ id | — | — |
| marketing | ✅ | — | ✅ campaign id | — | — |
| app-store | alias → integrations | — | — | install dialog | — |
| partner-programme | ✅ | — | — | apply drawer | — |
| financial-services | ✅ | — | application id | apply drawer | — |

---

## E. Target Route Tree

Proposed `apps/web/src/app/` structure (route groups reflect sidebar + portal boundaries):

```
apps/web/src/app/
├── layout.tsx                          # Root: fonts, theme, toasters
├── page.tsx                            # /  (marketing)
├── login/page.tsx                      # /login
├── marketplace/page.tsx                # /marketplace  (NEW)
│
├── (marketing)/                        # optional group — public, indexable
│
├── api/                                # UNCHANGED — 236 legacy + /api/v1 proxy
│   └── v1/[...path]/route.ts           # BFF proxy to Fastify (existing pattern)
│
├── (auth)/                             # middleware: redirect if session
│   └── dashboard/                      # LEGACY — 301 → /app/dashboard during migration
│       └── page.tsx
│
├── (app)/                              # Tenant desktop shell — noindex
│   ├── layout.tsx                      # AppShell: Sidebar + Header + auth gate
│   ├── dashboard/page.tsx
│   │
│   ├── operations/
│   │   ├── hub/page.tsx
│   │   ├── pod/page.tsx
│   │   ├── pod/[id]/page.tsx
│   │   ├── pod/new/page.tsx
│   │   └── warehouse/
│   │       ├── page.tsx                # default tab: inventory
│   │       └── [tab]/page.tsx          # inbound, outbound, …
│   │
│   ├── fleet/
│   │   ├── trips/page.tsx
│   │   ├── trips/[id]/page.tsx
│   │   ├── trips/new/page.tsx
│   │   ├── map/page.tsx
│   │   ├── vehicles/page.tsx
│   │   ├── vehicles/[id]/page.tsx
│   │   ├── lorry-receipts/...
│   │   ├── inspection/...
│   │   ├── issues/...
│   │   ├── maintenance/...
│   │   ├── workshop/page.tsx
│   │   ├── services/...
│   │   ├── fuel/...
│   │   ├── compliance/...
│   │   └── quality/...
│   │
│   ├── finance/
│   │   ├── invoice/...
│   │   ├── expenses/...
│   │   ├── payments/...
│   │   ├── rate-cards/...
│   │   └── ledger/
│   │       ├── page.tsx
│   │       └── [view]/page.tsx
│   │
│   ├── people/
│   │   ├── crm/[[...tab]]/page.tsx
│   │   ├── customers/...
│   │   ├── vendors/...
│   │   ├── purchase/...
│   │   ├── helpdesk/...
│   │   ├── marketing/...
│   │   ├── surveys/...
│   │   ├── hr/[[...tab]]/page.tsx
│   │   ├── drivers/...
│   │   └── payroll/[[...tab]]/page.tsx
│   │
│   ├── documents/
│   │   ├── page.tsx                    # vault
│   │   ├── [id]/page.tsx
│   │   ├── studio/...
│   │   ├── knowledge/...
│   │   └── reminders/...
│   │
│   ├── intelligence/
│   │   └── reports/[[...tab]]/page.tsx
│   │
│   ├── platform/
│   │   ├── chat/[[...conversationId]]/page.tsx
│   │   ├── settings/[[...tab]]/page.tsx
│   │   ├── integrations/page.tsx
│   │   ├── field-service/...
│   │   ├── planning/...
│   │   ├── approvals/...
│   │   └── automation/page.tsx         # or under settings
│   │
│   ├── ecosystem/
│   │   ├── partner-programme/page.tsx
│   │   └── financial-services/page.tsx
│   │
│   └── broker/                         # In-app broker modules (ProvisionedGate)
│       ├── console/page.tsx
│       ├── marketplace/page.tsx
│       └── settlements/page.tsx
│
├── (portal-driver)/
│   └── field/[[...tab]]/page.tsx       # DriverFieldApp
│
├── (portal-warehouse)/
│   └── field/[[...tab]]/page.tsx       # WarehouseFieldApp
│
├── (portal-vendor)/
│   └── [[...view]]/page.tsx            # VendorShell sub-views
│
├── (portal-broker)/
│   └── [[...view]]/page.tsx            # BrokerShell (18 sub-views)
│
└── (portal-admin)/
    └── [[...view]]/page.tsx            # SuperAdminShell (20 sub-views)
```

**Flat alternative (lower migration risk):** `/trips`, `/vehicles`, … at `(app)` root without domain folders — matches `ModuleId` slugs 1:1 for `navigateCompat`.

---

## F. Primary URL Map

Base path prefix: **`/app`** (or bare `/` post-migration with `/dashboard` as home). Below uses **`/app`** prefix for clarity.

| Module | List URL | Detail URL | Create URL | Notes |
|--------|----------|------------|------------|-------|
| dashboard | `/app/dashboard` | — | — | |
| operations-hub | `/app/operations` | `/app/operations/tasks/[id]` | — | task drawer → optional |
| trips | `/app/trips` | `/app/trips/[tripId]` | `/app/trips/new` | |
| fleet-map | `/app/fleet-map` | — | — | `?vehicle=` focus |
| vehicles | `/app/vehicles` | `/app/vehicles/[id]` | `/app/vehicles/new` | |
| lorry-receipts | `/app/lorry-receipts` | `/app/lorry-receipts/[id]` | `/app/lorry-receipts/new` | |
| invoice | `/app/invoice` | `/app/invoice/[invoiceNumber]` | `/app/invoice/new` | |
| expenses | `/app/expenses` | `/app/expenses/[id]` | `/app/expenses/new` | |
| payments | `/app/payments` | `/app/payments/[id]` | `/app/payments/new` | |
| customers | `/app/customers` | `/app/customers/[id]` | `/app/customers/new` | |
| vendors | `/app/vendors` | `/app/vendors/[id]` | `/app/vendors/new` | |
| drivers-staff | `/app/drivers` | `/app/drivers/[id]` | `/app/drivers/new` | slug rename optional |
| inspection | `/app/inspection` | `/app/inspection/[id]` | `/app/inspection/new` | |
| issues | `/app/issues` | `/app/issues/[id]` | `/app/issues/new` | |
| maintenance | `/app/maintenance` | `/app/maintenance/[id]` | `/app/maintenance/new` | |
| services | `/app/services` | — | `/app/services/new` | |
| fuel-energy | `/app/fuel` | `/app/fuel/[id]` | `/app/fuel/new` | |
| reminders | `/app/reminders` | — | `/app/reminders/new` | |
| documents | `/app/documents` | `/app/documents/[id]` | `/app/documents/new` | |
| reports | `/app/reports` | `/app/reports/run/[reportId]` | — | |
| settings | `/app/settings` | — | — | `/app/settings/[tab]` |
| automation | `/app/automation` | `/app/automation/[id]` | — | |
| system-design | `/app/system-design` | — | — | |
| chat | `/app/chat` | `/app/chat/[conversationId]` | — | |
| access-matrix | `/app/settings/access-matrix` | — | — | |
| pod | `/app/pod` | `/app/pod/[id]` | `/app/pod/new` | |
| rate-cards | `/app/rate-cards` | `/app/rate-cards/[id]` | `/app/rate-cards/new` | |
| financial-ops | `/app/ledger/treasury` | — | — | 301 from `/app/financial-ops` |
| warehouse | `/app/warehouse` | `/app/warehouse/[tab]` | — | tab default `inventory` |
| compliance | `/app/compliance` | — | — | `/app/compliance/[tab]` |
| payroll | `/app/payroll` | — | — | `/app/payroll/[tab]` |
| workshop | `/app/workshop` | — | — | |
| crm | `/app/crm` | — | — | `/app/crm/[tab]` |
| hr | `/app/hr` | — | — | `/app/hr/[tab]` |
| ledger | `/app/ledger` | — | — | `/app/ledger/[view]` |
| helpdesk | `/app/helpdesk` | `/app/helpdesk/[id]` | `/app/helpdesk/new` | |
| field-service | `/app/field-service` | `/app/field-service/[id]` | `/app/field-service/new` | |
| approvals | `/app/approvals` | `/app/approvals/[id]` | — | `?tab=decision` |
| knowledge | `/app/knowledge` | `/app/knowledge/[id]` | `/app/knowledge/new` | |
| planning | `/app/planning` | — | — | `/app/planning/[tab]` |
| purchase | `/app/purchase` | `/app/purchase/[id]` | `/app/purchase/new` | |
| quality | `/app/quality` | `/app/quality/[id]` | `/app/quality/new` | |
| subscriptions | `/app/settings/subscriptions` | `/app/settings/subscriptions/[id]` | — | |
| surveys | `/app/surveys` | `/app/surveys/[id]` | — | |
| marketing | `/app/marketing` | `/app/marketing/[id]` | — | |
| integrations | `/app/integrations` | — | — | |
| app-store | `/app/integrations` | — | — | 301 alias |
| partner-programme | `/app/partner-programme` | — | — | |
| financial-services | `/app/financial-services` | — | — | |
| broker-console | `/app/broker/console` | — | — | |
| broker-marketplace | `/app/broker/marketplace` | — | — | |
| broker-settlements | `/app/broker/settlements` | — | — | |
| document-studio | `/app/document-studio` | `/app/document-studio/[id]` | `/app/document-studio/new` | |
| superadmin (in-app) | `/app/superadmin` | — | — | prefer portal route |

---

## G. Warehouse Route Map

Verified against `apps/web/src/components/modules/warehouse/index.tsx` and `WAREHOUSE_TABS` in `_helpers.tsx`. UI uses **mock data** today; B0A-3 migrated API to Fastify but **UI wiring is out of scope for B0R**.

| Tab ID | Label | Component | Proposed URL | API resource (B0A-3) |
|--------|-------|-----------|--------------|----------------------|
| `inventory` | Inventory | `WarehouseInventory` | `/app/warehouse` or `/app/warehouse/inventory` | `GET /v1/warehouse/skus` |
| `inbound` | Inbound | `WarehouseInbound` | `/app/warehouse/inbound` | `inbound` |
| `outbound` | Outbound | `WarehouseOutbound` | `/app/warehouse/outbound` | `outbound` |
| `storage` | Storage Locations | `WarehouseStorage` | `/app/warehouse/storage` | `storage` |
| `pod-receive` | POD Receive | `WarehousePodReceive` | `/app/warehouse/pod-receive` | `pod-receive` |
| `pick-pack` | Pick & Pack | `WarehousePickPack` | `/app/warehouse/pick-pack` | `pick-pack` |
| `cycle-count` | Cycle Count | `WarehouseCycleCount` | `/app/warehouse/cycle-count` | `cycle-count` |
| `cross-docking` | Cross-Docking | `WarehouseCrossDocking` | `/app/warehouse/cross-docking` | `cross-dock` |
| `returns` | Returns / RMA | `WarehouseReturns` | `/app/warehouse/returns` | `returns` |
| `yard` | Yard | `WarehouseYard` | `/app/warehouse/yard` | `yard` |
| `dock-scheduling` | Dock Scheduling | `WarehouseDockScheduling` | `/app/warehouse/dock-scheduling` | `dock-appt` |

**Recommendation:** Nested path tabs (`/warehouse/[tab]`) over `?tab=` — 11 tabs exceed comfortable query-param UX; paths are shareable per warehouse function.

**Future Level C routes (when CRUD detail exists):** `/app/warehouse/inbound/[grn]`, `/app/warehouse/skus/[skuCode]`, etc.

**Warehouse field portal:** `/field/warehouse/[[tab]]` — separate from desktop warehouse module (`WarehouseFieldApp`).

---

## H. Detail Route Strategy

| Pattern | Current behavior | Modules | Recommendation |
|---------|------------------|---------|----------------|
| **Full page detail** | `activeView.view === "detail"` replaces list | trips, vehicles, customers, invoice, most CRUD | **`/[id]` segment** — primary pattern |
| **Inline drawer create** | `view === "create"` opens drawer, list stays mounted | trips (JobOrderDrawer), expenses, vehicles | **`/new` route** with parallel route or intercepting drawer (`(.)new`) |
| **Side drawer detail** | operations-hub tasks, HR employees | operations-hub, hr | **`?drawer=[id]`** or `@drawer` parallel route |
| **Modal / dialog** | app-store install, partner apply | integrations, partner-programme | **Stay Level D** — no route |
| **Cross-module detail** | `navigateDetail(otherModule, id)` | documents, quality, widgets | **Preserve via URL** — `/vehicles/[id]` |
| **Tab within detail** | `activeView.tab` e.g. approvals "decision" | approvals, inspection | **`/[id]/[tab]`** or `?tab=` |
| **Execution vs standard trip** | `TripDetailRouter` picks view by status | trips | **`/trips/[id]/execution`** sub-segment or auto-redirect in loader |

**Drawer vs full page rule:**
- **Full page:** entities with >3 tabs of related data (vehicle, trip, invoice, customer)
- **Drawer (@modal):** quick edits, create flows that return to list context
- **Intercepting routes:** match current JobOrderDrawer / create UX without losing list scroll position

---

## I. Create/Edit Strategy

| Module | Create trigger | Current UX | Proposed route |
|--------|---------------|------------|----------------|
| trips | Quick Add, list CTA | `JobOrderDrawer` | `/trips/new` (+ optional `@drawer`) |
| vehicles | Quick Add | full create view / drawer | `/vehicles/new` |
| invoice | Quick Add | create flow in module | `/invoice/new` |
| customers | Quick Add | create drawer | `/customers/new` |
| expenses | list CTA | drawer | `/expenses/new` |
| pod | list CTA | dedicated create view | `/pod/new` |
| knowledge | list CTA | create form | `/knowledge/new` |
| document-studio | list CTA | create | `/document-studio/new` |
| rate-cards | list CTA | create | `/rate-cards/new` |
| maintenance | list CTA | create | `/maintenance/new` |
| field-service | list CTA | create | `/field-service/new` |
| helpdesk | list CTA | create | `/helpdesk/new` |
| purchase | list CTA | create | `/purchase/new` |
| quality | list CTA | create | `/quality/new` |
| reminders | list CTA | create | `/reminders/new` |
| services | list CTA | create | `/services/new` |
| fuel-energy | list CTA | create | `/fuel/new` |
| inspection | list CTA | create | `/inspection/new` |
| issues | list CTA | create | `/issues/new` |
| drivers-staff | list CTA | `AddEmployeeDrawer` | `/drivers/new` |
| lorry-receipts | list CTA | create | `/lorry-receipts/new` |
| subscriptions | list CTA | create | `/settings/subscriptions/new` |
| partner-programme | CTA | `ApplyPartnerDrawer` | **modal only** |
| financial-services | CTA | `ApplyFinancingDrawer` | **modal only** |

**Edit:** Most modules edit inline on detail page — **`/[id]` with edit mode** via `?mode=edit` (Level E) rather than `/[id]/edit` unless dedicated designer (invoice designer tab).

---

## J. Tab Strategy

| Category | Modules | Current | Recommended |
|----------|---------|---------|-------------|
| **Cluster tabs (cross-module)** | vehicles cluster, crm cluster, etc. | `ModuleClusterTabs` + `navigate(sibling)` | **Separate primary routes** per module; optional shared layout with tab nav reading pathname |
| **Intra-module tabs (local state)** | warehouse, crm, payroll, ledger, compliance | `useState` tab | **Nested route** `/module/[tab]` — sync URL on tab click |
| **Settings sections** | settings | `settingsTab` in activeView | `/settings/[tab]` — already maps cleanly |
| **Detail sub-tabs** | vehicle detail, trip execution | component state | `/[id]/[tab]` when shareable |
| **Reports** | reports | `useState` library/scheduled/custom | `/reports/[tab]` |
| **Ledger statements** | ledger | internal tabs in StatementsView | `/ledger/statements/[statementType]` |

**Rule:** Prefer **nested routes** for tabs users bookmark or share; keep **component state** for transient UI (e.g. maintenance parts inventory toggle).

---

## K. Filter / Search / Pagination

| State type | Store today | Recommendation |
|------------|-------------|----------------|
| Table search | component `useState` | `?q=` |
| Status filter | component `useState` | `?status=` |
| Date range | **global** `dateRange` in app-store | `?from=&to=` on reports/finance modules; keep global as default |
| Pagination | mostly client-side on fetched arrays | `?page=&pageSize=` when server pagination lands |
| Sort | column state | `?sort=&order=` |
| Fleet map vehicle | `selectedMapVehicleId` in store | `?vehicle=` |
| CRM pipeline stage | local | `?stage=` |
| Active company | `activeCompany` persisted | **Keep Zustand** — tenant context, not route |

Use `nuqs` or Next.js `useSearchParams` wrapper; **`navigateCompat` must preserve query strings** when switching modules is not intended.

---

## L. AppShell → `layout.tsx`

Move from `AppShell` into `(app)/layout.tsx`:

| AppShell concern | Target |
|------------------|--------|
| Session restore `useEffect` | layout client wrapper `AppSessionProvider` |
| Portal gate (driver/vendor/broker/superadmin) | **segment layouts** — `(portal-*)/layout.tsx` |
| Desktop chrome: Sidebar + Header | `(app)/layout.tsx` |
| AlertBanner | layout |
| NotificationPanel, AnnouncementsCenter | layout |
| CommandPalette | layout |
| ChatPanel + FAB | layout |
| MobileQuickAddFab | layout |
| IncomingCallOverlay | layout |
| CompanySwitcher, TourOverlay | layout |
| Main content area + max-width container | layout `children` slot |
| ErrorBoundary around module | **route-level** `error.tsx` per segment |
| Marketing auth gate | `(marketing)/layout.tsx` or middleware |

**Stay client-side:** entire shell is `"use client"` today — incremental path is client layout wrapping `{children}` with existing components, not RSC rewrite.

---

## M. Portal Layouts

| Portal | Shell file | Sub-views | Proposed route group |
|--------|------------|-----------|---------------------|
| **App (tenant)** | `app-shell.tsx` + Sidebar | 54 ModuleRouter modules | `(app)/*` |
| **Superadmin** | `superadmin-shell.tsx` | 20 `AdminSubView` items | `(portal-admin)/admin/[view]` |
| **Broker** | `broker-shell.tsx` | 18 `BrokerSubView` items | `(portal-broker)/broker/[view]` |
| **Vendor** | `vendor-shell.tsx` | 12 `VendorSubView` items | `(portal-vendor)/vendor/[view]` |
| **Driver field** | `driver-field/index.tsx` | 6 tabs | `(portal-driver)/field/[tab]` |
| **Warehouse field** | `warehouse-field/index.tsx` | 5 tabs | `(portal-warehouse)/field/[tab]` |

Portal layouts **do not use ModuleRouter** today — migration can proceed independently in **B0R-7** after core app modules.

---

## N. Auth at Route Level

Fastify + session cookie remains **security authority**. Frontend route auth is **UX-only**.

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A — Middleware only** | `middleware.ts` checks session cookie, redirects to `/login` | Central, fast | No per-module permissions; stale cookie edge cases |
| **B — Middleware + layout loaders** | Middleware for auth; client layout calls `authMe()` | Matches current `restoreSession()` | Double fetch unless cached |
| **C — Server Component guards** | `getSession()` in RSC layouts | Best SEO separation | Major refactor; most modules are client |

**Recommendation:** **Option B** for B0R-1…B0R-6 — mirror existing `restoreSession()` in `(app)/layout.tsx`. Add **`requireModule(moduleId)` client hook** for permission gating (reads `currentRole.permissions`).

**Portal routing:** subdomain → portal type can move to middleware (`admin.reanzly.com` → `(portal-admin)`).

---

## O. Module Permissions at Route Level

Source: `packages/shared/src/permissions.ts` (`hasModuleAccess`), sidebar `canAccess()`, broker `ProvisionedGate`.

| Behavior | Recommendation |
|----------|----------------|
| Unauthorized module | Redirect to `/app/dashboard` + toast `"Your role does not have access to this module."` |
| Cluster child without direct permission | Allow if parent permission (existing `MODULE_PARENT` logic) |
| Broker provisioned gate | Keep client gate until billing API exposes module entitlements |
| superadmin in app shell | Redirect app tenants to dashboard; only `roleId=superadmin` on admin portal |
| 404 vs unauthorized | **403 page** for known modules without permission; **404** for unknown paths |

---

## P. Server vs Client Components

| Layer | Strategy |
|-------|----------|
| Route `page.tsx` | Thin **Server Component** wrapper: metadata, `noindex`, optional session check |
| Module UI | **Keep `"use client"`** — 486 module files, Zustand, hooks |
| Data fetching | Incremental: server prefetch for list pages later; **no blocker** for routing migration |
| Layouts | Client layout initially; extract static chrome to RSC when stable |

**Pattern:**

```tsx
// app/(app)/trips/page.tsx
import { TripsModule } from "@/components/modules/trips";
export const metadata = { robots: { index: false } };
export default function TripsPage() {
  return <TripsModule />;
}
```

---

## Q. Frontend API Client

Routing migration **must not change** API paths. Central client: `packages/shared/src/api-client.ts`.

| Concern | Impact |
|---------|--------|
| `api({ domain: "warehouse" })` | Resolves `/api/v1/warehouse/*` — **unchanged** |
| Legacy `fetch("/api/trips")` in modules | **unchanged** — orthogonal to UI routes |
| BFF proxy | `apps/web/src/app/api/v1/[...path]/route.ts` — **unchanged** |
| Auth cookie | `credentials: "include"` — works regardless of page URL |

**Action:** None for B0R. Optional future: normalize module fetch calls through `api-client`.

---

## R. Zustand Reduction Plan

| State | Action |
|-------|--------|
| `activeView` | **Remove** after ModuleRouter decommission |
| `history` | **Remove** — replaced by browser history |
| `navigate`, `navigateDetail`, `navigateBack` | **Remove** — replaced by `navigateCompat` → Next router |
| `marketingView` | **Remove** — replaced by `/marketplace`, `/login` routes |
| `sidebarCollapsed`, `sidebarOrder` | **Keep** |
| `authUser`, `isAuthenticated`, `portal` | **Keep** (until auth RSC) |
| `chatOpen`, `activeConversationId` | **Keep** short-term; optional `/chat/[id]` sync |
| `commandOpen`, overlays | **Keep** |
| `dateRange`, `activeCompany` | **Keep** |
| `selectedMapVehicleId` | **Move to URL** `?vehicle=` then remove |
| `currentRole` | **Keep** |
| Module zustand stores (`crm/_store`, `warehouse-store`, etc.) | **Keep** — data, not navigation |

---

## S. Navigation Adapter

Implement **`navigateCompat(module, view?, id?, tab?)`** in `apps/web/src/lib/navigation-compat.ts`:

```typescript
// Pseudocode — not implemented in B0R-0
function moduleToPath(module: ModuleId, view?: ViewState["view"], id?: string, tab?: string): string {
  if (module === "financial-ops") module = "ledger";
  if (module === "app-store") module = "integrations";
  const base = MODULE_PATH[module];
  if (view === "create") return `${base}/new`;
  if (view === "detail" && id) return tab ? `${base}/${id}/${tab}` : `${base}/${id}`;
  if (tab && MODULE_TAB_ROUTES[module]) return `${base}/${tab}`;
  return base;
}
```

**Dual-write period:** adapter calls `router.push(path)` AND legacy `navigate()` until module marked migrated.

**Reverse sync:** `(app)/layout` reads pathname → optionally hydrates `activeView` for unmigrated modules.

---

## T. Backward Compatibility

| Consumer | Risk | Mitigation |
|----------|------|------------|
| **localStorage `reanzly-app`** | Auth persists; bookmark to `/dashboard` only | `/dashboard` 301 to `/app/dashboard`; session restore unchanged |
| **Dashboard widgets** | 47 deep links in `widget-registry.tsx` | Batch-update with adapter; widget link table in B0R-2 |
| **Notifications** | `n.link.module` + optional id | Extend notification schema with `href` over time |
| **Chat links** | `navigate("chat")` | `/app/chat` |
| **Command palette** | mixed navigate/navigateDetail | Single adapter entry point |
| **Role featured modules** | `role-features.ts` | Map featured modules to URLs |
| **Marketing demo CTAs** | `demoEnter(moduleId)` | `router.push(moduleToPath(moduleId))` after login |
| **External bookmarks** | None exist (URL always `/dashboard`) | N/A — greenfield URLs |
| **financial-ops / app-store aliases** | Permanent redirects | |

---

## U. Browser Behavior Test Plan

When migration starts (Playwright E2E):

| # | Test | Expected |
|---|------|----------|
| 1 | Navigate Sidebar → Trips | URL `/app/trips`, list renders |
| 2 | Row click → trip detail | URL `/app/trips/[id]`, back button returns to list |
| 3 | Quick Add → create trip | URL `/app/trips/new`, drawer or page opens |
| 4 | Cluster tab Vehicles → Inspection | URL changes to `/app/inspection` |
| 5 | Widget KPI click | Lands on correct module URL |
| 6 | Notification deep link | Opens module + detail |
| 7 | Command palette entity search | Navigates to detail URL |
| 8 | Unauthorized role direct URL | Redirect dashboard + toast |
| 9 | Session expired | Redirect `/login`, return URL preserved |
| 10 | Refresh on detail page | Same detail renders (SSR/hydration) |
| 11 | Warehouse tab switch | URL `/app/warehouse/inbound` |
| 12 | Settings tab | URL `/app/settings/billing` |
| 13 | Portal broker shell | Independent `/broker/overview` path |
| 14 | `/dashboard` legacy URL | 301 to new home |

---

## V. SEO / Indexing

| Route group | Indexing |
|-------------|----------|
| `/`, `/marketplace`, marketing pages | **indexable** — retain/enhance metadata |
| `/login`, `/signup` | **noindex** |
| `(app)/**`, all portals | **`robots: noindex, nofollow`** in layout metadata |
| `/api/**` | Already non-indexed |

Public directory (future): `/directory/[slug]` — indexable, separate from dashboard.

---

## W. Loading / Error Boundaries

| Scope | File | Notes |
|-------|------|-------|
| Global app | `(app)/loading.tsx` | Skeleton matching PageHeader + table |
| Module | `(app)/trips/loading.tsx` | Per-module optional |
| Error | `(app)/error.tsx` | Replace inline `ErrorBoundary` gradually |
| Module error | `(app)/trips/error.tsx` | Isolated failure |
| Not found | `(app)/[...not-found]/page.tsx` | Unknown module paths |

Existing: `ErrorBoundary` in AppShell around ModuleRouter — keep until route-level `error.tsx` covers migrated modules.

---

## X. Migration Order, Matrix, Risks & Decommission

### X.1 B0R Implementation Batches

| Batch | Phase | Modules / scope | Dependencies |
|-------|-------|-----------------|--------------|
| **B0R-1** | Foundation | `(app)/layout.tsx`, `navigateCompat`, `/app/dashboard`, middleware auth, `/dashboard` → redirect | None |
| **B0R-2** | Core ops | trips, fleet-map, vehicles, pod, lorry-receipts | B0R-1 |
| **B0R-3** | Fleet cluster | inspection, issues, maintenance, workshop, services, fuel-energy, compliance, quality | B0R-2 |
| **B0R-4** | Finance | invoice, rate-cards, expenses, approvals, payments, ledger (+ financial-ops redirect) | B0R-1 |
| **B0R-5** | People & docs | crm, customers, vendors, purchase, helpdesk, marketing, surveys, hr, drivers-staff, payroll, documents, document-studio, knowledge, reminders | B0R-1 |
| **B0R-6** | Platform | settings, chat, integrations, reports, operations-hub, field-service, planning, automation, system-design, access-matrix, subscriptions, partner-programme, financial-services | B0R-1 |
| **B0R-7** | Portals | SuperAdminShell, BrokerShell, VendorShell, DriverFieldApp, WarehouseFieldApp | B0R-1 |
| **B0R-8** | Decommission | Remove ModuleRouter, `activeView`, legacy `navigate()` | B0R-2…B0R-7 complete |

**Warehouse routing phase:** **B0R-6** (with platform) — tab routes only, no API wiring.

### X.2 Module Migration Matrix

| Module | Current Key | Proposed URL | Detail URL | Tab Strategy | Nav calls (approx) | Complexity | Phase |
|--------|-------------|--------------|------------|--------------|-------------------|------------|-------|
| dashboard | dashboard | `/app/dashboard` | — | — | 5 | LOW | B0R-1 |
| trips | trips | `/app/trips` | `/app/trips/[id]` | — | 15 | MEDIUM | B0R-2 |
| fleet-map | fleet-map | `/app/fleet-map` | — | `?vehicle=` | 5 | LOW | B0R-2 |
| vehicles | vehicles | `/app/vehicles` | `/app/vehicles/[id]` | detail tabs | 20 | HIGH | B0R-2 |
| pod | pod | `/app/pod` | `/app/pod/[id]` | — | 12 | MEDIUM | B0R-2 |
| lorry-receipts | lorry-receipts | `/app/lorry-receipts` | `/app/lorry-receipts/[id]` | — | 8 | LOW | B0R-2 |
| inspection | inspection | `/app/inspection` | `/app/inspection/[id]` | detail tab | 12 | MEDIUM | B0R-3 |
| issues | issues | `/app/issues` | `/app/issues/[id]` | — | 12 | MEDIUM | B0R-3 |
| maintenance | maintenance | `/app/maintenance` | `/app/maintenance/[id]` | parts toggle | 12 | MEDIUM | B0R-3 |
| workshop | workshop | `/app/workshop` | — | local | 3 | LOW | B0R-3 |
| services | services | `/app/services` | — | — | 5 | LOW | B0R-3 |
| fuel-energy | fuel-energy | `/app/fuel` | `/app/fuel/[id]` | — | 12 | MEDIUM | B0R-3 |
| compliance | compliance | `/app/compliance` | — | nested `[tab]` | 5 | LOW | B0R-3 |
| quality | quality | `/app/quality` | `/app/quality/[id]` | — | 8 | LOW | B0R-3 |
| invoice | invoice | `/app/invoice` | `/app/invoice/[id]` | designer | 18 | HIGH | B0R-4 |
| rate-cards | rate-cards | `/app/rate-cards` | `/app/rate-cards/[id]` | — | 10 | MEDIUM | B0R-4 |
| expenses | expenses | `/app/expenses` | `/app/expenses/[id]` | — | 10 | MEDIUM | B0R-4 |
| approvals | approvals | `/app/approvals` | `/app/approvals/[id]` | `?tab=decision` | 6 | LOW | B0R-4 |
| payments | payments | `/app/payments` | `/app/payments/[id]` | — | 10 | MEDIUM | B0R-4 |
| ledger | ledger | `/app/ledger` | — | `[view]` nested | 8 | HIGH | B0R-4 |
| financial-ops | financial-ops | `/app/ledger/treasury` | — | redirect | 3 | LOW | B0R-4 |
| crm | crm | `/app/crm` | — | `[tab]` nested | 2 | MEDIUM | B0R-5 |
| customers | customers | `/app/customers` | `/app/customers/[id]` | — | 12 | MEDIUM | B0R-5 |
| vendors | vendors | `/app/vendors` | `/app/vendors/[id]` | — | 10 | MEDIUM | B0R-5 |
| purchase | purchase | `/app/purchase` | `/app/purchase/[id]` | — | 8 | LOW | B0R-5 |
| helpdesk | helpdesk | `/app/helpdesk` | `/app/helpdesk/[id]` | — | 8 | LOW | B0R-5 |
| marketing | marketing | `/app/marketing` | `/app/marketing/[id]` | — | 4 | LOW | B0R-5 |
| surveys | surveys | `/app/surveys` | `/app/surveys/[id]` | — | 4 | LOW | B0R-5 |
| hr | hr | `/app/hr` | — | `[tab]` nested | 4 | MEDIUM | B0R-5 |
| drivers-staff | drivers-staff | `/app/drivers` | `/app/drivers/[id]` | — | 12 | MEDIUM | B0R-5 |
| payroll | payroll | `/app/payroll` | — | `[tab]` nested | 2 | MEDIUM | B0R-5 |
| documents | documents | `/app/documents` | `/app/documents/[id]` | — | 10 | MEDIUM | B0R-5 |
| document-studio | document-studio | `/app/document-studio` | `/app/document-studio/[id]` | — | 10 | MEDIUM | B0R-5 |
| knowledge | knowledge | `/app/knowledge` | `/app/knowledge/[id]` | — | 8 | LOW | B0R-5 |
| reminders | reminders | `/app/reminders` | — | — | 6 | LOW | B0R-5 |
| settings | settings | `/app/settings` | — | `[tab]` nested | 8 | MEDIUM | B0R-6 |
| chat | chat | `/app/chat` | `/app/chat/[id]` | — | 6 | MEDIUM | B0R-6 |
| integrations | integrations | `/app/integrations` | — | — | 4 | LOW | B0R-6 |
| app-store | app-store | `/app/integrations` | — | alias | 2 | LOW | B0R-6 |
| reports | reports | `/app/reports` | — | `[tab]` nested | 2 | MEDIUM | B0R-6 |
| operations-hub | operations-hub | `/app/operations` | drawer | local tabs | 8 | HIGH | B0R-6 |
| field-service | field-service | `/app/field-service` | `/app/field-service/[id]` | — | 8 | LOW | B0R-6 |
| planning | planning | `/app/planning` | — | `[tab]` | 2 | LOW | B0R-6 |
| automation | automation | `/app/automation` | — | — | 2 | LOW | B0R-6 |
| system-design | system-design | `/app/system-design` | — | — | 1 | LOW | B0R-6 |
| access-matrix | access-matrix | `/app/settings/access-matrix` | — | — | 1 | LOW | B0R-6 |
| subscriptions | subscriptions | `/app/settings/subscriptions` | `/app/settings/subscriptions/[id]` | — | 6 | LOW | B0R-6 |
| warehouse | warehouse | `/app/warehouse` | — | `[tab]` nested | 1 | MEDIUM | B0R-6 |
| partner-programme | partner-programme | `/app/partner-programme` | — | modal | 1 | LOW | B0R-6 |
| financial-services | financial-services | `/app/financial-services` | — | modal | 1 | LOW | B0R-6 |
| broker-console | broker-console | `/app/broker/console` | — | — | 2 | MEDIUM | B0R-6 |
| broker-marketplace | broker-marketplace | `/app/broker/marketplace` | — | — | 4 | MEDIUM | B0R-6 |
| broker-settlements | broker-settlements | `/app/broker/settlements` | — | — | 1 | LOW | B0R-6 |
| superadmin | superadmin | `/admin/[view]` | — | portal nested | 5 | HIGH | B0R-7 |
| driver-field | — | `/field/driver/[tab]` | — | local | 0 | MEDIUM | B0R-7 |
| warehouse-field | — | `/field/warehouse/[tab]` | — | local | 0 | LOW | B0R-7 |
| vendor portal | — | `/vendor/[view]` | — | 12 views | 0 | MEDIUM | B0R-7 |
| broker portal | — | `/broker/[view]` | — | 18 views | 0 | HIGH | B0R-7 |

### X.3 Risk Matrix

| Module / area | Risk | Rationale |
|---------------|------|-----------|
| dashboard widgets | **HIGH** | 47 navigation calls, broad cross-module surface |
| vehicles + cluster | **HIGH** | 9 sibling modules, cross-links to drivers/trips |
| invoice + document-studio | **HIGH** | Cross-link from invoice detail to studio |
| ledger + financial-ops | **HIGH** | Alias + 10 sub-views + localStorage stores |
| trips execution router | **MEDIUM** | Conditional detail component by status |
| operations-hub | **MEDIUM** | Drawer-based task detail |
| superadmin dual shell | **MEDIUM** | Two entry paths |
| broker dual shell | **MEDIUM** | 18 local views vs 3 ModuleRouter modules |
| warehouse | **LOW** (routing) | Tabs only; mock data; API already extracted |
| partner-programme, financial-services | **LOW** | Modal-only create |
| reminders, workshop, system-design | **LOW** | Fewnav dependencies |
| Portals (vendor/driver) | **MEDIUM** | Separate shells, no navigate() today |

### X.4 Test Strategy

- **Unit:** `moduleToPath()` / `pathToModule()` round-trip tests for all 54 ModuleIds
- **Integration:** Vitest + mock router for `navigateCompat` dual-write
- **E2E (Playwright):** Section U checklist — run per batch before merge
- **Parity:** Extend `pilot-parity.test.ts` pattern for route ↔ activeView sync during coexistence
- **Regression:** Existing 66+ API tests unaffected; add `apps/web/src/lib/__tests__/routing-compat.test.ts`

### X.5 No Big-Bang Rule

1. **Every batch** ships with ModuleRouter still mounted as fallback for unmigrated modules.
2. **`navigateCompat`** dual-writes URL + Zustand until batch sign-off.
3. **Feature flag** `NEXT_PUBLIC_ROUTING_MIGRATION=1` enables adapter per environment.
4. **Sidebar** uses adapter first; unmigrated modules still work via Zustand-only path.
5. **No removal** of `router.tsx` until B0R-8 criteria met.

### X.6 ModuleRouter Decommission Criteria

Remove `ModuleRouter`, `activeView`, and store `navigate()` when **all** are true:

- [ ] 100% of `ModuleId` values have Next.js `page.tsx` entry points
- [ ] ≥95% of `navigate(` / `navigateDetail(` call sites use `navigateCompat` or direct `router.push`
- [ ] Playwright E2E suite green for all 14 browser behavior tests
- [ ] No production feature flag rollback for 2 weeks
- [ ] Portal shells migrated to route groups
- [ ] Widget + notification links emit URLs not module ids
- [ ] `/dashboard` redirect in place with analytics confirming traffic on new paths

**Target phase:** **B0R-8** (estimated after B0R-1…B0R-7).

---

## Appendix: Current vs Target (Quick Reference)

```
TODAY:
  Browser URL: /dashboard (always)
  State: Zustand activeView { module, view, id, tab }
  Render: AppShell → ModuleRouter → Module

TARGET:
  Browser URL: /app/trips/TX-123
  State: Next.js params + searchParams (+ Zustand for data/overlays)
  Render: (app)/layout → trips/[id]/page → TripsModule (detail mode)
  Adapter: navigateCompat bridges during migration
```

---

*End of B0R-0 audit document.*

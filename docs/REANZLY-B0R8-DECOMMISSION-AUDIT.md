# Reanzly B0R-8A — Routing Decommission Readiness Audit

**Audit date:** 2026-09-02  
**Auditor mode:** Read-only decommission readiness audit (no code changes)  
**Repository:** `d:\Reanzly`  
**Branch:** `main`  
**Git HEAD:** `b34ec80eb55e09fbb6551956dc1bdf0f51533250`  
**Working tree:** 2 untracked log files (`apps/web/b0r7-playwright*.log`)  
**Prerequisites read:** `REANZLY-NEXTJS-ROUTING-MIGRATION-AUDIT.md`, `REANZLY-B0R1` through `REANZLY-B0R7` verification reports

---

## A. Pre-flight baseline

| Item | Value |
|------|-------|
| Branch | `main` |
| HEAD | `b34ec80eb55e09fbb6551956dc1bdf0f51533250` |
| Node | v24.14.1 |
| npm | 11.11.0 |
| `npm ci` | **PASS** |
| `npm run typecheck` | **PASS** (0 errors) |
| `npm run lint` | **PASS** (4 pre-existing cosmetic warnings) |
| `npm test` (Vitest) | **121/121 PASS** |
| `npm run build:web` | **PASS** — 119 `page.tsx` under `(app)/app/*`, portals `/admin`, `/broker`, `/vendor`, `/field/*` |
| `npm run build:api` | **PASS** |
| Playwright (`npx playwright test`, flag ON) | **213 passed, 38 skipped, 3 failed** (22.6m) |

**Playwright failures (this audit run only):**

| # | Test | Failure mode |
|---|------|--------------|
| 21 | `/app` index → `/app/dashboard` | Session lost mid-suite; redirected to `/login?returnTo=...` |
| 22 | robots noindex on `/app/dashboard` | `ERR_CONNECTION_REFUSED` — dev server on `:3099` died late in run |
| 23 | legacy `/dashboard` 307 | Same connection refused |

Skipped cases (38) are predominantly **detail deep-link** tests gated on mock/DB entity IDs (trips, POD, LR, inspection, etc.) — same pattern documented in B0R-2…B0R-6 reports. B0R-7 reported **44 PASS / 1 SKIP** on a clean run.

**Pre-flight verdict:** Build + unit tests green. Playwright **not fully green** in this environment (infra/session flake at end of 22-minute run). Prior B0R-7 verification is the best available E2E evidence.

---

## B. ModuleId reconciliation (53 vs 54)

### B.1 Exact union count

`ModuleId` is defined in `apps/web/src/lib/store/app-store.ts` (lines 34–90).

| Source | Count |
|--------|-------|
| `ModuleId` union members | **54** |
| `ALL_MODULE_IDS` in `module-paths.ts` | **54** |
| `ModuleRouter` `switch` cases (excl. `default`) | **54** |
| `MIGRATED_MODULES` in `routing-config.ts` | **54** |
| `MODULE_BASE_PATH` keys | **54** |

**Reconciliation of “53 vs 54”:** B0R-7 reports cited **53 migrated desktop + superadmin** by treating **`financial-ops`** and **`app-store`** as *alias-only* (not separate migration surfaces). They remain **full union members** (permissions, widgets, `ModuleRouter` cases) but map to canonical URLs of sibling modules. The union is **54**; unique list-level URL destinations are **52**.

### B.2 Canonical destinations (52 unique list bases)

All under `/app/*` except `superadmin` → `/admin`:

`dashboard`, `operations`, `trips`, `fleet-map`, `vehicles`, `lorry-receipts`, `invoice`, `expenses`, `payments`, `customers`, `vendors`, `drivers`, `inspection`, `issues`, `maintenance`, `services`, `fuel`, `reminders`, `documents`, `reports`, `settings`, `automation`, `system-design`, `pod`, `rate-cards`, `warehouse`, `compliance`, `payroll`, `workshop`, `settings/access-matrix`, `chat`, `crm`, `hr`, `ledger`, `broker/console`, `broker/marketplace`, `broker/settlements`, `document-studio`, `integrations`, `helpdesk`, `field-service`, `approvals`, `knowledge`, `planning`, `purchase`, `quality`, `settings/subscriptions`, `surveys`, `marketing`, `partner-programme`, `financial-services`, plus portal `superadmin` → `/admin`.

### B.3 Aliases (verified)

| ModuleId | Resolved target | `navigate()` rewrite | `moduleToPath` | `ModuleRouter` case | Redirect route |
|----------|-----------------|----------------------|----------------|---------------------|----------------|
| `financial-ops` | `ledger` + tab `treasury-ops` | Yes → `ledger` in `app-store.ts:640` | `/app/ledger/treasury` | `LedgerModule` | `(app)/app/financial-ops/page.tsx` → treasury path |
| `app-store` | `integrations` | No (path alias only) | `/app/integrations` | `IntegrationsModule` | `(app)/app/app-store/page.tsx` → integrations |
| `drivers-staff` | slug `drivers` | No | `/app/drivers` | `DriversStaffModule` | — |

`resolveModuleAlias()` in `module-paths.ts:161–165` handles `financial-ops` → `ledger` and `app-store` → `integrations`.

### B.4 Unexplained ModuleIds

**0.** Every union member has: `MODULE_BASE_PATH`, `ModuleRouter` case, App Router `page.tsx`(s) (or portal redirect), and `MIGRATED_MODULES` entry when flag ON.

---

## C. ModuleRouter forensic inventory

| Item | Detail |
|------|--------|
| **File** | `apps/web/src/components/modules/router.tsx` (241 lines) |
| **Export** | `ModuleRouter()` |
| **Switch cases** | **54** explicit + `default` → `PlaceholderModule` |
| **Cluster config** | 8 `CLUSTERS` arrays → `CLUSTER_BY_MODULE` map (9 fleet, 2 finance, 5 settings-platform, 7 CRM, 3 HR, 3 ops, 2 expenses, 4 documents) |
| **ProvisionedGate** | `broker-console`, `broker-marketplace`, `broker-settlements` |

### C.1 Consumers (production)

| File | Role |
|------|------|
| `components/layout/app-shell.tsx:159` | **Primary mount** — legacy SPA desktop portal |
| `components/marketing/real-data.ts:33` | Comment reference only |
| `app/dashboard/page.tsx`, `app-desktop-shell.tsx` | Comments / contrast with `{children}` |
| `app/(app)/app/[...slug]/page.tsx` | Comment — unknown paths use `not-found`, not ModuleRouter |

### C.2 Production dependency with `NEXT_PUBLIC_ROUTING_MIGRATION=1`

| Path | ModuleRouter required? |
|------|------------------------|
| Normal tenant nav `/app/*` | **NO** — `AppRouteShell` → `AppDesktopShell` → route `page.tsx` → module component |
| `/dashboard` (no `legacy=1`) | **NO** — server redirect to `/app/dashboard` |
| `/dashboard?legacy=1` | **YES** — `LegacyDashboardClient` → `AppShell` → `ModuleRouter` |
| `/app/superadmin` (flag OFF branch) | **YES** — redirects to `/dashboard?legacy=1` |
| `NEXT_PUBLIC_ROUTING_MIGRATION=0` | **YES** — full SPA at `/dashboard` |

**Flag ON normal-nav verdict:** ModuleRouter is **rollback-only**, not on the hot path for tenant desktop navigation.

---

## D. `/dashboard` forensic audit

| # | Caller / surface | Classification | Notes |
|---|------------------|----------------|-------|
| D1 | `app/dashboard/page.tsx` | **A** — redirect gateway | Flag ON → `redirect(DASHBOARD_ROUTE)` unless `?legacy=1` |
| D2 | `app/dashboard/legacy-client.tsx` | **B** — legacy SPA client | Renders `AppShell` |
| D3 | `components/layout/app-shell.tsx` | **B** — legacy SPA shell | Full ModuleRouter path |
| D4 | `components/shared/module-cluster-tabs.tsx:44` | **C** — unmigrated fallback | `router.push("/dashboard?legacy=1")` when tab not migrated (dead branch today — all cluster members migrated) |
| D5 | `app/(app)/app/superadmin/page.tsx:10` | **C** — migration escape | Flag OFF → `/dashboard?legacy=1` |
| D6 | `components/auth/login-screen.tsx:141` | **D** — login landing | Default landing `/dashboard` when flag OFF; `/app/dashboard` when ON |
| D7 | `lib/navigation/return-to.ts:86` | **D** — returnTo normalization | Maps legacy `/dashboard` → `DASHBOARD_ROUTE` |
| D8 | E2E specs (foundation, b0r7) | **E** — test fixtures | Portal redirect cases #251–252 |

**Classifications:** A=redirect, B=legacy render, C=compat escape, D=auth/returnTo, E=test-only.

**Production string references** (`'/dashboard'` in `apps/web/src`): **4 files** — `login-screen.tsx`, `return-to.ts`, `module-cluster-tabs.tsx`, `superadmin/page.tsx`.

---

## E. `NEXT_PUBLIC_ROUTING_MIGRATION` usage audit

| File | Usage |
|------|-------|
| `lib/navigation/routing-config.ts` | `isRoutingMigrationEnabled()` — `=== "1"` or `=== "true"` |
| `app/dashboard/page.tsx` | Gate redirect vs legacy client |
| `app/(app)/app/superadmin/page.tsx` | Gate `/admin` vs `/dashboard?legacy=1` |
| `playwright.config.ts` | Defaults `"1"` for E2E webServer env |
| `e2e/routing-b0r7.spec.ts`, `routing-foundation.spec.ts` | Flag ON/OFF describe blocks |
| `lib/__tests__/routing-compat.test.ts` | Unit tests stub env |
| `.env.example` | Commented example |
| Docs (B0R-1, B0R-7, B0R-0) | Architecture references |

**Production runtime references:** **4** (`routing-config.ts`, `dashboard/page.tsx`, `superadmin/page.tsx`, plus build-time inlining via Next.js for client bundles that import `isRoutingMigrationEnabled`).

**Decommission action:** Remove flag after soak → always migrate; keep **one release** with flag default ON before deletion.

---

## F. `activeView` complete inventory

**Counts (production / tests):**

| Metric | Production | Tests |
|--------|------------|-------|
| `activeView` line matches | **192** | **14** |
| Files | **63** | **1** (`routing-compat.test.ts`) |

### F.1 Classification

| Class | Description | Files (production) |
|-------|-------------|-------------------|
| **A** | URL-primary via `ModuleRouteState` + `resolveModuleView(route, activeView, module)` | **40** module `index.tsx` files (trips, vehicles, …, crm) |
| **B** | URL→Zustand sync (`useActiveViewSync`) | `use-active-view-sync.ts`, wired in `app-route-shell.tsx` |
| **C** | Dual-write target (`syncActiveView` / `navigateCompat`) | `navigate-compat.ts`, `app-store.ts` |
| **D** | Chrome / UX only (not routing authority) | `app-shell.tsx` (chat FAB), `app-desktop-shell.tsx` (`data-e2e-active-module`), `command-palette.tsx` (recents seed), `sidebar.tsx` (active highlight) |
| **E** | Legacy-only (`ModuleRouter`, flag OFF `/dashboard`) | `router.tsx`, `app-shell.tsx` |

### F.2 Module `index.tsx` files still reading `activeView` (Class A/C — **blockers**)

All **40** migrated modules use `resolveModuleView` with `activeView` fallback:  
`trips`, `vehicles`, `fleet-map`, `pod`, `lorry-receipts`, `inspection`, `issues`, `maintenance`, `workshop`, `services`, `fuel-energy`, `compliance`, `quality`, `invoice`, `rate-cards`, `expenses`, `approvals`, `payments`, `ledger`, `crm`, `customers`, `vendors`, `purchase`, `helpdesk`, `marketing`, `surveys`, `hr`, `drivers-staff`, `payroll`, `documents`, `document-studio`, `knowledge`, `reminders`, `warehouse`, `reports`, `operations-hub`, `field-service`, `planning`, `settings`, `chat`, `subscriptions`.

### F.3 Shared layouts (Class D/C)

| File | Usage |
|------|-------|
| `shared/page-header.tsx` | `activeView.breadcrumb`, `useMigratedNavBack(activeView.module)` |
| `shared/detail-layout.tsx` | Same pattern |
| `shared/*-cluster-layout.tsx` (4) | Tab highlight from `activeView.module` |
| `ledger/treasury-ops.tsx` | Tab state vs `activeView` |

### F.4 Portal shells (local state — not `activeView`)

`broker-shell.tsx`, `vendor-shell.tsx`, `superadmin-shell.tsx` reference `activeView` only for **cross-links** into desktop modules (2 refs each approx.) — portal primary nav uses URL via `use-portal-navigation.ts`.

---

## G. `ViewState` field inventory

```typescript
interface ViewState {
  module: ModuleId;
  view: "list" | "detail" | "create" | "edit";
  id?: string;
  tab?: string;
  settingsTab?: SettingsTab;
  breadcrumb: { label: string; module?: ModuleId; id?: string }[];
}
```

| Field | Replacement source (post-decommission) | Still needed during B0R-8B? |
|-------|----------------------------------------|----------------------------|
| `module` | `usePathname()` + `pathToModule()` or `useParams()` | Yes — dual-write |
| `view` | Path segments (`/new`, `/[id]`) | Yes |
| `id` | `params.*Id` dynamic segments | Yes |
| `tab` | Nested segment or `searchParams` | Yes |
| `settingsTab` | `/app/settings/[tab]` segment | Merge into `tab` |
| `breadcrumb` | Derive from pathname + `MODULE_BASE_PATH` labels | Recompute client-side; drop store field |

`history: ViewState[]` (max 20) → **browser `history`** + optional session recents in command palette.

---

## H. `history` / `navigateBack` inventory

| Symbol | Production files | Production line matches |
|--------|------------------|-------------------------|
| `history` (store stack) | `app-store.ts`, `command-palette.tsx` | **~8** (store CRUD + palette recents) |
| `navigateBack()` | `app-store.ts`, `use-migrated-nav-back.ts`, `campaign-detail.tsx` | **4** |

| Caller | Behavior |
|--------|----------|
| `app-store.navigate` / `navigateDetail` | Pushes prior `activeView` onto `history` (max 20) |
| `app-store.navigateBack` | Pops stack or resets to `DEFAULT_VIEW` |
| `use-migrated-nav-back.ts` | Migrated → `router.push(moduleToPath(module))`; else `navigateBack()` |
| `campaign-detail.tsx` | Direct `navigateBack()` (2 calls) — **legacy path** |
| `command-palette.tsx` | Reads `history` for “Recent” modules (3 entries) |

**Decommission:** Remove store `history` after command palette uses URL/session recents.

---

## I. `navigate()` exact production callers (exclude compat / tests)

**Total `navigate(` production:** **113** lines / **35** files (includes compat internals and comments).

### I.1 Direct `useAppStore().navigate` (bypass compat) — **must migrate in B0R-8B**

| File | Calls | Notes |
|------|-------|-------|
| `dashboard/widget-registry.tsx` | **~28** widget fns | Still `useAppStore().navigate`; others use `useWidgetNavigation()` |
| `layout/header.tsx` (`MobileQuickAddFab`) | **1** per action | `navigate(a.module, a.view)` — header main uses `navigateCompat` |
| `drivers-staff/driver-detail.tsx` | **1+** | Store `navigate` for chat cross-link |
| `marketing/campaign-detail.tsx` | **1** | Store `navigate` |
| `layout/command-palette.tsx` | **1** | Dead branch: `navigate()` when `!isModuleMigrated` |
| `shared/module-cluster-tabs.tsx` | **1** | `legacyNavigate()` dead branch |

**Header main chrome** (`header.tsx:299`) uses `useNavigateCompat` — **not** a blocker.

### I.2 Routed through compat (OK for decommission prep)

`sidebar.tsx` (`navigateCompat`), `notification-panel.tsx` (hybrid), `alert-banner.tsx`, `announcements-center.tsx`, `chat-panel.tsx`, `role-features.ts`, `smart-insights-widget.tsx`, app-store cards, **26** module `index.tsx` files via `useNavigateCompat` / `useModuleNavigation`.

### I.3 Imperative static

| File | Call |
|------|------|
| `app-store.ts` (`demoEnter`) | `navigateCompatStatic(moduleId, "list")` |

**Direct production `navigate()` call sites to fix:** **~33** (widget-registry bulk + 5 other files).

---

## J. `navigateDetail()` exact production callers

**Total `navigateDetail(` production:** **114** lines / **46** files.

| Pattern | Files | Status |
|---------|-------|--------|
| `useModuleNavigation().navigateDetail` | **26** list/detail modules | Routes through compat when migrated ✓ |
| `useNavigateCompat().navigateDetailCompat` | `invoice-detail`, `vendor-detail`, widgets (partial) | ✓ |
| `useAppStore().navigateDetail` direct | `widget-registry` (**2**), `vehicle-summary-panel`, `vehicles/tabs/overview`, `vehicle-onboarding` | **Blocker** |
| `useAppStore.getState().navigateDetail` | `trips/trip-detail.tsx:705` | **Blocker** (invoice link) |

---

## K. `navigateBack()` inventory

| File | Calls | Migration status |
|------|-------|------------------|
| `lib/store/app-store.ts` | Definition | Remove with store API |
| `lib/navigation/use-migrated-nav-back.ts` | Fallback invoke | Keep hook; drop legacy branch |
| `marketing/campaign-detail.tsx` | **2** | Should use `router.back()` or list path |

**Production invocations:** **2** (campaign-detail only; hook wraps store method).

---

## L. Compatibility navigation inventory

| Artifact | Location | REMOVE vs SIMPLIFY |
|----------|----------|---------------------|
| `navigateCompat` / `useNavigateCompat` | `navigate-compat.ts` | **SIMPLIFY →** thin `router.push(moduleToPath(...))` wrapper, then **REMOVE** |
| `useModuleNavigation` | `navigate-compat.ts` | **REMOVE** — single nav API |
| `navigateCompatStatic` | `navigate-compat.ts`, `demoEnter` | **REMOVE** after `demoEnter` uses router |
| `MIGRATED_MODULES` / `isModuleMigrated` | `routing-config.ts` | **REMOVE** when 100% URL-only |
| `syncActiveView` | `app-store.ts` | **REMOVE** |
| `useActiveViewSync` | `use-active-view-sync.ts` | **REMOVE** |
| `resolveModuleView` | `module-route-state.ts` | **SIMPLIFY →** route props only from pages |
| `ModulePageShell` | `module-page-shell.tsx` | **KEEP** (permission gate) |
| `use-migrated-nav-back` | `use-migrated-nav-back.ts` | **SIMPLIFY →** `useRouter().back()` or list path |
| `module-cluster-tabs` legacy branch | `module-cluster-tabs.tsx` | **REMOVE** `/dashboard?legacy=1` branch |
| `command-palette` dual `go()` | `command-palette.tsx` | **SIMPLIFY** — compat only |
| `notification-panel` dual nav | `notification-panel.tsx` | **SIMPLIFY** |
| `widget-registry` `useWidgetNavigation` | `widget-registry.tsx` | **SIMPLIFY then REMOVE** |

---

## M. Design — final navigation API recommendation

**Target (post B0R-8B):**

```typescript
// apps/web/src/lib/navigation/navigate.ts (future)
import { useRouter } from "next/navigation";
import { moduleToPath } from "./module-paths";

export function useAppNavigation() {
  const router = useRouter();
  return {
    goToModule(module, view?, id?, tab?) {
      router.push(moduleToPath(module, view, id, tab));
    },
    goBack(module) {
      router.push(moduleToPath(module));
    },
  };
}
```

- **Single entry point** for imperative nav; no Zustand navigation slice.
- **Pages** pass `ModuleRouteState` from `params` / `searchParams` into module components.
- **Breadcrumbs** derived from pathname, not `activeView.breadcrumb`.
- **Notifications** should carry `href` (future); until then `moduleToPath(n.link.module, …)`.

---

## N. `useActiveViewSync` audit

| Item | Value |
|------|-------|
| File | `lib/navigation/use-active-view-sync.ts` (62 lines) |
| Mounted from | `AppRouteShell` → `ActiveViewSyncBridge` (Suspense) |
| Production references | **4** lines / **3** files |
| Test references | **0** |
| Loop guard | Compares parsed path vs `activeView`; `lastSyncedPath` ref |
| Scope | Only `/app/*` paths where `isModuleMigrated` |

**Decommission:** Delete hook + bridge when `activeView` removed.

---

## O. `syncActiveView` audit

| Item | Value |
|------|-------|
| Definition | `app-store.ts:678–693` |
| Callers | `navigate-compat.ts` (3), `use-active-view-sync.ts` (1) |
| Production line matches | **11** |
| Test line matches | **6** (`routing-compat.test.ts`) |
| Behavior | Sets `activeView` **without** pushing `history` stack |

**Decommission:** Remove with `activeView` field.

---

## P. `ModuleRouteState` / `ModulePageShell` audit

### P.1 `ModuleRouteState`

| Item | Value |
|------|-------|
| File | `lib/navigation/module-route-state.ts` |
| Interface fields | `module`, `view`, `id?`, `tab?` |
| `resolveModuleView` | Falls back to `activeView` when `route` undefined — **coexistence shim** |
| Production references | **85** lines / **41** files |

### P.2 `ModulePageShell`

| Item | Value |
|------|-------|
| File | `lib/navigation/module-page-shell.tsx` (27 lines) |
| Role | `useModuleRouteGuard` + loading spinner |
| Production references | **350** lines / **114** `page.tsx` files |
| Tests | **0** |

**Decommission:** **Keep** `ModulePageShell` + guards; **remove** `resolveModuleView` fallback to `activeView`; pages always pass explicit `route` prop.

---

## Q. Module component route state matrix

| Module | `route` prop | `resolveModuleView` + `activeView` fallback | App Router pages | Flag ON list nav |
|--------|--------------|-----------------------------------------------|------------------|------------------|
| All 40 business modules | Optional | **Yes** | Yes | URL |
| `dashboard` | No (list only) | No | `/app/dashboard` | URL |
| `fleet-map` | Partial (`?vehicle=`) | Yes | `/app/fleet-map` | URL |
| Broker desktop trio | Via `ModulePageShell` | N/A | `/app/broker/*` | URL |
| `partner-programme`, `financial-services` | Shell only | N/A | page.tsx | URL |
| `automation`, `system-design`, `integrations`, `access-matrix` | Shell | N/A | page.tsx | URL |
| Portal shells | URL via `use-portal-navigation` | No `activeView` for primary nav | `/admin`, `/broker`, etc. | URL |

**Matrix verdict:** Routing **works** flag ON via URL; **state authority** still duplicated in Zustand for all CRUD modules.

---

## R. `settingsTab` cleanup

| Item | Detail |
|------|--------|
| `SettingsTab` type | 11 values in `app-store.ts` |
| `setSettingsTab()` | `app-store.ts:694` — mutates `activeView` |
| Callers | `alert-banner.tsx`, `announcements-center.tsx` |
| `settingsTab` in `ViewState` | Set only via `setSettingsTab` / `pathToModule` parse |
| URL mapping | `/app/settings/[tab]` — **already primary** flag ON |

**Cleanup:** Replace `setSettingsTab(tab)` with `navigateCompat("settings", "list", undefined, tab)` then `router.push`; remove `settingsTab` from `ViewState`.

**Production `settingsTab` references:** **6** lines / **2** production files (+ 1 test).

---

## S. Portal local state cleanup

| Shell | Pre-B0R-7 state | Post-B0R-7 | Local state remaining |
|-------|-------------------|------------|------------------------|
| `SuperAdminShell` | `AdminSubView` useState | `/admin/[view]` | Drawer/dialog UI only |
| `BrokerShell` | `BrokerSubView` | `/broker/[view]` | Same |
| `VendorShell` | `VendorSubView` | `/vendor/[view]` | Same |
| `DriverFieldApp` | tab `useState` | `/field/driver/[tab]` | Capture overlays |
| `WarehouseFieldApp` | tab `useState` | `/field/warehouse/[tab]` | Same |

**Decommission impact:** Portal shells **do not** block ModuleRouter removal.

---

## T. Portal store state audit (identity vs navigation)

| State | Purpose | Keep? |
|-------|---------|-------|
| `portal` | Product surface gate | **KEEP** |
| `authUser`, `isAuthenticated` | Session | **KEEP** |
| `currentRole` | Permissions | **KEEP** |
| `activeView`, `history` | Legacy navigation | **REMOVE** |
| `marketingView` | Public site mode | **REMOVE** (route `/marketplace`, `/login`) |
| `sidebarCollapsed`, `sidebarOrder` | Chrome | **KEEP** |
| `chatOpen`, `activeConversationId` | Overlay | **KEEP** (optional URL sync later) |
| `commandOpen`, overlays | UI | **KEEP** |
| `dateRange`, `activeCompany` | Data context | **KEEP** |
| `selectedMapVehicleId` | Fleet map focus | **MOVE** to `?vehicle=` (partially done) |

---

## U. `marketingView` audit

| Item | Value |
|------|-------|
| Type | `"landing" \| "auth" \| "marketplace"` |
| Persisted | **No** |
| Production references | **19** lines / **8** files |
| Route exists | `/marketplace` (`app/marketplace/page.tsx`) — **parallel** to Zustand flag |
| `AppShell` gate | `marketingView === "marketplace"` → `<MarketplaceSite />` |

**Cleanup:** Use `/marketplace` route exclusively; drop `marketingView` / `setMarketingView` from store; `AppShell` unauthenticated path shrinks to redirect-only or marketing layout group.

---

## V. AppShell vs AppDesktopShell / AppRouteShell / PortalRouteShell

| Component | Path | Renders ModuleRouter? | Role post-migration |
|-----------|------|----------------------|---------------------|
| `AppShell` | `/dashboard?legacy=1`, flag OFF | **Yes** | **DELETE** after rollback window |
| `AppDesktopShell` | `/app/*` | **No** — `{children}` | **KEEP** as `(app)/layout` chrome |
| `AppRouteShell` | `(app)/layout.tsx` client wrapper | No | **KEEP** — auth + portal redirect + `useActiveViewSync` (latter removable) |
| `PortalRouteShell` | Portal layout groups | No | **KEEP** |

---

## W. Cluster router vs `ModuleClusterTabs`

| Layer | Flag ON behavior | Flag OFF / legacy |
|-------|------------------|-------------------|
| **App Router** | Cluster sibling modules have **separate URLs**; cluster layouts (`fleet-cluster-layout.tsx`, etc.) render tab strip | — |
| **`ModuleClusterTabs`** (in `router.tsx` clusters) | Used only inside **ModuleRouter** SPA path | `navigateCompat` per tab; unmigrated → `/dashboard?legacy=1` |
| **Sidebar** | Links to cluster **anchor** module only | Same |

**Decommission:** Remove `CLUSTERS` / `ModuleClusterTabs` from `router.tsx`; **keep** cluster layout components in `/app/*` routes.

---

## X. Breadcrumb audit

| Source | Mechanism | Post-decommission |
|--------|-----------|-------------------|
| `PageHeader` | Reads `activeView.breadcrumb` | Parse pathname |
| `DetailLayout` | Same | Same |
| `navigate()` | Sets single-level breadcrumb | Drop |
| `syncActiveView` | Single-level breadcrumb | Drop |

**Files:** `page-header.tsx`, `detail-layout.tsx` — both already use `navigateCompat` for crumb clicks.

---

## Y. Header / Sidebar / CommandPalette / widgets audit

| Surface | Navigation API | `activeView` use | Blocker? |
|---------|----------------|------------------|----------|
| **Sidebar** | `navigateCompat` | Active module highlight | No |
| **Header** (desktop) | `navigateCompat` | Minimal | No |
| **MobileQuickAddFab** | **Store `navigate`** | No | **Yes** |
| **CommandPalette** | Hybrid compat/store | Recents from `history` + `activeView` | **Partial** |
| **NotificationPanel** | Hybrid | No | Simplify |
| **AlertBanner** | `setSettingsTab` + module | No | settingsTab |
| **Widget registry** | Mixed `useWidgetNavigation` / store | No | **Yes** (~28 widgets) |
| **Smart insights widget** | Compat | No | No |

---

## Z. Portal switch / role switch audit

| Action | Mechanism | URL impact |
|--------|-----------|------------|
| Login landing | `resolvePostLoginRoute()` in `return-to.ts` | Canonical portal URL |
| `AppRouteShell` gate | Redirect non-tenant from `/app/*` | Portal landing |
| `PortalRouteShell` | Wrong portal → toast + redirect | Portal landing |
| Header role switch | `authSwitchRole` + **full page reload** | Re-login flow |
| `setPortal` | Zustand only | Used at login |

**Decommission:** No change required for portal switching; independent of ModuleRouter.

---

## AA. Legacy redirect inventory

| From | To | Permanent? |
|------|-----|------------|
| `/dashboard` (flag ON) | `/app/dashboard` | **Migration** — keep through soak, then simplify |
| `/app` | `/app/dashboard` | **KEEP** |
| `/app/financial-ops` | `/app/ledger/treasury` | **KEEP** (alias) |
| `/app/app-store` | `/app/integrations` | **KEEP** (alias) |
| `/app/superadmin` | `/admin` (flag ON) or `/dashboard?legacy=1` (OFF) | **KEEP** `/admin` only after flag removal |
| `return-to` `/dashboard` | `DASHBOARD_ROUTE` | **KEEP** |

---

## AB. Test dependency audit

| Suite | Depends on legacy nav? | Decommission work |
|-------|------------------------|-------------------|
| `routing-compat.test.ts` | **Yes** — `navigate`, `syncActiveView`, `history` | Rewrite for URL-only |
| `module-paths.test.ts` | No | Keep |
| `return-to.test.ts`, `portal-paths.test.ts` | No | Keep |
| E2E `routing-*.spec.ts` | **No** — URL assertions | Remove flag OFF describe (#252 skip) |
| `activeView` E2E (#44 b0r2) | **Yes** — sync check | Replace with DOM/URL assertions |

**Vitest navigation-specific:** **12** tests in `routing-compat.test.ts`.

---

## AC. Playwright decommission readiness

| Metric | Value |
|--------|-------|
| Total tests | **254** |
| This audit run | **213 passed**, **38 skipped**, **3 failed** |
| B0R-7 reference | **44 PASS**, **1 SKIP** (portal suite) |
| Coverage | Foundation + B0R-2…7 URL nav, clusters, portals, auth, back/forward |
| Flag OFF case | **1 skipped** (#252) — required before removing rollback |

**Readiness:** E2E **architecture is sufficient** for decommission validation; this run **not green** due to session/server flake. Re-run required for sign-off.

**Skipped detail tests (38):** Environment/mock data — not routing regressions; document as **test-data blocker**, not decommission blocker.

---

## AD. Production rollback review

| Criterion (B0R-0) | Evidence in repo | Soak evidence |
|-------------------|------------------|---------------|
| 100% ModuleId pages | **Yes** — 119 `page.tsx` | N/A |
| ≥95% compat migration | **~85%** direct `navigate` migrated; widgets lag | N/A |
| Playwright green | B0R-7 yes; B0R-8A run partial | N/A |
| **2-week flag rollback soak** | Flag exists; OFF path preserved | **None recorded — do not fabricate** |
| Portal shells migrated | B0R-7 closed | N/A |
| Widget/notification URLs | Partial | N/A |
| `/dashboard` redirect | Implemented | **No analytics** |

**Production soak evidence:** **Not available in repository.** Rollback remains via `NEXT_PUBLIC_ROUTING_MIGRATION=0` + `/dashboard` SPA (verified in B0R-7 #252 skip test).

---

## AE. Dead code candidates (post B0R-8B)

| Candidate | Condition |
|-----------|-----------|
| `ModuleRouter` + `router.tsx` clusters | After flag removal + soak |
| `AppShell` desktop branch ModuleRouter path | After legacy `/dashboard` removed |
| `legacy-client.tsx` | After `/dashboard?legacy=1` removed |
| `activeView`, `history`, `navigate*` in store | After all callers migrated |
| `useActiveViewSync`, `syncActiveView` | Same |
| `MIGRATED_MODULES`, `isModuleMigrated` | Same |
| `module-cluster-tabs` legacy branch | Same |
| `setSettingsTab` | After settings URL nav |
| `marketingView` | After `/marketplace` is sole entry |
| `PlaceholderModule` default in ModuleRouter | Replace with App Router `not-found` only |

---

## AF. Final state design

```
UNAUTHENTICATED
  /, /login, /marketplace  → marketing layouts (no Zustand nav)

AUTHENTICATED TENANT
  /app/dashboard … /app/*  → AppRouteShell → AppDesktopShell → page.tsx → Module(route)

PORTALS
  /admin/*, /broker/*, /vendor/*, /field/*  → PortalRouteShell → shell

NO
  /dashboard SPA, ModuleRouter, activeView, history stack, migration flag
```

---

## AG. Final store design (KEEP vs REMOVE)

| Field / action | Decision |
|----------------|----------|
| `activeView`, `history` | **REMOVE** |
| `navigate`, `navigateDetail`, `navigateBack`, `syncActiveView`, `setSettingsTab` | **REMOVE** |
| `marketingView`, `setMarketingView` | **REMOVE** |
| `portal`, auth, role, company, overlays, sidebar | **KEEP** |
| Module data stores (`crm/_store`, etc.) | **KEEP** |

---

## AH. B0R-8B removal order (10 steps)

1. **Migrate remaining direct `navigate` call sites** — widget-registry (28), MobileQuickAddFab, trip-detail, vehicle panels, campaign-detail, driver-detail.
2. **Module components** — require `route` prop from pages; delete `resolveModuleView` `activeView` fallback.
3. **Remove `useActiveViewSync` + `syncActiveView`** — URL is sole authority.
4. **Breadcrumbs** — pathname-derived; drop `activeView.breadcrumb`.
5. **Command palette recents** — URL/session based; drop `history` reads.
6. **Replace `setSettingsTab`** with settings URL navigation.
7. **Marketing** — route-only `/marketplace`; remove `marketingView`.
8. **Delete compat layer** — `MIGRATED_MODULES`, `useNavigateCompat`, `useModuleNavigation`, dual branches.
9. **Remove ModuleRouter, legacy `/dashboard` client, `AppShell` ModuleRouter path** — after flag soak.
10. **Remove `NEXT_PUBLIC_ROUTING_MIGRATION`** and migration-only redirects; **keep** permanent alias redirects (`financial-ops`, `app-store`).

---

## AI. Rollback strategy after decommission

| Scenario | Mitigation |
|----------|------------|
| Post-removal production incident | **Git revert** + redeploy (no in-app SPA fallback) |
| Partial revert | Re-enable previous release artifact with flag ON |
| URL bookmarks | Permanent redirects cover aliases; `/dashboard` 301 must stay until analytics show zero traffic |

**Pre-decommission requirement:** Complete **documented** 2-week soak with flag ON before step 9.

---

## AJ. Decommission blockers table

| ID | Blocker | Severity | Evidence |
|----|---------|----------|----------|
| B1 | **40 module `index.tsx`** still fallback to `activeView` | HIGH | `resolveModuleView` grep |
| B2 | **~28 dashboard widgets** use store `navigate` directly | HIGH | `widget-registry.tsx` |
| B3 | **MobileQuickAddFab** store `navigate` | MEDIUM | `header.tsx:971` |
| B4 | **trip-detail** `getState().navigateDetail` | MEDIUM | `trip-detail.tsx:705` |
| B5 | **Vehicle/fleet** direct `navigateDetail` (3 files) | MEDIUM | fleet-map, vehicles |
| B6 | **campaign-detail** `navigateBack` / `navigate` | LOW | marketing module |
| B7 | **`setSettingsTab`** parallel API | LOW | alert-banner, announcements |
| B8 | **`marketingView`** vs `/marketplace` route | LOW | 8 files |
| B9 | **ModuleRouter + AppShell** required for flag OFF | MEDIUM | Rollback until soak complete |
| B10 | **`/dashboard?legacy=1`** escape hatch | LOW | cluster-tabs, superadmin |
| B11 | **Production soak evidence** | HIGH | None in repo |
| B12 | **Playwright sign-off** this audit | MEDIUM | 3 failures (flake) |

---

## AK. Remove / Keep matrix

| Component | B0R-8B action |
|-----------|---------------|
| `ModuleRouter`, `router.tsx` CLUSTERS | **REMOVE** |
| `AppShell` (full legacy) | **REMOVE** (keep minimal auth/marketing gate until marketing routes done) |
| `AppDesktopShell`, `AppRouteShell`, `PortalRouteShell` | **KEEP** |
| `ModulePageShell`, `useModuleRouteGuard` | **KEEP** |
| `module-paths.ts`, `pathToModule`, `moduleToPath` | **KEEP** |
| `navigate-compat.ts` | **REMOVE** (after caller migration) |
| `routing-config.ts` flag + `MIGRATED_MODULES` | **REMOVE** |
| `use-active-view-sync.ts` | **REMOVE** |
| Cluster layout components (`*-cluster-layout.tsx`) | **KEEP** |
| `ModuleClusterTabs` in router | **REMOVE** with ModuleRouter |
| Permanent alias redirects | **KEEP** |
| `/dashboard` → `/app/dashboard` | **KEEP** (then evaluate) |

---

## AL. Exact code counts (production vs tests)

| Pattern | Production lines | Production files | Test lines | Test files |
|---------|------------------|------------------|------------|------------|
| `activeView` | 192 | 63 | 14 | 1 |
| `navigate(` | 113 | 35 | 2 | 1 |
| `navigateDetail(` | 114 | 46 | 0 | 0 |
| `navigateBack(` | 4 | 2 | 0 | 0 |
| `syncActiveView` | 11 | 3 | 6 | 1 |
| `useActiveViewSync` | 4 | 3 | 0 | 0 |
| `navigateCompat` | 190 | 68 | 10 | 1 |
| `useNavigateCompat` | 168 | 83 | 0 | 0 |
| `useModuleNavigation` | 52 | 26 | 0 | 0 |
| `MIGRATED_MODULES` | 2 | 1 | 4 | 1 |
| `marketingView` | 19 | 8 | 0 | 0 |
| `settingsTab` | 6 | 2 | 1 | 1 |
| `ModuleRouter` | 9 | 7 | 0 | 0 |
| `ModulePageShell` | 350 | 114 | 0 | 0 |
| `ModuleRouteState` / `resolveModuleView` | 85 | 41 | 0 | 0 |
| `legacy=1` | 5 | 4 | 3 | 1 |
| `'/dashboard'` string | 4 | 4 | 1 | 1 |
| App Router `page.tsx` (tenant) | — | **119** | — | — |

---

## B0R-8A Executive Summary

```
REANZLY B0R-8A — DECOMMISSION AUDIT FINAL
Current HEAD: b34ec80eb55e09fbb6551956dc1bdf0f51533250
ModuleId union count: 54
Canonical destinations: 52 unique list-level URL bases (+ detail/create/tab variants)
Aliases: financial-ops→ledger/treasury; app-store→integrations; drivers-staff→/app/drivers slug
Unexplained ModuleIds: 0
ModuleRouter production normal-nav dependency: NONE (flag ON /app/*); YES only for /dashboard?legacy=1 or flag OFF
activeView production references: 192 lines / 63 files
Business-module activeView blockers: 40 module index.tsx using resolveModuleView fallback
navigate() direct production calls: ~33 (28 widget-registry + MobileQuickAddFab + campaign/driver-detail + dead branches)
navigateDetail() direct production calls: 6 (widget-registry×2, vehicle×3, trip-detail×1)
navigateBack() production calls: 2 (campaign-detail.tsx)
syncActiveView: 11 prod lines / 3 files (+ 6 test lines)
useActiveViewSync: 4 prod lines / 3 files (mounted from AppRouteShell)
Migration flag references: 4 production source files
MIGRATED_MODULES references: 1 prod file (+ tests); 54 members = full union
marketingView: 19 lines / 8 files — cleanup candidate; /marketplace route exists
settingsTab: 6 lines / 2 prod files — replace with URL tab
portal state: identity KEEP; navigation fields REMOVE
Legacy /dashboard references: 4 prod source files
legacy=1 references: 5 prod lines / 4 files
AppShell: legacy SPA + ModuleRouter — rollback only
ModulePageShell: 114 page wrappers — KEEP
ModuleRouteState: 41 files — simplify to route-only
Navigation helpers final recommendation: single useAppNavigation → router.push(moduleToPath)
Permanent redirects to keep: /app/financial-ops, /app/app-store, /app→dashboard, alias paths
Migration-only redirects to remove: /dashboard SPA render, /dashboard?legacy=1, flag-gated superadmin branch
Production soak evidence: NONE in repository (do not fabricate)
Decommission blockers: 12 (see AJ) — primary: activeView fallback, widget-registry, soak evidence
Recommended B0R-8B removal order: 10 steps (see AH)
Audit decision: NOT READY FOR B0R-8B
Audit document: docs/REANZLY-B0R8-DECOMMISSION-AUDIT.md
```

### Decision rationale

**NOT READY** — Migration **routing** is complete (54/54 modules, URL nav flag ON, ModuleRouter off hot path), but **decommission prerequisites** are unmet:

1. Zustand `activeView` remains the fallback rendering authority for all business modules.
2. Dashboard widget-registry and several chrome paths still call store `navigate` directly.
3. No documented production soak with migration flag ON.
4. Playwright pre-flight in this audit was not fully green (213/216 executed non-skip passed).

**B0R-8B may proceed** after: caller migration (AH step 1–2), recorded soak, and clean Playwright run.

---

*End of B0R-8A decommission audit.*

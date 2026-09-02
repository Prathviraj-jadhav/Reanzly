# Reanzly B0R-8PV — Final Decommission-Preparation Verification Report

**Date:** 2026-09-02  
**Starting HEAD:** `96e31bc604d21c0902585da3a3b4333a89573f46`  
**Current HEAD (post-fixes):** pending commit  
**Branch:** `main`  
**Scope:** B0R-8PV — final verification only (no B0R-8B deletions)

---

## A. Pre-flight baseline

| Item | Value |
|------|-------|
| Branch | `main` |
| Starting HEAD | `96e31bc604d21c0902585da3a3b4333a89573f46` |
| B0R-8P commit | **CONFIRMED** — `96e31bc refactor(routing): prepare legacy navigation decommission` |
| Untracked logs | `apps/web/b0r7-playwright*.log` — **untracked, not committed** |
| Working tree | `apps/web/tsconfig.json` reverted (removed erroneous `.next/dev/dev/types` include) |
| `npm ci` | **PASS** |
| `npm run typecheck` | **PASS** (after tsconfig revert + `.next` clean) |
| `npm run lint` | **PASS** |
| `npm test` (Vitest) | **122/122 PASS** (includes new `isActiveViewSyncEnabled` test) |
| `npm run build:web` | **PASS** |
| `npm run build:api` | **PASS** |

---

## B. `useAppNavigation()` API

Unchanged from B0R-8P. Exports: `useAppNavigation`, `buildModulePath`, `pushModulePath`, `useActiveModuleFromPath` in `lib/navigation/use-app-navigation.ts`.

---

## C. Widget registry migration

| Metric | B0R-8PV (flag ON normal path) |
|--------|----------------------------------|
| Direct `useAppStore().navigate` in widgets | **0** |
| Navigation | `useWidgetNavigation()` → `useAppNavigation` when migrated; legacy store branch when flag OFF |

---

## D. Mobile quick-add

`MobileQuickAddFab` uses `useAppNavigation().goToModule` — **0** store `navigate` calls.

---

## E. Trip detail legacy nav

`trip-detail.tsx` `FinancialTab` uses `goToDetail("invoice", …)` — **0** `getState().navigateDetail`.

---

## F. Vehicle / fleet legacy nav

| File | Status |
|------|--------|
| `vehicle-summary-panel.tsx` | `goToDetail` via `useAppNavigation` |
| `vehicles/tabs/overview.tsx` | `goToDetail` via `useAppNavigation` |
| `vehicle-onboarding.tsx` | `goToDetail` via `useAppNavigation` |

---

## G. Campaign detail

`campaign-detail.tsx` uses `goToModule` + `router.back()` — **0** store `navigate` / `navigateBack`.

---

## H. Business module `activeView` routing

| Metric | Count |
|--------|-------|
| Module `index.tsx` with `resolveModuleView` fallback | **0** |
| Module `index.tsx` with `activeView` reads (routing) | **2** (`chat`, `operations-hub` — overlay state only) |
| Required `route: ModuleRouteState` prop | **40** business modules |
| `fleet-map` | URL/searchParams authority (no `route` prop — map surface) |
| `dashboard` | Separate module component (not in 40-count set) |

---

## I. ModuleRouter legacy adapter

`router.tsx` passes `route={legacyResolveModuleView(activeView, module)}` — **preserved** for rollback.

---

## J. Breadcrumb `activeView` dependency

| Component | B0R-8PV |
|-----------|---------|
| `PageHeader` | Optional `breadcrumb` prop — **0** `activeView.breadcrumb` |
| `DetailLayout` | Optional `breadcrumb` prop — **0** `activeView.breadcrumb` |

---

## K. Sidebar active highlight

`sidebar.tsx`: when flag ON, `activeView` prop is **pathname-derived** via `useActiveModuleFromPath()` — not store `activeView` for highlight authority.

---

## L. Cluster layouts active highlight

All `*-cluster-layout.tsx` use `AppClusterTabs` + `useActiveModuleFromPath()` — **0** `activeView` for tab highlight on `/app/*`.

---

## M. Command palette

| Item | B0R-8PV |
|------|---------|
| `isModuleMigrated` branch | **Removed** |
| Navigation | `useAppNavigation` only |
| Recents | `recent-routes-store` (`href`, `label`, `visitedAt`) — **independent from `history[]`** |

---

## N. Settings tab navigation

| Caller | B0R-8PV |
|--------|---------|
| `alert-banner.tsx` | `goToModule("settings", …, tab)` when flag ON |
| `announcements-center.tsx` | same |
| `setSettingsTab` production callers | **0** |

---

## O. `marketingView` (flag ON path)

Unchanged in `AppShell` rollback path. Full removal deferred to B0R-8B.

---

## P. Compat helper isolation (normal production path)

| Symbol | Normal production imports |
|--------|---------------------------|
| `useNavigateCompat` | **0** (rollback: `module-cluster-tabs.tsx`) |
| `navigateCompat()` | **0** |
| `isModuleMigrated` | **2** (`widget-registry` dual path; `use-active-view-sync` rollback) + `notification-target.ts` URL guard |

---

## Q. Rollback preservation

| Artifact | Status |
|----------|--------|
| `ModuleRouter` | **KEPT** |
| `AppShell` | **UNCHANGED** |
| `activeView` / `history` / `navigate*` | **KEPT** |
| `/dashboard?legacy=1` | **KEPT** |
| `NEXT_PUBLIC_ROUTING_MIGRATION` | **KEPT** |

---

## R. `useActiveViewSync`

**Disabled when flag ON** via `isActiveViewSyncEnabled()` early return. Unit test added in `routing-compat.test.ts`.

---

## S. `syncActiveView`

Only `navigate-compat.ts` (rollback) and disabled `useActiveViewSync` — **0** normal App Router paths.

---

## T. Exact counts — normal path (flag ON)

| Metric | Target | Actual |
|--------|--------|--------|
| `navigate()` direct | 0 | **0** |
| `navigateDetail()` direct | 0 | **0** |
| `navigateBack()` direct | 0 | **0** |
| `setSettingsTab` callers | 0 | **0** |
| Business module `activeView` route reads | 0 | **0** (2 overlay-only exceptions) |
| Breadcrumb `activeView` | 0 | **0** |
| Sidebar store `activeView` highlight (flag ON) | 0 | **0** (pathname-derived) |
| Cluster `activeView` highlight | 0 | **0** |
| `useActiveViewSync` mutations (flag ON) | 0 | **0** |
| `syncActiveView` normal callers | 0 | **0** |
| `useNavigateCompat` normal imports | 0 | **0** |
| `navigateCompat` normal imports | 0 | **0** |
| `isModuleMigrated` normal imports | 0 | **2** (dual-path rollback helpers) |

---

## U. Playwright — B0R-8P critical suite (`routing-b0r8p.spec.ts`)

**Pre-fix run (HEAD `96e31bc`, plain `test` + manual `loginViaApi`):**

| Subset | Result |
|--------|--------|
| Flag ON #301–#320 | **16 PASS / 5 FAIL** |
| Flag OFF #321 | **SKIP** (flag ON in webServer env) |

**Failures (pre-fix):** #301 sidebar Trips, #302 sidebar Vehicles, #303 command palette Settings, #307 financial-ops alias, #308 app-store alias — root cause: missing `authTest`/`storageState`, unscoped sidebar selector, command palette not using search fill.

**Post-fix (this session):** Spec migrated to `authTest` + `sidebarNav()` + command palette search pattern; #321 uses isolated `browser.newContext`. **Full re-run blocked** by dev-server lock contention (`.next/dev/lock`) and webServer 180s timeout after prior runs.

---

## V. Playwright — full routing suite

**NOT RUN** this session — blocked by `:3099` / `:3110` webServer startup failures after concurrent `next dev` instances. B0R-8A reference: 213 passed, 38 skipped, 3 failed.

---

## W. Vitest

**122/122 PASS** including `isActiveViewSyncEnabled` flag ON/OFF proof.

---

## X. TypeScript / Lint / Build

| Check | Status |
|-------|--------|
| TypeScript | **0 errors** |
| Lint | **PASS** |
| Web build | **PASS** |
| API build | **PASS** |

---

## Y. Production soak

**NOT STARTED** — see `docs/REANZLY-ROUTING-PRODUCTION-SOAK.md`. No fabricated evidence.

---

## Z. B0R-8P code decision

**CODE READY** — normal-path direct store navigation eliminated; 40 modules use required `route` prop; rollback preserved.

**B0R-8PV E2E gate:** **NOT CLOSED** — critical Playwright subset not fully green post-fix (infra blocked re-run).

---

## AA. B0R-8B readiness

**BLOCKED — PRODUCTION SOAK PENDING**

Remaining blockers before B0R-8B:

1. Production soak (7+ days, flag ON)
2. Full Playwright routing suite green on production build
3. B0R-8P critical suite 21/21 PASS after spec fixes verified in CI

---

## AB. Session isolation

| Test | Isolation |
|------|-----------|
| `routing-foundation.spec.ts` #18 invalidate-session | `browser.newContext({ storageState: undefined })` |
| `routing-foundation.spec.ts` #19 returnTo login | Empty storageState context |
| `routing-foundation.spec.ts` #23 legacy redirect | Isolated context |
| `routing-b0r8p.spec.ts` #321 flag OFF | Isolated context — **does not mutate `e2e/.auth/owner.json`** |

Destructive auth tests do not invalidate shared owner session.

---

## AC. Server stability (`:3099` ERR_CONNECTION_REFUSED)

| Finding | Detail |
|---------|--------|
| Symptom | Late-suite `ERR_CONNECTION_REFUSED` on `:3099` (B0R-8A audit) |
| Lock contention | `.next/dev/lock` when multiple `next dev` instances run |
| webServer timeout | 180s exceeded when lock held or cold Turbopack compile |
| Missing env | Manual `next dev` without `.env.production` → `DATABASE_URL` missing → auth 500 |
| Mitigation | Remove stale lock; single webServer per run; playwright loads `.env.production` |

---

## AD. Skip classification (B0R-8A full suite reference)

| Category | Count | Reason |
|----------|-------|--------|
| Detail deep-link (missing fixture IDs) | ~35 | Trips, POD, LR, inspection entity IDs not in mock DB |
| Flag OFF gated | 1 | `routing-foundation` #24 when migration ON |
| Auth skipped | 0 | — |
| Portal-only | ~2 | Superadmin/broker when creds absent |

---

## AE–AF. Fixes applied (verification session)

| Fix | File |
|-----|------|
| `authTest` + scoped sidebar + command palette pattern | `e2e/routing-b0r8p.spec.ts` |
| `isActiveViewSyncEnabled()` + unit test | `use-active-view-sync.ts`, `routing-compat.test.ts` |
| tsconfig revert | `apps/web/tsconfig.json` |
| Production soak doc | `docs/REANZLY-ROUTING-PRODUCTION-SOAK.md` |

---

## AG. Traceability checklist

| # | Item | Status |
|---|------|--------|
| AA | `useAppNavigation` API | ✅ |
| AB | 40 module `route` props | ✅ |
| AC | Compat isolated to rollback | ✅ |
| AD | `useActiveViewSync` disabled flag ON | ✅ + unit test |
| AE | Command palette recents store | ✅ |
| AF | B0R-8PV verification report | ✅ |
| AP | E2E spec fixes | ✅ (re-run pending) |
| AQ | Production soak doc | ✅ NOT STARTED |

---

*End of B0R-8PV verification report.*

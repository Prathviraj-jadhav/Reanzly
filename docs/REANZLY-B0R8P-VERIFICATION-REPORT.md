# Reanzly B0R-8P — Routing Decommission Preparation Verification Report

**Date:** 2026-09-02  
**Starting HEAD:** `b34ec80eb55e09fbb6551956dc1bdf0f51533250`  
**Branch:** `main`  
**Scope:** B0R-8P — prepare legacy navigation decommission (preserve rollback)

---

## A. Pre-flight baseline

| Item | Value |
|------|-------|
| Branch | `main` |
| Starting HEAD | `b34ec80eb55e09fbb6551956dc1bdf0f51533250` |
| `npm ci` | **PASS** (prior B0R-8A) |
| `npm run typecheck` | **PASS** (0 errors) |
| `npm run lint` | **PASS** |
| `npm test` (Vitest) | **121/121 PASS** |
| `npm run build:web` | **PASS** |
| `npm run build:api` | **PASS** |

---

## B. `useAppNavigation()` API

| Export | Location | Role |
|--------|----------|------|
| `useAppNavigation()` | `lib/navigation/use-app-navigation.ts` | `goToModule`, `goToDetail`, `goToCreate`, `goToTab`, `goBack`, `push` |
| `buildModulePath()` | same | Static URL builder |
| `pushModulePath()` | same | Imperative non-hook navigation |
| `useActiveModuleFromPath()` | same | Pathname-derived active module (chrome) |

---

## C. Widget registry migration

| Metric | Before (B0R-8A) | After (B0R-8P normal path) |
|--------|-----------------|----------------------------|
| Direct `useAppStore().navigate` in widgets | ~28 | **0** |
| Navigation API | store / compat mix | `useWidgetNavigation()` → `useAppNavigation` when flag ON; store when flag OFF (legacy `/dashboard`) |

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
| Module `index.tsx` with `activeView` reads (routing) | **2** (`chat`, `operations-hub` — overlay state only, not view routing) |
| Required `route: ModuleRouteState` prop | **40** business modules |

---

## I. ModuleRouter legacy adapter

`router.tsx` passes `route={legacyResolveModuleView(activeView, module)}` to all business modules. **Preserved** for `/dashboard?legacy=1` rollback.

---

## J. Breadcrumb `activeView` dependency

| Component | B0R-8P |
|-----------|--------|
| `PageHeader` | Optional `breadcrumb` prop; no `activeView.breadcrumb` |
| `DetailLayout` | Optional `breadcrumb` prop; no `activeView.breadcrumb` |

---

## K. Sidebar active highlight

`sidebar.tsx` derives active module from `useActiveModuleFromPath()` when flag ON; legacy `activeView` when flag OFF.

---

## L. Cluster layouts active highlight

All `*-cluster-layout.tsx` files use `AppClusterTabs` + `useActiveModuleFromPath()` — **0** `activeView` for tab highlight on `/app/*`.

---

## M. Command palette

| Item | B0R-8P |
|------|--------|
| `isModuleMigrated` branch | **Removed** |
| Navigation | `useAppNavigation` only |
| Recents | `recent-routes-store` (`href`, `label`, `visitedAt`) |

---

## N. Settings tab navigation

| Caller | B0R-8P |
|--------|--------|
| `alert-banner.tsx` | `goToModule("settings", …, tab)` when flag ON |
| `announcements-center.tsx` | same |
| `setSettingsTab` production callers | **0** (store API retained for rollback) |

---

## O. `marketingView` (flag ON path)

Unchanged in `AppShell` rollback path. Public routes `/`, `/login`, `/marketplace` exist. Full `marketingView` removal deferred to B0R-8B.

---

## P. Compat helper isolation (normal production path)

| Symbol | Normal production imports |
|--------|---------------------------|
| `useNavigateCompat` | **0** (rollback: `module-cluster-tabs.tsx`, `navigate-compat.ts`) |
| `useModuleNavigation` | **0** |
| `navigateCompat()` | **0** |
| `isModuleMigrated` | **2** (`widget-registry` dual path for legacy dashboard; `use-active-view-sync` rollback) |

---

## Q. Rollback preservation

| Artifact | Status |
|----------|--------|
| `ModuleRouter` | **KEPT** — passes explicit `route` from `activeView` |
| `AppShell` | **UNCHANGED** |
| `activeView` / `history` / `navigate*` store actions | **KEPT** |
| `/dashboard?legacy=1` | **KEPT** |
| `NEXT_PUBLIC_ROUTING_MIGRATION` | **KEPT** |

---

## R. `useActiveViewSync`

**Disabled when `NEXT_PUBLIC_ROUTING_MIGRATION=1`** (early return). Documented in hook JSDoc. Rollback dual-write remains when flag OFF.

---

## S. `syncActiveView`

Only called from `navigate-compat.ts` (rollback) and disabled `useActiveViewSync` — **0** normal App Router navigation paths invoke it.

---

## T. Playwright — B0R-8P critical suite

**File:** `e2e/routing-b0r8p.spec.ts` — **21 cases** (301–321)

| Subset run | Result |
|------------|--------|
| #309 legacy `/dashboard` redirect | **PASS** |
| #320 vehicles hard refresh | **PASS** |
| #301 sidebar trips (selector fix applied) | Re-run pending |

Full suite + flag-OFF #321: run in CI / soak environment.

---

## U. Playwright — full suite (B0R-8A reference)

B0R-8A: 213 passed, 38 skipped, 3 failed (session flake). **Not re-run in full** this session.

---

## V. Vitest

**121/121 PASS** including `routing-compat.test.ts` (rollback API tests).

---

## W. TypeScript / Lint / Build

| Check | Status |
|-------|--------|
| TypeScript | **0 errors** |
| Lint | **PASS** |
| Web build | **PASS** |
| API build | **PASS** |

---

## X. Production soak

**PENDING** — no fabricated evidence. Required before B0R-8B.

---

## Y. B0R-8P code decision

**CODE READY** — normal-path direct store `navigate`/`navigateDetail` eliminated; business modules use required `route` prop; rollback artifacts preserved.

---

## Z. B0R-8B readiness

**BLOCKED** — production soak PENDING; compat layer deletion (B0R-8B steps 8–10) not started.

---

## AA–AQ. Traceability checklist

| # | Item | Status |
|---|------|--------|
| AA | `useAppNavigation` created | ✅ |
| AB | `module-paths` unchanged authority | ✅ |
| AC | Widget registry migrated | ✅ |
| AD | Mobile quick-add migrated | ✅ |
| AE | Trip / vehicle / campaign migrated | ✅ |
| AF | Command palette recents store | ✅ |
| AG | ModuleClusterTabs legacy branch simplified (rollback file) | ✅ |
| AH | Settings URL navigation | ✅ |
| AI | Notification panel URL nav | ✅ |
| AJ | Sidebar / header pathname authority | ✅ |
| AK | 40 module `route` props | ✅ |
| AL | `resolveModuleView` deprecated | ✅ |
| AM | Cluster layouts pathname active | ✅ |
| AN | `useActiveViewSync` disabled flag ON | ✅ |
| AO | Compat isolated to rollback | ✅ |
| AP | E2E critical suite added | ✅ |
| AQ | Verification report | ✅ |

---

*End of B0R-8P verification report.*

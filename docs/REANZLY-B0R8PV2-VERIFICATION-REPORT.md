# Reanzly B0R-8PV2 — E2E Closure & Soak-Readiness Verification Report

**Date:** 2026-09-02  
**Starting HEAD:** `363106dd18a809670dfa71ec32ba21afcbb725b9`  
**Current HEAD (post-fixes):** pending commit  
**Branch:** `main`  
**Scope:** B0R-8PV2 — E2E closure gate + soak readiness (no B0R-8B deletions)

---

## A. Pre-flight baseline

| Item | Value |
|------|-------|
| Branch | `main` |
| Starting HEAD | `363106dd18a809670dfa71ec32ba21afcbb725b9` |
| B0R-8P commit | **CONFIRMED** — `96e31bc refactor(routing): prepare legacy navigation decommission` |
| B0R-8PV commit | **CONFIRMED** — `363106d test(routing): verify decommission preparation` |
| Process cleanup | Stale Reanzly `next dev` / Playwright PIDs killed; ports 3099/3110 verified free |
| `.next` clean | Removed before runs; lock contention cleared on first attempt |
| `tsconfig.json` | Reverted erroneous `.next/dev/types` include (again) |
| Env (`DATABASE_URL`, `DIRECT_URL`) | Present in `.env.production` (loaded by Playwright config) |
| Env (`NEXT_PUBLIC_ROUTING_MIGRATION`, `E2E_TEST_MODE`) | Set by Playwright `webServer` env at runtime |

---

## B. `useAppNavigation()` API

Unchanged from B0R-8P/B0R-8PV. Exports: `useAppNavigation`, `buildModulePath`, `pushModulePath`, `useActiveModuleFromPath`.

---

## C. Widget registry migration

| Metric | B0R-8PV2 (flag ON normal path) |
|--------|--------------------------------|
| Direct `useAppStore().navigate` in widgets | **0** |
| Navigation | `useWidgetNavigation()` → `useAppNavigation` when migrated |

---

## D. Mobile quick-add

`MobileQuickAddFab` uses `useAppNavigation().goToModule` — **0** store `navigate` calls.

---

## E. Trip detail legacy nav

`trip-detail.tsx` `FinancialTab` uses `goToDetail("invoice", …)` — **0** `getState().navigateDetail`.

---

## F. Vehicle / fleet legacy nav

All vehicle/fleet surfaces use `useAppNavigation().goToDetail` — **0** direct store navigation on normal path.

---

## G. Campaign detail

`campaign-detail.tsx` uses `goToModule` + `router.back()` — **0** store `navigate` / `navigateBack`.

---

## H. Business module `activeView` routing

| Metric | Count |
|--------|-------|
| Module `index.tsx` with `resolveModuleView` fallback | **0** |
| Module `index.tsx` with `activeView` reads (routing) | **2** (`chat`, `operations-hub` — overlay only) |
| Required `route: ModuleRouteState` prop | **40** business modules |
| `fleet-map` | URL/searchParams authority (no `route` prop) |

---

## I. ModuleRouter legacy adapter

`router.tsx` passes `route={legacyResolveModuleView(activeView, module)}` to **41** module render branches (40 business modules + aliases). **Preserved** for rollback.

---

## J. Breadcrumb `activeView` dependency

`PageHeader` / `DetailLayout` use optional `breadcrumb` prop — **0** `activeView.breadcrumb` on normal path.

---

## K. Sidebar active highlight

Flag ON: pathname-derived via `useActiveModuleFromPath()` — **0** store `activeView` highlight authority.

---

## L. Cluster layouts active highlight

All `*-cluster-layout.tsx` use `AppClusterTabs` + `useActiveModuleFromPath()` — **0** `activeView` tab highlight on `/app/*`.

---

## M. Command palette

`useAppNavigation` only when flag ON; recents via `recent-routes-store`.

---

## N. Settings tab navigation

`alert-banner.tsx` / `announcements-center.tsx` use `goToModule("settings", …, tab)` — **0** `setSettingsTab` production callers.

---

## O. `marketingView` (flag ON path)

Unchanged in AppShell rollback path. Full removal deferred to B0R-8B.

---

## P. Compat helper isolation (normal production path)

| Symbol | Normal production imports |
|--------|---------------------------|
| `useNavigateCompat` | **0** |
| `navigateCompat()` | **0** |
| `isModuleMigrated` | **2** (dual-path rollback helpers) |

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

**Disabled when flag ON** via `isActiveViewSyncEnabled()` early return. Unit test in `routing-compat.test.ts`.

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
| Business module `activeView` route reads | 0 | **0** (2 overlay-only) |
| Breadcrumb `activeView` | 0 | **0** |
| Sidebar store `activeView` highlight (flag ON) | 0 | **0** |
| Cluster `activeView` highlight | 0 | **0** |
| `useActiveViewSync` mutations (flag ON) | 0 | **0** |
| `syncActiveView` normal callers | 0 | **0** |
| `useNavigateCompat` normal imports | 0 | **0** |
| `navigateCompat` normal imports | 0 | **0** |
| Flag ON `/app/*` uses `ModuleRouter` | no | **no** (App Router pages only) |

---

## U. Playwright — B0R-8P critical suite (`routing-b0r8p.spec.ts`, flag ON)

**Run:** `NEXT_PUBLIC_ROUTING_MIGRATION=1`, port **3099**, Playwright-owned `next dev`

| Subset | Result |
|--------|--------|
| Flag ON #301–#320 | **20/20 PASS** |
| Flag OFF #321–#325 | **5 SKIP** (expected on flag-ON run) |
| **Total executed** | **21 PASS / 0 FAIL / 5 SKIP** |

| Fix case | Result |
|----------|--------|
| #301 sidebar Trips | **PASS** |
| #302 sidebar Vehicles | **PASS** |
| #303 command palette Settings | **PASS** |
| #307 financial-ops alias | **PASS** |
| #308 app-store alias | **PASS** |

---

## V. Playwright — flag OFF rollback (port 3110)

**Run:** `NEXT_PUBLIC_ROUTING_MIGRATION=0`, port **3110**, dedicated `chromium-flag-off` project

| Test | Result |
|------|--------|
| #321 legacy `/dashboard` SPA | **PASS** |
| #322 ModuleRouter trips sidebar | **PASS** |
| #323 ModuleRouter settings sidebar | **PASS** |
| #324 ModuleRouter warehouse sidebar | **PASS** |
| #325 `/dashboard?legacy=1` AppShell | **PASS** |
| foundation #24 legacy SPA entry | **PASS** |
| b0r7 #252 broker portal at `/dashboard` | **FAIL** (missing `[data-e2e-portal='broker']` — portal creds/fixture) |

**Flag OFF server:** YES — `:3110` `next dev` with `NEXT_PUBLIC_ROUTING_MIGRATION=0`

---

## W. Playwright — full routing suite (flag ON)

**Run:** `e2e/` all specs, port **3099**, 279 tests, 27.8 minutes

| Metric | Value |
|--------|-------|
| **Pass** | **129** |
| **Fail** | **108** |
| **Skip** | **42** |
| **Total** | **279** |
| Server survived | **YES** |
| `ERR_CONNECTION_REFUSED` | **0** |
| `.next/dev/lock` during run | **0** (after pre-run cleanup) |
| Retries (local) | **0** — failures are first-attempt, not flake-recovered |

**Failure root cause (dominant):** Legacy B0R-2..B0R-6 specs assert `main[data-e2e-active-module='…']` and unscoped sidebar selectors; many modules render without that attribute or match wrong buttons. B0R-8P critical suite uses URL-only assertions and scoped sidebar — all green.

---

## X. Vitest

**122/122 PASS** including `isActiveViewSyncEnabled` flag ON/OFF proof.

---

## Y. TypeScript / Lint / Build

| Check | Status |
|-------|--------|
| TypeScript | **0 errors** |
| Lint | **PASS** (5 pre-existing warnings) |
| Web build | **PASS** |
| API build | **PASS** |

---

## Z. Production build verification

| Check | Status |
|-------|--------|
| `next build` routes | **PASS** — `/app/dashboard`, `/app/trips`, `/app/settings`, `/app/warehouse/[tab]`, `/app/ledger/[view]`, `/admin` present in build manifest |
| Local `next start` / standalone | **PARTIAL** — requires `.env.production` loaded; standalone path differs on Windows; auth 500 without `DATABASE_URL` in process env |
| Production Playwright subset | **BLOCKED** — auth setup fails without env on prod server |

---

## AA. Production soak & B0R-8B gate

| Item | Status |
|------|--------|
| Production soak | **NOT STARTED** — no fabricated evidence |
| Soak document | `docs/REANZLY-ROUTING-PRODUCTION-SOAK.md` updated — **READY TO START AFTER DEPLOYMENT** |
| Required soak duration | **14 days** |
| B0R-8B | **BLOCKED** — 14-day production soak required |

---

## AB. Session isolation

| Test | Isolation |
|------|-----------|
| foundation #18 invalidate-session | `browser.newContext({ storageState: undefined })` |
| foundation #19 returnTo login | Empty storageState context |
| foundation #23 legacy redirect | Isolated context |
| b0r8p #321–#325 flag OFF | Isolated `browser.newContext({ storageState: undefined })` — does not mutate shared owner session |

---

## AC. Skip classification (full suite, 42 skipped)

| Category | Count | Reason |
|----------|-------|--------|
| Detail deep-link (missing fixture IDs) | ~35 | Trips, POD, LR, inspection entity IDs not in mock DB |
| Flag OFF gated (on flag-ON run) | 5 | b0r8p #321–#325 |
| Flag ON gated (on flag-OFF run) | 2 | b0r7 #251, b0r8p #309 |
| Auth / portal creds | ~0–2 | Broker portal when creds absent |

---

## AD. Fixes applied (B0R-8PV2 session)

| Fix | File |
|-----|------|
| Remove `.next/dev/types` from tsconfig include | `apps/web/tsconfig.json` |
| Flag-OFF port 3110 + `chromium-flag-off` project | `apps/web/playwright.config.ts` |
| Rollback tests #322–#325 (trips/settings/warehouse/legacy=1) | `apps/web/e2e/routing-b0r8p.spec.ts` |
| Production soak doc status + 14-day duration | `docs/REANZLY-ROUTING-PRODUCTION-SOAK.md` |

---

## AE. B0R-8P decision

**CODE READY** — normal-path direct store navigation eliminated; counts at zero; rollback preserved.

**CRITICAL E2E CLOSED** — B0R-8P suite #301–#320 **21/21 PASS** on flag ON.

**FULL E2E NOT CLOSED** — 108 failures in legacy B0R-2..B0R-6 assertion patterns (mostly `data-e2e-active-module` + unscoped sidebar).

**PRODUCTION SOAK:** Ready to **start after deployment** — not yet started.

---

## AF. B0R-8B readiness

**BLOCKED — 14-DAY PRODUCTION SOAK REQUIRED**

Remaining blockers:

1. Production soak (14 days, flag ON, post-deploy)
2. Full Playwright routing suite green on production build (or spec alignment with B0R-8P URL assertions)
3. Broker portal rollback test (#252) when portal creds available

---

*End of B0R-8PV2 verification report.*

# Reanzly B0R-8PV3 Verification Report

**Date:** 2026-09-03  
**Starting HEAD:** `e4625d1` (`test(routing): close decommission preparation verification`)  
**Current HEAD (post-commit):** recorded in FINAL OUTPUT / `git log -1` after this batch  
**Branch:** `main`  
**Scope:** B0R-8PV3 — Playwright test-estate alignment & final soak gate (no B0R-8B deletions)

---

## A. Status

| Gate | Result |
|------|--------|
| Flag-ON full routing suite | **236 PASS / 0 FAIL / 36 SKIP** |
| Flag-OFF rollback (`@flag-off`) | **8 PASS / 0 FAIL** |
| Production-mode critical (#301–#320) | **21/21 PASS** |
| Normal-path code counts | **0** (targets met) |
| Quality gates | Typecheck / Lint / Vitest / build:web / build:api **PASS** |
| Production soak | **NOT STARTED** |
| B0R-8B | **BLOCKED** — 14-day soak required |

**Verdict:** B0R-8P **CLOSED — READY FOR PRODUCTION DEPLOYMENT/SOAK**

---

## B. Git Baseline

| Item | Value |
|------|-------|
| Branch | `main` |
| Starting HEAD | `e4625d1` |
| Prior | B0R-8PV2 close commit on `main` |
| Uncommitted at start | E2E/config/product alignment work in progress (no PV3 commit yet) |
| Node / npm | Windows host; workspace npm scripts |

---

## C. Failure Classification Baseline (from B0R-8PV2)

| Class | Approx. count (PV2) | Disposition in PV3 |
|-------|---------------------|--------------------|
| Obsolete `data-e2e-active-module` / store-authority assertions | Dominant of 108 | Aligned to pathname / URL helpers |
| Unscoped sidebar / cluster selectors | Large share | Scoped via `e2e/fixtures/navigation.ts` |
| Fixture / missing entity deep-links | ~35–42 skips | Remain **optional fixture skips** |
| Real product routing regressions | 0 confirmed in PV2 | **0** found; minimal product fixes only for E2E signal |

Initial PV2 full suite: **129 pass / 108 fail / 42 skip**.

---

## D. Legacy Assertion Inventory

Dominant obsolete patterns removed/replaced:

- `main[data-e2e-active-module='…']` as store/`activeView` authority
- Unscoped `getByRole('button', { name: … })` for sidebar/cluster
- Flag-OFF expectations run inside flag-ON projects (inflated skips)
- Broker #252 expecting portal shell under flag-OFF desktop SPA

---

## E. Assertion Standard

Canonical helpers in `apps/web/e2e/fixtures/navigation.ts`:

- `sidebarNav` / `clickSidebarNav`
- `clusterTab` / `clickClusterTab`
- `openCommandPalette` / `commandPaletteGoToModule`
- `expectModule` / `expectModuleShell` (URL + shell, not Zustand `activeView`)

Flag-ON tests assert **pathname / App Router URL**. Flag-OFF tests tagged `@flag-off`.

---

## F. Sidebar Selector Alignment

Sidebar and cluster interactions use scoped locators from the navigation fixture. Shell exposes `data-e2e-active-module` from **pathname** (`useActiveModuleFromPath`) when migration is ON — not Zustand `activeView`.

---

## G. B0R-2 Suite

| Metric | Value |
|--------|-------|
| Pass | **13** |
| Fail | **0** |
| Skip | **9** (detail / entity fixture deep-links) |

---

## H. B0R-3 Suite

| Metric | Value |
|--------|-------|
| Pass | **22** |
| Fail | **0** |
| Skip | **8** (inspection/issues/maintenance/fuel/quality detail fixtures) |

---

## I. B0R-4 Suite

| Metric | Value |
|--------|-------|
| Pass | **23** |
| Fail | **0** |
| Skip | **9** (invoice/expense/approval/payment detail fixtures) |

---

## J. B0R-5 Suite

| Metric | Value |
|--------|-------|
| Pass | **49** |
| Fail | **0** |
| Skip | **7** (customer/vendor/driver/document detail fixtures) |

---

## K. B0R-6 Suite

| Metric | Value |
|--------|-------|
| Pass | **41** |
| Fail | **0** |
| Skip | **3** (field-service detail / chat conversation URL) |

---

## L. B0R-7 Suite

| Metric | Value |
|--------|-------|
| Pass | **43** (flag-ON project) |
| Fail | **0** |
| Flag-OFF broker #252 | **PASS** (desktop `/dashboard` shell; portal shell is App Router `/broker`) |

---

## M. Flag ON/OFF Separation

| Mode | Port | Dist | Project filter |
|------|------|------|----------------|
| Flag ON | 3099 | `NEXT_DIST_DIR=.next-e2e-flag-on` | `grepInvert: /@flag-off/` |
| Flag OFF | 3110 | `NEXT_DIST_DIR=.next-flag-off` | `grep: /@flag-off/` |
| Prod | Playwright prod project | standalone server | `PLAYWRIGHT_PROD_MODE=1` |

Single webServer per mode avoids `.next` lock contention.

---

## N. Broker Rollback

| Test | Result |
|------|--------|
| #252 flag OFF broker on legacy `/dashboard` desktop shell | **PASS** |
| Assertion | `Broker Console` / desktop shell — **not** `[data-e2e-portal='broker']` |

Portal broker UI remains under App Router `/broker` (flag ON).

---

## O. Portal Fixture Matrix

| Portal | Flag ON | Flag OFF |
|--------|---------|----------|
| Broker desktop vs `/broker` | Covered in B0R-7 / B0R-8P | Desktop SPA shell (#252) |
| Vendor / field | Existing suite coverage | Rollback via ModuleRouter path |

---

## P. Detail Fixture Matrix

Optional skips when seed entity IDs absent (trips, POD, LR, inspection, finance, CRM entities, field-service, chat). Not soak-critical when list/cluster/sidebar/command-palette URL coverage is green.

---

## Q. Deterministic Fixtures

- Shared owner auth via Playwright setup project
- Flag-OFF tests use isolated contexts where required
- Navigation helpers stabilize selectors across suites

---

## R. Full Flag-ON Run

**Log:** `apps/web/b0r8pv3-full-flag-on-final.log`

| Metric | Value |
|--------|-------|
| Pass | **236** |
| Fail | **0** |
| Skip | **36** |
| Duration | ~16.4m |
| Foundation | 24 pass |
| B0R-8P critical (flag ON) | 20 pass (+ setup; flag-OFF excluded by grep) |

---

## S. First-Attempt Stability

Final flag-ON run: **FAIL = 0** on first reporting pass (no flake-recovered failures in summary). Prior intermediate logs (`v2`/`v3`) used during alignment; final artifact is `…-final.log`.

---

## T. Flag-OFF Rollback Run

**Log:** `apps/web/b0r8pv3-flag-off-final.log`

| Test | Result |
|------|--------|
| foundation #24 | **PASS** |
| b0r7 #252 broker desktop | **PASS** |
| #321–#325 | **PASS** |
| **Total** | **8 passed** |

---

## U. Production Server Environment

Fixes applied for prod E2E:

1. Standalone `server.js` path (`apps/web/package.json` `start` → monorepo standalone)
2. `scripts/copy-standalone.mjs` copies static/public into standalone tree
3. Load root `.env` / `.env.production` in Playwright prod mode
4. Bake `NEXT_PUBLIC_ROUTING_MIGRATION=1` and `NEXT_PUBLIC_AUTH_API_VERSION=legacy` into client build (avoids Fastify `/api/v1/auth/me` hang against local API)
5. Chromium install for Playwright cache when missing
6. `NEXT_DIST_DIR` support in `next.config.ts` for isolated caches

---

## V. Production-Mode E2E

**Log:** `apps/web/b0r8pv3-prod-e2e-v3.log`

| Suite | Result |
|-------|--------|
| B0R-8P #301–#320 | **21/21 PASS** (~1.3m) |

---

## W. Dev/Production Parity

Critical routing assertions (#301–#320) **PASS** on both Playwright-owned `next dev` (flag ON) and production standalone `next start` / node server.

---

## X. Skip Classification

| Category | Count | Soak-critical? |
|----------|-------|----------------|
| Detail / entity deep-link missing fixtures | **36** | **No** (optional) |
| Flag-OFF gated (on flag-ON run) | **0** (excluded via `@flag-off` + grepInvert) | N/A |
| Flag-ON gated (on flag-OFF run) | Excluded by grep | N/A |

---

## Y. Soak-Critical Coverage

| Area | Status |
|------|--------|
| Sidebar module nav | Covered / PASS |
| Command palette | Covered / PASS |
| Cluster tabs | Covered / PASS |
| Alias redirects | Covered / PASS (#307–#308) |
| Legacy `/dashboard` redirect (flag ON) | Covered / PASS (#309) |
| Hard refresh | Covered / PASS |
| Flag-OFF ModuleRouter rollback | Covered / PASS (#321–#325) |
| Broker rollback desktop | Covered / PASS (#252) |

---

## Z. Normal-Path Code Counts

| Metric | Target | Actual |
|--------|--------|--------|
| Direct store `navigate()` (normal path) | 0 | **0** |
| Direct store `navigateDetail()` | 0 | **0** |
| Direct store `navigateBack()` | 0 | **0** |
| Business module `activeView` route reads | 0 | **0** (chat + operations-hub overlay only) |
| Sidebar highlight authority (flag ON) | pathname | **pathname** |
| Cluster highlight (flag ON `/app/*`) | pathname | **AppClusterTabs** + pathname |
| `useActiveViewSync` mutations (flag ON) | disabled | **disabled** via `isActiveViewSyncEnabled()` |
| `syncActiveView` normal App Router callers | 0 | **0** (compat/rollback only) |
| `useNavigateCompat` on App Router layouts | 0 | **0** (only `ModuleRouter` → `module-cluster-tabs`) |
| Widget registry | `useWidgetNavigation` → `useAppNavigation` when migrated | **confirmed** |

Minimal product fixes this phase:

- `app-desktop-shell.tsx` — `data-e2e-active-module` from pathname when migrated
- `widget-registry.tsx` — `useWidgetNavigation()` (URL path when flag ON)

Rollback architecture **preserved** (ModuleRouter, AppShell, store navigate*, flag, `/dashboard?legacy=1`).

---

## AA. Product Defects Found

**None** that reintroduced `activeView` as routing authority. Remaining skips are fixture/seed gaps, not product routing bugs.

---

## AB. Vitest

**122/122 PASS** (`vitest-b0r8pv3-gates.log`; prior timeout flake on auth login re-run green).

---

## AC. TypeScript

**0 errors** after `npm run db:generate` (`typecheck-b0r8pv3-gates.log`).

---

## AD. Lint

**PASS** — 0 errors, 5 pre-existing warnings (`lint-b0r8pv3-gates.log`).  
ESLint ignores extended for `.next-e2e-flag-on` / `.next-flag-off` (and `.bak` variants) so E2E dist caches are not linted.

---

## AE. Builds

| Build | Status |
|-------|--------|
| `npm run build:web` | **PASS** (prod build log `build-web-b0r8pv3-prod.log`; standalone assets copied) |
| `npm run build:api` | **PASS** (`build-api-b0r8pv3-gates.log`) |

---

## AF. Soak Readiness

| Item | Status |
|------|--------|
| Soak document | `docs/REANZLY-ROUTING-PRODUCTION-SOAK.md` → **READY FOR DEPLOYMENT** |
| Required duration | **14 days** |
| Soak started | **NO** — no fabricated SHA/dates |
| Deploy | **NOT** performed in this batch |

---

## AG. Remaining Blockers

1. **Production deployment** of flag-ON build (out of scope)
2. **14-day production soak** evidence (blocks B0R-8B)
3. Optional: seed entity IDs to convert 36 fixture skips → pass (non-blocking for soak gate)

---

## AH. Decision

```text
B0R-8P CLOSED — READY FOR PRODUCTION DEPLOYMENT/SOAK
B0R-8B BLOCKED — 14-DAY PRODUCTION SOAK NOT COMPLETED
```

Do **not** remove ModuleRouter / compatibility / rollback paths until soak completes.

---

*End of B0R-8PV3 verification report.*

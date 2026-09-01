# Reanzly B0 Verification Report

**Date:** 2026-09-01  
**Starting HEAD:** `f19475155ce418274de269760c09a6d90d15bfca`  
**Branch:** `main`  
**Scope:** B0 — Build, Security & Test Baseline

---

## A. Pre-change baseline

| Item | Value |
|------|-------|
| Branch | `main` |
| Starting HEAD | `f19475155ce418274de269760c09a6d90d15bfca` |
| Node | v24.14.1 |
| npm | 11.11.0 |
| Working tree (pre) | `tsconfig.tsbuildinfo` modified; audit doc untracked |

---

## B. Dependency install

| Command | Result |
|---------|--------|
| `npm ci` | **FAIL** — lockfile out of sync (missing optional platform packages) |
| `npm install` | **PASS** — restored `node_modules` (877→915 packages after vitest) |

**Note:** `package-lock.json` updated by `npm install`. Canonical lockfile drift should be reconciled in a follow-up.

---

## C. Build integrity

| Command | Exit | Summary |
|---------|------|---------|
| `npx prisma generate` | 0 | Prisma Client v6.19.2 generated |
| `npm run build` | 1 | **BLOCKED** — `@next/swc-win32-x64-msvc` invalid Win32 binary; Turbopack WASM fallback lacks `turbo.createProject` |
| `npx tsc --noEmit` | 2 | Pre-existing errors in warehouse UI, Next route param types (`.next/types`), seed scripts |
| `npm run lint` | 1 | **BLOCKED** — corrupted `eslint-plugin-react-hooks` module parse error in `node_modules` |

### Error categories (TypeScript)

1. Next.js 16 `params: Promise<>` vs sync `params` in ~8 broker/warehouse/purchase routes
2. Warehouse UI type mismatches (`isLoading` vs `loading`, store shape)
3. Stale `.next/types/validator.ts` references
4. Seed script Prisma client drift (pre-existing)

---

## D. Prisma client

- `npx prisma generate` run successfully
- No migrations or `db push` executed (per B0 rules)

---

## E. P0 — Driver activity auth

**File:** `src/app/api/driver/activity/route.ts`  
**Fix:** Session required via `getSessionUser()` + `resolveDriverScope()` (`src/lib/driver-access.ts`)

| Scenario | Status |
|----------|--------|
| Unauthenticated | 401 |
| Driver own access | Allowed |
| Driver cross-driver | 403 |
| Fleet role same-company | Allowed |
| Fleet role cross-company | 404 |

**Tests:** `src/lib/__tests__/driver-access.test.ts` (5 cases)

---

## F. P0 — Warehouse tenant overwrite

**Fix:** `src/lib/warehouse/create-fields.ts` + `tenantCreateData()` in `src/lib/api-guards.ts`

**Routes updated (11 POST handlers):**

- inbound, outbound, skus, storage, pod-receive, pick-pack, cycle-count, cross-dock, yard, pick-list, returns, dock-appt

`companyId` is set from session **after** allowlisted field mapping; body cannot override tenant.

**Tests:** `src/lib/__tests__/warehouse-create-fields.test.ts`

---

## G. P0 — Storage IDOR

**File:** `src/app/api/storage/[...key]/route.ts`  
**Fix:** `canAccessStorageObject()` in `src/lib/storage/access-control.ts`

- Path traversal blocked (`..`, invalid buckets)
- Ownership via metadata `companyId`, driver activity `storage://` refs, task attachments, chat participants
- Default deny for unlinked objects

**Tests:** `src/lib/storage/__tests__/access-control.test.ts`

---

## H. HIGH — Integration webhook verification

**File:** `src/app/api/integrations/webhook/[providerId]/route.ts`  
**Fix:** `src/lib/integrations/webhook-verify.ts` — HMAC/Stripe verifiers; env secrets `WEBHOOK_SECRET_<PROVIDER>`

Unverified webhooks return **401** before DB mutations.

**Tests:** `src/lib/__tests__/webhook-verify.test.ts`

---

## I. HIGH — Chat internal broadcast

**File:** `mini-services/chat-service/index.ts`  
**Fix:** `verifyInternalSecret()` on `POST /internal/broadcast` (constant-time)  
**Env:** `CHAT_INTERNAL_SECRET` / `INTERNAL_SERVICE_SECRET`  
**Callers updated:** `src/lib/chat-broadcast.ts` used by chat conversations/messages routes

---

## J. Health / metrics exposure

| Endpoint | Before | After |
|----------|--------|-------|
| `/api/health` | Full infra details | `{ "status": "ok" }` only |
| `/api/metrics` | Public | Internal secret OR `superadmin` session |

**Deploy compatibility:** `scripts/deploy-prod.sh` polls `/api/health` for HTTP 200 — still compatible.

---

## K. API security classification

**Doc:** `docs/API-SECURITY-CLASSIFICATION.md`  
**Guards:** `src/lib/api-guards.ts`

---

## L. Module access gaps

Audited auth-only routes. Documented exceptions (chat, vendor-portal, driver field, notifications, dashboard stats). Added `requireModuleAccess` to warehouse yard route (was auth-only). No global middleware added (per B0 scope).

---

## M. Ledger tenant validation

**File:** `src/app/api/ledger/entries/[id]/route.ts`  
**Fix:** PATCH journal lines validate all `accountId` values belong to `sessionUser.companyId` (matches POST route pattern).

**Tests:** `src/lib/__tests__/ledger-tenant.test.ts`

---

## N. Test foundation

| Item | Value |
|------|-------|
| Runner | Vitest 3.2.x |
| Config | `vitest.config.ts` |
| Command | `npm test` |
| Files | 6 test files, **18 tests** |
| Result | **ALL PASS** |

Coverage: api-guards, driver-access, warehouse tenant, storage traversal, webhook signatures, ledger validation.

---

## O. `ignoreBuildErrors` removal

- **Removed** from `next.config.ts`
- Build still **fails** on this Windows env due to SWC native binary (environment blocker, not B0 code regression)
- Re-enabling `ignoreBuildErrors` would mask type debt; left removed per B0 goal

### Remaining P0 (post-B0)

| # | Issue |
|---|-------|
| P0-3 | Warehouse UI still disconnected from API (out of B0 scope) |
| — | Production build blocked on Windows SWC binary in CI/local env |

### Remaining P1

| # | Issue |
|---|-------|
| P1-8 | ~1000+ TypeScript errors (pre-existing UI/seeds/route params) |
| P1-9 | ESLint broken in `node_modules` (react-hooks plugin) |
| P1-1 | No global API middleware (documented, intentional) |
| — | Lockfile drift (`npm ci` fails until lock regenerated) |

---

## B0 exit criteria checklist

| Criterion | Status |
|-----------|--------|
| Security hotfixes (driver, warehouse, storage, webhook, chat, metrics) | ✅ |
| Guard helpers + classification doc | ✅ |
| Ledger tenant validation | ✅ |
| Test foundation + `npm test` | ✅ |
| `ignoreBuildErrors` removed | ✅ |
| `npm run build` PASS | ❌ (SWC env) |
| `tsc --noEmit` clean | ❌ (pre-existing debt) |
| `npm run lint` PASS | ❌ (node_modules corruption) |

## B0 Decision

**PARTIAL PASS — Security baseline established; build/lint blocked by environment/pre-existing debt.**

Security P0 items addressed with automated regression tests. Build verification requires Linux/Docker CI or repaired `@next/swc-win32-x64-msvc` binary on Windows.

---

*End of B0 verification report.*

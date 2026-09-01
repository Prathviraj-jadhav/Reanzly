# Reanzly B0A-3 Verification Report

**Date:** 2026-09-01  
**Starting HEAD:** `6b6bc2cd2a98e6378abac9bfb28893014f0a8023`  
**Branch:** `main`  
**Scope:** B0A-3 — Warehouse API Extraction

---

## A. Pre-flight baseline

| Item | Value |
|------|-------|
| Branch | `main` |
| Starting HEAD | `6b6bc2cd2a98e6378abac9bfb28893014f0a8023` |
| Node | v24.14.1 |
| npm | 11.11.0 |
| `npm ci` | **PASS** |
| `npm run typecheck` (pre) | **0 errors** |
| `npm run lint` (pre) | **PASS** (4 cosmetic warnings) |
| `npm test` (pre) | **66/66 PASS** (1 flaky timeout fixed) |
| `npm run build:web` / `build:api` (pre) | **PASS** |

---

## B. Legacy route inventory (24 files / 36 handlers)

| Domain Area | Method | Legacy Route | Prisma Model | Auth | Module Guard | Tenant Filter | Frontend Consumer | Status |
|-------------|--------|--------------|--------------|------|--------------|---------------|-------------------|--------|
| SKU | GET | `/api/warehouse/skus` | `WarehouseSku` | Session | `warehouse` | `companyId` | `warehouse-store.ts` | Migrated |
| SKU | POST | `/api/warehouse/skus` | `WarehouseSku` | Session | `warehouse` | `tenantCreateData` | `warehouse-store.ts` | Migrated |
| SKU | PATCH | `/api/warehouse/skus/[id]` | `WarehouseSku` | Session | `warehouse` | findUnique + check | `warehouse-store.ts` | Migrated |
| Inbound | GET/POST | `/api/warehouse/inbound` | `WarehouseInbound` | Session | `warehouse` | `companyId` / allowlist | `warehouse-store.ts` | Migrated |
| Inbound | PATCH | `/api/warehouse/inbound/[id]` | `WarehouseInbound` | Session | `warehouse` | tenant check | `warehouse-store.ts` | Migrated |
| Outbound | GET/POST/PATCH | `/api/warehouse/outbound*` | `WarehouseOutbound` | Session | `warehouse` | tenant scoped | `warehouse-store.ts` | Migrated |
| Storage | GET/POST/PATCH | `/api/warehouse/storage*` | `WarehouseStorageLocation` | Session | `warehouse` | tenant scoped | `warehouse-store.ts` | Migrated |
| POD Receive | GET/POST/PATCH | `/api/warehouse/pod-receive*` | `WarehousePodReceive` | Session | `warehouse` | tenant scoped | `warehouse-store.ts` | Migrated |
| Pick-Pack | GET/POST/PATCH | `/api/warehouse/pick-pack*` | `WarehousePickList` | Session | `warehouse` | tenant scoped | `warehouse-store.ts` | Migrated |
| Pick-List | GET/POST/PATCH/DELETE | `/api/warehouse/pick-list*` | `WarehousePickList` | Session | **none (legacy gap)** | `companyId` in where | — (orphan) | Migrated + guard fixed in v1 |
| Cycle Count | GET/POST/PATCH | `/api/warehouse/cycle-count*` | `WarehouseCycleCount` | Session | `warehouse` | tenant scoped | `warehouse-store.ts` | Migrated |
| Cross-Dock | GET/POST/PATCH | `/api/warehouse/cross-dock*` | `WarehouseCrossDock` | Session | `warehouse` | tenant scoped | `warehouse-store.ts` | Migrated |
| Returns | GET/POST/PATCH/DELETE | `/api/warehouse/returns*` | `WarehouseReturn` | Session | **none (legacy gap)** | `companyId` in where | `warehouse-store.ts` | Migrated + guard fixed in v1 |
| Yard | GET/POST | `/api/warehouse/yard` | `WarehouseYard` | Session | `warehouse` | `companyId` | `warehouse-store.ts` | Migrated |
| Yard | PATCH/DELETE | `/api/warehouse/yard/[id]` | `WarehouseYard` | Session | **none on [id] (legacy gap)** | compound where | `warehouse-store.ts` | Migrated + guard fixed in v1 |
| Dock Appt | GET/POST/PATCH/DELETE | `/api/warehouse/dock-appt*` | `WarehouseDockAppt` | Session | **none (legacy gap)** | compound where | `warehouse-store.ts` | Migrated + guard fixed in v1 |

All 24 legacy handlers preserved with `@deprecated` rollback comments.

---

## C. Warehouse data model (no schema changes)

| Model | companyId | branchId | FK relations | Status/qty fields |
|-------|-----------|----------|--------------|-------------------|
| `WarehouseSku` | ✅ indexed | — | none (skuCode string) | `stock`, `reserved`, `minLevel` |
| `WarehouseInbound` | ✅ indexed | — | none (skus JSON) | `status`, `totalValue` |
| `WarehouseOutbound` | ✅ indexed | — | none (skus JSON) | `status`, `totalValue` |
| `WarehouseStorageLocation` | ✅ indexed | — | none | `capacityPallets`, `occupiedPallets` |
| `WarehousePodReceive` | ✅ indexed | — | none | `status`, `damageCount`, `shortageQty` |
| `WarehousePickList` | ✅ indexed | — | none | `status`, qty fields |
| `WarehouseCycleCount` | ✅ indexed | — | none | `status`, `systemQty`, `countedQty`, `variance` |
| `WarehouseCrossDock` | ✅ indexed | — | none | `status`, `qty`, `dwellTimeMin` |
| `WarehouseReturn` | ✅ indexed | — | none | `status`, `qty`, `unitValue` |
| `WarehouseYard` | ✅ indexed | — | none | `status`, `dwellMin` |
| `WarehouseDockAppt` | ✅ indexed | — | none | `status`, `durationMin` |

**Branch isolation:** N/A — no `branchId` on warehouse models.  
**FK tenant validation:** N/A — no Prisma FK relations; business keys (`skuCode`, `grn`, etc.) are plain strings. v1 validates via Zod strict + tenant scoping only.

---

## D. `packages/contracts/warehouse/`

| Resource | Create | Patch | List/Response DTOs | Strict (no companyId) |
|----------|--------|-------|-------------------|------------------------|
| sku | ✅ | ✅ | ✅ wrapped | ✅ |
| inbound | ✅ | ✅ | ✅ `{ shipments }` | ✅ |
| outbound | ✅ | ✅ | ✅ `{ shipments }` | ✅ |
| storage | ✅ | ✅ | ✅ `{ locations }` | ✅ |
| pod-receive | ✅ | ✅ | ✅ `{ receives }` | ✅ |
| pick-pack / pick-list | ✅ | ✅ | ✅ wrapped + raw array | ✅ |
| cycle-count | ✅ | ✅ | ✅ `{ counts }` | ✅ |
| cross-dock | ✅ | ✅ | ✅ `{ crossDocks }` | ✅ |
| return | ✅ | ✅ | ✅ raw array | ✅ |
| yard | ✅ | ✅ | ✅ raw array | ✅ |
| dock-appointment | ✅ | ✅ | ✅ raw array | ✅ |

---

## E. B0 warehouse security (shared)

| Helper | Location | Status |
|--------|----------|--------|
| `tenantCreateData()` | `packages/shared/src/tenant-data.ts` | ✅ generalized |
| `tenantPatchData()` | `packages/shared/src/tenant-data.ts` | ✅ generalized |
| Field allowlists | `packages/shared/src/warehouse/create-fields.ts` | ✅ 11 resources |
| Web re-export | `apps/web/src/lib/warehouse/create-fields.ts` | ✅ Prisma-typed wrappers |

v1 POST/PATCH never spread raw body; PATCH uses allowlists. Legacy routes unchanged for rollback parity (including legacy mass-assignment gap).

---

## F. Fastify module (`apps/api/src/modules/warehouse/`)

| File | Role |
|------|------|
| `dto.ts` | Date serialization for JSON parity |
| `repository.ts` | Tenant-scoped Prisma access |
| `service.ts` | Orchestration |
| `routes.ts` | 36 `/v1/warehouse/*` endpoints |

All reads/writes scope by `auth.companyId` from session — never `body.companyId`.

---

## G. Module guard

| Module key | Legacy | V1 | Verified roles |
|------------|--------|-----|----------------|
| `warehouse` | `requireModuleAccess(..., "warehouse")` (partial on legacy) | `requireModule(..., "warehouse")` on **all** v1 handlers | owner ✅, warehouse-manager ✅, dispatcher ❌ |

---

## H. Branch security

**N/A** — warehouse Prisma models have no `branchId`. Documented; no injection surface.

---

## I. FK tenant validation

**N/A** — no FK columns. String references (`skuCode`, `inboundRef`) are not cross-table FKs. v1 rejects `companyId`/`id` injection via Zod strict + patch allowlists.

---

## J. V1 endpoints (36)

Canonical wrapped routes mirror Pattern A legacy (`skus`, `inbound`, `outbound`, `storage`, `pod-receive`, `pick-pack`, `cycle-count`, `cross-dock`).  
Legacy-style raw-array routes preserved for `pick-list`, `returns`, `yard`, `dock-appt` including DELETE `{ success: true }` where legacy had it.

---

## K. Response parity

| Pattern | Legacy | V1 | Parity |
|---------|--------|-----|--------|
| Wrapped collections | `{ skus }`, `{ shipments }`, etc. | Same keys | ✅ |
| Raw arrays | returns, yard, dock-appt GET | Same | ✅ |
| POST status codes | 201 (canonical) / 200 (legacy-style) | Preserved per route | ✅ |
| DELETE | `{ success: true }` | Same | ✅ |

---

## L. Status transitions & quantity integrity

No server-side transition state machines in legacy — status/qty fields updated directly. v1 preserves pass-through updates on allowed fields only. No automatic stock ledger coupling (documented P2).

---

## M. Frontend cutover

| Consumer | Change |
|----------|--------|
| `warehouse-store.ts` | All 33 API calls via `warehouse-api.ts` → `domain: warehouse` → `/api/v1/warehouse/*` |
| Static UI arrays | **Not replaced** (per scope) |
| Warehouse Field module | **Untouched** |

Rollback: `NEXT_PUBLIC_WAREHOUSE_API_VERSION=legacy` (default `v1`).

---

## N. Legacy routes

24 files preserved, `@deprecated` headers added. No schema changes.

---

## O. Parity tests

| Suite | Cases |
|-------|-------|
| `pilot-api-routing.test.ts` | +2 warehouse v1/legacy URL tests |
| `pilot-parity.test.ts` | +1 warehouse module gate + SKU DTO shape |
| `warehouse-domains.test.ts` | 8 (SKU security matrix, returns raw array, inbound wrap) |

---

## P. Warehouse security tests

| Scenario | Result |
|----------|--------|
| Anonymous GET → 401 AUTH_REQUIRED | ✅ |
| Module denial (dispatcher) → 403 | ✅ |
| Cross-tenant PATCH → 404 | ✅ |
| companyId injection POST → 400 | ✅ |
| id/companyId mass assignment PATCH → 400 | ✅ |
| Same-company SKU CRUD | ✅ |
| Returns raw array + DELETE | ✅ |

---

## Q. Mass assignment tests

v1 Zod `.strict()` rejects unknown fields on POST; PATCH rejects `id`, `companyId`, `createdAt`, `updatedAt` via allowlist + strict schemas.

---

## R. `logAudit()` preservation

| Domain | Legacy audit | V1 audit |
|--------|--------------|----------|
| All warehouse resources | **Not used** | **Not used** (documented — no audit in legacy) |

---

## S. Performance review (P2 debt)

| Item | Severity |
|------|----------|
| List endpoints fetch full tenant tables (no pagination) | P2 |
| Global unique business keys (`skuCode`, `grn`, …) | P2 (pre-existing) |
| No stock movement ledger on qty PATCH | P2 |

---

## T. Total tests

| Metric | Result |
|--------|--------|
| B0 security | **18/18 PASS** |
| B0A-0/1 auth | **12/12 PASS** |
| B0A-2 pilot | **21/21 PASS** |
| B0A-3 warehouse | **11/11 PASS** |
| **Total** | **77/77 PASS** |

---

## U. TypeScript / lint / builds

| Command | Result |
|---------|--------|
| `npm run typecheck` | **0 errors** |
| `npm run lint` | **PASS** (4 cosmetic warnings) |
| `npm run build:web` | **PASS** |
| `npm run build:api` | **PASS** |

---

## V. Security regression

B0 + B0A-1 + B0A-2 tests pass unchanged.

---

## W. OpenAPI

`packages/contracts/openapi.yaml` documents all 36 warehouse v1 paths.

---

## X. B0A-3 Decision

**PASS — Warehouse extracted to Fastify `/v1/warehouse/*` with tenant isolation, module guards on all v1 handlers, shared create/patch allowlists, frontend store cutover, legacy rollback, and security/parity tests.**

---

*End of B0A-3 verification report.*

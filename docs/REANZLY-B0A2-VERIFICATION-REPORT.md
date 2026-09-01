# Reanzly B0A-2 Verification Report

**Date:** 2026-09-01  
**Starting HEAD:** `77270e1b6462ee27a6dfd29a256096d283426849`  
**Branch:** `main`  
**Scope:** B0A-2 — Low-Risk Domain Extraction (Reminders + Knowledge + Helpdesk)

---

## A. Pre-flight baseline

| Item | Value |
|------|-------|
| Branch | `main` |
| Starting HEAD | `77270e1b6462ee27a6dfd29a256096d283426849` |
| Node | v24.14.1 |
| npm | 11.11.0 |
| `npm ci` | **PASS** |
| `npm run typecheck` (pre) | **0 errors** |
| `npm run lint` (pre) | **PASS** (4 cosmetic warnings) |
| `npm test` (pre) | **45/45 PASS** |
| `npm run build:web` / `build:api` (pre) | **PASS** |

---

## B. Legacy route inventory

| Method | Legacy Route | Frontend Consumer | Auth | Module Gate | Tenant Filter | Prisma Model | Response Shape |
|--------|--------------|-------------------|------|-------------|---------------|--------------|----------------|
| GET | `/api/reminders` | `reminders/index.tsx` | Session | `reminders` | `companyId` | `Reminder` | `{ reminders: ReminderDto[] }` |
| POST | `/api/reminders` | `reminders/index.tsx` | Session | `reminders` | `companyId` on create | `Reminder` | `{ reminder }` 201 |
| PATCH | `/api/reminders/[id]` | `reminders/index.tsx` | Session | `reminders` | `companyId` on lookup | `Reminder` | `{ reminder }` |
| DELETE | `/api/reminders/[id]` | — (list update only) | Session | `reminders` | `companyId` on lookup | `Reminder` | `{ ok: true }` |
| GET | `/api/knowledge` | `knowledge/index.tsx` | Session | `knowledge` | `companyId` | `KnowledgeArticle` | `{ articles: ArticleDto[] }` |
| POST | `/api/knowledge` | `knowledge/index.tsx` | Session | `knowledge` | `companyId` on create | `KnowledgeArticle` | `{ article }` 201 |
| GET | `/api/knowledge/[id]` | `knowledge/article-detail.tsx` | Session | `knowledge` | `companyId` | `KnowledgeArticle` | `{ article }` + computed `related` |
| PATCH | `/api/knowledge/[id]` | `knowledge/article-detail.tsx` | Session | `knowledge` | `companyId` | `KnowledgeArticle` | `{ article }` |
| GET | `/api/helpdesk` | `helpdesk/index.tsx` | Session | `helpdesk` | `companyId` | `HelpdeskTicket` | `{ tickets: TicketDto[] }` |
| POST | `/api/helpdesk` | `helpdesk/index.tsx` | Session | `helpdesk` | `companyId` on create | `HelpdeskTicket` | `{ ticket }` 201 |
| GET | `/api/helpdesk/[id]` | `helpdesk/ticket-detail.tsx` | Session | `helpdesk` | `companyId` | `HelpdeskTicket` | `{ ticket }` (id or ticketId) |
| PATCH | `/api/helpdesk/[id]` | `helpdesk/index.tsx`, `ticket-detail.tsx` | Session | `helpdesk` | `companyId` | `HelpdeskTicket` | `{ ticket }` |

No archive, pagination, search, or filter query params exist in legacy handlers.

---

## C. `packages/contracts`

| Schema | Status |
|--------|--------|
| `ReminderCreateSchema` / `ReminderPatchSchema` / DTOs | ✅ strict, no `companyId` |
| `KnowledgeCreateSchema` / `KnowledgePatchSchema` / DTOs | ✅ strict, no Prisma JSON column names |
| `HelpdeskCreateSchema` / `HelpdeskPatchSchema` / DTOs | ✅ strict, no trusted tenant fields |
| OpenAPI `packages/contracts/openapi.yaml` | ✅ pilot v1 paths documented |

---

## D. Fastify modules (`apps/api`)

| Domain | routes.ts | service.ts | repository.ts | Status |
|--------|-----------|------------|---------------|--------|
| reminders | ✅ | ✅ | ✅ | `/v1/reminders/*` |
| knowledge | ✅ | ✅ | ✅ | `/v1/knowledge/*` |
| helpdesk | ✅ | ✅ | ✅ | `/v1/helpdesk/*` |

All repositories scope queries by `auth.companyId` from session — never `body.companyId` or `query.companyId`.

---

## E. Module guards

| Module | Legacy guard | V1 guard | Cluster parent |
|--------|--------------|----------|----------------|
| reminders | `requireModuleAccess(..., "reminders")` | `requireModule(..., "reminders")` | — |
| knowledge | `requireModuleAccess(..., "knowledge")` | `requireModule(..., "knowledge")` | `documents` |
| helpdesk | `requireModuleAccess(..., "helpdesk")` | `requireModule(..., "helpdesk")` | `crm` |

Shared logic: `packages/shared/src/permissions.ts` (`hasModuleAccess`, `MODULE_PARENT`).

---

## F. V1 endpoints

| Legacy | V1 | Parity |
|--------|-----|--------|
| GET/POST `/api/reminders` | GET/POST `/v1/reminders` | ✅ |
| PATCH/DELETE `/api/reminders/[id]` | PATCH/DELETE `/v1/reminders/:id` | ✅ |
| GET/POST `/api/knowledge` | GET/POST `/v1/knowledge` | ✅ |
| GET/PATCH `/api/knowledge/[id]` | GET/PATCH `/v1/knowledge/:id` | ✅ |
| GET/POST `/api/helpdesk` | GET/POST `/v1/helpdesk` | ✅ |
| GET/PATCH `/api/helpdesk/[id]` | GET/PATCH `/v1/helpdesk/:id` | ✅ |

v1 errors use envelope `{ error: { code, message } }` with codes `AUTH_REQUIRED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`.

---

## G. Reminders security tests (8 scenarios)

| # | Scenario | Result |
|---|----------|--------|
| 1 | Unauthenticated list → 401 AUTH_REQUIRED | ✅ |
| 2 | Module denial (dispatcher) → 403 FORBIDDEN | ✅ |
| 3 | Cross-tenant PATCH → 404 NOT_FOUND | ✅ |
| 4 | Cross-tenant DELETE → 404 NOT_FOUND | ✅ |
| 5 | `companyId` injection in POST → 400 (Zod strict) | ✅ |
| 6 | Cross-tenant vehicle FK not linked | ✅ |
| 7 | Tenant vehicle FK resolves entity | ✅ |
| 8 | CRUD happy path | ✅ |

---

## H. Knowledge security tests

| Scenario | Result |
|----------|--------|
| Cross-tenant GET → 404 | ✅ |
| Module denial | ✅ |
| CRUD + `logAudit` on create | ✅ |
| `companyId` injection rejected | ✅ |
| RAG/Rean routes untouched | ✅ (no migration) |

---

## I. Helpdesk security tests

| Scenario | Result |
|----------|--------|
| Cross-tenant GET → 404 | ✅ |
| Assignee patch tenant-scoped | ✅ |
| `companyId` injection rejected | ✅ |
| Ticket lookup by cuid or `ticketId` | ✅ |

---

## J. `logAudit()` preservation

| Domain | Legacy audit | V1 audit |
|--------|--------------|----------|
| reminders | Not used | Not used (documented) |
| knowledge | CREATE, STATUS_CHANGE | ✅ preserved |
| helpdesk | CREATE, STATUS_CHANGE, assignee UPDATE | ✅ preserved |

---

## K. Frontend cutover

| Consumer | Migrated to `pilot-api.ts` → `/api/v1/*` |
|----------|----------------------------------------|
| `reminders/index.tsx` | ✅ |
| `knowledge/index.tsx` | ✅ |
| `knowledge/article-detail.tsx` | ✅ |
| `helpdesk/index.tsx` | ✅ |
| `helpdesk/ticket-detail.tsx` | ✅ |

No UI/routing changes. Uses centralized `api()` client with domain flags.

---

## L. Rollback flags

| Env var | Values | Default |
|---------|--------|---------|
| `NEXT_PUBLIC_REMINDERS_API_VERSION` | `v1` \| `legacy` | `v1` |
| `NEXT_PUBLIC_KNOWLEDGE_API_VERSION` | `v1` \| `legacy` | `v1` |
| `NEXT_PUBLIC_HELPDESK_API_VERSION` | `v1` \| `legacy` | `v1` |
| `REANZLY_*_API_VERSION` | same | `v1` |

---

## M. Legacy routes

All 6 legacy handlers preserved with `@deprecated` comments for rollback. No schema changes.

---

## N. Parity tests

| Suite | Cases |
|-------|-------|
| `pilot-parity.test.ts` | Module gates + DTO field shapes |
| `pilot-api-routing.test.ts` | v1 vs legacy URL resolution |

---

## O. New API tests

| Suite | Cases |
|-------|-------|
| `apps/api/test/pilot-domains.test.ts` | 14 |

---

## P. Total tests

| Metric | Result |
|--------|--------|
| B0 security tests | **18/18 PASS** |
| B0A-0 + B0A-1 prior | **45/45 PASS** (pre) |
| B0A-2 new tests | **21** |
| **Total** | **66/66 PASS** |

---

## Q. TypeScript / lint / builds

| Command | Result |
|---------|--------|
| `npm run typecheck` | **0 errors** |
| `npm run lint` | **PASS** (4 cosmetic warnings) |
| `npm run build:web` | **PASS** |
| `npm run build:api` | **PASS** |

---

## R. Security regression (B0 + B0A-1)

All 18 B0 security tests and 12 B0A-1 auth tests pass unchanged.

---

## S. OpenAPI

`packages/contracts/openapi.yaml` documents all migrated v1 pilot endpoints.

---

## T. Out of scope (confirmed)

| Item | Status |
|------|--------|
| warehouse, trips, vehicles, finance, HR, chat, Rean/SLM | Not migrated |
| Prisma schema changes | None |
| SPA routing / ModuleRouter | Unchanged |
| Push to remote | Not performed |

---

## U. Remaining blockers

| # | Item | Severity |
|---|------|----------|
| 1 | Next batch domain extraction (warehouse) | Planned |
| 2 | Full OpenAPI generation from Zod (automated) | P3 |

---

## V. B0A-2 Decision

**PASS — Reminders, Knowledge, and Helpdesk extracted to Fastify `/v1/*` with tenant isolation, module guards, frontend cutover, legacy rollback, and full test coverage.**

---

*End of B0A-2 verification report.*

# Reanzly Backend Separation Architecture & Extraction Audit (B0A)

**Audit date:** 2026-09-01  
**Auditor mode:** Read-only architecture audit (no extraction, no schema/auth changes)  
**Repository:** `d:\Reanzly`  
**Git HEAD:** `b9053f7f425a4661bd75b43dc3e93e31795c0eda` (`main`)  
**Prerequisites read:** `REANZLY-EXISTING-REPOSITORY-AUDIT.md`, `REANZLY-B0-VERIFICATION-REPORT.md`, `REANZLY-B0B-VERIFICATION-REPORT.md`, `API-SECURITY-CLASSIFICATION.md`

---

## Executive Summary

Reanzly is a **236-route Next.js 16 monolith** with **100 Prisma models**, **two existing mini-services** (chat on Bun/Socket.IO, SLM on Rust), and an **in-process DB-backed job queue** started via `instrumentation.ts`. B0/B0B closed the production toolchain and hardened critical security paths (driver scope, warehouse tenant create, storage IDOR, webhook signatures, chat internal broadcast, health/metrics exposure). **Backend separation is recommended** to decouple API scaling, worker lifecycle, and multi-portal consumption from the Next.js frontend deploy.

**Verdict:** Adopt an **npm workspaces monorepo** with `apps/web`, `apps/api` (Fastify modular monolith), `apps/worker`, retain `apps/chat` and `apps/slm-engine`, and shared `packages/database`, `packages/auth`, `packages/contracts`. Migrate incrementally behind a thin `api-client` with legacy `/api` fallback. Preserve B0 session-cookie auth (Option B: BFF + shared parent-domain cookie) — do not introduce JWT without a compelling cross-domain mobile-native requirement.

| Metric | Value |
|--------|-------|
| Total API route files | **236** |
| Prisma models | **100** |
| `src/lib/*` files with direct Prisma (excl. seeds) | **18** |
| Frontend files with `fetch("/api/...")` | **~135** |
| Server Actions (`"use server"`) | **0** |
| Centralized `api-client.ts` | **Absent** |
| Zod in API routes | **Not adopted** (dependency present) |
| B0 security tests | **18/18 passing** |

---

## A. Target Architecture

### A.1 Current state

```
┌─────────────────────────────────────────────────────────────────┐
│  apps/web (today: root Next.js 16)                              │
│  ├── src/app/dashboard (SPA shell + ModuleRouter)               │
│  ├── src/app/api/** (236 route handlers) ← ALL business API     │
│  └── instrumentation.ts → in-process queue worker               │
├─────────────────────────────────────────────────────────────────┤
│  mini-services/chat-service (Bun, :3003, bun:sqlite)            │
│  mini-services/slm-engine (Rust Axum, :3004, optional)          │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Prisma) + local ./storage + Job table queue        │
└─────────────────────────────────────────────────────────────────┘
```

### A.2 Proposed target state

```
┌──────────────┐     cookie/BFF      ┌──────────────────────────────┐
│  apps/web    │ ──────────────────► │  apps/api (Fastify)          │
│  Next.js UI  │   api.reanzly.com   │  Modular monolith, /v1/*     │
│  app.reanzly │                     │  Prisma via packages/database│
└──────────────┘                     └──────────────┬───────────────┘
       │                                            │
       │ WebSocket proxy                            │ enqueue
       ▼                                            ▼
┌──────────────┐                          ┌─────────────────┐
│  apps/chat   │◄── internal secret ──────│  apps/worker    │
│  Socket.IO   │                          │  Job consumers  │
└──────────────┘                          └─────────────────┘
       │                                            │
       └────────────────┬───────────────────────────┘
                        ▼
              ┌──────────────────┐     ┌─────────────────┐
              │  PostgreSQL RDS  │     │  S3 (future)    │
              └──────────────────┘     └─────────────────┘
                        ▲
              ┌─────────┴──────────┐
              │  apps/slm-engine │  (Rust, GPU inference)
              └──────────────────┘
```

### A.3 Package layout (proposed)

| Package / App | Responsibility |
|---------------|----------------|
| `apps/web` | Next.js UI only; no Prisma imports; `api-client` for HTTP |
| `apps/api` | Fastify HTTP API, auth middleware, domain modules, webhooks |
| `apps/worker` | Queue polling, `photo.process`, `automation.run`, alert scans |
| `apps/chat` | Rename/move `mini-services/chat-service`; Socket.IO + session validation |
| `apps/slm-engine` | Rename/move `mini-services/slm-engine`; GGUF inference |
| `packages/database` | `prisma/schema.prisma`, generated client, migrations |
| `packages/auth` | Session helpers, `getSessionUser`, scrypt, cookie constants |
| `packages/contracts` | Zod DTOs, shared enums, OpenAPI-generated types |
| `packages/shared` | `api-guards`, permissions, storage drivers, queue enqueue API |

### A.4 Framework comparison (objective, repo-grounded)

| Criterion | Next.js Route Handlers (status quo) | **Fastify** | NestJS | Express |
|-----------|-------------------------------------|-------------|--------|---------|
| Migration cost from 236 handlers | **Lowest** (already there) | **Medium** — port handlers to plugins/routes | **High** — DI modules, decorators | **Medium** — manual structure |
| TypeScript ergonomics | Good (App Router types) | **Excellent** (`@fastify/type-provider-zod`) | Excellent | Fair |
| Validation / schema | Ad-hoc per route | **Native plugin + Zod** | class-validator pipes | Manual |
| Performance / overhead | Moderate (Next bundling) | **High throughput** | Moderate | High throughput |
| Matches repo style | Yes (flat route files) | **Yes** (modular, minimal ceremony) | No (heavy abstraction) | Yes but unstructured |
| Worker separation | Coupled via `instrumentation.ts` | **Clean split** with `apps/worker` | Clean split | Clean split |
| Team familiarity (from codebase) | **100%** | Partial (none yet) | None | Common |
| Multi-service deploy | Poor (monolith image) | **Good** | Good | Good |

**Recommendation:** **Fastify** for `apps/api`. Keeping Next.js route handlers long-term couples API deploys to frontend builds, prevents independent ECS scaling, and retains the anti-pattern of starting background workers inside the web process (`src/instrumentation.ts`). NestJS adds ceremony disproportionate to the repo's flat route-handler style. Express lacks built-in schema validation — the codebase already depends on Zod (`^4.0.2`) but does not use it in routes.

**Interim:** Next.js route handlers remain as **legacy shim** during migration; new endpoints land only in `apps/api`.

---

## B. API Dependency Map

**Total route files:** 236 (verified via `Get-ChildItem src/app/api/**/route.ts`).

Legend: **Auth** = primary guard pattern; **Perm** = `requireModuleAccess` or equivalent; **Queue** = calls `enqueue()`; **Storage** = object storage; **Chat** = broadcasts to chat-service; **SLM** = Rean/SLM inference; **Ext** = external integration.

### B.1 Domain inventory

| Domain | Routes | Auth | Permissions | Prisma Models (primary) | Shared Helpers | Queue | Storage | Chat | SLM | Ext | Frontend Consumers |
|--------|--------|------|-------------|-------------------------|----------------|-------|---------|------|-----|-----|-------------------|
| **warehouse** | 24 | Session | `warehouse` module | `WarehouseSku`, `WarehouseInbound`, `WarehouseOutbound`, `WarehouseStorageLocation`, `WarehousePodReceive`, `WarehousePickList`, `WarehouseCycleCount`, `WarehouseCrossDock`, `WarehouseReturn`, `WarehouseYard`, `WarehouseDockAppt` | `warehouse/create-fields.ts`, `api-guards.tenantCreateData` | — | — | — | — | — | `warehouse-store.ts` (33 fetches; UI module not wired) |
| **broker** | 20 | Session | Broker modules + `broker.ts` scope | `BrokerProfile`, `BrokerEnquiry`, `BrokerQuote`, `BrokerSettlement`, `BrokerPayout`, `BrokerCompliance`, `BrokerSubBroker`, `BrokerLaneRate`, `BrokerSupportTicket`, `BrokerDocument` | `lib/broker.ts` | — | — | — | — | — | 10× `use-broker-*-data.ts`, `use-broker-api.ts` |
| **hr** | 20 | Session | `hr`, `drivers-staff` | `Employee`, `Attendance`, `Leave`, `Position`, `Candidate`, `Interview`, `Offer`, `HrDocRequest`, `Issuance`, `PayrollRun` (HR) | — | — | — | — | — | — | `hr/_store.ts` (11 fetches) |
| **payroll** | 17 | Session | `payroll` | `PayrollCycle`, `PayrollStructure`, `Payslip`, `PayrollBonus`, `PayrollLoan`, `PayrollReimbursement`, `PayrollStatutory`, `BankAdvice` | — | — | — | — | — | — | `payroll/*` tabs (~40 fetches) |
| **vendor-portal** | 14 | Session | Portal `customerId` scope | `Customer`, shipments, invoices, RFQ, tickets, POD, ledger views | `lib/vendor-portal.ts` | — | — | — | — | — | `vendor-portal/*`, `vendor-shell.tsx` |
| **auth** | 10 | Public/mixed | N/A | `User`, `Session`, `Company`, `Driver`, `BrokerProfile` (signup) | `lib/auth.ts` | — | — | — | — | — | `login-screen`, `signup-screen`, `header`, `profile` |
| **crm** | 10 | Session | `crm` + children | `CrmAccount`, `CrmContact`, `CrmDeal`, `CrmLead`, `CrmActivity` | — | — | — | — | — | — | `crm/_store.ts` |
| **ledger** | 9 | Session | `ledger` | `LedgerAccount`, `JournalEntry`, `GstReturn`, `GstRecon` | `ledger/_lib.ts` | — | — | — | — | — | `use-ledger-data.ts`, `use-gst-data.ts` |
| **reports** | 7 | Session | `reports` | `ReportDefinition`, `ScheduledReport`, `CustomReport` | `lib/reports-engine.ts` | `report.generate` (partial) | export blobs | — | — | — | `use-reports-data.ts` |
| **superadmin** | 6 | Platform admin | `requirePlatformAdmin` / `requireSuperadmin` | `FeatureFlag`, `Gateway`, `Backup`, `BackupSchedule`, platform audit | `lib/superadmin-audit.ts` | — | backup paths | — | — | — | `use-superadmin-*-data.ts` |
| **operations** | 6 | Session | `operations-hub` | `OpsTask`, `OpsSprint`, attachments, comments | `operations/_lib.ts` | — | task attachments | — | — | — | `use-operations-data.ts` |
| **automation** | 6 | Session | `automation` | `Automation`, `AutomationLog` | `lib/automation-engine.ts` | `automation.run` | — | — | Rean draft | — | `use-automation-data.ts`, `ask-rean-drawer` |
| **chat** | 5 | Session | Participant scope | `Conversation`, `Message`, `ChatCall` | `chat-broadcast.ts` | `photo.process` | upload → storage | **self** | Rean auto-reply | — | `chat-store.ts`, `chat-call.tsx` |
| **billing** | 4 | Session | `settings` | `Subscription`, `PaymentMethod`, `BillingPlan` | — | — | — | — | — | payment gateways (stub) | `settings/billing.tsx` |
| **integrations** | 4 | Session + webhook sig | `integrations` | `IntegrationConnection`, logs | `webhook-verify.ts` | — | — | — | — | **webhook inbound** | `integrations-store.ts` |
| **planning** | 4 | Session | `planning` | `PlanningResource`, `PlanningAllocation` | `planning/_lib.ts` | — | — | — | — | — | `use-planning-data.ts` |
| **notifications** | 3 | Session (auth-only) | User inbox | `Notification` | `lib/notify.ts` | `notification.dispatch` (stub) | — | — | — | — | `header.tsx` |
| **financial-services** | 3 | Session | `financial-services` | `FinancialApplication` | `financial-services-engine.ts` | — | — | — | — | simulated offers | `use-financial-services-data.ts` |
| **driver** | 3 | Session + driver scope | Role-scoped | `Driver`, `DriverActivity`, `DriverLocation` | `driver-access.ts`, `driver-session.ts` | `location.batch`, `photo.process` | activity photos | — | — | — | `driver-store.ts` |
| **trips** | 2 | Session | `trips` | `Trip`, legs, costs | — | — | — | — | db-tool allowlist | — | `trips/*` (~15 fetches) |
| **vehicles** | 2 | Session | `vehicles` | `Vehicle` | — | — | — | — | db-tool | — | `vehicles/*` (~20 fetches) |
| **drivers** | 2 | Session | `drivers-staff` | `Driver` | — | — | — | — | db-tool | — | `drivers-staff/*` |
| **invoices** | 2 | Session | `invoice` | `Invoice`, lines | — | — | — | — | db-tool | — | `invoice/*` |
| **expenses** | 2 | Session | `expenses` | `Expense` | — | — | receipts | — | db-tool | — | `expenses/*` |
| **lorry-receipts** | 2 | Session | `lorry-receipts` | `LorryReceipt` | — | — | — | — | — | — | `lorry-receipts/*` |
| **pod** | 2 | Session | `pod` | `PodRecord` | — | — | POD images | — | — | — | `pod-store.ts` |
| **purchase-orders** | 2 | Session | `purchase` | `PurchaseOrder` | — | — | — | — | — | — | `purchase/*` |
| **quality-checks** | 2 | Session | `quality` | `QualityCheck` | — | — | — | — | — | — | `quality/*` |
| **helpdesk** | 2 | Session | `helpdesk` | `HelpdeskTicket` | — | — | — | — | — | — | `helpdesk/*` |
| **knowledge** | 2 | Session | `knowledge` | `KnowledgeArticle` | — | — | — | — | RAG corpus | — | `knowledge/*` |
| **reminders** | 2 | Session | `reminders` | `Reminder` | — | — | — | — | — | — | `reminders/*` |
| **issues** | 2 | Session | `issues` | `Issue` | — | — | — | — | db-tool | — | `issues/*` |
| **inspections** | 2 | Session | `inspection` | `Inspection` | — | — | — | — | — | — | `inspection/*` |
| **work-orders** | 2 | Session | `maintenance` | `WorkOrder` | — | — | — | — | — | — | `maintenance/*` |
| **fuel-entries** | 2 | Session | `fuel-energy` | `FuelEntry` | — | — | — | — | — | — | `fuel-energy/*` |
| **field-service** | 2 | Session | `field-service` | `FieldServiceTask` | — | — | — | — | — | — | `use-field-service-data.ts` |
| **customers** | 2 | Session | `customers` | `Customer` | — | — | — | — | db-tool | — | `customers/*` |
| **vendors** | 2 | Session | `vendors` | `Vendor` | — | — | — | — | db-tool | — | `vendors/*` |
| **documents** | 2 | Session | `documents` | `Document` (metadata) | — | — | metadata only | — | — | — | `documents/*` |
| **approvals** | 2 | Session | `approvals` | `Approval` | — | — | — | — | — | — | `approvals/*` |
| **rate-cards** | 2 | Session | `rate-cards` | `RateCard` | — | — | — | — | — | — | `rate-cards/*` |
| **service-templates** | 2 | Session | `services` | `ServiceTemplate` | — | — | — | — | — | — | `services/*` |
| **treasury** | 2 | Session | `payments` | `TreasuryVoucher` | — | — | — | — | — | — | `use-treasury-data.ts` |
| **slm** | 2 | Superadmin / session | Platform / session | `SlmMemory`, `SlmFeedback` | `lib/slm/*` | — | — | — | **core** | — | `slm-playground`, `slm-overview` |
| **rean** | 1 | Session | Session + rate limit | Many via db-tool allowlist | `slm/db-tool`, `rag`, `self-learning` | — | — | — | **core** | — | `ask-rean-drawer`, automation |
| **storage** | 1 | Session + ownership | `canAccessStorageObject` | metadata refs across models | `storage/access-control.ts`, `object-storage.ts` | via `photo.process` | **core** | chat photos | — | — | indirect via upload URLs |
| **dashboard** | 1 | Session (auth-only) | Read aggregate | cross-model counts | — | — | — | — | — | — | `stats-context.tsx` |
| **audit-log** | 1 | Session | `settings`/audit | `AuditLog` | `lib/audit.ts` | `audit.log` | — | — | — | — | `use-audit-log.ts` |
| **metrics** | 1 | Internal OR superadmin | B0 hardened | table counts | — | — | — | — | — | — | `system-design` (internal) |
| **health** | 1 | Public | N/A | — | — | — | — | — | — | deploy probe | deploy scripts |
| **queue** | 1 | Superadmin / internal | Platform | `Job` | `lib/queue` | **admin** | — | — | — | — | superadmin (indirect) |
| **data** | 1 | Session | `dashboard` | seed/bootstrap | — | — | — | — | — | — | legacy bootstrap |
| **users** | 1 | Session | `settings` | `User` | — | — | — | — | — | — | settings (read-only gap) |
| **service-programs** | 1 | Session | `services` | `ServiceProgram` | — | — | — | — | — | — | `services/*` |
| **root `/api`** | 1 | Public | N/A | — | — | — | — | — | — | — | — |

### B.2 Cross-cutting dependency graph

```
auth (session cookie)
  └──► all session routes (~210)
permissions (mock-data RBAC)
  └──► ~170 routes with requireModuleAccess
api-guards (tenant create/patch, internal secret)
  └──► warehouse POST, metrics, webhooks
driver-access
  └──► /api/driver/*
vendor-portal.ts
  └──► /api/vendor-portal/*
broker.ts
  └──► /api/broker/*
queue.enqueue
  └──► driver/activity, automation-engine, alert scan loop
storage (object-storage + access-control)
  └──► /api/storage, chat/upload, driver photos, task attachments
chat-broadcast (CHAT_INTERNAL_SECRET)
  └──► /api/chat/conversations, /api/chat/messages
slm/* (db-tool allowlist, RAG, infer client)
  └──► /api/rean, /api/slm/chat, automation/draft-with-rean
reports-engine, automation-engine, financial-services-engine
  └──► respective domain routes + worker handlers
```

### B.3 External integration touchpoints

| Surface | Route / File | Direction | B0 Status |
|---------|--------------|-----------|-----------|
| Webhook receiver | `/api/integrations/webhook/[providerId]` | Inbound | Signature verified |
| Sync trigger | `/api/integrations/[id]/sync` | Outbound | **Simulated** (`setTimeout`) |
| Provider CRUD | `/api/integrations/*` | — | Real DB |
| Payment webhooks | Stripe/Razorpay/etc. registry | Inbound | Env-secret HMAC |
| Chat internal | `chat-service POST /internal/broadcast` | Internal | Secret required (B0) |
| SLM inference | `slm-engine :3004` / local-engine fallback | Internal | Optional Rust service |

---

## C. Auth Extraction

### C.1 Current implementation

- **Mechanism:** Opaque DB-backed session token in HttpOnly cookie `reanzly_session` (`src/lib/auth.ts`).
- **Hashing:** scrypt password verification (not NextAuth at runtime despite dependency).
- **Socket auth:** `getSessionUserByToken()` for chat-service handshake; chat-service reads same `Session` table via `bun:sqlite`.
- **No JWT** — intentional; logout revokes server-side immediately.

### C.2 Extraction options

| Option | Description | Fit for Reanzly |
|--------|-------------|-----------------|
| **A — Shared-domain cookie** | `api.reanzly.com` + `app.reanzly.com` share cookie via `Domain=.reanzly.com` | **Good** after API on subdomain |
| **B — BFF/proxy (recommended Phase 1)** | Next.js rewrites `/api/*` → `apps/api`; cookie set by API, forwarded by web | **Best for incremental migration** |
| **C — Token-based (JWT/API keys)** | Bearer tokens for mobile/third-party | Defer unless native apps need offline refresh |

### C.3 Recommended: Option B → A

**Phase 1 (BFF):** `apps/web` proxies `/api/v1/*` and legacy `/api/*` to `apps/api`. Cookie set by API responses with `Path=/`, `SameSite=Lax`, `Secure` in production. Next.js `rewrites` in `next.config.ts` — no CORS needed for browser (same-origin to web).

**Phase 2 (direct API subdomain):** Move to `api.reanzly.com` with `Domain=.reanzly.com` cookie. Enable `credentials: 'include'` only for known portal origins.

| Concern | Recommendation |
|---------|----------------|
| Cookie domain | `.reanzly.com` in prod; `localhost` dev (separate ports use proxy) |
| SameSite | `Lax` (current) — sufficient for top-level navigations; `None`+`Secure` only if cross-site embed |
| CORS | Restrict to `app.`, `vendor.`, `broker.`, `driver.` portal origins when calling API directly |
| CSRF | SameSite=Lax + no cookie on cross-site POST; add CSRF token for state-changing forms if `SameSite=None` |
| Credentials | `credentials: 'include'` in `api-client`; never send session token in JS-accessible storage |
| Logout | `POST /v1/auth/logout` deletes `Session` row + clears cookie (preserve current behavior) |
| Session renewal | Extend `expiresAt` on activity (optional); current 30-day TTL |
| Portal implications | Vendor/broker/driver portals on subdomains share parent-domain cookie in Phase 2 |
| Mobile driver app | Future: long-lived refresh token table OR device-bound session — not JWT by default |

**Do not recommend JWT** unless a future native app cannot use cookie jar + secure WebView. The existing opaque session model is correct for multi-tenant ERP.

---

## D. Prisma Ownership

### D.1 Import locations (verified)

| Location | Count / Files | Migration target |
|----------|---------------|------------------|
| `src/app/api/**/route.ts` | ~220 route files | → `apps/api` domain services + repositories |
| `src/lib/auth.ts` | 1 | → `packages/auth` |
| `src/lib/queue/index.ts` | 1 | → `apps/worker` (+ enqueue client in `packages/shared`) |
| `src/lib/audit.ts`, `superadmin-audit.ts` | 2 | → `packages/shared` or `apps/api` platform module |
| `src/lib/automation-engine.ts` | 1 | → `apps/worker` handler + `apps/api` trigger routes |
| `src/lib/reports-engine.ts` | 1 | → `apps/worker` (`report.generate`) |
| `src/lib/broker.ts`, `vendor-portal.ts` | 2 | → `apps/api` portal modules |
| `src/lib/driver-access.ts`, `driver-session.ts` | 2 | → `packages/auth` + `apps/api/driver` |
| `src/lib/storage/access-control.ts` | 1 | → `packages/shared` (used by API + worker) |
| `src/lib/notify.ts` | 1 | → `apps/worker` |
| `src/lib/financial-services-engine.ts` | 1 | → `apps/api` |
| `src/lib/slm/*` (5 files) | 5 | → `apps/api/rean` module (+ calls to `apps/slm-engine`) |
| `src/lib/warehouse/create-fields.ts` | types only | → `packages/contracts` + API mappers |
| `src/scripts/seed-*.ts` | 30+ | → `packages/database/scripts` (dev/CI only) |
| `mini-services/chat-service` | **bun:sqlite raw SQL** | → migrate to Prisma client from `packages/database` OR API-only writes |
| `src/components/**` | **0 Prisma imports** | ✅ Correct — maintain |

### D.2 Ownership rules

1. **`packages/database`** — sole owner of `schema.prisma`, migrations, generated client export.
2. **`apps/api`** — only app with full Prisma read/write for request path (via repository layer).
3. **`apps/worker`** — Prisma for job handlers; no HTTP surface.
4. **`apps/web`** — **zero Prisma** (Definition of Done).
5. **`apps/chat`** — prefer API calls for mutations; read-only Prisma or replicated session validation only.
6. **`apps/slm-engine`** — no Prisma (Rust); TS orchestration in API.

---

## E. Frontend API Consumer Inventory

### E.1 Summary

| Pattern | Files | Notes |
|---------|-------|-------|
| Direct `fetch("/api/...")` | ~135 files | No abstraction layer |
| Zustand stores with fetch | `app-store`, `chat-store`, `driver-store`, `pod-store`, `warehouse-store`, `integrations-store`, `crm/_store`, `hr/_store` | Mixed credentials (default same-origin cookie) |
| Custom hooks | `use-broker-api`, `use-*-data.ts` (15+) | Domain-specific |
| Server Actions | 0 | None |
| Direct Prisma in components | 0 | ✅ |

### E.2 Representative consumer table

| Frontend Module | API Prefix | Methods | Auth Assumption | Migration Complexity |
|-----------------|------------|---------|-----------------|---------------------|
| Auth (login/signup) | `/api/auth/*` | POST | Public → session cookie | **Low** — first mover |
| Dashboard stats | `/api/dashboard/stats` | GET | Session cookie | Low |
| Trips | `/api/trips`, `/api/lorry-receipts` | CRUD | Session + module | Medium |
| Vehicles | `/api/vehicles`, `/api/fuel-entries`, `/api/issues` | CRUD | Session + module | Medium |
| Drivers & staff | `/api/drivers`, `/api/hr/*` | CRUD | Session + module | Medium |
| Payroll | `/api/payroll/*` | CRUD | Session + module | **High** (17 API routes, money) |
| Ledger/GST | `/api/ledger/*` | CRUD | Session + module | **High** (tenant validation critical) |
| CRM | `/api/crm/*` | CRUD | Session + module | Medium |
| Broker network | `/api/broker/*` | CRUD | Session + broker scope | Medium (seed fallback) |
| Vendor portal | `/api/vendor-portal/*` | CRUD | Session + customer link | Medium |
| Driver field | `/api/driver/*` | GET/POST | Session + driver scope | **High** (B0 hardened) |
| Chat | `/api/chat/*` + Socket.IO | Mixed | Session + participant | **High** (real-time) |
| Warehouse | `/api/warehouse/*` | CRUD | Session + module | Low coupling (store exists; UI unwired) |
| Superadmin | `/api/superadmin/*`, `/api/metrics` | CRUD/GET | Platform admin | Medium |
| Automation/Rean | `/api/automation/*`, `/api/rean` | POST | Session + module | High (SLM coupling) |
| Reports | `/api/reports/*` | CRUD + run | Session + module | Medium |
| Operations hub | `/api/operations/*` | CRUD | Session + module | Medium |
| Settings/billing | `/api/billing/*`, `/api/auth/profile` | CRUD | Session | Medium |
| Integrations UI | `/api/integrations/*` | CRUD | Session + module | Low |
| Documents | `/api/documents/*` | CRUD | Session | Medium (no blob yet) |
| Payments/treasury | `/api/treasury/*` | CRUD | Session | Medium |

### E.3 `api-client.ts` recommendation

Introduce `packages/shared/src/api-client.ts`:

```typescript
// Conceptual — not implemented in B0A
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ""; // empty = same-origin proxy

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json() as Promise<T>;
}
```

**Feature flag per domain:** `API_ROUTING.warehouse = "v1" | "legacy"` enables gradual cutover without dual implementations in components.

---

## F. API Contract Strategy

### F.1 Current state

- **No Zod** in route handlers despite dependency.
- **No OpenAPI** spec; no shared DTO package.
- Frontend types are **inferred from fetch responses** or duplicated in component files.
- Some routes export Prisma `GetPayload` shapes implicitly via `NextResponse.json(entity)`.
- `src/lib/prisma-payload.ts` referenced in B0B fixes (untracked) — indicates move toward typed selects.

### F.2 Recommended stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Request validation | **Zod** schemas in `packages/contracts` | Parse + strip unknown fields (mass-assignment defense) |
| Response shaping | Zod `.parse()` on output OR explicit DTO mappers | Never leak Prisma internal fields |
| Documentation | **OpenAPI 3.1** generated from Zod (`@asteasolutions/zod-to-openapi`) | Portal + mobile consumers |
| Shared types | `packages/contracts` exported to web + api | Single source of truth |
| Prisma | **Internal only** — never imported in `apps/web` | DB adapter layer |

### F.3 Contract rules

1. Route handler returns `Contract.TripResponse`, not `Prisma.Trip`.
2. Pagination/filter query params validated by Zod.
3. Error envelope: `{ error: string, code?: string, details?: unknown }` — consistent across v1.
4. Breaking changes require `/v2` — see Section G.

---

## G. API Versioning

### G.1 Options

| Convention | Example | Pros | Cons |
|------------|---------|------|------|
| Path version | `/api/v1/trips` | Explicit, cacheable, gateway-friendly | Longer paths |
| Header version | `Accept: application/vnd.reanzly.v1+json` | Clean URLs | Harder to test/debug |
| Unversioned | `/api/trips` (current) | Zero migration | Breaking changes painful |

### G.2 Recommendation

- **New backend:** `/v1/{resource}` on `apps/api` (e.g. `/v1/trips`, `/v1/warehouse/inbound`).
- **Legacy shim:** `apps/web` rewrites `/api/trips` → `/v1/trips` during migration.
- **Do not** version per-module (`/api/v1/trips` + `/api/warehouse/...` unversioned).
- **Stability policy:** v1 frozen once domain migrated; additive fields only; removals → v2.

---

## H. Backend Module Structure

Modular monolith inside `apps/api/src/modules/` — ~50 domain folders matching existing route prefixes. **No useless ceremony:** flat structure per domain unless cross-cutting concern warrants a service.

```
apps/api/src/
├── app.ts                 # Fastify bootstrap, plugins
├── plugins/
│   ├── auth.ts            # session from cookie
│   ├── tenant.ts          # companyId context
│   └── permissions.ts     # requireModuleAccess port
├── modules/
│   ├── trips/
│   │   ├── routes.ts
│   │   ├── service.ts
│   │   └── repository.ts
│   ├── warehouse/
│   ├── ledger/
│   ├── auth/
│   └── ...
└── integrations/          # webhooks, provider adapters
```

**Extraction from route handlers:** Move Prisma calls to `repository.ts`, business rules to `service.ts`, HTTP to `routes.ts`. Existing `src/app/api/*/route.ts` become thin compatibility proxies until deleted.

**Shared `_lib.ts` files** (e.g. `ledger/_lib.ts`, `planning/_lib.ts`) → colocated `service.ts` in respective modules.

---

## I. Tenant Security Architecture

### I.1 B0 guarantees to preserve

1. `companyId` from session — never from request body on create.
2. `tenantCreateData` / `warehouseCreateMappers` allowlists on POST.
3. `tenantPatchData` strips `companyId`, `id`, timestamps on PATCH.
4. Driver routes use `resolveDriverScope()`.
5. Storage uses `canAccessStorageObject()`.
6. Ledger PATCH validates `accountId` ∈ tenant accounts.
7. Webhook signature before mutation.
8. Chat internal broadcast requires secret.

### I.2 Recommended pattern: **Request Context + Repository scoping**

```typescript
// packages/shared — conceptual
interface RequestContext {
  userId: string;
  companyId: string;
  role: string;
  brokerProfileId?: string;
  customerId?: string; // vendor portal
}

// Repository factory — mandatory companyId filter
function tripsRepo(ctx: RequestContext) {
  return {
    findMany: (where) => db.trip.findMany({ where: { companyId: ctx.companyId, ...where } }),
    create: (data) => db.trip.create({ data: { ...data, companyId: ctx.companyId } }),
  };
}
```

**Do not rely solely on Prisma Client Extensions** for tenant isolation — use explicit repository scoping (extensions as defense-in-depth only). Portals with alternate scope (`brokerProfileId`, `customerId`) get dedicated repository factories.

**Anti-pattern to eliminate:** `{ companyId: session.companyId, ...body }` spread — B0 fixed this in warehouse; audit all POST handlers during extraction.

---

## J. Validation & Mass Assignment

### J.1 Target request pipeline

```
HTTP Request
  → Zod schema parse (packages/contracts)     # strip unknown keys
  → Auth plugin (session cookie)
  → Permission guard (module / portal / driver scope)
  → Tenant context injection
  → Service layer (business rules)
  → Repository (scoped Prisma)
  → Response DTO (Zod output optional)
```

### J.2 Current gaps

- Manual `await req.json()` + field picking in each route.
- Warehouse uses `warehouseCreateMappers` — **good pattern to generalize**.
- No global validation; B0 uses allowlists ad hoc.

### J.3 Fastify enforcement

Use `@fastify/type-provider-zod` with route-level schemas:

```typescript
app.post("/v1/warehouse/inbound", {
  schema: { body: CreateInboundSchema, response: { 201: InboundResponseSchema } },
  preHandler: [requireAuth, requireModule("warehouse")],
}, handler);
```

---

## K. Background Job Extraction

### K.1 Current implementation

| Component | Location | Behavior |
|-----------|----------|----------|
| Job model | `prisma/schema.prisma` `Job` | Postgres-backed |
| Queue lib | `src/lib/queue/index.ts` | Poll every 500ms, in-process |
| Worker start | `src/instrumentation.ts` | Starts on Next.js boot |
| Enqueue callers | `driver/activity`, `automation-engine`, alert scan | 3 paths |
| Admin | `/api/queue/status` | Superadmin |

### K.2 Job types

| Type | Handler | Production readiness |
|------|---------|-------------------|
| `photo.process` | Storage upload + metadata | **Real** |
| `location.batch` | GPS batch write | Real (minimal) |
| `audit.log` | AuditLog append | Real |
| `automation.run` | `runAutomationOnce` | Real |
| `notifications.scan-alerts` | Overdue scan loop | Real |
| `notification.dispatch` | `console.log` | **Simulated** |
| `report.generate` | Lazy registered | Partial |
| `cache.invalidate` | Tag bust | Real |

### K.3 Extraction plan

| Component | Target | Notes |
|-----------|--------|-------|
| Worker loop | `apps/worker` | Standalone Node process, ECS service |
| `enqueue()` | `packages/shared/queue-client` | Writes to `Job` table |
| `instrumentation.ts` | **Remove** worker start from web | Web only enqueues |
| DB queue vs Redis | **Phase 1: keep DB queue** | Already durable; swap to BullMQ+Redis when >100 jobs/sec |
| Alert scan | `apps/worker` cron | Replace `startAlertScan()` in instrumentation |

**Rationale for DB queue first:** Job table exists, handlers work, 18 tests pass. Redis adds ops complexity before scale requires it.

---

## L. Chat Service

### L.1 Architecture today

- **REST:** `/api/chat/*` in Next.js (conversations, messages, upload, calls, init).
- **WebSocket:** `mini-services/chat-service` on :3003, `bun:sqlite` direct DB.
- **Auth:** Cookie parsed in chat-service; validates `Session` table.
- **Internal:** `POST /internal/broadcast` — B0 requires `CHAT_INTERNAL_SECRET`.
- **Coupling:** `chat-broadcast.ts` in Next.js calls chat-service HTTP.

### L.2 Extraction options

| Model | Pros | Cons |
|-------|------|------|
| Direct DB (current) | Low latency | Schema drift, dual access path |
| API-only mutations | Single write path | Added latency for messages |
| **Hybrid (recommended)** | WS for real-time; API for persistence + auth | Moderate complexity |

### L.3 Recommendation

1. Move to `apps/chat`; use `packages/database` Prisma client (retire `bun:sqlite` raw SQL).
2. Message persistence via `apps/api` internal endpoints OR shared Prisma with strict module boundaries.
3. Caddy/`Caddyfile.prod` must proxy WebSocket to chat port (audit notes gap).
4. `apps/web` connects Socket.IO to `wss://chat.reanzly.com` (or same-origin proxy `/socket.io`).

---

## M. SLM / Rean

### M.1 Coupling map

```
/api/rean (session, rate limit)
  ├── slm/local-engine.ts (keyword fallback)
  ├── slm/client.ts → slm-engine :3004 (Rust)
  ├── slm/db-tool.ts (ALLOWED_MODELS allowlist + confirm gate)
  ├── slm/rag.ts (knowledge corpus)
  └── slm/self-learning.ts (memory)

/api/slm/chat (superadmin)
  └── Same inference stack

/api/automation/draft-with-rean
  └── Rean for automation drafts

chat-service
  └── Hardcoded POST localhost:3000/api/rean (auto-reply)
```

### M.2 Allowlists to preserve

`ALLOWED_MODELS` in `db-tool.ts`: vehicle, driver, customer, vendor, trip, invoice, expense, issue, (+ more). Writable fields explicitly enumerated. **Confirm/reject gate** for mutations must survive extraction.

### M.3 Recommendation

- `apps/api/src/modules/rean/` owns orchestration.
- `apps/slm-engine` remains separate Rust service (add to Docker/ECS).
- Replace chat-service hardcoded `localhost:3000` with `REAN_API_URL` env.
- Superadmin SLM playground calls `/v1/slm/chat` on API subdomain.

---

## N. Storage

### N.1 Current

- **Driver:** `LocalFileStorage` at `./storage/{bucket}/{key}`.
- **Serve:** `GET /api/storage/[...key]` with B0 ownership checks.
- **Pipeline:** `photo.process` job uploads driver/chat photos.
- **S3 driver:** Stub only — interface ready (`STORAGE_DRIVER=s3`).

### N.2 Extraction

| Concern | Target |
|---------|--------|
| Upload URLs | `apps/api` `POST /v1/storage/upload` (presigned future) |
| Download/auth | `apps/api` `GET /v1/storage/*` with `canAccessStorageObject` |
| Worker processing | `apps/worker` `photo.process` handler |
| Chat photos | API issues storage key; chat references URL |
| Documents module | Metadata in API; blob to storage (gap today) |

**S3 migration (future):** Implement `S3Storage` driver in `packages/shared`; no behavior change in API contract.

---

## O. External Integrations

### O.1 Proposed `apps/api/src/integrations/` structure

```
integrations/
├── registry.ts           # provider → adapter
├── webhook/
│   ├── verify.ts         # port webhook-verify.ts
│   └── handlers/         # per-provider normalizers
├── outbound/
│   ├── sync.ts           # replace setTimeout simulation
│   └── credentials.ts    # IntegrationConnection secrets
├── idempotency.ts        # webhook event dedup keys
└── retry.ts              # failed sync backoff
```

### O.2 Requirements

- **Webhooks:** Signature verify (B0) → idempotency key → handler → audit log.
- **Credentials:** Per-connection encrypted at rest (future); today env-based secrets.
- **Retries:** Queue `integration.sync` job with exponential backoff.
- **Outbound:** Replace `Math.random()` simulation in `integrations/[id]/sync` with real adapters incrementally.

---

## P. Portal Impact

| Portal | Host (proposed) | API consumption | Auth notes |
|--------|-----------------|-----------------|------------|
| Main ERP | `app.reanzly.com` | All modules via api-client | Session cookie via proxy |
| Vendor | `vendor.reanzly.com` or `/vendor` shell | `/v1/vendor-portal/*` | `customerId` scope |
| Broker | `/broker` in main or `broker.reanzly.com` | `/v1/broker/*` | `brokerProfileId` scope |
| Driver field | `/driver` mobile shell | `/v1/driver/*` | Driver scope (B0) |
| Warehouse field | `/warehouse-field` | `/v1/warehouse/*` | Module gate |
| Superadmin | `/superadmin` | `/v1/superadmin/*`, metrics | Platform admin |
| Marketing/marketplace | `reanzly.com` | Public + signup APIs | Pre-session |

**`api.reanzly.com` design:** Public endpoints (`/v1/health`, `/v1/auth/login`, webhooks) + authenticated REST. WebSocket stays on `chat.reanzly.com` or proxied path.

---

## Q. Next.js Routing Interaction

### Q.1 Current routing

- Single `/dashboard` SPA with `ModuleRouter` (50+ modules).
- API colocated at `/api/*`.
- No `middleware.ts` (intentional post-B0).

### Q.2 Safest migration sequence

1. **Do not** change `ModuleRouter` or portal shells in B0A.
2. Add `api-client` + env `NEXT_PUBLIC_API_URL` (empty = legacy).
3. Stand up `apps/api` with `/v1/health`, `/v1/auth/*`.
4. Add Next.js `rewrites` for migrated domains only.
5. Migrate domain modules in dependency order (Section T).
6. Remove legacy `src/app/api/{domain}` route files per domain after parity tests pass.
7. **Parallel operation:** Both handlers live until per-domain cutover flag flips.

**Warehouse UI wiring** is explicitly **out of scope** until API is stable — store already exists.

---

## R. Deployment Target

| Service | Target | Image / runtime | Ports | Health |
|---------|--------|-----------------|-------|--------|
| Frontend | ECS/Fargate or Vercel | `apps/web` standalone | 3000 | Static/`/api/health` proxy |
| API | **ECS Fargate** | `apps/api` Node 20 | 4000 | `GET /v1/health` |
| Worker | ECS Fargate (1+ tasks) | `apps/worker` | — | process heartbeat |
| Chat | ECS sidecar or separate | Bun | 3003 | TCP + session test |
| SLM | GPU EC2 or separate | Rust binary | 3004 | inference probe |
| DB | **RDS PostgreSQL** | Multi-AZ | 5432 | — |
| Storage | EBS → **S3** | Later | — | — |
| Gateway | Caddy/ALB | TLS termination | 443 | — |

| Concern | Recommendation |
|---------|----------------|
| Domains | `app.`, `api.`, `chat.` subdomains |
| TLS | ACM certs on ALB or Caddy |
| Secrets | AWS Secrets Manager (`INTERNAL_SERVICE_SECRET`, `CHAT_INTERNAL_SECRET`, `DATABASE_URL`) |
| Migrations | `prisma migrate deploy` in API task startup (job) or dedicated migration task |
| Autoscaling | API on CPU/RPS; worker on queue depth metric |
| Docker | Extend current `Dockerfile` → separate images per app |

---

## S. Migration Compatibility Strategy

### S.1 Principles

1. **Incremental coexistence** — legacy `/api` and `/v1` run in parallel.
2. **api-client routing** — feature flag per domain selects backend.
3. **Module-by-module** — no big-bang.
4. **Rollback** — flip flag back to legacy; keep route files until batch stable 2 weeks.
5. **Parity testing** — contract tests compare legacy vs v1 responses.

### S.2 Compatibility shim (Next.js)

```javascript
// next.config.ts rewrites (conceptual)
async rewrites() {
  return [
    { source: "/api/warehouse/:path*", destination: `${API_URL}/v1/warehouse/:path*` },
    // per migrated domain
  ];
}
```

---

## T. Recommended Extraction Order

Derived from dependency graph (not arbitrary):

| Phase | Domain(s) | Rationale |
|-------|-----------|-----------|
| **0 — Foundation** | health, auth (login/logout/me/profile), users | All domains depend on session |
| **1 — Platform read** | dashboard/stats, notifications, audit-log | Low risk, read-heavy |
| **2 — Pilot CRUD** | reminders, knowledge, helpdesk | Small surface, real UI, low money risk |
| **3 — Isolated backend** | **warehouse** (24 routes) | Backend complete; UI unwired = clean cutover; B0 tenant fixes |
| **4 — Field ops** | driver (B0 hardened), pod, inspections | Mobile-critical; test driver scope heavily |
| **5 — Core freight** | trips, vehicles, drivers, lorry-receipts, fuel, issues | High business value; many consumers |
| **6 — Finance** | expenses, invoices, ledger, treasury, payroll | **High risk** — after patterns proven |
| **7 — Portals** | vendor-portal, broker | Scoped auth variants |
| **8 — Complex** | crm, hr, operations, planning, reports | Many cross-links |
| **9 — Platform** | superadmin, billing, integrations, queue admin | Platform-wide blast radius |
| **10 — Real-time & AI** | chat, storage, rean/slm, automation | Cross-service deps |
| **11 — Worker cutover** | Move queue off Next.js | After enqueue paths migrated |
| **12 — Decommission** | Remove `src/app/api/**` | Definition of Done |

**Recommended first extraction domain (after foundation):** **warehouse** — highest route density with isolated frontend, B0-hardened tenant create, and existing `warehouse-store.ts` ready to point at v1.

---

## U. Migration Risk Matrix

| Domain | Complexity | Business Criticality | Tenant Risk | API Count | Frontend Coupling | Service Coupling | Rollback Difficulty |
|--------|------------|---------------------|-------------|-----------|-------------------|------------------|---------------------|
| auth | Medium | **Critical** | High | 10 | High | chat, all routes | Hard |
| warehouse | Low | Medium | **High** (B0) | 24 | Low (unwired UI) | — | Easy |
| driver | Medium | **Critical** | **Critical** | 3 | Medium | queue, storage | Hard |
| ledger | **High** | **Critical** | **Critical** | 9 | Medium | GST reports | Hard |
| payroll | **High** | **Critical** | **Critical** | 17 | High | HR overlap | Hard |
| trips | Medium | **Critical** | High | 2 | High | LR, POD, map | Medium |
| chat | **High** | High | Medium | 5 | High | socket, storage, rean | Hard |
| storage | Medium | High | **Critical** (B0) | 1 | Medium | worker, chat, driver | Medium |
| integrations | Medium | Medium | Medium | 4 | Low | webhooks | Easy |
| broker | Medium | High | High | 20 | Medium | finance | Medium |
| vendor-portal | Medium | High | High | 14 | Medium | customer scope | Medium |
| superadmin | Medium | High | Platform | 6 | Low | metrics, backups | Medium |
| rean/slm | **High** | Medium | High | 3 | Low | rust engine, db-tool | Medium |
| reminders | **Low** | Low | Low | 2 | Low | — | **Easy** |
| knowledge | **Low** | Low | Low | 2 | Low | RAG | Easy |
| helpdesk | **Low** | Medium | Low | 2 | Low | — | Easy |

**High-risk domains (prioritize security testing):** auth, driver, ledger, payroll, storage, warehouse, chat, superadmin.

---

## V. Monorepo Decision

### V.1 Recommendation: **YES** — npm workspaces

```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

### V.2 Migration approach

1. **Do not reorganize files yet** — B0A is audit-only.
2. Phase B1: Create workspace root `package.json`; move `mini-services/*` → `apps/chat`, `apps/slm-engine`.
3. Lift `prisma/` → `packages/database`.
4. Use `git mv` to preserve history.
5. Single `package-lock.json` at root.
6. Keep `src/` in `apps/web` initially; extract `apps/api` with copied then deleted routes.

**Avoid:** Turborepo/Nx until >3 apps need coordinated caching.

---

## W. Test Strategy

| Layer | Scope | Tooling |
|-------|-------|---------|
| Unit | `tenantCreateData`, permissions, driver-access, webhook-verify | Vitest (18 tests exist) |
| API integration | Per-module `/v1` routes with test DB | Vitest + supertest + `@fastify/inject` |
| Tenant isolation | Cross-tenant read/write denied | Dedicated test suite per domain |
| Auth | Session create/destroy, cookie, portal scopes | Integration |
| Contract | Zod schema ↔ OpenAPI ↔ responses | snapshot + `zod-to-openapi` |
| Parity | Legacy `/api` vs `/v1` response diff | Scripted comparison per domain |
| E2E | Login → trip create → invoice | Playwright (future) |
| Worker | Job enqueue → handler completion | Integration with test Job rows |
| Chat | Socket auth + message round-trip | Integration |

**Gate:** No domain cutover without parity tests green for that domain.

---

## X. Success Criteria / Definition of Done

| # | Criterion | Measurable |
|---|-----------|------------|
| 1 | `apps/web` has **zero** Prisma imports | `rg @prisma/client apps/web` = 0 |
| 2 | No business logic in Next.js route handlers | `src/app/api` deleted or proxy-only |
| 3 | All portals consume independent API | api-client → `api.reanzly.com` |
| 4 | Worker runs outside web process | No queue start in Next instrumentation |
| 5 | B0 security tests pass on new API | 18+ tests, extended per domain |
| 6 | Tenant isolation tests per migrated domain | Automated |
| 7 | OpenAPI spec published for v1 | `packages/contracts/openapi.yaml` |
| 8 | Chat + SLM in deploy path | Docker/ECS includes all services |
| 9 | Rollback tested per batch | Feature flag documented |
| 10 | Production deploy uses RDS + secrets manager | No `.env` in images |

---

## Y. Proposed B0A Implementation Batches

These are **planning batches for post-B0A implementation** — not executed in this audit.

### Batch 0 — Monorepo scaffold (1–2 weeks)

- [ ] npm workspaces root; `packages/database`, `packages/contracts`, `packages/auth`, `packages/shared`
- [ ] `apps/api` Fastify hello + `/v1/health`
- [ ] `apps/worker` skeleton (no handlers)
- [ ] `api-client.ts` in `packages/shared`
- [ ] CI: `tsc`, `lint`, `test` across workspaces

### Batch 1 — Auth + foundation (1–2 weeks)

- [ ] Port `auth.ts`, login/logout/me/profile/signup routes to `/v1/auth/*`
- [ ] Next.js rewrite for `/api/auth/*` → v1
- [ ] Session cookie works through proxy
- [ ] Auth integration tests (login, logout, 401)

### Batch 2 — Low-risk pilots (1 week)

- [ ] reminders, knowledge, helpdesk → v1
- [ ] Parity tests vs legacy
- [ ] Flip `API_ROUTING` flags

### Batch 3 — Warehouse (2 weeks)

- [ ] Port 24 warehouse routes with `warehouseCreateMappers` + Zod contracts
- [ ] Tenant isolation test suite
- [ ] Point `warehouse-store.ts` at v1
- [ ] **Defer UI wiring** to separate product batch

### Batch 4 — Storage + driver (2 weeks)

- [ ] Port storage access-control + driver routes (B0 patterns)
- [ ] Worker `photo.process` in `apps/worker`
- [ ] Remove enqueue from Next instrumentation for migrated jobs

### Batch 5 — Core freight (3 weeks)

- [ ] trips, vehicles, drivers, lorry-receipts, fuel, issues, pod
- [ ] Contract DTOs for each

### Batch 6 — Finance (3–4 weeks)

- [ ] expenses, invoices, ledger, treasury, payroll
- [ ] Extended money/tenant tests

### Batch 7 — Portals (2 weeks)

- [ ] vendor-portal, broker scopes

### Batch 8 — CRM/HR/Ops (3 weeks)

- [ ] crm, hr, operations, planning, reports, automation

### Batch 9 — Platform + integrations (2 weeks)

- [ ] superadmin, billing, integrations/webhooks, queue admin

### Batch 10 — Chat + SLM (2–3 weeks)

- [ ] `apps/chat` Prisma migration; WebSocket gateway
- [ ] rean/slm module; slm-engine in Docker
- [ ] Replace hardcoded localhost Rean URL

### Batch 11 — Decommission (1 week)

- [ ] Delete `src/app/api/**` (except proxy if needed)
- [ ] Remove `instrumentation.ts` worker
- [ ] Final E2E smoke

**Estimated total:** 11 batches, **~20–24 weeks** with 1–2 engineers (parallelizable after Batch 3).

---

## Appendix: Verification Commands

```powershell
# Route count
(Get-ChildItem -Path src\app\api -Recurse -Filter route.ts).Count  # 236

# Prisma outside API
rg "from [\"']@/lib/db[\"']|from [\"']@prisma/client[\"']" src --glob "!**/app/api/**" --glob "!**/scripts/**"

# Frontend API consumers
rg 'fetch\([`"\']/api/' src --count

# Current HEAD
git rev-parse HEAD
```

---

*End of B0A Backend Separation Audit.*

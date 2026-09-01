# Reanzly Existing Repository Audit

**Audit date:** 2026-09-01  
**Auditor mode:** Read-only forensic audit (code verified; documentation cross-checked)  
**Repository:** `d:\Reanzly`  
**Git HEAD:** `f19475155ce418274de269760c09a6d90d15bfca` (`main`, clean working tree)

---

## A. Executive Verdict

Reanzly is a **large, UI-rich Next.js 16 logistics operating system** with **100 Prisma models**, **236 API route files**, and **54 functional module areas**. The codebase is **not production-ready** despite substantial real backend work.

**What is genuinely real:** Custom DB-backed session auth (scrypt + HttpOnly cookie), core freight operations (trips, vehicles, drivers, lorry receipts, POD, invoices, expenses), CRM, HR/payroll APIs, operations hub, chat service (Socket.IO + SQLite/Postgres), ledger journal APIs, broker APIs, vendor portal APIs, and warehouse APIs (backend only).

**What blocks production:** Build currently **fails** (incomplete `node_modules` — Radix/cmdk/gsap/socket.io-client missing on disk despite `package.json` entries). **Zero automated tests**. **No API middleware**. **Critical security gaps** (`/api/driver/activity` unauthenticated, storage IDOR, webhook without signature verification). **Warehouse UI disconnected** from 24 real API routes. **Payments, compliance, workshop, marketing, subscriptions, surveys** remain mock/localStorage. **All third-party integrations simulated** (`setTimeout`/`Math.random`). **SLM Rust engine not containerized**. `next.config.ts` sets `ignoreBuildErrors: true`; `tsc` reports **1,313 errors** (mostly stale Prisma client in seeds).

**Overall production readiness: 39/100** — strong prototype / demo platform, not a deployable multi-tenant production ERP without significant hardening.

| Metric | Count |
|--------|-------|
| Modules REAL | 28 |
| Modules PARTIAL | 14 |
| Modules MOCK | 9 |
| Modules UI-ONLY | 1 |
| Modules BROKEN | 1 |
| P0 findings | 6 |
| P1 findings | 14 |
| Security blockers (Critical+High) | 5 |
| DB-backed modules (API+Prisma wired to UI) | ~32 |
| Simulated integration surfaces | ~8 |

---

## B. Repository Baseline

### Git

| Item | Value |
|------|-------|
| Branch | `main` (tracks `origin/main`) |
| HEAD SHA | `f19475155ce418274de269760c09a6d90d15bfca` |
| Last commit | `Remove Prisma push and seed from Vercel build script` |
| Working tree | Clean |

### Package manager & runtime

| Item | Value |
|------|-------|
| Primary package manager | **npm** (`package-lock.json` present) |
| Secondary | **bun** (`bun.lock` present; used for chat-service dev) |
| App name / version | `nextjs_tailwind_shadcn_ts` v0.2.1 |
| Node (audit env) | v24.14.1 |
| npm | 11.11.0 |
| Next.js | ^16.1.1 |
| React | ^19.0.0 |
| Prisma | ^6.11.1 |
| TypeScript | ^5 |
| Zustand | ^5.0.6 |

### File counts

| Scope | Count |
|-------|-------|
| Source files (excl. `node_modules`, `.next`, `db/custom.db`) | **1,017** |
| `src/app/api/**/route.ts` | **236** |
| `src/components/modules/*/index.tsx` | **52** |
| Prisma models | **100** |
| Test files (`*.test.*`, `*.spec.*`) | **0** |

### Top-level directory tree

```
d:\Reanzly\
├── prisma/              # schema.prisma (PostgreSQL)
├── src/
│   ├── app/             # App Router: page.tsx (3), api/ (236 routes)
│   ├── components/      # modules/, layout/, auth/, marketing/, ui/
│   ├── lib/             # auth, db, slm, queue, storage, stores
│   ├── hooks/
│   └── scripts/         # seed-*.ts (30+ seed scripts)
├── mini-services/
│   ├── chat-service/    # Bun + Socket.IO (port 3003)
│   └── slm-engine/      # Rust Axum GGUF inference (port 3004)
├── public/
├── scripts/             # deploy-prod.sh, ollama-mcp.js
├── docs/                # (this audit)
├── Dockerfile, docker-compose*.yml
├── Caddyfile, Caddyfile.prod, Caddyfile.docker
├── package.json, package-lock.json, bun.lock
├── next.config.ts, tailwind.config.ts, tsconfig.json
├── Reanzly.md, AUDIT.md, task.md, worklog.md
└── .env.example
```

### Key config files

| File | Purpose |
|------|---------|
| `next.config.ts` | `output: "standalone"`, **`typescript.ignoreBuildErrors: true`**, `reactStrictMode: false` |
| `prisma/schema.prisma` | PostgreSQL (`DATABASE_URL` + `DIRECT_URL`) |
| `.env.example` | Postgres/Supabase, NextAuth vars (stale — app uses custom session), storage, chat port |
| `src/instrumentation.ts` | Starts background queue worker on boot |
| **No `src/middleware.ts`** | Confirmed absent |

---

## C. Architecture

| Layer | Technology | Evidence |
|-------|------------|----------|
| Framework | Next.js 16 App Router | `src/app/layout.tsx`, `src/app/dashboard/page.tsx` |
| UI | React 19 + Tailwind 4 + shadcn/Radix | `src/components/ui/*` |
| Client state | Zustand (+ persist/localStorage in many modules) | `src/lib/store/*`, module `_store.ts` files |
| Server data | Route handlers + Prisma | `src/app/api/**`, `src/lib/db.ts` |
| Auth | Custom scrypt sessions (not NextAuth at runtime) | `src/lib/auth.ts` |
| RBAC | Role archetypes from `mock-data.ts` + `permissions.ts` | `src/lib/permissions.ts` |
| Real-time chat | Bun Socket.IO microservice | `mini-services/chat-service/index.ts` |
| SLM | Rust `slm-engine` + TS fallback | `mini-services/slm-engine/`, `src/lib/slm/` |
| Background jobs | SQLite/Postgres `Job` table + in-process worker | `src/lib/queue/index.ts` |
| Storage | Local filesystem driver | `src/lib/storage/object-storage.ts` |
| Deploy | Docker multi-stage + Caddy gateway | `Dockerfile`, `docker-entrypoint.sh` |

**Routing model:** Single SPA shell at `/dashboard` with client-side `ModuleRouter` (`src/components/modules/router.tsx`) switching 50+ modules via Zustand `activeView`. Portals: main app shell, driver-field (`app-shell.tsx`), vendor portal (`vendor-shell.tsx`), broker modules (provisioned gate), superadmin, marketing site (`src/components/marketing/`).

---

## D. Module Reality Matrix

**Legend:** Y=Yes, P=Partial, N=No, —=N/A

| Module | Main Files | UI Built | Real DB | Real API | Mock Data | Zustand/localStorage | CRUD Complete | Business Logic | RBAC | Tenant Isolation | Tests | Status |
|--------|-----------|----------|---------|----------|-----------|---------------------|---------------|----------------|------|------------------|-------|--------|
| access-matrix | `index.tsx` | Y | N | N | Y | N | Read | Mock | P | N | None | **MOCK** |
| app-store | `index.tsx`, `_helpers.tsx` | Y | P | N | Y | Y | Partial | Mock catalog | P | N | None | **UI-ONLY** |
| approvals | `index.tsx`, `approvals-list.tsx` | Y | Y | Y | N | Y | Full | Real | Y | Y | None | **REAL** |
| automation | `index.tsx`, `use-automation-data.ts` | Y | Y | Y | P | N | Full | Real | Y | Y | None | **REAL** |
| broker-network | `broker-console.tsx`, `use-broker-*-data.ts` (10 hooks) | Y | Y | Y | P | Y | Partial | Partial | Y | Y | None | **PARTIAL** |
| chat | `index.tsx`, `chat-store.ts` | Y | Y | Y | N | Y | Full | Real | P | Y | None | **REAL** |
| compliance | `index.tsx`, `_helpers.tsx` | Y | N | N | Y | N | Read | Mock | N | N | None | **MOCK** |
| crm | `index.tsx`, `_store.ts` | Y | Y | Y | P | Y | Full | Real | Y | Y | None | **REAL** |
| customers | `index.tsx`, `customers-list.tsx` | Y | Y | Y | N | Y | Full | Real | Y | Y | None | **REAL** |
| dashboard | `index.tsx`, `widget-registry.tsx` | Y | P | Y | P | Y | Partial | Mixed | P | P | None | **PARTIAL** |
| document-studio | `index.tsx`, `_store.ts`, `_data.ts` | Y | N | N | Y | Y | Partial | Mock | P | N | None | **MOCK** |
| documents | `index.tsx`, `documents-list.tsx` | Y | Y | Y | N | Y | Full* | Real metadata | Y | Y | None | **PARTIAL** |
| driver-field | `index.tsx`, `driver-store.ts` | Y | P | Y | Y | Y | Partial | GPS real | P | Y | None | **PARTIAL** |
| drivers-staff | `index.tsx`, tabs/* | Y | Y | Y | N | Y | Full | Real | Y | Y | None | **REAL** |
| expenses | `index.tsx`, `expenses-list.tsx` | Y | Y | Y | N | Y | Full | Real | Y | Y | None | **REAL** |
| field-service | `index.tsx`, `use-field-service-data.ts` | Y | Y | Y | N | Y | Full | Real | Y | Y | None | **REAL** |
| financial-services | `index.tsx`, `use-financial-services-data.ts` | Y | Y | Y | Y | N | Partial | Demo offers | Y | Y | None | **PARTIAL** |
| fleet-map | `index.tsx` | Y | Y | Y | N | Y | Read | Real | Y | Y | None | **REAL** |
| fuel-energy | `index.tsx`, `fuel-list.tsx` | Y | Y | Y | N | Y | Full | Real | Y | Y | None | **REAL** |
| helpdesk | `index.tsx`, `tickets-list.tsx` | Y | Y | Y | N | Y | Full | Real | Y | Y | None | **REAL** |
| hr | `index.tsx`, `_store.ts`, 10 tabs | Y | P | Y | Y | Y | Partial | 5/13 tabs real | Y | Y | None | **PARTIAL** |
| inspection | `index.tsx`, `inspection-list.tsx` | Y | Y | Y | N | Y | Full | Real | Y | Y | None | **REAL** |
| integrations | `index.tsx`, `integrations-store.ts` | Y | P | Y | Y | Y | Partial | Simulated sync | Y | Y | None | **PARTIAL** |
| invoice | `index.tsx`, `invoice-list.tsx` | Y | Y | Y | P | Y | Full | Real | Y | Y | None | **REAL** |
| issues | `index.tsx`, `issues-list.tsx` | Y | Y | Y | P | Y | Full | Real | Y | Y | None | **REAL** |
| knowledge | `index.tsx`, `articles-list.tsx` | Y | Y | Y | N | Y | Full | Real | Y | Y | None | **REAL** |
| ledger | `index.tsx`, `use-ledger-data.ts`, `use-gst-data.ts` | Y | P | Y | Y | Y | Partial | Double-entry API; tally local | Y | Y | None | **PARTIAL** |
| lorry-receipts | `index.tsx`, `lr-detail.tsx` | Y | Y | Y | P | Y | Full | Real | Y | Y | None | **REAL** |
| maintenance | `index.tsx`, `maintenance-list.tsx` | Y | Y | Y | P | Y | Full | Real | Y | Y | None | **REAL** |
| marketing | `index.tsx`, `_helpers.tsx` | Y | N | N | Y | Y | Partial | Mock campaigns | P | N | None | **MOCK** |
| operations-hub | `index.tsx`, `use-operations-data.ts` | Y | Y | Y | P | Y | Full | Real Kanban | Y | Y | None | **REAL** |
| partner-programme | `index.tsx`, `partner-store.ts` | Y | N | N | Y | Y | Partial | Mock | P | N | None | **MOCK** |
| payments | `index.tsx`, `use-payments-data.ts` | Y | P | Y | Y | Y | Partial | Treasury real; receivables mock | Y | Y | None | **PARTIAL** |
| payroll | `index.tsx`, cycles/payslips tabs | Y | Y | Y | N | N | Full | Real | Y | Y | None | **REAL** |
| planning | `index.tsx`, `use-planning-data.ts` | Y | Y | Y | N | N | Full | Real | Y | Y | None | **PARTIAL** |
| pod | `index.tsx`, `pod-store.ts` | Y | Y | Y | N | Y | Full | Real | Y | Y | None | **REAL** |
| purchase | `index.tsx`, `po-list.tsx` | Y | Y | Y | N | Y | Full | Real | Y | Y | None | **REAL** |
| quality | `index.tsx`, `checks-list.tsx` | Y | Y | Y | N | Y | Full | Real | Y | Y | None | **REAL** |
| rate-cards | `index.tsx`, `rate-card-detail.tsx` | Y | Y | Y | N | Y | Full | Real | Y | Y | None | **REAL** |
| reminders | `index.tsx`, `reminders-list.tsx` | Y | Y | Y | P | Y | Full | Real | Y | Y | None | **PARTIAL** |
| reports | `index.tsx`, `use-reports-data.ts` | Y | Y | Y | P | N | Full | Data explorer RNG | Y | Y | None | **PARTIAL** |
| services | `index.tsx`, `services-list.tsx` | Y | Y | Y | N | Y | Full | Real | Y | Y | None | **REAL** |
| settings | `index.tsx`, `sections/*` | Y | P | Y | P | Y | Partial | User mgmt gaps | Y | Y | None | **PARTIAL** |
| subscriptions | `index.tsx`, `_helpers.tsx` | Y | N | N | Y | Y | Partial | Mock | P | N | None | **MOCK** |
| superadmin | `index.tsx`, `_store.ts`, 20+ tabs | Y | P | P | Y | Y | Partial | Platform mock data | Y | P | None | **PARTIAL** |
| surveys | `index.tsx`, `_helpers.tsx` | Y | N | N | Y | Y | Partial | Mock | P | N | None | **MOCK** |
| system-design | `index.tsx`, `_helpers.tsx` | Y | P | P | Y | N | Read | Static docs + `/api/metrics` | N | N | None | **UI-ONLY** |
| trips | `index.tsx`, `trips-list.tsx` | Y | Y | Y | P | Y | Full | Real | Y | Y | None | **REAL** |
| vehicles | `index.tsx`, `vehicles-list.tsx` | Y | Y | Y | N | Y | Full | Real | Y | Y | None | **REAL** |
| vendor-portal | `vendor-shell.tsx`, 11 screens | Y | Y | Y | N | Y | Full | Real portal | Y | Y | None | **REAL** |
| vendors | `index.tsx`, `vendors-list.tsx` | Y | Y | Y | N | Y | Full | Real | Y | Y | None | **REAL** |
| warehouse | `index.tsx`, `_helpers.tsx` (static arrays) | Y | Y* | Y* | **Y (UI only)** | N | **None in UI** | Mock WMS | P | Y* | None | **BROKEN** |
| warehouse-field | `index.tsx`, `warehouse-field-store.ts` | Y | N | N | Y | Y | Partial | Mock floor | P | N | None | **MOCK** |
| workshop | `index.tsx`, `_helpers.tsx` | Y | N | N | Y | N | Read | Mock | N | N | None | **MOCK** |

\*Warehouse: 24 `/api/warehouse/*` routes + 12 Prisma models exist; **zero `fetch()` in UI** (`warehouse/index.tsx` imports only `_helpers.tsx` static arrays).

**Router bug:** `router.tsx` case `"app-store"` renders `<IntegrationsModule />` instead of `<AppStoreModule />`.

---

## E. Database & Prisma

### Datasource

- **Provider:** PostgreSQL (`postgresql` in `schema.prisma`)
- **URLs:** `DATABASE_URL` (pooled), `DIRECT_URL` (migrations)
- **Comment drift:** Schema header still mentions SQLite swap; runtime targets Postgres/Supabase per `.env.example`
- **Legacy artifact:** `db/custom.db-shm` present (SQLite remnant)

### Model inventory (100 models)

**Tenancy & identity:** Company, Branch, User, Session, Role  
**Core freight:** Vehicle, Driver, Customer, Vendor, Trip, Invoice, LorryReceipt, Pod, RateCard, Expense, Issue  
**Fleet ops:** FuelEntry, Inspection, WorkOrder, ServiceProgram, ServiceTemplate, Reminder, QualityCheck, FieldServiceTask  
**Finance:** LedgerAccount, LedgerJournalEntry, LedgerJournalLine, TreasuryVoucher, LedgerGstReturn, LedgerGstReconLine, LedgerEntry  
**HR/Payroll:** Employee, SalaryStructure, AttendanceRecord, LeaveRequest, PayrollRun, Payslip, HrPosition, Candidate, HrDocumentRequest, HrIssuance, HrInterview, HrOfferLetter, PayrollStatutoryFiling, PayrollBankAdvice, PayrollReimbursement, PayrollBonus, PayrollLoan, PayrollLoanInstallment  
**CRM:** Lead, Deal, CrmContact, CrmActivity  
**Broker:** BrokerProfile, NachMandate, PayoutRun, PayoutRecipient, SubBroker, BrokerEnquiry, BrokerQuote, SettlementCycle, BrokerLedgerEntry, LaneRate, BrokerDocument, BrokerTaxReturn, BrokerLicense  
**Warehouse:** WarehouseSku, WarehouseInbound, WarehouseOutbound, WarehouseStorageLocation, WarehousePodReceive, WarehousePickList, WarehouseCycleCount, WarehouseCrossDock, WarehouseReturn, WarehouseYard, WarehouseDockAppt  
**Platform:** Plan, Subscription, PaymentMethod, PlatformInvoice, PlatformUser, PlatformAuditLog, Backup, BackupSchedule, SuperadminAuditLog, SuperadminFeatureFlag, SuperadminGateway  
**Chat/AI:** ChatConversation, ChatParticipant, ChatMessage, ChatPollVote, ChatReaction, ChatReadReceipt, Call, SlmFeedback, SlmMemory, KnowledgeChunk, RagAction  
**Ops:** Sprint, Task, TaskComment, TaskAttachment, Automation, AutomationRunLog, ScheduledReport, CustomReport, FinancingApplication, ApprovalRequest  
**Integrations:** IntegrationConnection, IntegrationWebhookLog, IntegrationSyncLog  
**Other:** Document, AuditLog, Notification, KnowledgeArticle, HelpdeskTicket, DriverActivity, DriverLocationPing, Job, SyncQueueItem, ConflictRecord, BackupSnapshot, PurchaseOrder, Rfq, SupportTicket, TicketMessage, PlanningResource, PlanningAllocation

### Tenancy pattern

- **Primary key:** `companyId` on virtually all tenant tables
- **No Postgres RLS** — isolation enforced in application code only
- **Alternate scopes:** `brokerProfileId`, `customerId` (vendor portal), `userId` (notifications)

### Money types

- **No `Decimal` type** — monetary fields use **`Float`** throughout (e.g. `Invoice.amount`, `TreasuryVoucher.amount`, `BrokerEnquiry.quotedRate`)
- **Risk:** Floating-point rounding in accounting/settlements

### Indexes & relations

- Standard `@relation` with `onDelete: Cascade` on company children
- Dedicated indexes on high-traffic fields (sessions, chat, driver location) — verify per-model in schema for production tuning

### Gaps

| Gap | Detail |
|-----|--------|
| No `Payment` model | Payments UI maps treasury vouchers; receivables/CN-DN still mock |
| No workshop models | JobCard/Bay are UI-only mock |
| Documents lack `storageKey` linkage | Metadata CRUD without blob persistence |
| Prisma client stale in repo | `tsc` errors on seed scripts referencing valid models |
| Migrations | `db:push` script uses `--accept-data-loss` (dangerous for prod) |

---

## F. API Inventory

**Total route files:** 236 | **Authenticated:** ~224 (95%) | **No middleware layer**

### Summary by domain

| Domain | Routes | Auth | Tenant Filter | Module Gate | Notes |
|--------|--------|------|---------------|-------------|-------|
| auth | 10 | Mixed | Partial | No | Real login/signup/sessions |
| trips, vehicles, drivers | 6 | Yes | `companyId` | Yes | Solid IDOR checks |
| warehouse | 24 | Yes | `companyId` | 16/24 | POST body spread risk; UI unwired |
| broker | 20 | Yes | `brokerProfileId` | Yes | Well scoped |
| vendor-portal | 14 | Yes | `customerId` | No | Portal identity scoped |
| ledger/treasury | 11 | Yes | `companyId` | Yes | Journal math in `_lib.ts` |
| hr | 20 | Yes | `companyId` | Yes | |
| payroll | 17 | Yes | `companyId` | Yes | |
| crm | 10 | Yes | `companyId` | Yes | |
| operations | 6 | Yes | `companyId` | Yes | |
| chat | 5 | Yes | Participant | No | |
| integrations | 4 | 3/4 | Yes | Yes | Webhook unauthenticated |
| superadmin | 6 | `requireSuperadmin` | Platform | N/A | |
| driver | 3 | **1/3** | Partial | No | **activity unauthenticated** |
| public | 3 | No | No | No | `/api`, `/health`, `/metrics` |

### IDOR risk flags

| Route | Risk |
|-------|------|
| `GET/POST /api/driver/activity` | **CRITICAL** — no session; arbitrary `driverId` |
| `GET /api/storage/[...key]` | **HIGH** — auth only, no ownership check |
| `POST /api/warehouse/*/create` | **CRITICAL** — `{ companyId, ...body }` allows tenant overwrite |
| `POST /api/integrations/webhook/[providerId]` | **HIGH** — no signature verification |
| `PATCH /api/ledger/entries/[id]` | **MEDIUM** — `accountId` not validated to tenant |

---

## G. Authentication

### Production auth (REAL)

| Component | Implementation |
|-----------|----------------|
| Password hashing | scrypt via Node `crypto` (`src/lib/auth.ts`) |
| Sessions | Opaque DB token, HttpOnly `reanzly_session` cookie, 30-day TTL |
| Login | `POST /api/auth/login` — verifies `User.passwordHash` + `salt` |
| Signup | `POST /api/auth/signup`, `signup-broker`, `signup-driver`, `signup-shipper` |
| Session resolution | `getSessionUser()` — sole server identity source |
| Logout | `destroySession()` deletes DB row + cookie |

### Demo / dev affordances

| Mechanism | Location | Behavior |
|-----------|----------|----------|
| Role quick-login | `login-screen.tsx` | Pre-filled demo credentials for seeded roles |
| Role switch (tenant) | `POST /api/auth/switch-role` | Owner/superadmin only; same `companyId` |
| Superadmin internal role switcher | `superadmin/role-switcher.tsx` | Client-side Zustand; switches admin sub-views without re-auth |
| ProvisionedGate | `router.tsx` | `selectedModules` bypass when undefined (demo users get `*`) |
| `.env.example` NextAuth vars | Stale | App does **not** use NextAuth at runtime despite dependency |

**Verdict:** Core auth is **production-grade design**; demo paths and missing middleware weaken enforcement.

---

## H. RBAC / Tenant Isolation

### RBAC model

- **Source of truth:** `ROLE_ARCHETYPES` in `src/lib/mock-data.ts` (permissions arrays)
- **Server enforcement:** `requireModuleAccess()`, `requireSuperadmin()`, `requirePlatformAdmin()` in `src/lib/permissions.ts`
- **Client enforcement:** `sidebar.tsx` `canAccess()` + cluster tab rendering
- **Cluster expansion:** `MODULE_PARENT` map mirrors UI clusters (e.g. `quality` → `vehicles`)

### Gaps

| Issue | Impact |
|-------|--------|
| RBAC data in mock-data.ts | Role changes require code deploy, not DB |
| ~35 routes auth-only (no module check) | Any tenant user can hit chat, vendor-portal, dashboard stats, audit-log |
| Access-matrix module | Display-only mock; not wired to enforcement |
| Field-level RBAC | Not implemented |
| Row-level beyond `companyId` | Inconsistent on warehouse PATCH mass-assignment |

### Tenant isolation verdict

**PARTIAL** — correct pattern on majority of routes; **critical exceptions** (driver activity, warehouse POST spread, storage IDOR) undermine multi-tenant safety.

---

## I. Portal Status

| Portal | Entry | Auth | Data backing | Status |
|--------|-------|------|--------------|--------|
| **Main App** | `/dashboard` | Session cookie | Mixed REAL/PARTIAL | **PARTIAL** |
| **Driver Field** | `app-shell.tsx` → `driver-field` | Session + `/api/driver/me` | GPS/activity API; earnings mock | **PARTIAL** |
| **Warehouse Field** | `warehouse-field` module | Session | localStorage + desktop mock tasks | **MOCK** |
| **Vendor Portal** | `vendor-shell.tsx` | Session + `customerId` link | 14 `/api/vendor-portal/*` routes | **REAL** |
| **Broker Console** | `broker-console` | Session + broker profile | `/api/broker/*` | **PARTIAL** |
| **Broker Marketplace** | `broker-marketplace` | ProvisionedGate | API + seed fallbacks | **PARTIAL** |
| **Broker Settlements** | `broker-settlements` | ProvisionedGate | API + trip estimate mocks | **PARTIAL** |
| **Superadmin** | `superadmin` module | `role === superadmin` | Mix API + localStorage store | **PARTIAL** |
| **Marketing / Marketplace** | `/` + marketing components | Public | Static + `marketplace-data.ts` | **MOCK/UI** |

---

## J. Core Workflow Verification

| Workflow | UI | API | DB | End-to-end | Status |
|----------|----|----|-----|------------|--------|
| Trip lifecycle (plan → execute → complete) | Y | `/api/trips` | Trip | Wired | **REAL** |
| Lorry receipt / consignment | Y | `/api/lorry-receipts` | LorryReceipt | Wired | **REAL** |
| POD capture & audit | Y | `/api/pod` | Pod, PodAuditEntry | Wired | **REAL** |
| Invoice → release | Y | `/api/invoices` | Invoice | Wired | **REAL** |
| Fleet maintenance WO | Y | `/api/work-orders` | WorkOrder | Wired | **REAL** |
| Driver assignment | Y | `/api/drivers`, trips | Driver | Wired | **REAL** |
| Warehouse inbound→pick→ship | Y (mock) | `/api/warehouse/*` | Warehouse* | **Disconnected** | **DISCONNECTED** |
| Employee hire→payroll | P | `/api/hr/*`, `/api/payroll/*` | Employee, Payslip | Partial tabs mock | **PARTIAL** |
| Broker enquiry→quote→settlement | Y | `/api/broker/*` | Broker* | Mostly wired | **PARTIAL** |
| Vendor RFQ→shipment | Y | `/api/vendor-portal/*` | Rfq, etc. | Wired | **REAL** |
| Approval gates (expense) | Y | `/api/approvals` | ApprovalRequest | Wired | **REAL** |

---

## K. Finance & Accounting

| Area | UI | Backend | Double-entry | Verdict |
|------|-----|---------|--------------|---------|
| Invoices | Real API | `Invoice` model | N/A (AR doc) | **REAL** |
| Expenses | Real API | `Expense` model | N/A | **REAL** |
| Treasury vouchers / payments | Real API | `TreasuryVoucher` | Partial | **PARTIAL** |
| Ledger journal | Real API | `LedgerJournalEntry` + lines | **Yes** in `_lib.ts` | **PARTIAL** (UI hybrid) |
| P&L / Balance sheet / Trial balance | UI tabs | `/api/ledger/reports` | Server-side math | **PARTIAL** |
| GST returns/recon | UI | `/api/ledger/gst/*` | Real models | **PARTIAL** |
| Cost centres / inventory vouchers | UI | localStorage `ledger-tally-store` | No | **MOCK** |
| Payments receivables / CN-DN | UI | Mock `INVOICES` from mock-data | No | **MOCK** |
| Rate cards → invoice pricing | Real | `RateCard` | N/A | **REAL** |
| Financial services | UI | `FinancingApplication` | Demo underwriting | **PARTIAL** |

**Verdict:** Journal double-entry logic exists server-side (`src/app/api/ledger/_lib.ts`) but UI still blends API data with localStorage tally stores. **Not audit-ready for statutory accounting.**

---

## L. Marketplace

| Surface | Location | Status |
|---------|----------|--------|
| Broker marketplace loads | `broker-marketplace.tsx` | API + `SEED_MARKETPLACE_LOADS` fallback |
| Marketing marketplace site | `src/components/marketing/marketplace-site.tsx` | Static/demo data |
| App store module | `app-store/index.tsx` | Client-side module provisioning flags |
| Integrations marketplace tab | `superadmin/integrations-marketplace-tab.tsx` | Catalog mock |
| Partner programme | `partner-programme/` | localStorage mock |

**Verdict:** **MOCK / PARTIAL** — no real load-board matching engine or payment settlement for marketplace transactions.

---

## M. Rean / SLM

| Component | File(s) | Status |
|-----------|---------|--------|
| Ask Rean API | `/api/rean` | **REAL** — session, rate limit, DB tool, RAG, infer |
| SLM playground | `/api/slm/chat` | **REAL** inference path |
| Local keyword engine | `src/lib/slm/local-engine.ts` | **REAL** fallback |
| Live KPIs/anomalies | `src/lib/slm/live-data.ts` | **REAL** Prisma queries |
| DB tool (allowlist CRUD) | `src/lib/slm/db-tool.ts` | **REAL** with confirm gate |
| Memory/feedback | `SlmMemory`, `SlmFeedback` | **REAL** when embed engine up |
| Rust slm-engine | `mini-services/slm-engine/` | **REAL** but **not in Docker** |
| Agent loop UI | `src/lib/slm/runtime.ts` | **SIMULATED** (explicit comment) |
| Admin seed data | `src/lib/slm/seed.ts` | **MOCK** demo traces |
| Dashboard Rean widgets | `widget-registry.tsx` | **MOCK** static arrays |
| z-ai-web-dev-sdk | dependency | Dead outside sandbox per worklog |

---

## N. Chat / Real-Time

| Component | Status |
|-----------|--------|
| Socket.IO service (3003) | **REAL** — messages, presence, reactions, polls, calls |
| Session auth on socket | **REAL** — cookie validated in chat-service |
| Next.js REST bridge | `/api/chat/*` | **REAL** |
| Internal broadcast endpoint | **UNAUTHENTICATED** — risk |
| Rean auto-reply | POST `localhost:3000/api/rean` — hardcoded |
| Photo upload → storage | **REAL** via queue `photo.process` |
| Docker inclusion | chat-service in `docker-entrypoint.sh` |
| Prod Caddy routing | `Caddyfile.prod` may not proxy WebSocket to 3003 |

---

## O. External Integrations

| Integration surface | Persistence | Outbound API | Simulation detection |
|---------------------|-------------|--------------|---------------------|
| Connection CRUD | **REAL** `IntegrationConnection` | None | — |
| Sync | **REAL** logs | **FAKE** `setTimeout` + `Math.random()` in `integrations/[id]/sync/route.ts` | ✅ Simulated |
| Webhook receiver | **REAL** logs | Inbound only | No signature verify |
| UI test connection | N/A | **FAKE** `integrations-store.ts` setTimeout | ✅ Simulated |
| UI webhook logs sheet | N/A | **FAKE** `generateSeedEvents()` | ✅ Simulated |
| Provider catalog | `_data.ts`, `logistics-providers.ts` | None | Static |
| E-way/Fastag/etc. | `.env.example` keys | No clients | Not implemented |
| Email/SMS in automation | Queue stub | `console.log` only | ✅ Simulated |

**Simulated integration count:** **8** distinct simulated surfaces (sync API, sync UI, test UI, webhook logs UI, notification dispatch, automation email/SMS, financial services offers, broker marketplace seeds).

---

## P. Storage

| Capability | Status |
|------------|--------|
| Local file driver | **REAL** — `./storage/{bucket}/{key}` |
| S3 driver | **NOT IMPLEMENTED** (stub in `object-storage.ts`) |
| `GET /api/storage/[...key]` | **REAL** serve; **IDOR risk** |
| Chat photo pipeline | **REAL** |
| Document uploads | **METADATA ONLY** — no blob to storage |
| Backup snapshots | Superadmin API + `Backup` model | **PARTIAL** |

---

## Q. Jobs / Automation

| Job type | Handler | Status |
|----------|---------|--------|
| `photo.process` | Object storage upload | **REAL** |
| `audit.log` | AuditLog write | **REAL** |
| `automation.run` | `runAutomationOnce` | **REAL** |
| `notifications.scan-alerts` | Recurring overdue scan | **REAL** |
| `notification.dispatch` | console.log | **SIMULATED** |
| `location.batch` | Cache invalidation | **REAL** (minimal) |
| `report.generate` | Lazy registered | **PARTIAL** |

**Worker:** Started via `instrumentation.ts`; superadmin control at `/api/queue/status`.

**Automation engine:** Real trigger evaluation for invoice overdue, doc expiry, trip delay, etc.; email/SMS actions queued but not sent.

---

## R. Testing

| Category | Count | Notes |
|----------|-------|-------|
| Unit tests | 0 | No `*.test.ts` / `*.spec.ts` |
| Integration tests | 0 | |
| E2E tests | 0 | |
| Manual test scripts | ~3 | `scripts/test-signup-auth.js`, etc. |
| Seed scripts | 30+ | `src/scripts/seed-*.ts` |

**Module-to-test matrix:** All 54 modules → **None**.

---

## S. Observability

| Capability | Status |
|------------|--------|
| `/api/health` | Public — DB, cache, queue status |
| `/api/metrics` | Public — memory, table counts |
| `/api/audit-log` | Module-gated — real append-only |
| `logAudit()` | Partial adoption |
| Console logging | Pervasive in queue, chat, webhooks |
| OpenTelemetry/Prometheus | **Not implemented** |
| Caddy SIEM (prod) | JSON security log in `Caddyfile.prod` |
| Distributed tracing | **None** across chat ↔ Next ↔ slm-engine |

---

## T. Deployment

| Artifact | Status |
|----------|--------|
| `Dockerfile` | Multi-stage Next standalone + chat + Caddy |
| `docker-entrypoint.sh` | `prisma db push` → chat → Caddy → Next |
| `docker-compose.yml` | Dev: ports 80, 3000, 3003 |
| `docker-compose.prod.yml` | Postgres env; chat not externally exposed |
| `Caddyfile` / `.prod` | Gateway, WAF, rate limits (prod) |
| `scripts/deploy-prod.sh` | Backup + health poll |
| Vercel | `ignoreBuildErrors: true`; Prisma push removed from build |
| slm-engine in container | **Missing** |
| SQLite assumption | Removed from schema; `db/custom.db*` remnant |

---

## U. Documentation vs Code

| Document | Claims | Code reality (2026-09-01) |
|----------|--------|---------------------------|
| `Reanzly.md` | Comprehensive module catalog | Mostly accurate on scope; overstates completion for warehouse, compliance, payments |
| `AUDIT.md` (2026-08-12) | Warehouse has no Prisma models | **Stale** — 12 warehouse models + 24 API routes now exist |
| `AUDIT.md` | Broker has zero fetch() | **Stale** — 10 `use-broker-*-data.ts` hooks call APIs |
| `AUDIT.md` | Ledger fully localStorage | **Partially stale** — `use-ledger-data.ts` now fetches `/api/ledger/*` |
| `task.md` | Rust SLM verified working | **Accurate** when engine running locally; not deployed in Docker |
| `worklog.md` | Chat fix, SLM stages | **Accurate** for described fixes |
| `.env.example` | NextAuth | **Stale** — custom session auth used |

**Rule applied:** Code wins over documentation.

---

## V. Security Findings

### Critical

1. **`/api/driver/activity`** — unauthenticated read/write by `driverId` (cross-tenant).
2. **Warehouse POST tenant escape** — `{ companyId: sessionUser.companyId, ...body }` on 8+ create routes.

### High

3. **No API middleware** — 236 routes self-police; one miss = exposure.
4. **`/api/storage/[...key]` IDOR** — any authenticated user can fetch any key.
5. **Webhook no signature verification** — `integrations/webhook/[providerId]`.
6. **Unauthenticated `/api/metrics` and `/api/health`** — infrastructure reconnaissance.
7. **Chat `/internal/broadcast` unauthenticated** — arbitrary socket events.

### Medium

8. Missing `requireModuleAccess` on ~35 routes.
9. Ledger journal line `accountId` not tenant-validated on PATCH.
10. `ignoreBuildErrors: true` ships type-unsafe code.
11. Money as `Float` in Prisma — accounting precision risk.
12. RBAC permissions in static `mock-data.ts` — not admin-editable.

**Security blocker count (Critical + High): 5** (items 1–5 above; item 7 borderline High).

---

## W. P0 Issues

| # | Issue | Evidence |
|---|-------|----------|
| P0-1 | **Production build fails** | `npm run build` — 13 `Module not found` (incomplete `node_modules`; `@radix-ui/*`, `cmdk`, `gsap`, `socket.io-client`, etc.) |
| P0-2 | **Unauthenticated driver activity API** | `src/app/api/driver/activity/route.ts` — no `getSessionUser()` |
| P0-3 | **Warehouse UI disconnected from API** | `warehouse/index.tsx` — zero `fetch()`; 24 API routes unused |
| P0-4 | **Warehouse tenant escape on create** | `warehouse/inbound/route.ts:27-30` — `...body` after `companyId` |
| P0-5 | **Zero automated tests** | No test files in repository |
| P0-6 | **Storage IDOR** | `storage/[...key]/route.ts` — session without ownership check |

---

## X. P1 Issues

| # | Issue |
|---|-------|
| P1-1 | No `middleware.ts` for API auth allowlist |
| P1-2 | Payments receivables/CN-DN entirely mock |
| P1-3 | Compliance module 100% mock (7 roles expect real data) |
| P1-4 | All third-party integrations simulated |
| P1-5 | Documents upload metadata-only (no blob storage) |
| P1-6 | slm-engine not in Docker/deployment path |
| P1-7 | `typescript.ignoreBuildErrors: true` |
| P1-8 | 1,313 TypeScript errors (`tsc --noEmit`) |
| P1-9 | ESLint 52 errors / 1 warning |
| P1-10 | Settings user management — no POST/PATCH/DELETE on `/api/users` |
| P1-11 | HR 8/13 tabs still mock/localStorage |
| P1-12 | Webhook signature verification missing |
| P1-13 | Public `/api/metrics` exposes internals |
| P1-14 | Money fields use Float not Decimal |

---

## Y. P2 Issues

| # | Issue |
|---|-------|
| P2-1 | Router maps `app-store` → IntegrationsModule |
| P2-2 | Dashboard Rean widgets use static mock arrays |
| P2-3 | Reports data explorer uses deterministic RNG |
| P2-4 | Workshop module fully mock (no schema) |
| P2-5 | Marketing/subscriptions/surveys mock |
| P2-6 | Superadmin org/user data in localStorage store |
| P2-7 | `.env.example` documents NextAuth not in use |
| P2-8 | `db:push --accept-data-loss` in package.json |
| P2-9 | Agent loop UI simulated while playground is real (confusing) |
| P2-10 | Chat Rean callback hardcoded to `localhost:3000` |
| P2-11 | S3 storage driver stubbed |
| P2-12 | `console.log` in production paths (queue, seeds) |
| P2-13 | Prisma schema header still references SQLite |
| P2-14 | Missing `/api/integrations/test` route referenced by store |

---

## Z. Production Readiness Score

| # | Area | Score /10 | Rationale |
|---|------|----------|-----------|
| 1 | Authentication | 7 | Real sessions; demo affordances; no middleware |
| 2 | RBAC | 5 | Module gates exist; static permissions; gaps |
| 3 | Tenant isolation | 5 | Mostly `companyId`; critical holes |
| 4 | Core freight ops | 8 | Trips, LR, POD, fleet solid |
| 5 | Fleet maintenance | 7 | Real WO/inspection/fuel |
| 6 | Finance & accounting | 4 | Ledger partial; payments mock; Float money |
| 7 | HR & payroll | 6 | APIs real; UI tabs mixed |
| 8 | CRM & customers | 7 | Fully wired |
| 9 | Warehouse WMS | 2 | API built; UI broken |
| 10 | Broker network | 6 | APIs wired; marketplace mocks |
| 11 | Vendor portal | 7 | End-to-end real |
| 12 | Driver field app | 5 | GPS real; earnings mock; activity API open |
| 13 | Chat & real-time | 7 | Real service; routing gaps in prod |
| 14 | Rean / SLM | 6 | Real when engine runs; not deployed |
| 15 | External integrations | 2 | All simulated outbound |
| 16 | File storage | 4 | Local works; documents unwired; IDOR |
| 17 | Jobs & automation | 6 | Worker real; notifications stub |
| 18 | Testing | 1 | Zero tests |
| 19 | Build & type safety | 2 | Build fails; 1313 TS errors; ignore flags |
| 20 | Observability | 4 | Basic health/metrics; public endpoints |
| 21 | Deployment | 5 | Docker exists; incomplete service matrix |
| 22 | Documentation accuracy | 5 | AUDIT.md partially stale |

### **Overall: 39 / 100**

---

## AA. Recommended Implementation Sequence

1. **Restore build integrity** — `npm ci` from lockfile; verify `npm run build` passes; remove `ignoreBuildErrors`.
2. **Security hotfixes** — auth on `driver/activity`; fix warehouse body spread; storage ownership checks; webhook signatures; API middleware allowlist.
3. **Wire warehouse UI** — replace `_helpers.tsx` static arrays with `fetch('/api/warehouse/*')` (biggest functional gap).
4. **Finance hardening** — migrate money to Decimal; complete payments module against `TreasuryVoucher`; remove ledger localStorage tally.
5. **Integration layer** — implement at least one real provider (e.g. Razorpay or MSG91) end-to-end; remove simulated sync/test paths or gate behind feature flags.
6. **Test foundation** — auth, tenant isolation, trips CRUD, ledger journal balance API tests.
7. **Deploy slm-engine** — add to Dockerfile/compose; document `SLM_ENGINE_URL`.
8. **Documents blob pipeline** — wire upload drawer to `/api/storage` + `Document.storageKey`.
9. **Compliance & workshop** — either implement models/APIs or remove from role permissions.
10. **Observability** — authenticate metrics; add structured logging; OTel optional.

---

## AB. Evidence / Commands Executed

All commands run read-only from `d:\Reanzly` on 2026-09-01 unless noted.

### Git baseline

```powershell
git status
git branch -a
git rev-parse HEAD
git log -1 --oneline
```

**Results:** `main`, clean, HEAD `f194751`, up to date with `origin/main`.

### File inventory

```powershell
(Get-ChildItem -Recurse -File | Where-Object { $_.FullName -notmatch 'node_modules|\.next|db\\custom\.db' }).Count
```

**Result:** 1,017 files.

### TypeScript check

```powershell
npx tsc --noEmit
```

**Result:** Exit code 2 — **1,313 errors** (sample: seed scripts report `Property 'rateCard' does not exist on type 'PrismaClient'` — stale generated client).

### ESLint

```powershell
npm run lint
```

**Result:** Exit code 1 — **52 errors, 1 warning** (e.g. `react-hooks/set-state-in-effect` in `use-mobile.ts`).

### Production build

```powershell
npm run build
```

**Result:** Exit code 1 — Turbopack **13 module-not-found errors**:

- `@radix-ui/react-alert-dialog`, `react-avatar`, `react-collapsible`, `react-label`, `react-radio-group`, `react-slider`
- `cmdk`, `gsap`, `hls.js`, `react-day-picker`, `react-syntax-highlighter`, `socket.io-client`

**Note:** `Test-Path node_modules/@radix-ui/react-alert-dialog` → **False** despite entries in `package.json`. Lockfile install not run during audit (audit-only constraint).

### Tests

```powershell
# Glob search
**/*.{test,spec}.{ts,tsx,js}
```

**Result:** 0 files.

### Code searches (representative)

```powershell
# Prisma models
rg '^model ' prisma/schema.prisma  # → 100 models

# Warehouse UI — no fetch
rg 'fetch\(' src/components/modules/warehouse  # → No matches

# Middleware
# src/middleware.ts → Not found

# Mock-data imports
rg 'mock-data|@/lib/mock-data' src  # → 80+ files

# Simulation patterns
rg 'setTimeout|Math\.random' src  # → 80+ files (integrations, seeds, UI)

# console.log in src
rg 'console\.log' src  # → 37 files (mostly seeds + queue)

# TODO/FIXME/MOCK
rg 'TODO|FIXME|MOCK|HACK' src  # → 11 files
```

### Files read for verification

- `package.json`, `next.config.ts`, `.env.example`, `prisma/schema.prisma` (partial)
- `src/lib/auth.ts`, `src/lib/permissions.ts`
- `src/components/modules/router.tsx`, `warehouse/index.tsx`
- `src/app/api/auth/login/route.ts`, `driver/activity/route.ts`, `warehouse/inbound/route.ts`
- `src/app/api/ledger/_lib.ts`, `src/components/modules/payments/use-payments-data.ts`
- `AUDIT.md`, `task.md`, `worklog.md` (headers)
- Subagent verification of all 236 API routes and 54 module directories

### Deliverable path

`d:\Reanzly\docs\REANZLY-EXISTING-REPOSITORY-AUDIT.md`

---

*End of audit.*

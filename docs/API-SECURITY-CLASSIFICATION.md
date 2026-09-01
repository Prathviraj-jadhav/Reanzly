# API Security Classification

**Generated:** B0 baseline (2026-09-01)  
**Purpose:** Classify all `/api/*` route groups by auth model and document exceptions.

## Guard helpers (`src/lib/api-guards.ts`)

| Helper | Use |
|--------|-----|
| `requireInternalAuth(req)` | Internal service secret via `x-reanzly-internal-secret` or `Authorization: Bearer` |
| `requireMetricsAccess(req, sessionUser)` | Metrics: internal secret OR platform `superadmin` session |
| `tenantCreateData(body, companyId, fields)` | Warehouse POST — strips `companyId`/`id` from body, sets tenant last |
| `tenantPatchData(body, fields)` | Safe PATCH field allowlists |
| `verifySecret(provided, expected)` | Constant-time secret comparison |

**Env vars:** `INTERNAL_SERVICE_SECRET` / `REANZLY_INTERNAL_SECRET`, `CHAT_INTERNAL_SECRET`, `WEBHOOK_SECRET_<PROVIDER>` / `INTEGRATION_WEBHOOK_SECRET_<PROVIDER>`

## Route classification

| Group | Routes | Auth | Tenant | Module gate | Notes |
|-------|--------|------|--------|-------------|-------|
| **Public** | `/api`, `/api/health` | None | N/A | N/A | Health returns `{ status: "ok" }` only |
| **Auth** | `/api/auth/login`, `signup*`, `logout` | Mixed | Partial | No | Intentionally public for onboarding |
| **Webhooks** | `/api/integrations/webhook/[providerId]` | Signature | Per-connection | No | HMAC/signature required before DB writes |
| **Internal** | Chat `/internal/broadcast` (port 3003) | `CHAT_INTERNAL_SECRET` | N/A | N/A | Not a Next.js route |
| **Platform admin** | `/api/metrics`, `/api/superadmin/*`, `/api/queue/status` | Session + superadmin OR internal secret | Platform | N/A | Metrics no longer public |
| **Session + module** | trips, vehicles, drivers, ledger, warehouse, hr, payroll, crm, etc. | `getSessionUser()` | `companyId` filter | `requireModuleAccess` | Default pattern (~200 routes) |
| **Driver field** | `/api/driver/me`, `location`, `activity` | Session | Driver scope + `companyId` | No (role-scoped) | Activity/location use `resolveDriverScope` |
| **Vendor portal** | `/api/vendor-portal/*` | Session | `customerId` link | No | Portal identity, not module RBAC |
| **Chat REST** | `/api/chat/*` | Session | Participant check | No | **Documented exception** — participant-scoped |
| **Storage** | `/api/storage/[...key]` | Session | Ownership via `canAccessStorageObject` | No | IDOR-safe; traversal blocked |
| **Broker** | `/api/broker/*` | Session | `brokerProfileId` | Yes | Broker-scoped tenancy |
| **Dashboard/audit** | `/api/dashboard/stats`, `/api/audit-log` | Session | `companyId` | Partial | **Exception:** auth-only; stats is read-only aggregate |

## Module access exceptions (auth-only, documented)

These routes authenticate but do not call `requireModuleAccess` by design:

| Route(s) | Rationale |
|----------|-----------|
| `/api/chat/*` | Participant membership is the access boundary |
| `/api/vendor-portal/*` | Scoped to vendor `customerId`, not app modules |
| `/api/driver/*` | Field-app identity; driver/location/activity use role + driver scope |
| `/api/dashboard/stats` | Read-only KPI aggregate for any signed-in tenant user |
| `/api/notifications/*` | User-scoped inbox |
| `/api/auth/*` | Login lifecycle |
| `/api/health` | Public liveness |

## B0 security fixes applied

1. **Driver activity** — session + `resolveDriverScope` (tenant + driver isolation)
2. **Warehouse POST** — explicit field mapping; `companyId` cannot be overridden
3. **Storage GET** — ownership check + path traversal prevention
4. **Webhooks** — provider signature verification before mutations
5. **Chat broadcast** — internal secret required
6. **Health/metrics** — public liveness vs protected detailed metrics
7. **Ledger PATCH** — `accountId` validated against tenant accounts

## Remaining gaps (post-B0)

- No global API middleware (by design — avoids breaking login/webhooks)
- ~35 routes still auth-only without module gate; see exceptions above
- RBAC permissions remain in `mock-data.ts` (not DB-editable)
- Money fields still `Float` in Prisma

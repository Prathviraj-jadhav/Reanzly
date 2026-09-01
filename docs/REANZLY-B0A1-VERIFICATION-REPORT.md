# Reanzly B0A-1 Verification Report

**Date:** 2026-09-01  
**Starting HEAD:** `144e386dc7a72619abc465b22b524fb750bbd5cd`  
**Branch:** `main`  
**Scope:** B0A-1 — Auth & Identity Extraction

---

## A. Pre-flight baseline

| Item | Value |
|------|-------|
| Branch | `main` |
| Starting HEAD | `144e386dc7a72619abc465b22b524fb750bbd5cd` |
| `npm ci` | **PASS** |
| `npm test` (pre) | **21/21 PASS** (18 B0 + 3 B0A-0) |
| `npm run typecheck` (pre) | **0 errors** |
| `npm run lint` (pre) | **PASS** |
| `npm run build:web` / `build:api` (pre) | **PASS** |

---

## B. Auth route inventory & parity matrix

| Legacy route | Method | V1 route | Implemented |
|--------------|--------|----------|-------------|
| `/api/auth/login` | POST | `/v1/auth/login` | ✅ |
| `/api/auth/logout` | POST | `/v1/auth/logout` | ✅ |
| `/api/auth/me` | GET | `/v1/auth/me` | ✅ |
| `/api/auth/profile` | GET/PATCH | `/v1/auth/profile` | ✅ |
| `/api/auth/signup` | POST | `/v1/auth/signup` | ✅ |
| `/api/auth/signup-driver` | POST | `/v1/auth/signup-driver` | ✅ |
| `/api/auth/signup-broker` | POST | `/v1/auth/signup-broker` | ✅ |
| `/api/auth/signup-shipper` | POST | `/v1/auth/signup-shipper` | ✅ |
| `/api/auth/switch-role` | POST | `/v1/auth/switch-role` | ✅ |
| `/api/auth/forgot-password` | POST | `/v1/auth/forgot-password` | ✅ |

No separate password-reset or change-password routes exist beyond `forgot-password`.

---

## C. `packages/auth`

| Item | Status |
|------|--------|
| scrypt `hashPassword` / `verifyPassword` | ✅ |
| Session token create/lookup/destroy | ✅ |
| Cookie constants + `sessionCookieOptions` | ✅ |
| `getSessionUserByToken` | ✅ |
| `getAuthContextByToken` (extended scope) | ✅ |
| Shared handlers (login, signup, profile, switch-role, forgot-password) | ✅ |
| No Next.js dependency | ✅ |
| Uses Node `crypto` + Prisma types (no direct DB import) | ✅ |

---

## D. Cookie model

| Property | Value |
|----------|-------|
| Name | `reanzly_session` |
| Type | Opaque DB-backed token (not JWT) |
| HttpOnly | ✅ |
| SameSite | `Lax` |
| Secure | Production only |
| Domain | Host-only (no `Domain` attribute) |
| TTL | 30 days |

---

## E. Fastify auth plugin (`apps/api`)

| Item | Status |
|------|--------|
| Cookie → session → user resolution | ✅ |
| `request.auth` typed context | ✅ |
| `requireAuth` / `requireRole` guards | ✅ |
| Context fields: `userId`, `companyId`, `role`, `branchId?`, `customerId?`, `brokerProfileId?`, `driverId?` | ✅ |

---

## F. `packages/contracts` auth schemas

| Schema | Status |
|--------|--------|
| `LoginRequest` / `LoginResponse` | ✅ |
| `MeResponse` | ✅ |
| Signup variants (owner, driver, broker, shipper) | ✅ |
| `ProfilePatch` / `ProfileResponse` | ✅ |
| `SwitchRoleRequest` | ✅ |
| No `passwordHash`, `salt`, or raw token exposure | ✅ |

---

## G. V1 auth routes

All 10 legacy auth endpoints ported to `/v1/auth/*` with semantic parity.

---

## H. Login parity

| Behavior | Preserved |
|----------|-----------|
| scrypt verification | ✅ |
| Generic `Invalid email or password.` (no enumeration) | ✅ |
| Active account check | ✅ |
| Rate limit 10/min per IP | ✅ |
| Session cookie + `lastActive` update | ✅ |
| Response `{ user: SessionUser }` | ✅ |

---

## I. Logout parity

| Behavior | Preserved |
|----------|-----------|
| Server-side session row deletion | ✅ |
| Cookie cleared | ✅ |
| Response `{ ok: true }` | ✅ |

---

## J. Session / me parity

| Behavior | Preserved |
|----------|-----------|
| Cookie-only identity | ✅ |
| `{ user: null }` + 401 when unauthenticated | ✅ |
| Narrow `SessionUser` shape | ✅ |

---

## K. Signup parity

| Variant | Transaction | Session on success |
|---------|-------------|-------------------|
| Owner (`signup`) | Company + User | ✅ |
| Driver | Company + User + Driver + Vehicle | ✅ |
| Broker | `$transaction` (Company + User + BrokerProfile) | ✅ |
| Shipper | `$transaction` (Company + User + Customer) | ✅ |

Rate limit: 10/min on all signup POSTs.

---

## L. Role switch parity

| Guard | Status |
|-------|--------|
| Requires existing session | ✅ |
| Owner or superadmin only | ✅ |
| Same `companyId` only | ✅ |
| Owner cannot switch to superadmin | ✅ |
| Destroys old session, creates new | ✅ |

---

## M. Frontend auth cutover

| Consumer | Migrated to `auth-api.ts` → `/api/v1/auth/*` |
|----------|-----------------------------------------------|
| `app-store.ts` (login, me, logout, signup) | ✅ |
| `login-screen.tsx` (forgot-password) | ✅ |
| `signup-screen.tsx` (driver/shipper/broker) | ✅ |
| `profile.tsx` | ✅ |
| `header.tsx` (switch-role) | ✅ |

Non-auth `fetch("/api/...")` consumers unchanged (~135).

---

## N. Migration flag / rollback

| Env var | Values | Default |
|---------|--------|---------|
| `NEXT_PUBLIC_AUTH_API_VERSION` | `v1` \| `legacy` | `v1` |
| `REANZLY_AUTH_API_VERSION` | `v1` \| `legacy` | `v1` |

Set to `legacy` to route auth domain back to Next.js `/api/auth/*`.

---

## O. Legacy routes

All 10 legacy handlers preserved with `@deprecated` shim comments; delegate to `@reanzly/auth` via `auth-routes.ts`.

---

## P. Chat compatibility

Fastify-created sessions use the same `Session` table and opaque token format. `getSessionUserByToken` integration test confirms chat-service lookup compatibility.

---

## Q. Auth tests

| Suite | Cases |
|-------|-------|
| `packages/auth` password | 2 |
| `packages/auth` session | 5 |
| `apps/api/test/auth.test.ts` | 12 |
| `auth-parity.test.ts` | 3 |
| `api-client.test.ts` (auth routing) | 2 |

---

## R. Parity tests

Legacy vs v1 semantic parity covered for login failure message, me field shape, logout revocation, and error envelopes.

---

## S. Total tests

| Metric | Result |
|--------|--------|
| B0 security tests | **18/18 PASS** |
| B0A-0 tests | **3/3 PASS** |
| B0A-1 new tests | **24** |
| **Total** | **45/45 PASS** |

---

## T. TypeScript / lint / builds

| Command | Result |
|---------|--------|
| `npm run typecheck` | **0 errors** |
| `npm run lint` | **0 errors** (4 cosmetic warnings) |
| `npm run build:web` | **PASS** |
| `npm run build:api` | **PASS** |

---

## U. Security regression (B0)

All 18 B0 security tests pass unchanged.

---

## V. Rate limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| login, signup variants | 10 | 60s per IP |
| forgot-password | 5 | 60s per IP |

In-memory limiter (same model as legacy `security.ts`). Production should migrate to Redis (documented).

---

## W. CSRF review

| Topic | Notes |
|-------|-------|
| SameSite=Lax | Default on session cookie — protects against cross-site POST from third-party origins |
| Future `api.reanzly.com` | Subdomain cookie sharing requires explicit `Domain=.reanzly.com` policy review before cutover; not enabled in B0A-1 |
| No localStorage tokens | Session remains HttpOnly cookie only |

---

## Remaining blockers

| # | Item | Severity |
|---|------|----------|
| 1 | In-memory rate limit not shared across API replicas | P2 |
| 2 | `forgot-password` still reveals email existence (pre-existing) | P2 |
| 3 | Business API migration (B0A-2+) | Planned |

---

## B0A-1 Decision

**PASS — Auth extracted to `packages/auth` + Fastify `/v1/auth/*` with legacy rollback, frontend cutover, and full test coverage.**

---

*End of B0A-1 verification report.*

# Reanzly — Production Infrastructure & Ownership Baseline (B0D-0)

**Date:** 2026-09-03  
**Phase:** B0D-0  
**Decision:** `B0D-0 READY FOR OPERATOR CONNECTION`  
**Verified routing candidate SHA:** `a1ef307a3cf423255fba6f7eb73ab960f1ea686e`  
**Live flag-ON App Router:** **NOT proven** (`/dashboard` 200 legacy; `/app/dashboard` 404)

Do not begin B0R-8B. Do not start soak until flag-ON production deploy + smoke PASS.

---

## A. Architecture

### Observed live frontend (evidence)

| Fact | Evidence |
| ---- | -------- |
| Public site | `https://www.reanzly.com` |
| Apex | `https://reanzly.com` → 307 → `https://www.reanzly.com/` |
| Edge host | Response `Server: Vercel` |
| DNS `www` | CNAME → `cname.vercel-dns.com` |
| DNS apex | A → `76.76.21.21` (Vercel anycast) |
| Routing topology | Legacy SPA `/dashboard` **200**; `/app/dashboard` **404** |
| Public health | `GET /api/health` → **200** JSON `{ status: "ok" }` |

### Documented alternate / VPS path (`DEPLOYMENT_INFO.md`)

Repo documents a **self-hosted Ubuntu VPS** path:

| Item | Documented value |
| ---- | ---------------- |
| Host | `151.106.96.77` |
| SSH | port `65002`, user `deploy`, key path `~/.ssh/reanzly_deploy_key` |
| App dir | `/opt/reanzly` |
| Gateway | Caddy `:80`/`:443` |
| App | Next.js `:3000` + Socket.IO chat `:3003` |
| Historical DB note | SQLite `db/custom.db` (superseded in schema by PostgreSQL) |

**Status from this host:** SSH deploy key **MISSING**; VPS reachability / live role of VPS behind `www` **NOT VERIFIED**. Public DNS for `www`/`reanzly.com` points at **Vercel**, not the documented VPS IP.

### Application topology (repo)

```text
Browser
  → Vercel (Next.js apps/web)  [LIVE for www]
      → /api/health (Next route)
      → /api/* legacy Next handlers (majority still in apps/web)
      → /api/v1/* rewrite → API_PROXY_ORIGIN (default localhost:4000)
           → intended Fastify apps/api /v1/*

Optional / co-located (Docker/Caddy designs):
  → apps/chat (Socket.IO :3003)
  → queue worker started from apps/web instrumentation.ts (in-process)
  → apps/worker (standalone package; separate host NOT VERIFIED)
  → apps/slm-engine (optional Rust; not required for routing soak)
```

**Render:** No `render.yaml`, no Render service IDs/hooks in repo. Render is **not evidenced** as current production host.

---

## B. GitHub

| Field | Value |
| ----- | ----- |
| Remote | `https://github.com/Prathviraj-jadhav/Reanzly.git` |
| Owner (from URL) | Personal account `Prathviraj-jadhav` |
| Repository | `Reanzly` |
| Default / production branch (local) | `main` |
| `gh auth status` | **NOT AVAILABLE** (not logged in) |
| Org vs personal | **Personal** (recommend company org — do not transfer automatically) |
| Environments `staging` / `production` | **NOT VERIFIED** (API inaccessible without auth) |

### Existing workflows

| Workflow | Trigger | Purpose | Deploys? | Environment | Status |
| -------- | ------- | ------- | -------- | ----------- | ------ |
| `.github/workflows/ci-cd.yml` — DevSecOps CI | push/PR `main`/`master` | Bun install, lint, `bun run build`, Docker+Trivy | No (CI job) | none named | Present; **Bun-centric**, not the npm Node 20 gate matrix |
| `.github/workflows/ci-cd.yml` — CD SSH | push `main`/`master` if `DEPLOY_MODE != self-hosted-runner` | SSH to VPS, write `.env`, `deploy-prod.sh` | **Yes (VPS)** | none named | Present; requires secrets; historically host may be unreachable |
| `.github/workflows/ci-cd.yml` — CD self-hosted | push when `DEPLOY_MODE=self-hosted-runner` | rsync + deploy on runner | **Yes (VPS)** | none named | Present; runner registration **NOT VERIFIED** |
| `.github/workflows/restore-ssh.yml` | push `main` + `workflow_dispatch` | VPS diagnostics / authorized_keys restore | No product deploy | self-hosted | Present; operational risk if runner compromised |
| `.github/workflows/ci.yml` | push/PR `main`/`master` | npm Node 20: ci, db:generate, typecheck, lint, test, build:web, build:api | No | none | **Added in B0D-0** (safe, no deploy secrets) |

GitHub currently **does not** (from repo evidence) deploy Vercel or Render. Vercel Git integration is the preferred frontend path once operator-verified.

---

## C. CI

### Target gates (B0D-0)

**PR / main (`ci.yml`):**

```text
npm ci
npm run db:generate
npm run typecheck
npm run lint
npm test
npm run build:web
npm run build:api
```

Node **20** (repo `engines`: `>=20.9.0 <25`).

**Critical Playwright routing:** designed as separate job/workflow (`routing-critical-e2e`) — **not** mandatory on every tiny PR until secrets/fixtures are operator-owned. Must **not** use production DB.

**Full routing suite:** main/nightly/release only (policy in runbook).

**Production release:** manual approval + deploy exact SHA + post-deploy smoke (operator; not automated in B0D-0).

---

## D. Vercel

| Field | Value | Confidence |
| ----- | ----- | ---------- |
| Project name | `reanzly` | Documented (`DEPLOYMENT_INFO.md`) |
| Project URL | `https://vercel.com/prathviraj-jadhavs-projects/reanzly` | Documented |
| Project ID | `prj_ukbERz8sQp00bFfYBX2dVkjQkZDT` | Documented |
| Org/Team ID | `team_qj2noUY0FohBQiu0WXIxaOYJ` | Documented |
| Account type | Personal team slug `prathviraj-jadhavs-projects` | Documented → **BUSINESS CONTINUITY RISK** |
| Framework | `nextjs` (`vercel.json`) | Repo |
| Build | `bash scripts/build-vercel.sh` | Repo |
| Install | `bun install` (`vercel.json`) — note monorepo root also has `package-lock.json` / npm workspaces | Repo conflict risk |
| Production domain | `www.reanzly.com` / `reanzly.com` | Live DNS + HTTP |
| Git integration | **NOT VERIFIED** from this host | Need operator Vercel dashboard |
| CLI | **NOT INSTALLED** | This host |
| Access from Cursor | **NOT VERIFIED** | Prior sessions agree |

### Routing flag (critical)

| Context | `NEXT_PUBLIC_ROUTING_MIGRATION` |
| ------- | -------------------------------- |
| Repo default (code) | unset/falsy → legacy SPA behavior |
| `.env.example` | commented `# NEXT_PUBLIC_ROUTING_MIGRATION=1` |
| Expected Preview (soak canary) | `1` at **build** time |
| Expected Production (B0R-8S) | `1` at **build** time |
| Live production | Behavior implies **not** flag-ON |

Auth API for production: default **`v1`** (Fastify via `/api/v1`). Do **not** set Playwright `legacy` in Vercel Production.

---

## E. Render

| Service | Expected host | Build | Start | Health | Branch |
| ------- | ------------- | ----- | ----- | ------ | ------ |
| API (`apps/api`) | **NOT on Render (no evidence)** | `npm run build -w @reanzly/api` | `node dist/cli.js` | `/v1/health` | n/a |
| Worker (`apps/worker`) | **NOT VERIFIED** separate host | `npm run build -w @reanzly/worker` | `node dist/main.js` | none dedicated | n/a |
| Chat (`apps/chat`) | Docker/Caddy co-locate in docs; **not Render** | bun | `bun index.ts` / hot | internal | n/a |

**Render ownership/access:** **NOT VERIFIED** — no Render config in repo; treat as **not required** until an operator explicitly hosts services there.

---

## F. Database

| Field | Value |
| ----- | ----- |
| Prisma provider | `postgresql` (`packages/database/prisma/schema.prisma`) |
| Env vars | `DATABASE_URL`, `DIRECT_URL` (optional `DATABASE_REPLICA_URL`) |
| Provider class | **Supabase** (documented in `.env.example` pooler/direct host pattern; local production env template present) |
| Connection strings | **NOT PRINTED** |
| `prisma/migrations` | **ABSENT** |
| Scripts | `db:push` uses `prisma db push --accept-data-loss`; `db:migrate` / `db:reset` exist |
| Production migrate strategy | **Do not** auto-run `db push` or destructive migrate in CI/CD. Introduce versioned migrations before schema-changing releases. |
| Backup status | **NOT VERIFIED** |

---

## G. Supabase

Supabase **is required** for the documented PostgreSQL production design (pooler + direct URLs).

| Field | Status |
| ----- | ------ |
| Organization | **NOT VERIFIED** |
| Project | **NOT VERIFIED** |
| Region | Example docs mention `ap-south-1`; live project region **NOT VERIFIED** |
| Connection mode | Pooler (`DATABASE_URL`) + Direct (`DIRECT_URL` for Prisma migrate) |
| Backup ownership | **NOT VERIFIED** |
| Access from this host | **NOT VERIFIED** |

Recommend: company org, ≥2 admins, least-privilege developer access, no sole personal-account ownership.

---

## H. DNS

| Domain | Observed | Notes |
| ------ | -------- | ----- |
| `www.reanzly.com` | CNAME → Vercel | TLS OK (HTTPS 200 paths) |
| `reanzly.com` | A → Vercel; HTTPS 307 → www | TLS OK |
| `api.reanzly.com` | Design-only in architecture docs | **NOT VERIFIED** as live |
| Chat dedicated domain | Not required in current same-origin/Caddy design | |

| Field | Status |
| ----- | ------ |
| DNS provider account | **unknown / NOT VERIFIED** |
| Account access from Cursor | **NOT VERIFIED** |

No DNS mutations performed in B0D-0.

---

## I. Environments

| Environment | Purpose | Frontend | Backend | Data |
| ----------- | ------- | -------- | ------- | ---- |
| `local` | Dev | `next dev` | optional Fastify `:4000` | local/dev DB |
| `preview` / staging | Pre-prod canary | Vercel Preview or `staging.reanzly.com` **if** DNS permits | same-origin or staging API | non-prod preferred |
| `production` | Live | Vercel Production | Next handlers + optional Fastify proxy | Supabase prod |

Recommend GitHub Environments: `staging`, `production` with **manual approval** on production deploy jobs (when CD is re-enabled under org control).

---

## J. Secrets Ownership

| Secret/Config Type | Owner |
| ------------------ | ----- |
| CI credentials (SSH, if VPS CD used) | GitHub Actions secrets / Environments |
| Frontend build/runtime (`NEXT_PUBLIC_*`, `NEXTAUTH_*`, `API_PROXY_ORIGIN`) | Vercel project env |
| Fastify API secrets (if separately hosted) | Hosting provider env (Render/VPS) — **N/A until hosted** |
| DB credentials | Supabase (or DB provider) |
| DNS | Domain registrar / DNS provider |
| Chat/internal secrets | Same host as chat + web (`CHAT_INTERNAL_SECRET`, `INTERNAL_SERVICE_SECRET`) |

Do not duplicate every secret into GitHub unless a job needs it.

---

## K. Deployment Flow (target)

```text
release SHA on main (candidate a1ef307 or later infra-only commit)
  ↓
GitHub CI green (ci.yml)
  ↓
production approval (human)
  ↓
Vercel: set NEXT_PUBLIC_ROUTING_MIGRATION=1 (build) → deploy exact SHA
  ↓
Backend/DB: redeploy only if changed (B0R-8S should be frontend-only)
  ↓
post-deploy smoke (/dashboard→/app/dashboard, /login, /api/health)
  ↓
B0R-8S soak start
```

Prefer **Vercel Git integration** over custom Actions deploy tokens. Prefer **not** to use the VPS SSH CD path for frontend routing cutover while `www` is on Vercel.

---

## L. SHA Traceability

| Source | Use |
| ------ | --- |
| Vercel deployment metadata / dashboard | Primary for live frontend SHA + Deployment ID |
| `VERCEL_GIT_COMMIT_SHA` (build env) | Available in Vercel builds; surface via operator tools |
| GitHub Actions run ID | CI/CD audit trail |
| `/api/health` | Currently `{ status: "ok" }` only — **propose** optional non-sensitive `gitSha` later; **not implemented** in B0D-0 |

Until operator access exists, live SHA remains **NOT RETRIEVED**.

---

## M. Health Checks

| Surface | Endpoint | Notes |
| ------- | -------- | ----- |
| Frontend liveness | `GET /api/health` | Public; OK |
| App pages | `/`, `/login`, `/dashboard` | Smoke |
| Flag-ON proof | `/app/dashboard` must not 404 after cutover | Soak gate |
| Fastify | `GET /v1/health` | Via `/api/v1/health` when proxy configured |
| Docker compose | wget `localhost:3000/api/health` | VPS path |
| Chat | No public health standardized | internal |
| Worker | In-process; no separate HTTP health | |

---

## N. Rollback

### Frontend routing

1. Set Vercel Production build env `NEXT_PUBLIC_ROUTING_MIGRATION=0` (or remove) → **rebuild/redeploy**, or  
2. Instant rollback to previous Vercel deployment (known-good flag-OFF).

Runtime-only env change will **not** flip inlined `NEXT_PUBLIC_*`.

### Backend

Only if backend image/SHA changed. B0R-8S should keep backend unchanged.

### Known-good live SHA

**NOT RETRIEVED** (no Vercel/gh access). Live behavior is flag-OFF / legacy dashboard.

---

## O. Access Matrix

| System | Required for B0R-8S? | Connected from Cursor? | Ownership | Access level | Blocker |
| ------ | -------------------- | ---------------------- | --------- | ------------ | ------- |
| GitHub | Yes | No (`gh` unauthenticated) | Personal `Prathviraj-jadhav` | unknown | Auth + org recommendation |
| Vercel | Yes (frontend) | No (CLI missing) | Personal team (docs) | unknown | Login + env + deploy |
| Render | No (not evidenced) | N/A | N/A | N/A | None unless adopted |
| Supabase/DB | Yes (prod data) | No | **NOT VERIFIED** | unknown | Org access + backups |
| DNS | Yes (domain control) | No | **unknown** | unknown | Identify registrar |
| VPS SSH | Only if using Docker path | No (key missing) | Documented personal deploy key | none here | Optional for www-on-Vercel |

---

## P. Remaining Blockers

1. **SECURITY BLOCKER:** `.env.production` was tracked in git (contains real credentials). Must untrack, rotate credentials, scrub history as authorized.  
2. GitHub / Vercel / Supabase / DNS operator access not available from this environment.  
3. Cannot verify or set Production `NEXT_PUBLIC_ROUTING_MIGRATION=1`.  
4. Cannot retrieve live Deployment ID / SHA.  
5. No Prisma migration history — schema deploy risk.  
6. Dual topology docs (Vercel live vs VPS CD) — clarify source of truth with operators.  
7. `vercel.json` `bun install` vs npm workspaces/`package-lock.json` — reconcile before relying on CI parity with Vercel builds.  
8. Personal-account SPOF on GitHub + Vercel (docs) → **BUSINESS CONTINUITY RISK**.

---

## Related status

```text
B0R-8S: DEPLOYMENT PENDING
B0R-8B: BLOCKED
Production soak: NOT STARTED
```

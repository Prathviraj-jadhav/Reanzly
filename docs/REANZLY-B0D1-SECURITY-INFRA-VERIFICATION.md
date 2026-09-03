# Reanzly B0D-1 — Security & Infrastructure Verification

**Date:** 2026-09-03  
**Phase:** B0D-1 Production Secrets Remediation & Infrastructure Connection  
**Decision:** `B0D-1 BLOCKED — OPERATOR ACTION REQUIRED`  
**Local HEAD:** `9a8896befc66b8564eebce693aabc50f25d41a90` (product-equivalent to `a1ef307`; docs/CI baseline)  
**Remote `origin/main`:** `a1ef307a3cf423255fba6f7eb73ab960f1ea686e` (**still tracks `.env.production`**)

Hard stops honored: no soak, no flag-ON deploy, no B0R-8B, no history rewrite, no auto rotation, no ownership transfer, no Render create, no push.

---

## 1. Git baseline

| Item | Value |
| ---- | ----- |
| Branch | `main` |
| Local HEAD | `9a8896b` — `chore(infra): establish production CI/CD baseline` |
| Ahead of origin | **1** commit (untrack + B0D-0 docs; not pushed) |
| Product candidate | `a1ef307` (routing E2E aligned) |
| Working tree note | Unrelated local soak/script dirt may exist; B0D-1 commit scopes infra/security only |

---

## 2–4. Secret exposure confirmation (metadata only)

| Check | Result |
| ----- | ------ |
| `git ls-files` at local HEAD | `.env.example` only (no `.env.production`) |
| `git ls-tree origin/main .env.production` | **PRESENT** (blob `03e6e315…`) |
| History commits touching path | `fdd5af1`, `b6884dc`, `06c8a75`, `8ab48e0`, delete in local `9a8896b` |
| Local file | Exists on disk; `git check-ignore` → `.gitignore` `.env.*` |
| Names inventoried from local file (no values) | `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NODE_ENV`, `PORT`, `CHAT_SERVICE_PORT` |

### Rotation scope (summary)

| Class | Names |
| ----- | ----- |
| **ROTATE** | `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET` (minimum); plus any sibling secrets in Vercel/GitHub/VPS that matched the leaked set |
| **DO NOT ROTATE** | `NODE_ENV`, `PORT`, `CHAT_SERVICE_PORT` |
| **VERIFY OWNER** | `NEXTAUTH_URL`, chat/internal secrets, SSH deploy key, Playwright demo creds in `.env.example` |

Full procedure: `docs/REANZLY-SECRET-ROTATION-RUNBOOK.md`.

---

## 5–6. Untrack + gitignore

| Action | Status |
| ------ | ------ |
| `git rm --cached .env.production` | **Already effected** on local HEAD via `9a8896b` (delete) |
| Keep `.env.example` | Yes |
| Tighten `.gitignore` | B0D-1: explicit `.env.production`, app/package env patterns |
| Push to clear remote tip | **NOT AUTHORIZED** this session |

---

## 7–8. History exposure assessment (plan only)

| Finding | Detail |
| ------- | ------ |
| Tip exposure | Remote tip still serves `.env.production` until untrack commit is pushed |
| Deep history | Multiple commits + ≥1 blob object still reachable |
| Rewrite executed? | **NO** |

### History remediation decision (document only)

| Option | Description | B0D-1 stance |
| ------ | ----------- | ------------ |
| **A — Purge** | `git filter-repo` remove `.env.production`; force-push authorized refs after rotation | **Recommended after ROTATE + written approval** |
| **B — Leave history** | Rotate only; accept historical blob risk | Acceptable only with explicit org risk acceptance |

**Chosen documentation posture:** Prefer **A**; **do not execute** without new user authorization.

---

## 9–10. Secret rotation runbook

Created: `docs/REANZLY-SECRET-ROTATION-RUNBOOK.md` (order: freeze CD → DB → NextAuth → internal/chat → SSH → integrations → history purge → cache invalidation).

---

## 11–13. Supabase / DB

| Item | Status |
| ---- | ------ |
| CLI / dashboard from this host | **NOT CONNECTED** (`supabase` CLI available via npx only; no project auth) |
| Org / project / region ownership | **NOT VERIFIED** |
| Backup / PITR | **NOT VERIFIED** |
| `prisma/migrations` | **ABSENT** — schema drift risk |
| `db push --accept-data-loss` scripts exist | Do **not** run against prod from agent |

### B0D-DB1 debt (tracked)

```text
B0D-DB1: Introduce versioned prisma/migrations; ban destructive db push in prod CD;
         verify Supabase org ownership + PITR before any schema-changing release.
```

### B0R-8S schema rule

**B0R-8S = NO DB SCHEMA CHANGE.** Frontend routing cutover only once platforms allow.

---

## 14–18. GitHub

| Item | Status |
| ---- | ------ |
| Remote | `https://github.com/Prathviraj-jadhav/Reanzly.git` |
| Ownership | Personal `Prathviraj-jadhav` — **BUSINESS CONTINUITY RISK / SPOF** |
| `gh auth status` | **Not logged in** — no interactive login (not authorized) |
| Environments `staging` / `production` | **NOT VERIFIED** / not creatable without auth |
| Transfer ownership | **NOT DONE** (must not auto-transfer) |

### `ci.yml` validation

| Gate | Present |
| ---- | ------- |
| Node 20 + `npm ci` | Yes |
| `db:generate` with CI placeholder URLs | Yes |
| typecheck / lint / test | Yes |
| `build:web` / `build:api` | Yes |
| Production secrets required? | **No** |
| Routing E2E job | Designed `if: false` — safe |

### Legacy workflow risk classification

| Workflow | Risk | Recommendation |
| -------- | ---- | -------------- |
| `ci-cd.yml` DevSecOps (Bun) | Medium — duplicate CI; Bun vs npm drift | Keep for now; treat `ci.yml` as authoritative quality gate |
| `ci-cd.yml` SSH CD | **HIGH** — can write remote `.env` from GitHub secrets; host TCP reachable | Disable only with operator approval; do not use for www cutover |
| `ci-cd.yml` self-hosted CD | Medium — inactive unless `DEPLOY_MODE=self-hosted-runner` | Leave gated; verify runner ownership |
| `restore-ssh.yml` | **HIGH** — pushes to `main`, embeds deploy pubkey, mutates `authorized_keys` on self-hosted | Restrict / disable with approval; do not delete without approval |

**Disabled this session?** No (requires approval).

---

## 19–26. Vercel / build parity / flags

| Item | Status |
| ---- | ------ |
| CLI | **NOT INSTALLED** |
| Dashboard access | **NOT VERIFIED** |
| Documented project | `reanzly` under personal team `prathviraj-jadhavs-projects` — **SPOF** |
| Git integration | **NOT VERIFIED** |
| Live edge | `Server: Vercel` on www / apex |
| Env matrix presence in Vercel | **NOT VERIFIED** (no API access) |
| `NEXT_PUBLIC_ROUTING_MIGRATION` live | Behavior = **flag-OFF** (`/dashboard` 200, `/app/dashboard` 404) — **NOT deployed ON** |
| Auth API version | Must remain unset/`v1` — **NOT** Playwright `legacy` |

### Bun vs npm (evidence)

| Evidence | Observation |
| -------- | ----------- |
| `vercel.json` `installCommand` | `bun install` |
| Root lockfiles | **Both** `package-lock.json` and `bun.lock` present |
| `package.json` | npm `workspaces`; `engines.node` `>=20.9.0 <25`; no `packageManager` field |
| GitHub `ci.yml` | **npm** Node 20 |
| Legacy `ci-cd.yml` | **Bun** |
| `scripts/build-vercel.sh` | `npx prisma generate` + `npx next build` |

**Reconciliation stance (document):** Prefer **npm + `package-lock.json`** as CI source of truth; treat Vercel `bun install` as **parity risk** until operator changes `installCommand` to `npm ci` (or documents Bun as sole prod installer and aligns CI). **No change forced this session** without build verification access.

---

## 27–30. Fastify / Render / VPS topology

### Live probes (2026-09-03, this host)

| URL | Result |
| ---- | ------ |
| `GET https://www.reanzly.com/api/health` | **200** — keys include `status,database,replica,cache,queue,timestamp,version`; `status=operational`; `version=3.1.0` |
| `GET https://www.reanzly.com/api/v1/health` | **404** — Fastify not publicly evidenced via rewrite |
| `GET https://www.reanzly.com/dashboard` | **200** (legacy) |
| `GET https://www.reanzly.com/app/dashboard` | **404** |
| `GET https://reanzly.com/` | **307** → www (Vercel) |

`next.config.ts` rewrites `/api/v1/*` → `API_PROXY_ORIGIN` default `http://localhost:4000`. On Vercel, without a reachable Fastify origin, `/api/v1/health` 404 is expected.

| Platform | Verdict |
| -------- | ------- |
| **Render** | **NO** — no `render.yaml`, no service IDs; do not create unless operator confirms |
| **VPS** `151.106.96.77:65002` | TCP **REACHABLE** |
| **VPS** `:443` | TCP **REACHABLE** |
| **VPS role vs www** | DNS www/apex → **Vercel**, not VPS IP → classify **LEGACY / SIDELINED for public www**; stack may still be **ACTIVE** for other services — **UNKNOWN** without SSH |

SSH key `~/.ssh/reanzly_deploy_key`: **MISSING** on this host.

---

## 31–33. DNS / live SHA / traceability

| Item | Evidence |
| ---- | -------- |
| `www` | CNAME → `cname.vercel-dns.com` |
| Apex A | `76.76.21.21` (Vercel) |
| NS | `ns1.dns-parking.com`, `ns2.dns-parking.com` |
| SOA / mail clue | `dns.hostinger.com` / SPF `include:_spf.mail.hostinger.com` |
| Registrar/DNS owner account | **Hostinger-associated (inferred)** — login **NOT VERIFIED** from Cursor |
| Live Vercel Deployment ID | **NOT RETRIEVED** (no Vercel access) |
| Live Git SHA | **NOT RETRIEVED** |
| Health `version` | `3.1.0` (app version, not git SHA) |

### Traceability standard (target)

```text
Release record MUST include:
  - Git SHA (40-char)
  - Vercel Deployment ID
  - GitHub Actions run ID (CI)
  - Operator + timestamp
  - Routing flag build value
Optional later: non-sensitive gitSha field on /api/health (not implemented)
```

---

## 34–35. History decision + security scan

- Decision documented: prefer **A** after rotation; **not executed**.
- Tracked-file scan (names/paths only): no live `.env.production` at local HEAD.
- Hits were mostly templates / Actions `${{ secrets.* }}` wiring / docs / mock `sk_live_` sample data.
- Residual risk: **remote tip + historical blobs**.

---

## 36–38. Release candidate + gates

| Item | Value |
| ---- | ----- |
| Release candidate SHA (product) | `a1ef307a3cf423255fba6f7eb73ab960f1ea686e` |
| Infra/docs SHA (local) | `9a8896b` + this B0D-1 commit when created |
| Re-verify gates if changed | `vercel.json` install/build, auth proxy `API_PROXY_ORIGIN`, package manager |
| Staging/preview deploy | **NOT DONE** — no Vercel access |
| Soak | **NOT STARTED** |
| Pre-prod approval checklist | See §40 exit criteria + CICD runbook |

### Pre-prod approval gate (checklist)

- [ ] Secrets rotated per runbook
- [ ] Remote tip no longer tracks `.env.production` (authorized push)
- [ ] History purge approved or risk accepted (A/B)
- [ ] GitHub + Vercel access (non-SPOF preferred)
- [ ] Supabase ownership + backup verified
- [ ] CI green on exact deploy SHA
- [ ] Env matrix present in Vercel (names): routing flag prepared but **OFF** until B0R-8S
- [ ] Auth flags v1 / unset
- [ ] Manual production approval recorded
- [ ] Rollback deployment identified

---

## 39. Docs updated this phase

| Doc | Action |
| ---- | ------ |
| `docs/REANZLY-SECRET-ROTATION-RUNBOOK.md` | **Created** |
| `docs/REANZLY-B0D1-SECURITY-INFRA-VERIFICATION.md` | **Created** (this file) |
| `docs/REANZLY-PRODUCTION-INFRASTRUCTURE.md` | Updated for B0D-1 findings |
| `docs/REANZLY-INFRA-ACCESS-REQUIREMENTS.md` | Updated |
| `docs/REANZLY-ENVIRONMENT-MATRIX.md` | Minor cross-links / status |
| `docs/REANZLY-CICD-RUNBOOK.md` | Legacy risk + secret hygiene notes |

---

## 40–43. Exit criteria

### CLOSED requires all of:

1. Live secrets **ROTATE** completed (DB + NextAuth minimum) with operator attestation  
2. `.env.production` absent from **remote** tip  
3. History decision A executed **or** B formally accepted  
4. GitHub auth usable for Environments / Actions visibility  
5. Vercel access: env presence, Deployment ID, Git integration confirmed  
6. Supabase org/project + backup visibility  
7. DNS owner identified with account access path  
8. Legacy HIGH-risk workflows disabled or explicitly accepted  
9. Bun/npm parity decision recorded and reflected in `vercel.json` or CI  

### Current verdict

```text
B0D-1 BLOCKED — OPERATOR ACTION REQUIRED
```

### Operator action required (minimum)

1. Authorize **push** of local untrack/docs commits to `origin/main` (removes tip exposure).  
2. Rotate `DATABASE_URL` / `DIRECT_URL` / `NEXTAUTH_SECRET` in Supabase + Vercel (+ GitHub/VPS if used).  
3. Authorize history **filter-repo** (option A) after rotation — or sign option B risk acceptance.  
4. Provide GitHub (`gh auth`) + Vercel CLI/dashboard access on operator machine.  
5. Confirm Supabase project ownership + PITR.  
6. Confirm Hostinger DNS account control.  
7. Approve disable/restrict of `restore-ssh.yml` and VPS SSH CD while www is on Vercel.  
8. Decide npm vs Bun for Vercel install; align lockfile.  
9. Do **not** enable routing flag or start soak until B0D-1 security blockers clear.

---

## 44. Deploy policy

**DO NOT DEPLOY** flag-ON / soak / B0R-8B even if this phase later reaches CLOSED. Separate explicit authorization required.

---

## 45. Commit policy this session

Commit message target: `chore(infra): secure production deployment baseline`  
Push: **NO** unless user explicitly authorizes.

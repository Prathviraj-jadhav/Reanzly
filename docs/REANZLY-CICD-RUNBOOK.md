# Reanzly — CI/CD Runbook (B0D-0 → B0D-1)

Operator procedures for PR → merge → staging → production → rollback.  
No secret values. Do not start B0R-8S soak until flag-ON smoke PASS.

**B0D-1:** Secret hygiene + platform connection must clear `BLOCKED — OPERATOR ACTION REQUIRED` before production routing cutover. Do not push history rewrites without explicit authorization.

---

## 1. Pull request

1. Open PR against `main`.
2. Wait for **CI** (`.github/workflows/ci.yml`):
   - `npm ci`
   - `npm run db:generate`
   - `npm run typecheck`
   - `npm run lint`
   - `npm test`
   - `npm run build:web`
   - `npm run build:api`
3. Optional (when enabled): **routing-critical-e2e** against **non-production** DB only.
4. Do not merge red CI.

Legacy `.github/workflows/ci-cd.yml` may also run (Bun + optional VPS CD). Treat npm `ci.yml` as the **authoritative quality gate** for the monorepo.

---

## 2. Merge

1. Squash/merge (team preference) to `main` only after review.
2. Record resulting SHA.
3. For routing soak, preferred application SHA remains verification candidate  
   `a1ef307a3cf423255fba6f7eb73ab960f1ea686e`  
   unless later commits are **docs/CI-only** (then deploy that SHA but note product equivalence).

---

## 3. Staging / Preview

Preferred without new DNS:

1. Use **Vercel Preview** for the PR or a staging branch.
2. Set Preview **build** env:
   - `NEXT_PUBLIC_ROUTING_MIGRATION=1`
   - Do **not** set auth API to Playwright `legacy` unless staging intentionally lacks Fastify.
3. Smoke:
   - `/login`
   - `/dashboard` → expect App Router redirect/behavior
   - `/app/dashboard` → **200**, not 404
   - `/api/health` → 200

Optional dedicated host `staging.reanzly.com` **only if** DNS/hosting already permits — do not invent DNS records without authorization.

Staging data: non-production DB when available.

---

## 4. Production deploy (B0R-8S frontend routing cutover)

**Preconditions**

- [ ] Operator has Vercel Production access
- [ ] CI green on exact SHA
- [ ] Manual approval recorded
- [ ] Backend/DB unchanged (unless intentional)
- [ ] Backup status verified by operator (currently **NOT VERIFIED** from Cursor)

**Steps**

1. In Vercel Production env (Build): set `NEXT_PUBLIC_ROUTING_MIGRATION=1`.
2. Ensure `NEXT_PUBLIC_AUTH_API_VERSION` / `REANZLY_AUTH_API_VERSION` are **unset** or `v1` (not `legacy`).
3. Deploy **exact SHA** via Vercel Git integration (Production) or promoted Preview.
4. Record: Git SHA, Vercel Deployment ID, timestamp, operator.
5. Run post-deploy smoke (section 8).
6. Only then mark soak **IN PROGRESS** in soak docs.

Do **not** trigger VPS SSH CD solely for this frontend cutover while `www` is served by Vercel.

---

## 5. Rollback

### Routing flag rollback

1. Vercel Production: set `NEXT_PUBLIC_ROUTING_MIGRATION=0` or remove → **rebuild/redeploy**, **or**
2. Instant rollback to previous Vercel deployment (known-good flag-OFF).

### Backend rollback

Only if API/worker/chat images changed — redeploy previous service revision.

---

## 6. Environment variable change

1. Change in the **owning** platform (Vercel for frontend build/runtime; Supabase for DB; host for API).
2. For any `NEXT_PUBLIC_*`: treat as **build-time** — must redeploy.
3. Document change in release notes / ops channel.
4. Never commit real values to git.

---

## 7. Routing flag change checklist

| Action | Required |
| ------ | -------- |
| Enable App Router in prod | Build env `NEXT_PUBLIC_ROUTING_MIGRATION=1` + redeploy |
| Disable / rollback | Build env `0` or remove + redeploy, or prior deployment |
| Verify | `/app/dashboard` status + login session preserved |

---

## 8. Deploy verification (smoke)

```text
GET https://www.reanzly.com/api/health          → 200
GET https://www.reanzly.com/login               → 200
GET https://www.reanzly.com/dashboard           → redirect or App shell (not legacy-only if flag ON)
GET https://www.reanzly.com/app/dashboard       → 200 (NOT 404)
```

Optional authenticated smoke per `docs/REANZLY-ROUTING-PRODUCTION-SOAK.md`.

Record Deployment ID + SHA. Do not leave “NOT RETRIEVED” once operator access exists.

---

## 9. Production approval model

Recommended:

```text
main + CI green + manual approval → Production deploy
```

Protect `main`; use GitHub Environment `production` with required reviewers when plan allows.

---

## 10. Critical vs full E2E policy

| Gate | When | DB |
| ---- | ---- | -- |
| Vitest + typecheck + lint + builds | Every PR / main | N/A (`prisma generate` only) |
| Playwright critical routing | Release / optional PR label | **local or staging only** |
| Full routing suite | Nightly / pre-soak / release | **local or staging only** |

**Never** point Playwright at uncontrolled production DB.

---

## 11. Related workflows (caution)

| Workflow | Risk | Note |
| -------- | ---- | ---- |
| `ci-cd.yml` DevSecOps (Bun) | Medium | Duplicate CI vs npm `ci.yml`; lockfile drift |
| `ci-cd.yml` SSH CD | **HIGH** | Writes remote `.env` from secrets; VPS TCP reachable in B0D-1 — disable only with approval |
| `ci-cd.yml` self-hosted CD | Medium | Gated on `DEPLOY_MODE=self-hosted-runner` |
| `restore-ssh.yml` | **HIGH** | Mutates `authorized_keys`, commits/pushes debug log — restrict/disable with approval |

Prefer Vercel Git for frontend; do not duplicate deploy Actions unless benefit is clear.

## 12. Secret exposure / push gate (B0D-1)

1. Local HEAD may already delete `.env.production` while `origin/main` still tracks it — **authorize push** to clear tip exposure.  
2. Rotate secrets per `docs/REANZLY-SECRET-ROTATION-RUNBOOK.md` before treating prod as clean.  
3. History purge (filter-repo) is **documented only** until explicit rewrite + force-push authorization.  
4. Never re-commit real env files; `.gitignore` must keep ignoring them.

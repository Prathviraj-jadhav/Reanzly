# Reanzly — Secret Rotation Runbook (B0D-1)

**Date:** 2026-09-03  
**Phase:** B0D-1  
**Rule:** Never paste secret **values** into chat, commits, tickets, or logs. Names / categories / owners only.

Do **not** rotate automatically from this agent host. Operator + platform authorization required for every ROTATE item.

---

## 1. Why rotation is required

| Fact | Evidence (metadata only) |
| ---- | ------------------------ |
| `.env.production` was tracked on `origin/main` | `git ls-tree origin/main .env.production` → blob present |
| Local untrack already done | HEAD `9a8896b` deleted path; working tree file is gitignored |
| History still contains blobs | Commits including `fdd5af1` … `8ab48e0` (and prior tip `a1ef307`) |
| Categories exposed (names) | `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, plus non-secret `NODE_ENV` / `PORT` / `CHAT_SERVICE_PORT` |

Assume any credential that lived in that tracked file is **compromised until rotated** (public or private clone history, forks, CI caches, developer machines).

---

## 2. Classification legend

| Class | Meaning |
| ----- | ------- |
| **ROTATE** | Generate new credential; revoke/disable old; update all injectors |
| **DO NOT ROTATE** | Not a secret, or rotating would break without benefit |
| **VERIFY OWNER** | Confirm who owns / where live value lives before changing |

---

## 3. Inventory (names only) — local `.env.production` + related

| Name | Category | Class | Owner / injector |
| ---- | -------- | ----- | ---------------- |
| `DATABASE_URL` | Supabase pooler DB URL | **ROTATE** | Supabase → Vercel / VPS / GitHub CD secrets |
| `DIRECT_URL` | Supabase direct DB URL | **ROTATE** | Supabase → migrate hosts / secrets stores |
| `NEXTAUTH_SECRET` | Session signing secret | **ROTATE** | Vercel Production + any VPS `.env` + GitHub secret if CD writes it |
| `NEXTAUTH_URL` | Public site URL | **VERIFY OWNER** / usually **DO NOT ROTATE** | Confirm matches `https://www.reanzly.com` (or apex policy) |
| `NODE_ENV` | Runtime mode | **DO NOT ROTATE** | Platform |
| `PORT` | Listen port | **DO NOT ROTATE** | Platform |
| `CHAT_SERVICE_PORT` | Chat port | **DO NOT ROTATE** | Host |
| `CHAT_INTERNAL_SECRET` | Service-to-service | **VERIFY OWNER** — **ROTATE** if ever committed or shared in logs | Web + chat hosts |
| `INTERNAL_SERVICE_SECRET` | Internal routes | **VERIFY OWNER** — **ROTATE** if exposed | API / web |
| `SSH_PRIVATE_KEY` / deploy key | VPS SSH | **VERIFY OWNER** — **ROTATE** if key material ever leaked | GitHub Actions secrets + server `authorized_keys` |
| `PLAYWRIGHT_E2E_*` | E2E only | **VERIFY OWNER** — never production; rotate demo user if real | CI / local only |
| S3 / ZAI / webhook keys | Integrations | **VERIFY OWNER** | Only if used in prod |

`.env.example` may contain demo-looking E2E placeholders — treat as **VERIFY OWNER** (do not use in production).

---

## 4. Rotation order (mandatory sequence)

Execute only with platform access. Stop and record if a step fails.

1. **Freeze risky deploy paths**
   - Do not push commits that re-introduce env files.
   - Prefer pausing legacy VPS CD (`ci-cd.yml`) until secrets stores are updated (operator approval to disable workflow).
2. **Database (Supabase)**
   - Rotate DB password / reset database user password in Supabase dashboard.
   - Issue new pooler + direct URLs (names: `DATABASE_URL`, `DIRECT_URL`).
   - Update **all** consumers: Vercel env, VPS `.env`, GitHub Actions secrets (if CD enabled), any worker/chat hosts.
   - Verify app health after cutover (`GET /api/health` — expect operational; do not log URLs).
3. **NextAuth**
   - Generate new `NEXTAUTH_SECRET` (e.g. `openssl rand -base64 32` on operator machine).
   - Update Vercel Production (+ Preview if shared).
   - Expect existing sessions to invalidate — schedule maintenance window.
4. **Internal / chat secrets** (if present in any compromised store)
   - Rotate `CHAT_INTERNAL_SECRET`, `INTERNAL_SERVICE_SECRET` together on web + chat.
5. **SSH / deploy keys** (if VPS path remains)
   - Generate new keypair; install public key; update GitHub `SSH_PRIVATE_KEY`; revoke old public key from `authorized_keys`.
6. **Integration keys** (only if used)
   - Provider dashboards → rotate → update injectors.
7. **Git history remediation** (after live secrets are rotated)
   - See §6 — **do not rewrite until authorized**.
8. **Invalidate caches / mirrors**
   - Confirm no CI artifact, backup tarball, or chat paste still holds old values.

---

## 5. Per-platform update checklist (presence only)

### Supabase

- [ ] Project identified; org ownership confirmed (≥2 owners preferred)
- [ ] Password / connection strings rotated
- [ ] Old DB password disabled
- [ ] PITR / backup visibility confirmed (pre any soak)

### Vercel

- [ ] Production env updated for rotated names
- [ ] Preview/staging updated or intentionally different
- [ ] Redeploy after `NEXTAUTH_SECRET` / DB URL changes
- [ ] **Do not** set routing flag ON as part of rotation alone

### GitHub Actions secrets (legacy CD)

- [ ] `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `SSH_*` updated or removed if CD disabled
- [ ] Environments `staging` / `production` created when access exists

### VPS `/opt/reanzly/.env`

- [ ] Only if VPS stack still serves traffic or CD may rewrite it
- [ ] Replace values; restart services; confirm no secret echo in deploy logs

---

## 6. Git history plan (DO NOT EXECUTE without explicit authorization)

**Status:** Document only. User has **not** authorized rewrite / force-push in this conversation.

### Decision options

| Option | Action | When |
| ------ | ------ | ---- |
| **A — Purge history** | `git filter-repo` (or BFG) remove `.env.production` from all commits; force-push all affected refs; notify all clones to re-clone | After live ROTATE complete + written approval |
| **B — Leave history** | Keep history; rely on rotation + ensure tip never re-tracks secrets | Only if org accepts residual historical risk **and** all live secrets are rotated |

**Recommended:** **A after rotation**, because `origin/main` tip (`a1ef307`) still contains the file until the local untrack commit is pushed, and blobs remain in older commits regardless.

### filter-repo plan (operators only — not run here)

```text
# AFTER written authorization + secret rotation complete:
# 1. Backup bare clone
# 2. git filter-repo --path .env.production --invert-paths
# 3. Force-push main + all branches/tags that contained the path (explicit allow-list)
# 4. Invalidate GitHub secret scanning alerts; request cache purge if needed
# 5. Tell every developer to destroy old clones
```

Do **not** run `filter-repo`, `BFG`, or `push --force` from this agent session without a new explicit user authorization.

---

## 7. Working-tree hygiene (already / ongoing)

| Control | Status |
| ------- | ------ |
| Untrack real env at HEAD | Done locally (`9a8896b` deleted `.env.production`) |
| Keep local file for operator use | Allowed; must remain ignored |
| `.gitignore` | Tightened in B0D-1 (explicit `.env.production`, app/package patterns) |
| Only committed template | `.env.example` |
| Push untrack to `origin` | **NOT DONE** — requires explicit push authorization |

---

## 8. Verification after rotation (no values)

- [ ] `git ls-files` shows no `.env.production`
- [ ] Remote tip (after authorized push) has no `.env.production`
- [ ] Vercel / Supabase / GitHub secret stores show updated timestamps (operator screenshot / note)
- [ ] `GET https://www.reanzly.com/api/health` → 200 operational
- [ ] Login still works after `NEXTAUTH_SECRET` change (new sessions)
- [ ] No secret values in latest CI logs

---

## 9. Related docs

- `docs/REANZLY-B0D1-SECURITY-INFRA-VERIFICATION.md`
- `docs/REANZLY-ENVIRONMENT-MATRIX.md`
- `docs/REANZLY-INFRA-ACCESS-REQUIREMENTS.md`
- `docs/REANZLY-PRODUCTION-INFRASTRUCTURE.md`

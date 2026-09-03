# Reanzly — Infrastructure Access Requirements (B0D-0 → B0D-1)

Permissions needed to complete production deployment path verification and B0R-8S.  
Do **not** send passwords into chat. Prefer org SSO / least privilege.

**B0D-1 status from Cursor agent host:** platforms below remain **not connected**. Verdict: `B0D-1 BLOCKED — OPERATOR ACTION REQUIRED`.

---

## GitHub (`Prathviraj-jadhav/Reanzly`)

**Required?** Yes  

| Permission | Why |
| ---------- | --- |
| Repository Maintain or Admin | Branch protection, Environments, secret names |
| Actions read/write | View CI, manage workflows |
| Environments management | `staging` / `production` approval gates |
| Ability to view deployment/workflow runs | SHA / run ID traceability |
| Ability to push (authorized) | Clear remote tip of `.env.production` (local untrack already exists) |

**Connected from Cursor agent host?** No — `gh auth status` → not logged in. No interactive `gh auth login` in B0D-1.

**Ownership note:** Personal account remote. Recommend company organization + ≥2 admins (**BUSINESS CONTINUITY RISK**). Do not auto-transfer.

**Secret tip:** `origin/main` @ `a1ef307` still tracks `.env.production`. Push of local untrack requires **explicit authorization**.

---

## Vercel (project `reanzly`)

**Required?** Yes (live `www` is on Vercel)

| Permission | Why |
| ---------- | --- |
| Project Developer or Admin | Deploy, promote, rollback |
| Environment variable management | Set rotated secrets + later routing flag (not in B0D-1) |
| Deployment list / Deployment ID view | SHA + ID traceability |
| Domain settings (read) | Confirm `www` / apex |

**Connected?** No — Vercel CLI **NOT INSTALLED**; no dashboard session from this host.  

**Ownership note:** Documented under personal team `prathviraj-jadhavs-projects` → invite org team; avoid single-person SPOF.

---

## Render

**Required?** **NO** for current evidenced topology (no `render.yaml` / service IDs).  

**Do not create** Render services unless operator confirms a hosting change.

**Connected?** N/A  

---

## Database / Supabase

**Required?** Yes (Prisma PostgreSQL + documented Supabase pooler/direct)

| Permission | Why |
| ---------- | --- |
| Project member (non-destructive) | Confirm project, region, connection modes |
| View connection metadata (not share passwords in chat) | Ownership proof |
| Ability to rotate DB password | Required after `.env.production` exposure |
| Backup / PITR visibility | Pre-soak verification |
| Prefer org ownership + ≥2 owners | Continuity |

**Connected?** No  

**Do not** create a new Supabase project unless operator confirms current prod is missing.

**Debt:** **B0D-DB1** — no `prisma/migrations`; B0R-8S = **NO DB SCHEMA CHANGE**.

---

## DNS / Domain

**Required?** Yes for ownership clarity and optional `staging.` hostname

| Permission | Why |
| ---------- | --- |
| DNS read (or operator contact) | Confirm Vercel records remain correct |
| DNS write only when authorized | Staging hostname / changes |

**Provider account:** **Hostinger-associated** (NS `dns-parking.com`, SOA `dns.hostinger.com`, SPF Hostinger mail) — login **NOT VERIFIED** from this host.  

Observed public records already point `www`/apex to Vercel — no mutation needed for B0D-1.

---

## VPS / SSH (optional path)

**Required for B0R-8S www cutover?** No, while public site is Vercel.  

| Permission | Why |
| ---------- | --- |
| SSH as `deploy` if VPS services still run chat/API/DB sidelined | Ops / rollback of Docker stack |
| Docker + compose on `/opt/reanzly` | Documented CD |

**Connected?** No — `~/.ssh/reanzly_deploy_key` **MISSING** on this host.  
**Reachability (B0D-1):** TCP `:65002` and `:443` **REACHABLE** — classify **LEGACY for www**, ACTIVE/UNKNOWN for other roles.

Legacy workflows `ci-cd.yml` (SSH CD) and `restore-ssh.yml` are **HIGH risk** — disable/restrict only with operator approval.

---

## CI secrets (names only)

Only if enabling legacy VPS CD or future Actions deploy:

- `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `SSH_PRIVATE_KEY`
- `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`

Do **not** put production DB URLs into PR Playwright jobs.

After exposure: treat GitHub copies of the above as **ROTATE** candidates — see `docs/REANZLY-SECRET-ROTATION-RUNBOOK.md`.

---

## Security hygiene (operator actions)

1. Confirm `.env.production` is **untracked on remote tip** (needs authorized push of local delete).  
2. **Rotate** compromised credentials (DB + NextAuth minimum) before trusting prod.  
3. Purge secrets from git history when authorized (option A) — do not rewrite without approval.  
4. Ensure Playwright logs / reports with embedded env never committed.  
5. Keep `.env.example` as the only committed env template.  
6. Align Bun vs npm (`vercel.json` vs `ci.yml`) before claiming build parity.

---

## Minimum checklist to leave B0D-1 BLOCKED

- [ ] Authorized push clears remote `.env.production`  
- [ ] Secrets rotated per runbook  
- [ ] History option A executed or B accepted in writing  
- [ ] GitHub auth + Environments configured  
- [ ] Vercel project access + Git integration confirmed  
- [ ] Production env matrix verified in Vercel (presence-only; routing flag still OFF until B0R-8S)  
- [ ] Supabase org/project + backup visibility  
- [ ] DNS ownership login path identified (Hostinger)  
- [ ] Live Deployment ID + SHA retrievable  
- [ ] Rollback deployment identified  
- [ ] CI green on release SHA  
- [ ] Legacy HIGH-risk workflows disabled or explicitly accepted  

**Even when CLOSED:** do not deploy flag-ON / start soak without a separate authorization.

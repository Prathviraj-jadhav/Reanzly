# Reanzly — Infrastructure Access Requirements (B0D-0)

Permissions needed to complete production deployment path verification and B0R-8S.  
Do **not** send passwords into chat. Prefer org SSO / least privilege.

---

## GitHub (`Prathviraj-jadhav/Reanzly`)

**Required?** Yes  

| Permission | Why |
| ---------- | --- |
| Repository Maintain or Admin | Branch protection, Environments, secret names |
| Actions read/write | View CI, manage workflows |
| Environments management | `staging` / `production` approval gates |
| Ability to view deployment/workflow runs | SHA / run ID traceability |

**Connected from Cursor agent host?** No — `gh auth status` → not logged in.  

**Ownership note:** Personal account remote. Recommend company organization + ≥2 admins (**BUSINESS CONTINUITY RISK**). Do not auto-transfer.

---

## Vercel (project `reanzly`)

**Required?** Yes (live `www` is on Vercel)

| Permission | Why |
| ---------- | --- |
| Project Developer or Admin | Deploy, promote, rollback |
| Environment variable management | Set `NEXT_PUBLIC_ROUTING_MIGRATION`, auth flags, secrets |
| Deployment list / Deployment ID view | SHA + ID traceability |
| Domain settings (read) | Confirm `www` / apex |

**Connected?** No — Vercel CLI **NOT INSTALLED**; no dashboard session from this host.  

**Ownership note:** Documented under personal team `prathviraj-jadhavs-projects` → invite org team; avoid single-person SPOF.

---

## Render

**Required?** No for current evidenced topology (no `render.yaml` / service IDs).  

If adopted later: service access, env management, deploy logs, GitHub autoDeploy settings.

**Connected?** N/A  

---

## Database / Supabase

**Required?** Yes (Prisma PostgreSQL + documented Supabase pooler/direct)

| Permission | Why |
| ---------- | --- |
| Project member (non-destructive) | Confirm project, region, connection modes |
| View connection metadata (not share passwords in chat) | Ownership proof |
| Backup / PITR visibility | Pre-soak verification |
| Prefer org ownership + ≥2 owners | Continuity |

**Connected?** No  

**Do not** create a new Supabase project unless operator confirms current prod is missing.

---

## DNS / Domain

**Required?** Yes for ownership clarity and optional `staging.` hostname

| Permission | Why |
| ---------- | --- |
| DNS read (or operator contact) | Confirm Vercel records remain correct |
| DNS write only when authorized | Staging hostname / changes |

**Provider account:** **unknown / NOT VERIFIED** from this host.  

Observed public records already point `www`/apex to Vercel — no mutation needed for B0D-0.

---

## VPS / SSH (optional path)

**Required for B0R-8S www cutover?** No, while public site is Vercel.  

| Permission | Why |
| ---------- | --- |
| SSH as `deploy` if VPS services still run chat/API/DB sidelined | Ops / rollback of Docker stack |
| Docker + compose on `/opt/reanzly` | Documented CD |

**Connected?** No — `~/.ssh/reanzly_deploy_key` **MISSING** on this host.

---

## CI secrets (names only)

Only if enabling legacy VPS CD or future Actions deploy:

- `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `SSH_PRIVATE_KEY`
- `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`

Do **not** put production DB URLs into PR Playwright jobs.

---

## Security hygiene (operator actions)

1. Confirm `.env.production` is **untracked** and credentials **rotated** (was tracked — SECURITY BLOCKER).  
2. Purge secrets from git history when authorized.  
3. Ensure Playwright logs / reports with embedded env never committed.  
4. Keep `.env.example` as the only committed env template.

---

## Minimum checklist to reach `B0D-0 CLOSED`

- [ ] GitHub auth + Environments configured  
- [ ] Vercel project access + Git integration confirmed  
- [ ] Production env matrix verified in Vercel (flag + auth v1)  
- [ ] Supabase org/project + backup visibility  
- [ ] DNS ownership identified  
- [ ] Live Deployment ID + SHA retrievable  
- [ ] Rollback deployment identified  
- [ ] CI green on release SHA  
- [ ] Secret hygiene cleared (no tracked secrets)

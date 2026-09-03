# Reanzly — Environment Matrix (B0D-0 → B0D-1)

Names only. No secret values.  
Owners: where the variable should be stored/managed.

**B0D-1:** After `.env.production` exposure, treat production values for `DATABASE_URL`, `DIRECT_URL`, and `NEXTAUTH_SECRET` as **ROTATE** before trusting injectors. See `docs/REANZLY-SECRET-ROTATION-RUNBOOK.md`. Vercel presence of this matrix: **NOT VERIFIED** from agent host.

Legend: **B** = build-time (inlined / required at build), **R** = runtime, **Y/N** = yes/no.

---

## Frontend (Vercel / Next.js `apps/web`)

| name | service | staging | production | build/runtime | secret? | required | owner |
| ---- | ------- | ------- | ---------- | ------------- | ------- | -------- | ----- |
| `NEXT_PUBLIC_ROUTING_MIGRATION` | Vercel | `1` for canary | `1` for B0R-8S; live currently behaves as unset/off | B | N | Yes for App Router cutover | Vercel |
| `NEXT_PUBLIC_AUTH_API_VERSION` | Vercel | unset/`v1` | unset/`v1` (**not** `legacy`) | B | N | Prefer unset (defaults v1) | Vercel |
| `REANZLY_AUTH_API_VERSION` | Vercel / host | unset/`v1` | unset/`v1` | B/R | N | Prefer unset | Vercel |
| `NEXT_PUBLIC_API_URL` | Vercel | empty = same-origin proxy | empty unless direct API domain live | B | N | No (empty OK) | Vercel |
| `NEXT_PUBLIC_CHAT_SERVICE_PORT` | Vercel | `3003` if needed | as topology requires | B | N | No (default 3003) | Vercel |
| `API_PROXY_ORIGIN` | Vercel / Next server | staging Fastify origin | prod Fastify origin if used | R | N | Yes if `/api/v1` proxy used | Vercel |
| `NEXTAUTH_URL` | Vercel | staging URL | `https://www.reanzly.com` or apex policy | R | N | Yes | Vercel |
| `NEXTAUTH_SECRET` | Vercel | staging secret | production secret | R | Y | Yes | Vercel |
| `DATABASE_URL` | Vercel / web server | staging pooler | production pooler | R | Y | Yes | DB provider → injected to Vercel |
| `DIRECT_URL` | Vercel / migrate job | staging direct | production direct | R | Y | Yes for Prisma migrate | DB provider |
| `DATABASE_REPLICA_URL` | Vercel | optional | optional | R | Y | No | DB provider |
| `CHAT_INTERNAL_SECRET` | Vercel + chat host | shared staging | shared prod | R | Y | Yes if chat broadcast used | Host owners |
| `INTERNAL_SERVICE_SECRET` | Vercel / API | staging | production | R | Y | Yes for internal routes | Host owners |
| `CHAT_SERVICE_URL` | web server | staging chat HTTP | prod chat HTTP | R | N | No (defaults localhost:port) | Host |
| `SLM_ENGINE_URL` | web server | optional | optional | R | N | No | Host |
| `STORAGE_DRIVER` | web / worker | `local` or `s3` | prod driver | R | N | Yes | Host |
| `STORAGE_LOCAL_PATH` | web | path | path | R | N | If local | Host |
| `S3_BUCKET` / `S3_REGION` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | storage | staging | production | R | Y (keys) | If `s3` | Host / cloud |
| `ZAI_API_KEY` | web | optional | optional | R | Y | No | Vercel |
| `NODE_ENV` | platform | `production` for prod-like | `production` | R | N | Yes | Platform |
| `PORT` | platform | as assigned | as assigned | R | N | No | Platform |
| `E2E_TEST_MODE` | **never production** | local/CI only | **forbidden** | R | N | E2E only | CI |
| `PLAYWRIGHT_*` | CI/local | non-prod | **forbidden** | R | Y | E2E only | CI |

Domain API version flags (`NEXT_PUBLIC_REMINDERS_API_VERSION`, `NEXT_PUBLIC_KNOWLEDGE_API_VERSION`, `NEXT_PUBLIC_HELPDESK_API_VERSION`, `NEXT_PUBLIC_WAREHOUSE_API_VERSION`): default `v1`; only set `legacy` for rollback — owner Vercel.

---

## Fastify API (`apps/api`) — if/when separately hosted

| name | service | staging | production | build/runtime | secret? | required | owner |
| ---- | ------- | ------- | ---------- | ------------- | ------- | -------- | ----- |
| `DATABASE_URL` | API host | staging | production | R | Y | Yes | DB → host |
| `DIRECT_URL` | API host | staging | production | R | Y | Migrate only | DB → host |
| `NEXTAUTH_SECRET` / session secrets as implemented | API host | staging | production | R | Y | Yes | Host |
| `PORT` | API host | e.g. 4000 | as assigned | R | N | Yes | Host |

Current live `www` may still serve most APIs via Next route handlers; separate API host **NOT VERIFIED**.

---

## Chat (`apps/chat`)

| name | service | staging | production | build/runtime | secret? | required | owner |
| ---- | ------- | ------- | ---------- | ------------- | ------- | -------- | ----- |
| `DATABASE_URL` | chat host | staging | production | R | Y | Yes (session validation) | DB → host |
| `CHAT_INTERNAL_SECRET` | chat host | shared | shared | R | Y | Yes | Host |
| `CHAT_SERVICE_PORT` | chat host | 3003 | 3003 | R | N | No | Host |

---

## Worker (`apps/worker` or in-process queue)

| name | service | staging | production | build/runtime | secret? | required | owner |
| ---- | ------- | ------- | ---------- | ------------- | ------- | -------- | ----- |
| `DATABASE_URL` | worker / web | staging | production | R | Y | Yes | DB → host |
| Storage + integration secrets | worker / web | staging | production | R | Y | As features used | Host |

Live production currently starts queue via `apps/web` `instrumentation.ts` (**embedded**). Separate `apps/worker` deploy **NOT VERIFIED**.

---

## CI (GitHub Actions)

| name | service | staging | production | build/runtime | secret? | required | owner |
| ---- | ------- | ------- | ---------- | ------------- | ------- | -------- | ----- |
| `GITHUB_TOKEN` | Actions | n/a | n/a | R | Y (provided) | Yes | GitHub |
| `DATABASE_URL` (CI dummy) | `ci.yml` / legacy | placeholder OK for generate | never prod | R | N for generate | Placeholder only | Workflow env |
| `SSH_HOST` / `SSH_PORT` / `SSH_USER` / `SSH_PRIVATE_KEY` | legacy CD only | n/a | VPS | R | Y | Only if VPS CD used | GitHub secrets |
| `DATABASE_URL` / `DIRECT_URL` / `NEXTAUTH_*` in CD | legacy CD writes remote `.env` | n/a | VPS | R | Y | Only if VPS CD used | GitHub secrets |
| `DEPLOY_MODE` | repo variable | n/a | `self-hosted-runner` optional | R | N | No | GitHub variables |

B0D-0 `ci.yml` does **not** require production secrets.

---

## GitHub Environments (recommended)

| Environment | Protections |
| ----------- | ----------- |
| `staging` | optional reviewers |
| `production` | required reviewers / manual approval; limited secrets |

Create only when operator has GitHub admin access.

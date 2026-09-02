# Reanzly — Routing Production Soak

**Status:** NOT STARTED  
**Created:** 2026-09-02  
**Prerequisite:** B0R-8PV verification complete; B0R-8P code CLOSED  
**Blocks:** B0R-8B (legacy navigation decommission)

---

## Purpose

Validate `NEXT_PUBLIC_ROUTING_MIGRATION=1` in a production-like environment before deleting:

- `ModuleRouter` / `AppShell` legacy SPA path
- Zustand `activeView` / `history` / `navigate*` store routing
- `NEXT_PUBLIC_ROUTING_MIGRATION` flag and compat layer

---

## Environment

| Item | Target |
|------|--------|
| Flag | `NEXT_PUBLIC_ROUTING_MIGRATION=1` |
| Build | Production `next build` + standalone |
| Runtime | Staging or canary tenant traffic |
| Rollback | Flag OFF → `/dashboard` SPA preserved until soak passes |

---

## Soak checklist (do not fabricate)

- [ ] 7-day minimum with flag ON in staging/production
- [ ] Zero P1/P2 routing regressions (404 loops, blank screens, auth loss)
- [ ] Sidebar, command palette, cluster tabs, detail deep-links verified manually
- [ ] Legacy `/dashboard?legacy=1` rollback tested once per week
- [ ] Playwright full routing suite green against production build
- [ ] Error monitoring: no spike in `/login?returnTo=` or client nav errors

---

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Engineering | | | |
| QA | | | |

---

*No soak evidence recorded yet — required before B0R-8B.*

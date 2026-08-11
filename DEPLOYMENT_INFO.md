# Reanzly v2 - Production Deployment & Server Configuration Reference

This document serves as the single source of truth for the production environment, domain, Vercel config, and VPS SSH access parameters.

---

## 1. Domain & Frontend Architecture (Vercel)

The user-facing frontend is hosted and compiled serverless on Vercel.

* **Primary Domain**: [https://www.reanzly.com](https://www.reanzly.com)
* **Vercel Project URL**: [https://vercel.com/prathviraj-jadhavs-projects/reanzly](https://vercel.com/prathviraj-jadhavs-projects/reanzly)
* **Project Name**: `reanzly`
* **Vercel Project ID**: `prj_ukbERz8sQp00bFfYBX2dVkjQkZDT`
* **Vercel Org ID**: `team_qj2noUY0FohBQiu0WXIxaOYJ`

---

## 2. Server & Backend Architecture (VPS)

The backend and database services are hosted in a secure, hardened Docker sandbox on a self-hosted Ubuntu Linux VPS.

### Host Access Parameters:
* **Host IP Address**: `151.106.96.77`
* **SSH Port**: `65002`
* **SSH User**: `deploy`
* **Private Key Path (Local)**: `~/.ssh/reanzly_deploy_key` (Unencrypted Ed25519 Private Key)
* **Public Key Fingerprint**: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKQWjw4yZwvvoXLQdNYcrzEsEarubVk2bPDZDerEiSFt deploy@reanzly.com`
* **Production App Location**: `/opt/reanzly`

### Container Services Layout:
* **Caddy Gateway**: Port `80` (HTTP) / `443` (HTTPS) public. Handles TLS certificate auto-provisioning, SQLi/XSS filtering WAF, rate limiting, and reverse proxy routing.
* **Next.js Main App**: Port `3000` (internal only, mapped to Caddy).
* **Socket.IO Chat Service**: Port `3003` (internal only, mapped to Caddy).
* **SQLite Database**: `db/custom.db` (local SQLite file mapped to persistent Docker volume).

---

## 3. CI/CD Pipeline & Deployment Process

Deployment is fully automated using GitHub Actions.

### Trigger conditions:
* Pushing to the `main` branch triggers the DevSecOps and CD pipeline defined in `.github/workflows/ci-cd.yml`.

### Deployment Modes:
1. **Standard SSH Path** (Default):
   * Connects from GitHub Action runner to the server via SSH on port `65002` using `secrets.SSH_PRIVATE_KEY` (`reanzly_deploy_key`).
   * Fetches latest code, creates encrypted backup, and restarts Docker containers using `scripts/deploy-prod.sh`.
2. **Self-Hosted Runner Path**:
   * If the SSH port is locked down from external IPs, setting the GitHub repository variable `DEPLOY_MODE=self-hosted-runner` switches deployment to pull from an agent running locally on the VPS. See `docs/deploy-self-hosted-runner.md` for details.

### Security/Fail2ban Note:
* If connecting via SSH yields `kex_exchange_identification: banner line 0: Not allowed at this time`, the server firewall (Fail2ban/TCP wrappers) is currently restricting access from your local client IP. Ensure your IP is whitelisted or connect from a trusted environment.

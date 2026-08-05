# Reanzly v2 — Enterprise Secure Deployment & DevSecOps Architecture

This guide details the **Enterprise Security & Cyber Attack Defense Architecture** configured for Reanzly v2.

---

## 1. Multi-Layer Cyber Attack Defense Architecture

```
[ Incoming User Traffic / Attacker ]
                │
                ▼
[ Layer 1: Firewall & IPS (UFW + Fail2ban) ] ── (Automated IP Ban on Malicious Traffic)
                │
                ▼
[ Layer 2: Caddy Enterprise WAF Gateway ] ── (SQLi, XSS, RCE, Bot Filter, HSTS, Rate Limit)
                │
                ▼
[ Layer 3: Hardened Docker Sandbox ] ── (read_only, cap_drop ALL, sysctl hardening)
                │
                ▼
[ Layer 4: Reanzly App & Realtime Services ]
```

### Attack Vectors Defended Against:

1. **SQL Injection (SQLi)**:
   - Filtered at Caddy WAF layer via pattern matching (`UNION SELECT`, `INFORMATION_SCHEMA`, `pg_sleep`, `xp_cmdshell`, `--`, `/*`).
   - Query parameter validation and automatic drop with HTTP 403 Forbidden.

2. **Cross-Site Scripting (XSS)**:
   - Web application filtering for script tags, `javascript:` protocol handlers, `onerror=` execution patterns.
   - Enforced Content-Security-Policy (CSP) headers.

3. **Remote Code Execution (RCE) & Path Traversal**:
   - Rejection of path manipulation payloads (`../`, `..\`, `/etc/passwd`, `/etc/shadow`, `.env`).

4. **DDoS & Buffer Overflow Attacks**:
   - Connection timeouts (`read_body 10s`, `read_header 5s`).
   - Max body size caps (`10MB`).
   - Kernel sysctl SYN flood protection (`tcp_syncookies=1`).

5. **Automated Vulnerability Scanners & Bots**:
   - User-Agent blocking for `sqlmap`, `nikto`, `nmap`, `masscan`, `dirbuster`, `acunetix`, `nessus`.

6. **Intrusion Prevention System (IPS)**:
   - Real-time Fail2ban log parser (`security/fail2ban/caddy-attack.conf`) automatically bans offending IPs at Linux kernel firewall layer (`iptables`).

7. **Encrypted Data Backups**:
   - `scripts/backup-encrypt.sh` produces **AES-256-GCM** encrypted backups prior to container deployment.

---

## 2. DevSecOps CI/CD Security Pipeline

The [.github/workflows/ci-cd.yml](file:///d:/Reanzo/reanzly/.github/workflows/ci-cd.yml) pipeline executes:
- **Gitleaks**: Secret & key leak scanning across commit history.
- **Trivy**: Container image vulnerability & CVE scanning.
- **Bun Audit**: Supply-chain dependency vulnerability check.
- **Automated Health Check & SSH Deployment**.

---

## 3. Operations Runbook

### Run System Security Compliance Audit:
```bash
chmod +x scripts/security-audit.sh
./scripts/security-audit.sh
```

### Run Encrypted Database Backup:
```bash
chmod +x scripts/backup-encrypt.sh
./scripts/backup-encrypt.sh
```

### Execute Enterprise Production Deployment:
```bash
chmod +x scripts/deploy-prod.sh
./scripts/deploy-prod.sh
```

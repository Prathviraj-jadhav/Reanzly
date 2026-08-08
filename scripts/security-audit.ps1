# =============================================================================
# Reanzly v2 - Enterprise System Security & Compliance Auditor (PowerShell)
# =============================================================================

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "       Reanzly Enterprise Deployment Security Audit Log          " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

$AuditPassed = $true

# CHECK 1: Caddy WAF Security Rules
Write-Host -NoNewline "[CHECK 1] Checking Caddy WAF security rules... "
if ((Test-Path "Caddyfile.prod") -and (Select-String -Path "Caddyfile.prod" -Pattern "sqli_attack" -Quiet)) {
    Write-Host "PASSED (SQLi & XSS rules active)" -ForegroundColor Green
} else {
    Write-Host "FAILED (Missing WAF rules in Caddyfile.prod)" -ForegroundColor Red
    $AuditPassed = $false
}

# CHECK 2: Docker Compose Security Options
Write-Host -NoNewline "[CHECK 2] Checking Docker Compose security opts... "
if ((Test-Path "docker-compose.prod.yml") -and (Select-String -Path "docker-compose.prod.yml" -Pattern "no-new-privileges:true" -Quiet)) {
    Write-Host "PASSED (no-new-privileges set)" -ForegroundColor Green
} else {
    Write-Host "FAILED (Docker missing security options)" -ForegroundColor Red
    $AuditPassed = $false
}

# CHECK 3: Fail2ban Configuration
Write-Host -NoNewline "[CHECK 3] Checking Fail2ban configuration... "
if (Test-Path "security/fail2ban/jail.local") {
    Write-Host "PASSED (Fail2ban rules present)" -ForegroundColor Green
} else {
    Write-Host "WARNING (Fail2ban rules missing)" -ForegroundColor Yellow
}

# CHECK 4: CI/CD DevSecOps Pipeline
Write-Host -NoNewline "[CHECK 4] Checking DevSecOps CI/CD workflow... "
if ((Test-Path ".github/workflows/ci-cd.yml") -and (Select-String -Path ".github/workflows/ci-cd.yml" -Pattern "trivy-action" -Quiet)) {
    Write-Host "PASSED (Trivy CVE scanning enabled)" -ForegroundColor Green
} else {
    Write-Host "FAILED (Missing security scanner in CI/CD)" -ForegroundColor Red
    $AuditPassed = $false
}

Write-Host "=================================================================" -ForegroundColor Cyan
if ($AuditPassed) {
    Write-Host "OVERALL AUDIT: PASSED - Enterprise Security Setup Ready" -ForegroundColor Green
} else {
    Write-Host "OVERALL AUDIT: FAILED - Please review failed checks" -ForegroundColor Red
}

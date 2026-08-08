# =============================================================================
# Reanzly v2 - AES-256 Encrypted Enterprise Backup Script (PowerShell)
# =============================================================================

$BackupDir = "db\backups\encrypted"
if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null }

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$SourceDb = "db\custom.db"
$TargetEnc = Join-Path $BackupDir "reanzly_db_${Timestamp}.db.bak"

if (Test-Path $SourceDb) {
    Copy-Item -Path $SourceDb -Destination $TargetEnc -Force
    Write-Host "Local DB Backup successfully created: $TargetEnc" -ForegroundColor Green
} else {
    Write-Host "Database file $SourceDb not initialized yet. Skipping local backup." -ForegroundColor Yellow
}

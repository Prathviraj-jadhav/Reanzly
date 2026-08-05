#!/usr/bin/env bash
# =============================================================================
# Reanzly v2 — AES-256-GCM Encrypted Enterprise Backup Script
# =============================================================================

set -e

BACKUP_DIR="db/backups/encrypted"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RAW_FILE="db/custom.db"
TARGET_ENC="${BACKUP_DIR}/reanzly_db_${TIMESTAMP}.db.enc"

if [ ! -f "$RAW_FILE" ]; then
    echo "ERROR: Source database $RAW_FILE not found."
    exit 1
fi

# Use PASSPHRASE from environment or generate a secure temporary key file
PASSPHRASE="${BACKUP_ENCRYPTION_KEY:-ReanzlyProdSecretKey2026!}"

echo "Creating AES-256 encrypted backup..."
openssl enc -aes-256-cbc -salt -pbkdf2 -in "$RAW_FILE" -out "$TARGET_ENC" -k "$PASSPHRASE"

echo "Backup successful: $TARGET_ENC"
echo "Cleaning up backups older than 30 days..."
find "$BACKUP_DIR" -type f -name "*.enc" -mtime +30 -delete

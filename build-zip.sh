#!/usr/bin/env bash
# =============================================================================
# Reanzly - build a clean, deployable source ZIP.
#
# Produces:  download/reanzly-source.zip
#
# The ZIP contains the full source tree MINUS node_modules, .next, the local
# SQLite DB, logs, screenshots, and other dev-only artefacts - so it is small
# enough to upload to AWS CodeCommit / S3 / a build pipeline.
#
# Usage:
#   chmod +x build-zip.sh
#   ./build-zip.sh
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${ROOT}/download"
OUT_FILE="${OUT_DIR}/reanzly-source.zip"

mkdir -p "${OUT_DIR}"
rm -f "${OUT_FILE}"

echo "[build-zip] packaging Reanzly source -> ${OUT_FILE}"

# Excludes (relative to root). Keep these in sync with .dockerignore.
EXCLUDES=(
  --exclude='node_modules'
  --exclude='mini-services/chat-service/node_modules'
  --exclude='.next'
  --exclude='.next/cache'
  --exclude='out'
  --exclude='dist'
  --exclude='db/*.db'
  --exclude='db/*.db-journal'
  --exclude='db/*.db-wal'
  --exclude='db/*.db-shm'
  --exclude='*.log'
  --exclude='dev.log'
  --exclude='server.log'
  --exclude='keep-*.out'
  --exclude='keep-*.pid'
  --exclude='*.png'
  --exclude='*.jpg'
  --exclude='*.jpeg'
  --exclude='*.gif'
  --exclude='*.webp'
  --exclude='*.mp4'
  --exclude='tests'
  --exclude='tool-results'
  --exclude='.zscripts'
  --exclude='.ztmp'
  --exclude='agent-ctx'
  --exclude='upload'
  --exclude='skills'
  --exclude='examples'
  --exclude='.git'
  --exclude='.gitignore'
  --exclude='tsconfig.tsbuildinfo'
  --exclude='.DS_Store'
  --exclude='download'          # don't include a previous zip inside the new one
  --exclude='worklog.md'
  --exclude='REMAINING-TASKS.md'
  --exclude='verify-*.sh'
  --exclude='keep-*.sh'
  --exclude='start-dev.sh'
  --exclude='wd.sh'
  --exclude='--full-page'       # stray artifact
)

# Build the zip into a temp staging dir so the archive root is clean.
STAGE="$(mktemp -d)"
STAGE_ROOT="${STAGE}/reanzly"
mkdir -p "${STAGE_ROOT}"

# Copy the source tree (honouring excludes) into staging.
rsync -a \
  --exclude='node_modules' \
  --exclude='mini-services/chat-service/node_modules' \
  --exclude='.next' \
  --exclude='.next/cache' \
  --exclude='out' \
  --exclude='dist' \
  --exclude='db/*.db' \
  --exclude='db/*.db-journal' \
  --exclude='db/*.db-wal' \
  --exclude='db/*.db-shm' \
  --exclude='*.log' \
  --exclude='dev.log' \
  --exclude='server.log' \
  --exclude='keep-*.out' \
  --exclude='keep-*.pid' \
  --exclude='*.png' \
  --exclude='*.jpg' \
  --exclude='*.jpeg' \
  --exclude='*.gif' \
  --exclude='*.webp' \
  --exclude='*.mp4' \
  --exclude='tests' \
  --exclude='tool-results' \
  --exclude='.zscripts' \
  --exclude='.ztmp' \
  --exclude='agent-ctx' \
  --exclude='upload' \
  --exclude='skills' \
  --exclude='examples' \
  --exclude='.git' \
  --exclude='.gitignore' \
  --exclude='tsconfig.tsbuildinfo' \
  --exclude='.DS_Store' \
  --exclude='download' \
  --exclude='worklog.md' \
  --exclude='REMAINING-TASKS.md' \
  --exclude='verify-*.sh' \
  --exclude='keep-*.sh' \
  --exclude='start-dev.sh' \
  --exclude='wd.sh' \
  --exclude='--full-page' \
  "${ROOT}/" "${STAGE_ROOT}/"

# Make the entrypoint executable (in case umask stripped it).
chmod +x "${STAGE_ROOT}/docker-entrypoint.sh" 2>/dev/null || true
chmod +x "${STAGE_ROOT}/build-zip.sh" 2>/dev/null || true

( cd "${STAGE}" && zip -qr "${OUT_FILE}" "reanzly" )

# Clean staging
rm -rf "${STAGE}"

SIZE="$(du -h "${OUT_FILE}" | cut -f1)"
FILES="$(unzip -l "${OUT_FILE}" | tail -1 | awk '{print $2}')"
echo "[build-zip] done."
echo "[build-zip]    file:  ${OUT_FILE}"
echo "[build-zip]    size:  ${SIZE}"
echo "[build-zip]    files: ${FILES}"
echo ""
echo "[build-zip] Deploy on AWS:"
echo "    1. Upload to S3:  aws s3 cp ${OUT_FILE} s3://YOUR-BUCKET/reanzly-source.zip"
echo "    2. Or build Docker locally:  docker build -t reanzly .  (then push to ECR)"
echo "    3. See aws-deploy.md for the full EC2/ECS/RDS walkthrough."

#!/usr/bin/env bash
# =============================================================================
# ABC License — Integrated deploy script (dev machine)
# Builds both images, compresses and transfers them to the server via SSH key,
# then triggers the server-side load-and-run.sh.
#
# Usage:
#   ./scripts/build-and-deploy.sh              # build + deploy
#   ./scripts/build-and-deploy.sh --build-only # build & save locally, no transfer
#   ./scripts/build-and-deploy.sh --deploy-only # skip build, transfer existing dist/
#
# Prerequisites:
#   - SSH key at ~/.ssh/mac-pay-deploy (or set DEPLOY_SSH_KEY env var)
#   - .env file present at repo root
#   - Server: /root/abc-dashboard/.env filled with real secrets
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
DIST_DIR="${DIST_DIR:-${REPO_ROOT}/dist}"

SERVER_HOST="${ABC_SERVER:-155.138.245.11}"
SERVER_USER="${ABC_SERVER_USER:-root}"
SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/mac-pay-deploy}"
REMOTE_DIR="/root/abc-dashboard"

BUILD_ONLY=false
DEPLOY_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --build-only)  BUILD_ONLY=true ;;
    --deploy-only) DEPLOY_ONLY=true ;;
  esac
done

log()      { echo "[$(date '+%H:%M:%S')] $*"; }
ssh_cmd()  { ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o BatchMode=yes "${SERVER_USER}@${SERVER_HOST}" "$@"; }
scp_file() { scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$1" "${SERVER_USER}@${SERVER_HOST}:$2"; }

# ── Preflight ─────────────────────────────────────────────────────────────────
if [ ! -f "$SSH_KEY" ]; then
  echo "ERROR: SSH key not found at $SSH_KEY"
  echo "Set DEPLOY_SSH_KEY env var or place the key at ~/.ssh/mac-pay-deploy"
  exit 1
fi

if [ ! -f "${REPO_ROOT}/.env" ]; then
  echo "ERROR: .env not found at ${REPO_ROOT}/.env"
  exit 1
fi

mkdir -p "$DIST_DIR"

# ── Build ─────────────────────────────────────────────────────────────────────
if [ "$DEPLOY_ONLY" = false ]; then
  log "Building abc-license-backend:latest (linux/amd64)..."
  docker compose \
    --file "${REPO_ROOT}/docker-compose.yml" \
    --env-file "${REPO_ROOT}/.env" \
    build \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    backend
  log "Backend build complete."

  log "Building abc-license-frontend:latest (linux/amd64)..."
  docker compose \
    --file "${REPO_ROOT}/docker-compose.yml" \
    --env-file "${REPO_ROOT}/.env" \
    build \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    frontend
  log "Frontend build complete."

  log "Compressing images → ${DIST_DIR}..."
  docker save abc-license-backend:latest  | gzip -1 > "${DIST_DIR}/backend.tar.gz"
  docker save abc-license-frontend:latest | gzip -1 > "${DIST_DIR}/frontend.tar.gz"
  ls -lh "${DIST_DIR}"/*.tar.gz
  log "Images compressed."

  [ "$BUILD_ONLY" = true ] && { log "Build-only mode — done."; exit 0; }
fi

# ── Transfer ──────────────────────────────────────────────────────────────────
for f in backend frontend; do
  TAR="${DIST_DIR}/${f}.tar.gz"
  SIZE=$(du -sh "$TAR" | cut -f1)
  log "Transferring ${f} (${SIZE}) → ${SERVER_HOST}:${REMOTE_DIR}/dist/..."
  ssh_cmd "mkdir -p ${REMOTE_DIR}/dist"
  scp_file "$TAR" "${REMOTE_DIR}/dist/${f}.tar.gz"
  log "${f} transfer complete."
done

# ── Deploy ────────────────────────────────────────────────────────────────────
log "Triggering server-side deploy..."
ssh_cmd "cd ${REMOTE_DIR} && bash scripts/load-and-run.sh"

log "=== ABC License deploy complete ==="
log "Frontend: http://${SERVER_HOST}:3000"
log "Backend:  http://${SERVER_HOST}:5000"

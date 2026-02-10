#!/bin/bash

# =================================================================
# ABC License - Deploy & run (server) or start stack only (local/server)
# =================================================================
# - Without --start-only: load images from dist/*.tar.gz then start stack (server after transfer).
# - With --start-only: only start the stack (sets POSTGRES_PASSWORD_PLAIN when .env has enc:).
#
# Usage:
#   ./scripts/load-and-run.sh              # Load images + start (server)
#   ./scripts/load-and-run.sh --no-start   # Load images only
#   ./scripts/load-and-run.sh --start-only up -d   # Start stack only (local or server)
#   ./scripts/load-and-run.sh --start-only down    # Stop stack

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
DIST_DIR="${DIST_DIR:-$REPO_ROOT/dist}"
BACKEND_IMAGE_FILE="$DIST_DIR/backend.tar.gz"
FRONTEND_IMAGE_FILE="$DIST_DIR/frontend.tar.gz"

# Start stack with enc: password support (set POSTGRES_PASSWORD_PLAIN then docker compose)
start_stack() {
    cd "$REPO_ROOT"
    export POSTGRES_PASSWORD_PLAIN
    POSTGRES_PASSWORD_PLAIN=$(cd "$REPO_ROOT/backend" && node scripts/resolve-db-password-for-docker.js)
    exec docker compose "$@"
}

if [ "$1" = "--start-only" ]; then
    shift
    start_stack "$@"
fi

# --- Load + (optionally) start ---
NO_START=false
[ "$1" = "--no-start" ] && NO_START=true

echo "=========================================="
echo "ABC License - Load & Run"
echo "=========================================="
echo "Repo root: $REPO_ROOT"
echo "Dist dir:  $DIST_DIR"
echo ""

if [ ! -f "$BACKEND_IMAGE_FILE" ]; then
    echo "❌ ERROR: Backend image not found: $BACKEND_IMAGE_FILE"
    exit 1
fi
if [ ! -f "$FRONTEND_IMAGE_FILE" ]; then
    echo "❌ ERROR: Frontend image not found: $FRONTEND_IMAGE_FILE"
    exit 1
fi
echo "✓ Image files found"
echo ""

echo "[1/2] Loading backend image..."
docker load < "$BACKEND_IMAGE_FILE"
echo "[2/2] Loading frontend image..."
docker load < "$FRONTEND_IMAGE_FILE"
echo "✅ Images loaded"
docker images | grep abc-license | head -5
echo ""

if [ "$NO_START" = false ]; then
    echo "Starting stack... (use ./scripts/load-and-run.sh --start-only up -d to start only)"
    start_stack up -d
fi
echo "=========================================="

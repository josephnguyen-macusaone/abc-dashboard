#!/bin/bash

# =================================================================
# ABC License - Build and Save (Option A: Dev Machine)
# =================================================================
# Build Docker images on dev machine and save to compressed files
# for transfer to low-resource server.
#
# Usage: ./scripts/build-and-save.sh [OUT_DIR]
#
# Output: dist/backend.tar.gz, dist/frontend.tar.gz

set -e  # Exit on error

# =================================================================
# CONFIGURATION
# =================================================================

# Get repo root (parent of scripts/ dir)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# Output directory for saved images
OUT_DIR="${OUT_DIR:-$REPO_ROOT/dist}"

# Image names (must match docker-compose.yml)
BACKEND_IMAGE="abc-license-backend:latest"
FRONTEND_IMAGE="abc-license-frontend:latest"

# =================================================================
# PRE-BUILD CHECKS
# =================================================================

echo "=========================================="
echo "ABC License - Build & Save (Option A)"
echo "=========================================="
echo "Repo root: $REPO_ROOT"
echo "Output dir: $OUT_DIR"
echo ""

# Check .env file
if [ ! -f "$REPO_ROOT/.env" ]; then
    echo "❌ ERROR: .env file not found at $REPO_ROOT/.env"
    echo "  Please create .env file with required variables"
    exit 1
fi

# Check docker-compose.yml
if [ ! -f "$REPO_ROOT/docker-compose.yml" ]; then
    echo "❌ ERROR: docker-compose.yml not found"
    exit 1
fi

# Create output directory
mkdir -p "$OUT_DIR"

# Enable Docker BuildKit for better caching
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export BUILDKIT_INLINE_CACHE=1

echo "✓ Pre-flight checks passed"
echo ""

# =================================================================
# BUILD IMAGES
# =================================================================

cd "$REPO_ROOT"

echo "[1/3] Building backend..."
echo ""
docker compose build backend
echo ""
echo "✅ Backend build complete"
echo ""

echo "[2/3] Building frontend..."
echo ""
docker compose build frontend
echo ""
echo "✅ Frontend build complete"
echo ""

# =================================================================
# SAVE IMAGES TO FILES
# =================================================================

echo "[3/3] Saving images to $OUT_DIR..."
echo ""

# Save backend
echo "  - Saving backend image..."
docker save "$BACKEND_IMAGE" | gzip > "$OUT_DIR/backend.tar.gz"
echo "    ✓ backend.tar.gz"

# Save frontend
echo "  - Saving frontend image..."
docker save "$FRONTEND_IMAGE" | gzip > "$OUT_DIR/frontend.tar.gz"
echo "    ✓ frontend.tar.gz"

echo ""
echo "✅ Images saved successfully"
echo ""

# =================================================================
# SUMMARY
# =================================================================

echo "=========================================="
echo "Done. Files:"
ls -lh "$OUT_DIR"/*.tar.gz
echo ""
echo "Copy to server and run load-and-run.sh:"
echo "  scp $OUT_DIR/backend.tar.gz $OUT_DIR/frontend.tar.gz user@yourserver:/root/abc-dashboard/dist/"
echo "  ssh user@yourserver 'cd /root/abc-dashboard && ./scripts/load-and-run.sh'"
echo "=========================================="

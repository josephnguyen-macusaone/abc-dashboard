#!/bin/bash

# =================================================================
# ABC License - Load and Run (Option A: Server)
# =================================================================
# Load Docker images from compressed files and start the stack.
# Run this on your low-resource server after transferring images.
#
# Usage: ./scripts/load-and-run.sh [--no-start]

set -e  # Exit on error

# =================================================================
# CONFIGURATION
# =================================================================

# Get repo root (parent of scripts/ dir)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# Directory containing the image files
DIST_DIR="${DIST_DIR:-$REPO_ROOT/dist}"

# Image files
BACKEND_IMAGE_FILE="$DIST_DIR/backend.tar.gz"
FRONTEND_IMAGE_FILE="$DIST_DIR/frontend.tar.gz"

# Parse arguments
NO_START=false
if [ "$1" = "--no-start" ]; then
    NO_START=true
fi

# =================================================================
# PRE-LOAD CHECKS
# =================================================================

echo "=========================================="
echo "ABC License - Load & Run (Option A)"
echo "=========================================="
echo "Repo root: $REPO_ROOT"
echo "Dist dir:  $DIST_DIR"
echo ""

# Check if image files exist
if [ ! -f "$BACKEND_IMAGE_FILE" ]; then
    echo "❌ ERROR: Backend image not found: $BACKEND_IMAGE_FILE"
    echo "  Please transfer backend.tar.gz from dev machine"
    exit 1
fi

if [ ! -f "$FRONTEND_IMAGE_FILE" ]; then
    echo "❌ ERROR: Frontend image not found: $FRONTEND_IMAGE_FILE"
    echo "  Please transfer frontend.tar.gz from dev machine"
    exit 1
fi

echo "✓ Image files found"
echo ""

# =================================================================
# LOAD IMAGES
# =================================================================

echo "[1/2] Loading backend image..."
docker load < "$BACKEND_IMAGE_FILE"
echo ""

echo "[2/2] Loading frontend image..."
docker load < "$FRONTEND_IMAGE_FILE"
echo ""

echo "✅ Images loaded successfully"
echo ""

# Verify images
echo "Images loaded. Verifying:"
docker images | grep abc-license | head -5
echo ""

# =================================================================
# START STACK
# =================================================================

if [ "$NO_START" = false ]; then
    echo "Starting stack..."
    cd "$REPO_ROOT"
    docker compose up -d
    echo ""
    echo "✅ Stack started"
    echo ""
    echo "Done. Check: docker compose ps"
else
    echo "⚠️  Skipping stack start (--no-start flag)"
    echo "  Start manually with: cd $REPO_ROOT && docker compose up -d"
fi

echo "=========================================="

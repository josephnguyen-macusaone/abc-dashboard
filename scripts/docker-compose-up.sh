#!/bin/bash

# =================================================================
# ABC License – Start stack (local or server)
# =================================================================
# Runs docker compose with env support for POSTGRES_PASSWORD=enc:...
# Use after build-and-save.sh (images already in Docker) or after load-and-run.sh (images loaded).
#
# Usage: ./scripts/docker-compose-up.sh [COMPOSE_ARGS...]
# Examples:
#   ./scripts/docker-compose-up.sh up -d --force-recreate
#   ./scripts/docker-compose-up.sh up -d
#   ./scripts/docker-compose-up.sh down

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$REPO_ROOT"
export POSTGRES_PASSWORD_PLAIN
POSTGRES_PASSWORD_PLAIN=$(cd "$REPO_ROOT/backend" && node scripts/resolve-db-password-for-docker.js 2>/dev/null || true)
exec docker compose "$@"

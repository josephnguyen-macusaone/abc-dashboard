#!/usr/bin/env bash
# Run database reset (optional drop), migrate, seed, and license sync using Docker.
# Usage:
#   ./scripts/docker-db-reset-sync.sh           # migrate:fresh + seed + sync
#   ./scripts/docker-db-reset-sync.sh --drop    # drop DB, create, migrate + seed + sync
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

if ! docker compose ps backend 2>/dev/null | grep -q Up; then
  echo "Backend container is not running. Start stack first: docker compose up -d"
  exit 1
fi

if [ "$1" = "--drop" ]; then
  echo "Dropping and recreating database..."
  docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\";" -c "CREATE DATABASE \"$POSTGRES_DB\";"'
  echo "Running migrations..."
  docker compose exec backend npm run migrate
else
  echo "Resetting database (rollback + fresh migrations)..."
  docker compose exec backend npm run migrate:fresh
fi

echo "Running seeds..."
docker compose exec backend npm run seed

echo "Starting license sync (may take several minutes)..."
docker compose exec backend npm run sync:start

echo "Done."

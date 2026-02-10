#!/usr/bin/env bash
# Run database reset (optional drop), migrate, seed; optionally run license sync.
#
# Usage:
#   ./scripts/docker-db-reset-sync.sh              # migrate:fresh + seed
#   ./scripts/docker-db-reset-sync.sh --drop        # drop DB, create, migrate + seed
#   ./scripts/docker-db-reset-sync.sh --drop --sync # same as --drop + license sync
#
# Flow: checks backend container is up → (--drop: terminate connections, drop DB, create, migrate) or migrate:fresh
#       → seed → (--sync: npm run sync:start). All commands run inside containers via docker compose exec.
#
# Requires .env at repo root with Docker-friendly DB host/port (backend runs inside Docker):
#   POSTGRES_HOST=postgres
#   POSTGRES_PORT=5432
# If you see ECONNREFUSED on "Running migrations...", fix .env and restart: docker compose up -d
# If you see "password authentication failed for user abc_user", see docs/DEPLOYMENT-GUIDE.md (Troubleshooting)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

DO_DROP=0
DO_SYNC=0
for arg in "$@"; do
  case "$arg" in
    --drop) DO_DROP=1 ;;
    --sync) DO_SYNC=1 ;;
  esac
done

if ! docker compose ps backend 2>/dev/null | grep -q Up; then
  echo "Backend container is not running. Start stack first: docker compose up -d"
  exit 1
fi

if [ "$DO_DROP" = "1" ]; then
  echo "Terminating connections to database..."
  docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '\''"$POSTGRES_DB"'\'' AND pid <> pg_backend_pid();"'
  echo "Dropping and recreating database..."
  docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\";" -c "CREATE DATABASE \"$POSTGRES_DB\";"'
  echo "Running migrations..."
  if ! docker compose exec backend npm run migrate; then
    echo ""
    echo "Migrations failed. If the error is 'password authentication failed for user \"abc_user\"',"
    echo "see docs/DEPLOYMENT-GUIDE.md (Troubleshooting) for plain vs encrypted POSTGRES_PASSWORD and how to start the stack."
    exit 1
  fi
else
  echo "Resetting database (rollback + fresh migrations)..."
  if ! docker compose exec backend npm run migrate:fresh; then
    echo ""
    echo "Migrations failed. If the error is 'password authentication failed for user \"abc_user\"',"
    echo "see docs/DEPLOYMENT-GUIDE.md (Troubleshooting) for plain vs encrypted POSTGRES_PASSWORD and how to start the stack."
    exit 1
  fi
fi

echo "Running seeds..."
docker compose exec backend npm run seed

if [ "$DO_SYNC" = "1" ]; then
  echo "Starting license sync (may take several minutes)..."
  docker compose exec backend npm run sync:start
fi

echo "Done."

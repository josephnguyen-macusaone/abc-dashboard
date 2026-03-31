#!/usr/bin/env bash
# Run database reset (optional drop), migrate, seed; optionally run license sync.
#
# Usage:
#   ./scripts/docker-db-reset-sync.sh                # migrate:fresh + seed
#   ./scripts/docker-db-reset-sync.sh --drop        # drop DB, create, migrate + seed
#   ./scripts/docker-db-reset-sync.sh --sync        # migrate:fresh + seed + full license sync
#   ./scripts/docker-db-reset-sync.sh --sync=10     # migrate:fresh + seed + sync max 10 pages
#   ./scripts/docker-db-reset-sync.sh --sync-limit=10  # same + sync max 10 licenses (quick test)
#
# Flow: (--drop: stop backend, terminate connections, drop DB, start backend, migrate) or migrate:fresh in backend
#       → seed → (--sync: npm run sync:start). All commands run inside containers via docker compose exec.
#
# Note: With --drop, backend MUST be stopped before DROP DATABASE; otherwise Knex pools reconnect and DROP fails
#       ("database is being accessed by other users").
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
SYNC_LIMIT=""
SYNC_MAX_PAGES=""
for arg in "$@"; do
  case "$arg" in
    --drop) DO_DROP=1 ;;
    --sync) DO_SYNC=1 ;;
    --sync=*) DO_SYNC=1; SYNC_MAX_PAGES="${arg#--sync=}" ;;
    --sync-limit=*) DO_SYNC=1; SYNC_LIMIT="${arg#--sync-limit=}" ;;
  esac
done

if ! docker compose ps postgres 2>/dev/null | grep -q Up; then
  echo "Postgres container is not running. Start stack first: docker compose up -d"
  exit 1
fi

if [ "$DO_DROP" != "1" ]; then
  if ! docker compose ps backend 2>/dev/null | grep -q Up; then
    echo "Backend container is not running. Start stack first: docker compose up -d"
    exit 1
  fi
fi

wait_backend_health() {
  echo "Waiting for backend API after database recreate..."
  for i in $(seq 1 30); do
    if docker compose ps backend 2>/dev/null | grep -q Up; then
      if docker compose exec backend curl -sf http://localhost:5000/api/v1/health >/dev/null 2>&1; then
        echo "Backend is ready."
        return 0
      fi
    fi
    sleep 2
  done
  echo "Backend did not become ready after db drop. Try: make logs-backend"
  return 1
}

if [ "$DO_DROP" = "1" ]; then
  echo "Stopping backend container (releases DB connections before DROP DATABASE)..."
  docker compose stop backend >/dev/null 2>&1 || true

  echo "Terminating remaining connections to database..."
  docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '\''"$POSTGRES_DB"'\'' AND pid <> pg_backend_pid();"' || true

  echo "Dropping and recreating database..."
  # WITH (FORCE): PostgreSQL 13+ — terminate sessions and drop (defense in depth after stop backend)
  docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\" WITH (FORCE);" -c "CREATE DATABASE \"$POSTGRES_DB\";"'

  echo "Starting backend container..."
  docker compose start backend || docker compose up -d backend

  if ! wait_backend_health; then
    exit 1
  fi

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
  if [ -n "$SYNC_LIMIT" ]; then
    echo "Starting license sync (limit=$SYNC_LIMIT licenses)..."
    docker compose exec -e SYNC_LIMIT="$SYNC_LIMIT" backend npm run sync:start
  elif [ -n "$SYNC_MAX_PAGES" ]; then
    echo "Starting license sync (maxPages=$SYNC_MAX_PAGES)..."
    docker compose exec -e SYNC_MAX_PAGES="$SYNC_MAX_PAGES" backend npm run sync:start
  else
    echo "Starting license sync (may take several minutes)..."
    docker compose exec backend npm run sync:start
  fi
fi

echo "Done."

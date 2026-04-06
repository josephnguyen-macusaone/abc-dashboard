#!/usr/bin/env bash
# Local: reset DB / migrate / seed / sync (same flags as former docker-db-reset-sync.sh).
# Remote: ./scripts/db-reset.sh remote [HOST [USER]]  (or SERVER_HOST=...), optional --copy-script
#
# Local usage:
#   ./scripts/db-reset.sh [--drop] [--sync] [--sync=N] [--sync-limit=N]
#
# Remote usage:
#   SERVER_HOST=x ./scripts/db-reset.sh remote
#   ./scripts/db-reset.sh remote my.server.com root
#   ... --copy-script   # scp this script to server if missing/outdated
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# --- remote -------------------------------------------------------------------
if [[ "${1:-}" == remote ]]; then
  shift
  COPY_SCRIPT=0
  POSITIONAL=()
  for arg in "$@"; do
    case "$arg" in
      --copy-script) COPY_SCRIPT=1 ;;
      *) POSITIONAL+=("$arg") ;;
    esac
  done
  set -- "${POSITIONAL[@]}"

  SERVER_USER="${SERVER_USER:-root}"
  if [[ -n "${1:-}" ]]; then
    SERVER_HOST="$1"
    [[ -n "${2:-}" ]] && SERVER_USER="$2"
  fi

  if [[ -z "${SERVER_HOST:-}" ]]; then
    echo "Usage: SERVER_HOST=host ./scripts/db-reset.sh remote  OR  ./scripts/db-reset.sh remote host [user]" >&2
    echo "Optional: REMOTE_DIR, SSH_KEY, SSHPASS, --copy-script" >&2
    exit 1
  fi

  SSH_OPTS=(-o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new)
  [[ -n "${SSH_KEY:-}" ]] && SSH_OPTS=(-i "$SSH_KEY" "${SSH_OPTS[@]}")
  SSH_CMD=(ssh)
  [[ -n "${SSHPASS:-}" ]] && SSH_CMD=(sshpass -e ssh)
  APP_DIR="${REMOTE_DIR:-/root/abc-dashboard}"

  echo "=========================================="
  echo "Server DB reset: drop, migrate, seed, sync"
  echo "=========================================="
  echo "Server: $SERVER_USER@$SERVER_HOST  App: $APP_DIR"
  echo ""

  echo "[1/5] docker compose down -v ..."
  "${SSH_CMD[@]}" "${SSH_OPTS[@]}" "$SERVER_USER@$SERVER_HOST" "cd $APP_DIR && docker compose down -v"
  echo ""

  echo "[2/5] deploy up (enc:-safe) ..."
  "${SSH_CMD[@]}" "${SSH_OPTS[@]}" "$SERVER_USER@$SERVER_HOST" "cd $APP_DIR && ./scripts/deploy.sh up -d"
  echo ""

  echo "[3/5] Waiting for backend..."
  sleep 20
  echo ""

  if [[ "$COPY_SCRIPT" == 1 ]]; then
    echo "[4/5] Copying db-reset.sh to server..."
    "${SSH_CMD[@]}" "${SSH_OPTS[@]}" "$SERVER_USER@$SERVER_HOST" "mkdir -p $APP_DIR/scripts"
    SCP_CMD=(scp)
    [[ -n "${SSHPASS:-}" ]] && SCP_CMD=(sshpass -e scp)
    "${SCP_CMD[@]}" -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new \
      ${SSH_KEY:+-i "$SSH_KEY"} \
      "$SCRIPT_DIR/db-reset.sh" \
      "$SERVER_USER@$SERVER_HOST:$APP_DIR/scripts/"
    echo ""
  else
    echo "[4/5] Using db-reset.sh on server (use --copy-script if needed)."
    echo ""
  fi

  echo "[5/5] db-reset --drop --sync ..."
  "${SSH_CMD[@]}" "${SSH_OPTS[@]}" "$SERVER_USER@$SERVER_HOST" "cd $APP_DIR && ./scripts/db-reset.sh --drop --sync"
  echo ""
  echo "Done."
  exit 0
fi

# --- local (former docker-db-reset-sync.sh) -----------------------------------
cd "$REPO_ROOT"

load_env_file_safe() {
  local env_file="$1"
  [[ -f "$env_file" ]] || return 0

  while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
    local line="$raw_line"
    line="${line#"${line%%[![:space:]]*}"}"
    [[ -z "$line" || "${line:0:1}" == "#" ]] && continue
    [[ "$line" == *=* ]] || continue

    local key="${line%%=*}"
    local value="${line#*=}"
    key="${key%"${key##*[![:space:]]}"}"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"

    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value="${value:1:${#value}-2}"
    fi

    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    export "$key=$value"
  done < "$env_file"
}

load_env_file_safe "$REPO_ROOT/.env"

if [[ -f "$REPO_ROOT/.env" ]] && grep -q '^POSTGRES_PASSWORD=enc:' "$REPO_ROOT/.env" 2>/dev/null; then
  echo "Note: POSTGRES_PASSWORD=enc: — start the stack with ./scripts/deploy.sh up -d (not plain docker compose up)."
fi

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

_stack_hint="Start the stack: ./scripts/deploy.sh up -d (required for POSTGRES_PASSWORD=enc:)."

if ! docker compose ps postgres 2>/dev/null | grep -q Up; then
  echo "Postgres container is not running. $_stack_hint" >&2
  exit 1
fi

if [[ "$DO_DROP" != "1" ]]; then
  if ! docker compose ps backend 2>/dev/null | grep -q Up; then
    echo "Backend container is not running. $_stack_hint" >&2
    exit 1
  fi
fi

wait_backend_health() {
  echo "Waiting for backend API after database recreate..."
  for _ in $(seq 1 30); do
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

if [[ "$DO_DROP" == "1" ]]; then
  echo "Stopping backend container..."
  docker compose stop backend >/dev/null 2>&1 || true

  echo "Terminating remaining connections to database..."
  docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '\''"$POSTGRES_DB"'\'' AND pid <> pg_backend_pid();"' || true

  echo "Dropping and recreating database..."
  docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\" WITH (FORCE);" -c "CREATE DATABASE \"$POSTGRES_DB\";"'

  echo "Starting backend container..."
  docker compose start backend || docker compose up -d backend

  if ! wait_backend_health; then
    exit 1
  fi

  echo "Running migrations..."
  if ! docker compose exec backend npm run migrate; then
    echo ""
    echo "Migrations failed. If 'password authentication failed', see docs/DEPLOYMENT-GUIDE.md (Docker / database)."
    exit 1
  fi
else
  echo "Resetting database (migrate:fresh)..."
  if ! docker compose exec backend npm run migrate:fresh; then
    echo ""
    echo "Migrations failed. If 'password authentication failed', see docs/DEPLOYMENT-GUIDE.md (Docker / database)."
    exit 1
  fi
fi

# License sync must run before seeds that attach agents (002–004): those seeds match
# `licenses` / `external_licenses`, which are empty until sync. Otherwise agents exist
# but have no license_assignments → empty dashboard and no SMS history scope.
if [[ "$DO_SYNC" == "1" ]]; then
  if [[ -n "$SYNC_LIMIT" ]]; then
    echo "Starting license sync (limit=$SYNC_LIMIT licenses)..."
    docker compose exec -e SYNC_LIMIT="$SYNC_LIMIT" backend npm run sync:start
  elif [[ -n "$SYNC_MAX_PAGES" ]]; then
    echo "Starting license sync (maxPages=$SYNC_MAX_PAGES)..."
    docker compose exec -e SYNC_MAX_PAGES="$SYNC_MAX_PAGES" backend npm run sync:start
  else
    echo "Starting license sync (may take several minutes)..."
    docker compose exec backend npm run sync:start
  fi
fi

echo "Running seeds..."
docker compose exec backend npm run seed

echo "Done."

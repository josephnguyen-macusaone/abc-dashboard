#!/usr/bin/env bash
# =============================================================================
# PostgreSQL logical backup (custom format) via docker compose.
# Run from repo root with the stack up: ./scripts/db-backup.sh
#
# Env (optional):
#   BACKUP_DIR           — output directory (default: <repo>/backups/postgres)
#   BACKUP_RETENTION_DAYS — delete *.dump older than this many days (default: 14, 0 = skip)
#   COMPOSE_FILE         — alternate compose file path
#
# Cron example (daily 02:30 UTC):
#   30 2 * * * cd /root/abc-dashboard && ./scripts/db-backup.sh >>/var/log/abc-pg-backup.log 2>&1
#
# Restore (destructive — test on a copy first). From repo root, stack running:
#   docker compose exec -i -T postgres sh -c \
#     'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' \
#     < backups/postgres/your-file.dump
# If the target DB must be empty, drop/recreate it or use -C against postgres DB per pg_restore docs.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

# Pick up BACKUP_DIR, BACKUP_RETENTION_DAYS, COMPOSE_FILE from repo .env when present
if [[ -f "$REPO_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/backups/postgres}"
RETAIN="${BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/abc_dashboard-${STAMP}.dump"

mkdir -p "$BACKUP_DIR"

COMPOSE=(docker compose)
if [[ -n "${COMPOSE_FILE:-}" ]]; then
  COMPOSE=(docker compose -f "$COMPOSE_FILE")
fi

if ! "${COMPOSE[@]}" exec -T postgres true 2>/dev/null; then
  echo "Error: cannot exec into postgres. Is the stack up? (e.g. ./scripts/deploy.sh up -d)" >&2
  exit 1
fi

echo "Writing $OUT ..."
"${COMPOSE[@]}" exec -T postgres sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner' \
  >"$OUT"

SIZE="$(wc -c <"$OUT" | tr -d ' ')"
if [[ "$SIZE" -lt 1024 ]]; then
  echo "Warning: dump is very small (${SIZE} bytes); check for errors." >&2
fi
echo "Done (${SIZE} bytes)."

if [[ "$RETAIN" =~ ^[0-9]+$ ]] && [[ "$RETAIN" -gt 0 ]]; then
  find "$BACKUP_DIR" -maxdepth 1 -name 'abc_dashboard-*.dump' -type f -mtime "+${RETAIN}" -print -delete || true
  echo "Retention: removed dumps older than ${RETAIN} days (if any)."
fi

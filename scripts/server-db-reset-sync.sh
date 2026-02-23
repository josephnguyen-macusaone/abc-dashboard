#!/usr/bin/env bash
# Run full DB reset (drop, migrate, seed, sync) on the **server** via SSH.
# Use from your dev machine. Server must have app at /root/abc-dashboard with
# docker-compose.yml, .env, and scripts/load-and-run.sh, scripts/docker-db-reset-sync.sh.
#
# Usage:
#   SERVER_HOST=my.server.com ./scripts/server-db-reset-sync.sh
#   SERVER_HOST=my.server.com SERVER_USER=root ./scripts/server-db-reset-sync.sh
#   ./scripts/server-db-reset-sync.sh my.server.com [root]
#
# Optional: SSH_KEY=path/to/key to use a specific key (e.g. for CI).
set -e

SERVER_USER="${SERVER_USER:-root}"
if [ -n "$1" ]; then
  SERVER_HOST="$1"
  [ -n "$2" ] && SERVER_USER="$2"
fi

if [ -z "$SERVER_HOST" ]; then
  echo "Usage: SERVER_HOST=my.server.com ./scripts/server-db-reset-sync.sh"
  echo "   or: ./scripts/server-db-reset-sync.sh my.server.com [SERVER_USER]"
  exit 1
fi

SSH_OPTS=(-o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new)
[ -n "$SSH_KEY" ] && SSH_OPTS=(-i "$SSH_KEY" "${SSH_OPTS[@]}")
# Use sshpass for password auth when SSHPASS is set (e.g. SSHPASS='...' ./scripts/server-db-reset-sync.sh)
SSH_CMD=(ssh)
[ -n "$SSHPASS" ] && SSH_CMD=(sshpass -e ssh)

APP_DIR="/root/abc-dashboard"

echo "=========================================="
echo "Server DB reset: drop, migrate, seed, sync"
echo "=========================================="
echo "Server: $SERVER_USER@$SERVER_HOST"
echo "App dir: $APP_DIR"
echo ""

echo "[1/5] Stopping stack and removing Postgres volume..."
"${SSH_CMD[@]}" "${SSH_OPTS[@]}" "$SERVER_USER@$SERVER_HOST" "cd $APP_DIR && docker compose down -v"
echo ""

echo "[2/5] Starting stack (with decrypted DB password when using enc:)..."
"${SSH_CMD[@]}" "${SSH_OPTS[@]}" "$SERVER_USER@$SERVER_HOST" "cd $APP_DIR && ./scripts/load-and-run.sh --start-only up -d"
echo ""

echo "[3/5] Waiting for backend to be healthy..."
sleep 20
echo ""

echo "[4/5] Copying docker-db-reset-sync.sh to server..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"${SSH_CMD[@]}" "${SSH_OPTS[@]}" "$SERVER_USER@$SERVER_HOST" "mkdir -p $APP_DIR/scripts"
SCP_CMD=(scp)
[ -n "$SSHPASS" ] && SCP_CMD=(sshpass -e scp)
"${SCP_CMD[@]}" -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new \
  ${SSH_KEY:+-i "$SSH_KEY"} \
  "$SCRIPT_DIR/docker-db-reset-sync.sh" \
  "$SERVER_USER@$SERVER_HOST:$APP_DIR/scripts/"
echo ""

echo "[5/5] Running migrate + seed + license sync (this may take several minutes)..."
"${SSH_CMD[@]}" "${SSH_OPTS[@]}" "$SERVER_USER@$SERVER_HOST" "cd $APP_DIR && ./scripts/docker-db-reset-sync.sh --drop --sync"
echo ""

echo "=========================================="
echo "Done. DB reset and sync completed on server."
echo "=========================================="

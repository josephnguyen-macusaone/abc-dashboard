#!/usr/bin/env bash
# Docker compose (enc: password), image build/save, remote push — single entrypoint.
#
#   ./scripts/deploy.sh up -d                    # same as docker compose (sets POSTGRES_PASSWORD_PLAIN)
#   ./scripts/deploy.sh down
#   ./scripts/deploy.sh load [--no-start]        # docker load dist/*.tar.gz [+ up -d]
#   ./scripts/deploy.sh upgrade-dist [--rm-dist]  # load → migrate → up (CI / production)
#   ./scripts/deploy.sh build-save               # build images → dist/*.tar.gz
#   ./scripts/deploy.sh push [--build-only|--deploy-only]   # SCP + remote upgrade-dist
#   ./scripts/deploy.sh _print-pg-password       # internal: stdout = plain password (for backend/scripts delegate)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

# --- decrypt POSTGRES_PASSWORD (enc:) — embedded Node, no separate .js file -----------------
resolve_postgres_password_plain() {
  export REPO_ROOT_FOR_RESOLVE="$REPO_ROOT"
  # shellcheck disable=SC2016
  node --input-type=module <<'NODE'
import fs from 'fs';
import crypto from 'crypto';

const repoRoot = process.env.REPO_ROOT_FOR_RESOLVE;
const rootEnv = `${repoRoot}/.env`;

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const noop = () => {};
  const orig = process.stdout.write;
  process.stdout.write = noop;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1).replace(/\\(.)/g, '$1');
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } finally {
    process.stdout.write = orig;
  }
}

loadEnv(rootEnv);

const raw = process.env.POSTGRES_PASSWORD || '';
if (!raw.startsWith('enc:')) {
  process.stdout.write(raw);
  process.exit(0);
}

const hexData = raw.slice(4);
const keyHex = process.env.ENCRYPTION_KEY;
if (!keyHex || keyHex.length !== 64) {
  console.error('ENCRYPTION_KEY must be 64 hex chars when using enc: password');
  process.exit(1);
}

const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const key = Buffer.from(keyHex, 'hex');
const combined = Buffer.from(hexData, 'hex');
const iv = combined.subarray(0, IV_LENGTH);
const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);
const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
decipher.setAAD(Buffer.from('db_password'));
decipher.setAuthTag(authTag);
let decrypted = decipher.update(encrypted);
decrypted += decipher.final('utf8');
process.stdout.write(decrypted);
NODE
}

export_postgres_plain() {
  export POSTGRES_PASSWORD_PLAIN
  POSTGRES_PASSWORD_PLAIN="$(resolve_postgres_password_plain)" || {
    echo "ERROR: could not resolve POSTGRES_PASSWORD (enc:? check ENCRYPTION_KEY)." >&2
    exit 1
  }
}

_load_dist_archives() {
  local dist="${DIST_DIR:-$REPO_ROOT/dist}"
  for f in backend frontend; do
    [[ -f "$dist/$f.tar.gz" ]] || {
      echo "ERROR: missing $dist/$f.tar.gz" >&2
      exit 1
    }
  done
  echo "[deploy] Loading archives from $dist ..."
  docker load <"$dist/backend.tar.gz"
  docker load <"$dist/frontend.tar.gz"
}

cmd_load() {
  NO_START=false
  if [[ "${1:-}" == "--no-start" ]]; then
    NO_START=true
    shift
  fi
  _load_dist_archives
  if [[ "$NO_START" == true ]]; then
    echo "[deploy load] Done (no start)."
    exit 0
  fi
  export_postgres_plain
  exec docker compose up -d --force-recreate
}

# Load dist/*.tar.gz, run pending DB migrations, then compose up (handles enc: via deploy.sh up).
cmd_upgrade_from_dist() {
  RM_DIST=false
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --rm-dist) RM_DIST=true ;;
      *)
        echo "Unknown option: $1" >&2
        echo "Usage: $0 upgrade-dist [--rm-dist]" >&2
        exit 1
        ;;
    esac
    shift
  done

  _load_dist_archives

  local dist="${DIST_DIR:-$REPO_ROOT/dist}"
  if [[ "$RM_DIST" == true ]]; then
    rm -f "$dist/backend.tar.gz" "$dist/frontend.tar.gz"
    echo "[deploy upgrade-dist] Removed dist archives."
  fi

  echo "[deploy upgrade-dist] Running database migrations..."
  docker compose run --rm -T -e NODE_ENV=production --entrypoint node backend \
    src/infrastructure/scripts/migrate.js

  echo "[deploy upgrade-dist] Starting stack..."
  "$REPO_ROOT/scripts/deploy.sh" up -d --force-recreate
}

cmd_build_save() {
  DIST_DIR="${DIST_DIR:-$REPO_ROOT/dist}"
  TARGET_PLATFORM="${TARGET_PLATFORM:-linux/amd64}"
  [[ -f "$REPO_ROOT/.env" ]] || {
    echo "ERROR: .env not found at $REPO_ROOT/.env" >&2
    exit 1
  }
  [[ -f "$REPO_ROOT/docker-compose.yml" ]] || {
    echo "ERROR: docker-compose.yml not found" >&2
    exit 1
  }
  mkdir -p "$DIST_DIR"
  export DOCKER_DEFAULT_PLATFORM="$TARGET_PLATFORM"
  export DOCKER_BUILDKIT=1
  export COMPOSE_DOCKER_CLI_BUILD=1
  echo "Platform: $TARGET_PLATFORM"
  echo "[build-save] backend..."
  docker compose --file "$REPO_ROOT/docker-compose.yml" --env-file "$REPO_ROOT/.env" build \
    --build-arg BUILDKIT_INLINE_CACHE=1 backend
  echo "[build-save] frontend..."
  docker compose --file "$REPO_ROOT/docker-compose.yml" --env-file "$REPO_ROOT/.env" build \
    --build-arg BUILDKIT_INLINE_CACHE=1 frontend
  echo "[build-save] saving → $DIST_DIR ..."
  docker save abc-license-backend:latest  | gzip -1 >"$DIST_DIR/backend.tar.gz"
  docker save abc-license-frontend:latest | gzip -1 >"$DIST_DIR/frontend.tar.gz"
  ls -lh "$DIST_DIR"/*.tar.gz
  echo "Done."
}

cmd_push() {
  DIST_DIR="${DIST_DIR:-$REPO_ROOT/dist}"
  REMOTE_DIR="${REMOTE_DIR:-/root/abc-dashboard}"
  DO_BUILD=true
  DO_REMOTE=true
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --build-only) DO_REMOTE=false ;;
      --deploy-only) DO_BUILD=false ;;
      *)
        echo "Unknown option: $1" >&2
        echo "Usage: $0 push [--build-only | --deploy-only]" >&2
        exit 1
        ;;
    esac
    shift
  done

  log() { echo "[$(date '+%H:%M:%S')] $*"; }
  SERVER_HOST="${SERVER_HOST:-${ABC_SERVER:-}}"
  SERVER_USER="${SERVER_USER:-${ABC_SERVER_USER:-root}}"
  DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY:-}"

  if [[ "$DO_REMOTE" == true ]]; then
    [[ -n "$SERVER_HOST" ]] || {
      echo "ERROR: set SERVER_HOST or ABC_SERVER" >&2
      exit 1
    }
    [[ -n "$DEPLOY_SSH_KEY" && -f "$DEPLOY_SSH_KEY" ]] || {
      echo "ERROR: set DEPLOY_SSH_KEY to your SSH private key file" >&2
      exit 1
    }
  fi

  ssh_cmd() {
    ssh -i "$DEPLOY_SSH_KEY" -o StrictHostKeyChecking=no -o BatchMode=yes "${SERVER_USER}@${SERVER_HOST}" "$@"
  }
  scp_file() {
    scp -i "$DEPLOY_SSH_KEY" -o StrictHostKeyChecking=no "$1" "${SERVER_USER}@${SERVER_HOST}:$2"
  }

  if [[ "$DO_BUILD" == true ]]; then
    cmd_build_save
  elif [[ "$DO_REMOTE" == true ]]; then
    for f in backend frontend; do
      [[ -f "$DIST_DIR/$f.tar.gz" ]] || {
        echo "ERROR: missing $DIST_DIR/$f.tar.gz" >&2
        exit 1
      }
    done
  fi

  if [[ "$DO_REMOTE" != true ]]; then
    log "No SSH (build-only)."
    exit 0
  fi

  for f in backend frontend; do
    TAR="$DIST_DIR/$f.tar.gz"
    SIZE=$(du -sh "$TAR" | cut -f1)
    log "SCP $f ($SIZE) → ${SERVER_HOST}:${REMOTE_DIR}/dist/"
    ssh_cmd "mkdir -p ${REMOTE_DIR}/dist"
    scp_file "$TAR" "${REMOTE_DIR}/dist/$f.tar.gz"
  done
  log "Remote: deploy.sh upgrade-dist (load → migrate → up)"
  ssh_cmd "cd ${REMOTE_DIR} && ./scripts/deploy.sh upgrade-dist"
  log "Push finished."
}

usage() {
  cat <<EOF
Usage: ./scripts/deploy.sh <command> [args]

  ./scripts/deploy.sh up -d              # docker compose with enc: support
  ./scripts/deploy.sh down
  ./scripts/deploy.sh load [--no-start]
  ./scripts/deploy.sh upgrade-dist [--rm-dist]
  ./scripts/deploy.sh build-save
  ./scripts/deploy.sh push [--build-only|--deploy-only]

  upgrade-dist: load dist/*.tar.gz, migrate, then up -d --force-recreate (matches CI after SCP).
  push: SCP tarballs then runs upgrade-dist on the server (not plain load).

Env (push): SERVER_HOST or ABC_SERVER, DEPLOY_SSH_KEY, optional REMOTE_DIR, SERVER_USER
EOF
}

case "${1:-}" in
  ''|-h|--help|help)
    usage
    if [[ -z "${1:-}" ]]; then exit 1; fi
    exit 0
    ;;
  load)
    shift
    cmd_load "$@"
    ;;
  upgrade-dist)
    shift
    cmd_upgrade_from_dist "$@"
    ;;
  build-save)
    cmd_build_save
    ;;
  push)
    shift
    cmd_push "$@"
    ;;
  _print-pg-password)
    resolve_postgres_password_plain
    exit 0
    ;;
  *)
    export_postgres_plain
    exec docker compose "$@"
    ;;
esac

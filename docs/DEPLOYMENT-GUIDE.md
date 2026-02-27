# Deployment & Operations Guide

One guide for production deployment, Docker/local operations, and troubleshooting.

---

## Table of contents

1. [Deployment](#1-deployment) – Prerequisites, GitHub Secrets, deploy flow, verify, manual fallback, rotate secrets, security
2. [Troubleshooting & runbook](#2-troubleshooting--runbook) – Docker/DB, frontend build, backend, CI/CD, quick reference

---

# 1. Deployment

## Prerequisites

1. SSH access to production server
2. GitHub repository access
3. GitHub CLI installed: `brew install gh` (macOS)

---

## One-Time Setup

### SSH Key for CI/CD

```bash
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy_key
ssh-copy-id -i ~/.ssh/github_deploy_key.pub root@<SERVER_IP>
ssh -i ~/.ssh/github_deploy_key root@<SERVER_IP> 'echo "Connection successful"'
```

### GitHub Secrets (18 required)

Authenticate with GitHub:

```bash
cd /path/to/abc-dashboard
gh auth login
```

Set secrets using secure values:

```bash
# Server (3)
gh secret set SERVER_HOST -b "<your_server_ip>"
gh secret set SERVER_USER -b "root"
gh secret set SERVER_SSH_KEY < ~/.ssh/github_deploy_key

# Database (3)
gh secret set POSTGRES_DB -b "<database_name>"
gh secret set POSTGRES_USER -b "<database_user>"
gh secret set POSTGRES_PASSWORD -b "<strong_password>"

# Auth & security (2) – generate: openssl rand -base64 48 / openssl rand -hex 64
gh secret set JWT_SECRET -b "<random_48_char_string>"
gh secret set ENCRYPTION_KEY -b "<random_128_char_hex>"

# External License API (2)
gh secret set EXTERNAL_LICENSE_API_URL -b "<api_url>"
gh secret set EXTERNAL_LICENSE_API_KEY -b "<api_key>"

# Email – Mailjet (6)
gh secret set EMAIL_SERVICE -b "mailjet"
gh secret set EMAIL_HOST -b "in-v3.mailjet.com"
gh secret set EMAIL_PORT -b "587"
gh secret set EMAIL_FROM -b "<your_email@domain.com>"
gh secret set EMAIL_FROM_NAME -b "<Your App Name>"
gh secret set EMAIL_USER -b "<mailjet_api_key>"
gh secret set EMAIL_PASS -b "<mailjet_secret_key>"

# App (2) – generate: openssl rand -base64 48
gh secret set CLIENT_URL -b "<frontend_url>"
gh secret set NEXT_SERVER_ACTIONS_ENCRYPTION_KEY -b "<random_48_char_string>"

gh secret list   # Should show 18 secrets
```

### Generate secure values

```bash
openssl rand -base64 48   # JWT_SECRET, NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
openssl rand -hex 64      # ENCRYPTION_KEY
```

---

## Deploy

Only **`main`** triggers production deploy. Push and monitor:

```bash
git push origin main
gh run watch
```

**Automatic steps:** Build images → save to .tar.gz → transfer to server → load & `docker compose up -d` → health checks.

---

## Verify deployment

```bash
ssh root@<SERVER_IP> 'cd /root/abc-dashboard && docker compose ps'
curl https://your-domain.com/api/v1/health
ssh root@<SERVER_IP> 'cd /root/abc-dashboard && docker compose logs -f --tail=100'
```

---

## Manual deployment (fallback)

If CI/CD fails:

```bash
./scripts/build-and-save.sh
scp dist/*.tar.gz root@<SERVER_IP>:/root/abc-dashboard/dist/
ssh root@<SERVER_IP> 'cd /root/abc-dashboard && ./scripts/load-and-run.sh'
```

---

## Rotate secrets

If secrets are compromised:

```bash
NEW_JWT=$(openssl rand -base64 48)
NEW_ENC=$(openssl rand -hex 64)
NEW_NEXT=$(openssl rand -base64 48)
gh secret set JWT_SECRET -b "$NEW_JWT"
gh secret set ENCRYPTION_KEY -b "$NEW_ENC"
gh secret set NEXT_SERVER_ACTIONS_ENCRYPTION_KEY -b "$NEW_NEXT"
git commit --allow-empty -m "chore: trigger redeploy after secret rotation"
git push origin main
```

**Note:** Rotating JWT_SECRET logs out all users.

---

## Deployment troubleshooting

- **Build fails:** `gh run view --log`; test locally with `docker compose build`.
- **Deploy fails:** Check server disk (`df -h`), `docker compose logs`, restart with `docker compose restart`.
- **API not working:** `docker compose logs backend --tail=100`; check proxy (e.g. OpenLiteSpeed) if used.

---

## Security practices

1. Never commit secrets to git.
2. Use GitHub Secrets for all sensitive values.
3. Rotate secrets if exposed; use strong passwords (20+ chars).
4. Enable 2FA on GitHub and server; review access logs and keep dependencies updated.

---

# 2. Troubleshooting & runbook

Quick reference for common build and runtime issues.

---

## 2.1 Docker / database

### "password authentication failed for user \"abc_user\"" {#docker-db-password-auth}

**Where:** Backend container (e.g. `./scripts/docker-db-reset-sync.sh` or `docker compose exec backend npm run migrate`).

**Cause:** Postgres and backend use different passwords. Common when `.env` has `POSTGRES_PASSWORD=enc:...` but the stack was started with `docker compose up -d` (so Postgres got the literal `enc:...` while the backend decrypts and uses the real password).

**Fix A – Plain password (simplest for local/Docker)**

In **repo root** `.env`:

```env
POSTGRES_USER=abc_user
POSTGRES_DB=abc_dashboard
POSTGRES_PASSWORD=abc_password
```

Then:

```bash
docker compose down -v
docker compose up -d
./scripts/docker-db-reset-sync.sh --drop   # if needed
```

**Fix B – Keep encrypted password**

Always start the stack so Postgres receives the **decrypted** password:

```bash
./scripts/load-and-run.sh --start-only up -d
```

If the DB user was already created with the wrong password:

```bash
docker compose down -v
./scripts/load-and-run.sh --start-only up -d
./scripts/docker-db-reset-sync.sh --drop   # if needed
```

**Summary**

| .env value | How to start | Postgres gets | Backend uses |
|------------|--------------|---------------|--------------|
| `POSTGRES_PASSWORD=abc_password` | `docker compose up -d` | abc_password | abc_password ✓ |
| `POSTGRES_PASSWORD=enc:...` | `./scripts/load-and-run.sh --start-only up -d` | decrypted | decrypted ✓ |
| `POSTGRES_PASSWORD=enc:...` | `docker compose up -d` | literal enc:... | decrypted ✗ (mismatch) |

See also [scripts/README.md](../scripts/README.md) for encrypted DB password and script usage.

---

### Server: Full DB reset (drop, migrate, seed, sync) {#server-db-reset}

Use this when you want to **drop the database, run migrations, seed data, and run the external license sync** on the server. The server has the app directory (e.g. `/root/abc-dashboard`) with `docker-compose.yml`, `.env`, and the **scripts** from the repo (`scripts/load-and-run.sh`, `scripts/docker-db-reset-sync.sh`). Images are already loaded (from CI/CD or manual transfer).

**Prerequisites on server**

- App directory: `docker-compose.yml`, `.env`, `scripts/load-and-run.sh`, `scripts/docker-db-reset-sync.sh`
- Backend image must include `backend/scripts/resolve-db-password-for-docker.js` if you use encrypted DB password (so `load-and-run.sh --start-only` can set `POSTGRES_PASSWORD_PLAIN`)

**Plan (encrypted DB password: `POSTGRES_PASSWORD=enc:...`)**

1. SSH to the server and go to the app directory:
   ```bash
   ssh root@<SERVER_IP>
   cd /root/abc-dashboard
   ```
2. Stop the stack and remove the Postgres volume (so the DB is recreated with the correct password):
   ```bash
   docker compose down -v
   ```
3. Start the stack so Postgres gets the **decrypted** password (required when using `enc:`):
   ```bash
   ./scripts/load-and-run.sh --start-only up -d
   ```
4. Wait for the backend to be healthy (e.g. 15–30 seconds), then run drop + migrate + seed + sync:
   ```bash
   sleep 15
   ./scripts/docker-db-reset-sync.sh --drop --sync
   ```
5. Sync can take several minutes (many pages). When it finishes, the DB has fresh schema, seed users, and licenses from the external API.

**Plan (plain DB password)**

If `.env` has a plain `POSTGRES_PASSWORD=...` (no `enc:`):

1. SSH and `cd /root/abc-dashboard`.
2. Optional full reset of data: `docker compose down -v` then `docker compose up -d`. Otherwise leave the stack up.
3. Wait for backend: `sleep 15`.
4. Run: `./scripts/docker-db-reset-sync.sh --drop --sync`.

**If you don’t have the scripts on the server**

You can run the same steps manually (from the app directory where `docker-compose.yml` and `.env` exist):

```bash
# 1. Terminate connections and drop/recreate DB
docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '\''"$POSTGRES_DB"'\'' AND pid <> pg_backend_pid();"'
docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\";" -c "CREATE DATABASE \"$POSTGRES_DB\";"'

# 2. Migrate
docker compose exec backend npm run migrate

# 3. Seed
docker compose exec backend npm run seed

# 4. Sync (optional; can take several minutes)
docker compose exec backend npm run sync:start
```

When using an encrypted password, start the stack with `./scripts/load-and-run.sh --start-only up -d` (or ensure Postgres was given the decrypted password) before running these commands; otherwise migrations will fail with password authentication errors.

---

### Backend unhealthy / ECONNREFUSED to Postgres

**Cause:** Backend can’t reach Postgres (wrong host/port or DB not ready).

**Check:** `.env` at repo root: `POSTGRES_HOST=postgres`, `POSTGRES_PORT=5432` for Docker; `docker compose ps` (postgres healthy).

**Fix:** Correct `.env`, then `docker compose up -d` or `./scripts/load-and-run.sh --start-only up -d` when using encrypted password.

---

### Migrations fail: "relation does not exist" or schema errors

**Cause:** DB not migrated or out of date.

**Fix:** Run migrations (and optionally drop + seed): `./scripts/docker-db-reset-sync.sh --drop`. If you see password auth errors, use [Fix A or B](#password-authentication-failed-for-user-abc_user) above.

---

## 2.2 Frontend build

### TypeScript / "Cannot find name" during `npm run build`

**Where:** Frontend (Next.js build in repo or Docker).

**Cause:** Typo, renamed variable, or wrong type.

**Fix:** Fix the reported file and line; re-run `npm run build` or frontend Docker build.

---

### Node warning: `--localstorage-file was provided without a valid path`

**Cause:** Node 25+ experimental webstorage; Next.js dev server and build can trigger this when the runtime touches globals.

**Fix:** Frontend `package.json` sets `--no-experimental-webstorage` for both `dev` and `build`. The Dockerfile build step includes the same flag. If the warning still appears, ensure you're not overriding `NODE_OPTIONS` without this flag (e.g. in `.env` or your shell).

---

### Frontend Docker build: out of memory / timeout

**Fix:** In the frontend Dockerfile, increase Node memory for the build step, e.g. `NODE_OPTIONS="--max-old-space-size=2048"`.

---

## 2.3 Backend

### Seed or insert: "invalid input syntax for type json" (agents_name)

**Cause:** `licenses.agents_name` is JSONB; invalid JSON was written.

**Fix:** Application layer uses `agentsName` as a string. Ensure all writers send a valid string. See [backend/docs/guides/agents-name-field.md](../backend/docs/guides/agents-name-field.md).

---

### Backend health check fails after start

**Cause:** App not listening yet or DB/Redis connection failing.

**Check:** `docker compose logs backend`; DB auth (see [password auth](#password-authentication-failed-for-user-abc_user)).

**Fix:** Fix DB/Redis config; optionally increase `start_period` in `docker-compose.yml` healthcheck.

---

## 2.4 CI/CD

### Deploy workflow fails: build, transfer, or health check

**Check:** GitHub Actions logs; server connectivity and secrets (`SERVER_SSH_KEY`, `POSTGRES_PASSWORD`, etc.).

**Fix:** Ensure all required secrets are set (see [GitHub Secrets](#github-secrets-18-required)) and the server can run `docker compose` and health checks. See [.github/workflows/deploy.yml](../.github/workflows/deploy.yml).

---

## 2.5 Quick reference

| Symptom | Section / action |
|--------|-------------------|
| DB password auth in Docker | [2.1 Password auth](#password-authentication-failed-for-user-abc_user) |
| Encrypted DB password, start command | [scripts/README.md](../scripts/README.md) |
| Deploy and secrets | [1. Deployment](#1-deployment) |
| agentsName / agents_name | [backend/docs/guides/agents-name-field.md](../backend/docs/guides/agents-name-field.md) |
| License Management: default date range, view prior years | [License Management – Default Date Range](#license-management--default-date-range) |
| Server: drop DB, migrate, seed, sync | [Server: Full DB reset](#server-db-reset) |

---

## License Sync (Automatic vs Manual)

**Default:** Automatic sync is **disabled** in production. Sync runs only when the user clicks the **Sync** button in License Management.

- **`LICENSE_SYNC_ENABLED=false`** – Sync only via Sync button (no overlay "jumping" while viewing)
- **`LICENSE_SYNC_ENABLED=true`** – Scheduled sync runs (e.g. 2am, 3am Chicago); overlay appears when sync runs

To re-enable automatic sync, add `LICENSE_SYNC_ENABLED=true` to the server `.env` and restart: `docker compose up -d`.

---

## License Management – Default Date Range

**Default:** The License Management table shows licenses from the **last 12 months** (from today going back 12 months).

- To view licenses from prior years (e.g. 2025 or earlier): use the **Date Range** filter in the toolbar to select a wider range, or clear the date filter to load all licenses (no date restriction).
- When searching (DBA, Agents, Zipcode), the date filter is not applied – search returns all matching licenses regardless of date.

---

## WebSocket (Real-time Sync)

When using OpenLiteSpeed as a reverse proxy, configure a WebSocket proxy for real-time license sync:

1. WebAdmin Console → **Virtual Hosts → Your Virtual Host → WebSocket Proxy → Add**
2. **URI:** `/socket.io`
3. **Address:** `127.0.0.1:5000` (or the host:port where the backend container listens)
4. Save and graceful restart

**If WebSocket proxy cannot be configured:** Set `WEBSOCKET_ENABLED=false` in `.env` (single source for both backend and frontend). Rebuild the frontend image. The app will fall back to polling (LicenseSyncButton) and sync will still work.

See [docs/WEBSOCKET-CONNECTION-FIX-PLAN.md](WEBSOCKET-CONNECTION-FIX-PLAN.md) for troubleshooting.

---

## Additional resources

- GitHub Actions: https://docs.github.com/en/actions
- Docker Compose: https://docs.docker.com/compose/
- OpenLiteSpeed: https://openlitespeed.org/kb/
- Next.js Deployment: https://nextjs.org/docs/deployment

Never share or commit production secrets.

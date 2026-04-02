# Scripts (repo root)

| Script | Purpose |
|--------|---------|
| **`deploy.sh`** | Compose + images + remote push: **`up -d`**, **`down`**, any `docker compose` args (handles `enc:`). Subcommands **`build-save`**, **`load`** (optional **`--no-start`**), **`upgrade-dist`** (optional **`--rm-dist`**: load `dist/*.tar.gz` → migrate → **`up -d --force-recreate`**), **`push`** (SCP then remote **`upgrade-dist`**). Password decrypt is **embedded Node**. |
| **`db-reset.sh`** | Local: migrate, seed, external license sync; optional **`--drop`**. **`remote`**: SSH to server and run the same (optional **`--copy-script`**). |
| **`db-backup.sh`** | Postgres `pg_dump`; see [docs/DEPLOYMENT-GUIDE.md](../docs/DEPLOYMENT-GUIDE.md#postgresql-backups). |

**Makefile:** `make up` → `deploy.sh up -d`; `make db-reset` → `db-reset.sh --drop`.

**Backend:** `backend/scripts/resolve-db-password-for-docker.js` calls `scripts/deploy.sh _print-pg-password` (for any tool that still invokes the backend path).

## Encrypted DB password

With **`POSTGRES_PASSWORD=enc:`**, use **`./scripts/deploy.sh`** instead of plain **`docker compose up`**.

## Examples

```bash
./scripts/deploy.sh build-save
./scripts/deploy.sh up -d --force-recreate

./scripts/deploy.sh push
SERVER_HOST=x DEPLOY_SSH_KEY=~/.ssh/id_ed25519 ./scripts/deploy.sh push --deploy-only

./scripts/deploy.sh upgrade-dist --rm-dist   # on server after SCP (same as CI)
./scripts/deploy.sh load                     # load + up only (no migrate)
```

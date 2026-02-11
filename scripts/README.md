# Scripts

Three scripts cover deploy and DB operations:

- **`build-and-save.sh`** – Build images, save to `dist/*.tar.gz` (manual deploy from dev machine).
- **`docker-compose-up.sh`** – Start/stop the stack (uses current images). Handles `POSTGRES_PASSWORD=enc:...`. Example: `./scripts/docker-compose-up.sh up -d --force-recreate`.
- **`load-and-run.sh`** – On server: load images and start stack. With `--start-only`: only start/stop the stack (use when `.env` has `POSTGRES_PASSWORD=enc:...`).
- **`docker-db-reset-sync.sh`** – Reset DB (migrate:fresh or drop), seed, optional license sync.
- **`server-db-reset-sync.sh`** – From dev machine: SSH to server and run full DB reset + sync (drop, migrate, seed, sync). Requires `SERVER_HOST=my.server.com`.

## Password authentication failed (Docker)

If you see **`password authentication failed for user "abc_user"`** when running `./scripts/docker-db-reset-sync.sh` or migrations in the backend container, the postgres and backend containers are using different passwords. See **[docs/DEPLOYMENT-GUIDE.md](../docs/DEPLOYMENT-GUIDE.md#21-docker--database)** (Troubleshooting → Docker / database) for causes and fixes (plain vs encrypted `POSTGRES_PASSWORD`, and how to start the stack with `./scripts/load-and-run.sh --start-only` when using `enc:`).

## Encrypted DB password (`POSTGRES_PASSWORD=enc:...`)

Start the stack with **`./scripts/load-and-run.sh --start-only up -d`** so the Postgres container gets the decrypted password. Running `docker compose up -d` directly will give Postgres the literal `enc:...` and the backend will decrypt a different value → connection fails.

## Usage

**Local Docker: start stack and reset DB**
```bash
# From repo root. After building images:
./scripts/build-and-save.sh
./scripts/docker-compose-up.sh up -d --force-recreate
# Or use load-and-run.sh --start-only when POSTGRES_PASSWORD=enc:...
./scripts/docker-db-reset-sync.sh              # migrate:fresh + seed
# Optional: ./scripts/docker-db-reset-sync.sh --drop        # drop DB + migrate + seed
# Optional: ./scripts/docker-db-reset-sync.sh --drop --sync # same + license sync
```

**Deploy (manual):**
```bash
./scripts/build-and-save.sh
scp dist/*.tar.gz root@YOUR_SERVER:/root/abc-dashboard/dist/
ssh root@YOUR_SERVER 'cd /root/abc-dashboard && ./scripts/load-and-run.sh'
```

**Server: drop DB, migrate, seed, sync (full reset)**  
See **`docs/DEPLOYMENT-GUIDE.md`** (section “Server: Full DB reset”). Short version:
```bash
cd /root/abc-dashboard
docker compose down -v
./scripts/load-and-run.sh --start-only up -d    # required when POSTGRES_PASSWORD=enc:...
sleep 15
./scripts/docker-db-reset-sync.sh --drop --sync
```

**DB only (on server or local with Docker):**
```bash
cd /path/to/abc-dashboard
./scripts/docker-db-reset-sync.sh              # migrate:fresh + seed
./scripts/docker-db-reset-sync.sh --drop       # drop DB + migrate + seed
./scripts/docker-db-reset-sync.sh --drop --sync # same + license sync
```

**Backend only (local, no Docker):** Use Docker-based reset above, or from `backend/` run `npm run migrate:fresh` and `npm run seed` after dropping/recreating the DB yourself (e.g. `dropdb`/`createdb` with `POSTGRES_DB`/`POSTGRES_USER` from `.env`).

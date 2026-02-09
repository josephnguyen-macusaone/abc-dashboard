# Scripts

Three scripts cover deploy and DB operations:

- **`build-and-save.sh`** – Build images, save to `dist/*.tar.gz` (manual deploy from dev machine).
- **`load-and-run.sh`** – On server: load images and start stack. With `--start-only`: only start/stop the stack (use when `.env` has `POSTGRES_PASSWORD=enc:...`).
- **`docker-db-reset-sync.sh`** – Reset DB (migrate:fresh or drop), seed, optional license sync.

## Encrypted DB password (`POSTGRES_PASSWORD=enc:...`)

Start the stack with **`./scripts/load-and-run.sh --start-only up -d`** so the Postgres container gets the decrypted password. Running `docker compose up -d` directly will give Postgres the literal `enc:...` and the backend will decrypt a different value → connection fails.

## Usage

**Local Docker: start stack and reset DB**
```bash
# From repo root. When POSTGRES_PASSWORD is enc:..., use --start-only so postgres gets plain password.
./scripts/load-and-run.sh --start-only up -d --build
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
See **`docs/SERVER-DROP-REDEPLOY-RUNBOOK.md`**. Short version:
```bash
cd /root/abc-dashboard
docker compose down
./scripts/load-and-run.sh --start-only up -d    # or ./scripts/load-and-run.sh if loading new images
sleep 10
./scripts/docker-db-reset-sync.sh --drop --sync
```

**DB only (on server or local):**
```bash
cd /path/to/abc-dashboard
./scripts/docker-db-reset-sync.sh              # migrate:fresh + seed
./scripts/docker-db-reset-sync.sh --drop       # drop DB + migrate + seed
./scripts/docker-db-reset-sync.sh --drop --sync # same + license sync
```

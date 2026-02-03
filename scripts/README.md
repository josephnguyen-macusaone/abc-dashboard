# Scripts

- **`build-and-save.sh`** – Build images, save to `dist/*.tar.gz` (manual deploy)
- **`load-and-run.sh`** – On server: load images, `docker compose up -d`
- **`docker-db-reset-sync.sh`** – Reset DB, migrate, seed, sync licenses

## Usage

**Deploy (manual):**
```bash
./scripts/build-and-save.sh
scp dist/*.tar.gz root@155.138.245.11:/root/abc-dashboard/dist/
ssh root@155.138.245.11 'cd /root/abc-dashboard && ./scripts/load-and-run.sh'
```

**Deploy (auto):** Push to `develop`/`main` (CI/CD handles everything)

**DB operations:**
```bash
ssh root@155.138.245.11
cd /root/abc-dashboard
./scripts/docker-db-reset-sync.sh        # Reset + sync
./scripts/docker-db-reset-sync.sh --drop # Drop DB + reset + sync
```

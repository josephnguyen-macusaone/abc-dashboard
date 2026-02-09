# Server runbook: Drop DB, redeploy, migrate, seed, sync licenses

Use this on the **server** after you have transferred new images (or to do a full DB reset and re-sync with existing images).

**Assumptions:** Repo on server at `/root/abc-dashboard`, `.env` present with `POSTGRES_PASSWORD` (plain or `enc:...`) and `ENCRYPTION_KEY` if using `enc:`.

---

## Option A: One-time paste (run each block on the server)

### 1. (Optional) Transfer new images from dev machine

On your **dev machine**:

```bash
cd /path/to/abc-dashboard
./scripts/build-and-save.sh
scp dist/backend.tar.gz dist/frontend.tar.gz root@YOUR_SERVER_IP:/root/abc-dashboard/dist/
```

Skip this if you are only resetting the DB and not deploying new images.

---

### 2. SSH into the server

```bash
ssh root@YOUR_SERVER_IP
```

---

### 3. Go to repo and stop the stack

```bash
cd /root/abc-dashboard
docker compose down
```

---

### 4. Load images (if new) and start the stack

If you transferred new images in step 1:

```bash
./scripts/load-and-run.sh
```

If you did **not** transfer new images, only start the stack (required when `.env` has `enc:` password):

```bash
./scripts/load-and-run.sh --start-only up -d
```

---

### 5. Wait for Postgres to be ready (optional)

```bash
sleep 10
docker compose ps
```

---

### 6. Drop database, migrate, seed, and sync licenses

```bash
cd /root/abc-dashboard
./scripts/docker-db-reset-sync.sh --drop --sync
```

This will:

- Terminate connections to the DB, drop and recreate the database
- Run migrations
- Run seeds
- Run license sync (may take several minutes)

---

### 7. Verify

```bash
docker compose ps
# Optional: hit your app URL and check licenses
```

---

## Quick reference (no new images)

If images are already on the server and you only want to drop DB + migrate + seed + sync:

```bash
cd /root/abc-dashboard
docker compose down
./scripts/load-and-run.sh --start-only up -d
sleep 10
./scripts/docker-db-reset-sync.sh --drop --sync
```

## Quick reference (with new images)

```bash
cd /root/abc-dashboard
docker compose down
./scripts/load-and-run.sh
sleep 10
./scripts/docker-db-reset-sync.sh --drop --sync
```

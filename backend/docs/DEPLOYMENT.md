# Backend Deployment

For **full stack deployment** (CI/CD, GitHub secrets, server): see repo root [docs/DEPLOYMENT-GUIDE.md](../../docs/DEPLOYMENT-GUIDE.md). This doc covers backend-specific deployment: env, Docker, PM2, DB, troubleshooting.

## Environment variables

Key variables for production:

```bash
NODE_ENV=production
PORT=5000
CLIENT_URL=https://yourdomain.com

POSTGRES_HOST=...
POSTGRES_PORT=5432
POSTGRES_DB=abc_dashboard
POSTGRES_USER=...
POSTGRES_PASSWORD=...   # or enc:... with ENCRYPTION_KEY (see root DEPLOYMENT-GUIDE)
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}

JWT_SECRET=...          # Strong 32+ chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

EMAIL_SERVICE=google-workspace|mailjet
EMAIL_HOST=...
EMAIL_PORT=587
EMAIL_USER=...
EMAIL_PASS=...
EMAIL_FROM=...

REDIS_URL=redis://...   # optional
```

For encrypted DB password (`POSTGRES_PASSWORD=enc:...`), start the stack with `./scripts/docker-compose-up.sh` or `./scripts/load-and-run.sh --start-only` so Postgres gets the decrypted value. See [../../scripts/README.md](../../scripts/README.md) and root DEPLOYMENT-GUIDE.

## Docker

From repo root:

```bash
docker compose up -d
# Or: make up  (uses scripts/docker-compose-up.sh for enc: password)
```

Backend runs in `backend` container; DB in `postgres`. Migrate and seed:

```bash
docker compose exec backend npm run migrate
docker compose exec backend npm run seed
# Or: make db-reset  (drop + migrate + seed)
```

Build images: `docker compose build backend` or `make build`.

## PM2 (production, no Docker)

```bash
npm install -g pm2
pm2 start server.js --name abc-dashboard-backend -i max
pm2 save
pm2 startup
```

Or use `ecosystem.config.js`:

```bash
pm2 start ecosystem.config.js --env production
```

Logs: `pm2 logs abc-dashboard-backend`. Restart: `pm2 restart abc-dashboard-backend`.

## Nginx reverse proxy

Example location for API:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Use HTTPS and set `CLIENT_URL` to the frontend origin. See root DEPLOYMENT-GUIDE for SSL and security.

## Database

- **Migrations:** `npm run migrate` (or inside container: `docker compose exec backend npm run migrate`). Staging/prod: `NODE_ENV=staging npm run migrate` etc.
- **Backup:** `pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d).sql`
- **Restore:** `psql "$DATABASE_URL" < backup_YYYYMMDD.sql`

## Health and monitoring

- Health: `GET /api/v1/health`
- Swagger: `/api-docs`
- License sync status: `npm run sync:status` (or see `/api/v1/license-sync/*` if exposed)

## Troubleshooting

**Database connection failed**

- Check `POSTGRES_*` / `DATABASE_URL`. If using Docker, ensure Postgres and backend use the same password (plain or decrypted from `enc:`). Start stack with `./scripts/docker-compose-up.sh` when using encrypted password.
- See root [DEPLOYMENT-GUIDE.md](../../docs/DEPLOYMENT-GUIDE.md) (Troubleshooting → Docker / database).

**App won’t start**

- Check env: `printenv | grep -E "NODE_ENV|PORT|POSTGRES|JWT"`
- Logs: `pm2 logs` or `docker compose logs backend`

**High memory**

- `pm2 monit`; restart with higher limit: `pm2 restart abc-dashboard-backend --max-memory-restart 2G`

**Email not sending**

- Validate config: `npm run test:email:config`. See [guides/email-setup.md](./guides/email-setup.md).

## Security checklist

- [ ] Strong JWT_SECRET (32+ chars)
- [ ] HTTPS and correct CLIENT_URL
- [ ] Secrets in env (no commit)
- [ ] Rate limiting and Helmet enabled (default in app)
- [ ] DB user least-privilege; regular backups

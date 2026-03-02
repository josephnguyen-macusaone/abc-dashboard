# Backend Setup

Quick start for local development (Node + PostgreSQL). For Docker and production, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm 10+

## Basic setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your values (see below)
npm run migrate
npm run seed    # optional test data
npm run dev
```

Server: `http://localhost:5000` (or `PORT` from `.env`). API base: `http://localhost:5000/api/v1`. Swagger UI: `http://localhost:5000/api-docs`.

## Environment variables

Minimum for local dev:

```bash
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=abc_dashboard
POSTGRES_USER=abc_user
POSTGRES_PASSWORD=abc_password

JWT_SECRET=your-dev-secret-at-least-32-chars
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
```

For **email (dev):** use MailHog so no real mail is sent. In `.env`:

```bash
EMAIL_SERVICE=mailhog
EMAIL_HOST=localhost
EMAIL_PORT=1025
EMAIL_FROM=noreply@localhost
```

Run MailHog locally (e.g. `mailhog`); SMTP on 1025, web UI on 8025. For production email (Google Workspace, Mailjet), see [guides/email-setup.md](./guides/email-setup.md).

## Database (local, no Docker)

If you need to recreate the DB, use the same name as `POSTGRES_DB` in `.env`:

```bash
dropdb "${POSTGRES_DB:-abc_dashboard}"
createdb "${POSTGRES_DB:-abc_dashboard}"
```

Then from `backend/`: `npm run migrate` and `npm run seed`. See also [../../scripts/README.md](../../scripts/README.md) for Docker-based DB reset.

## Commands

| Command | Purpose |
|--------|---------|
| `npm run dev` | Start dev server (nodemon) |
| `npm run migrate` | Run migrations |
| `npm run migrate:fresh` | Rollback all, run migrations again |
| `npm run seed` | Seed data |
| `npm run test` | Run tests |
| `npm run test:unit` | Unit tests only |
| `npm run test:integration` | Integration tests (needs test DB) |
| `npm run test:email:config` | Validate email config |
| `npm run db:status` | Migration status |
| `npm run sync:start` | Run license sync once |
| `npm run sync:status` | Sync and health status |

## Integration tests

Create a test DB and run migrations for test env:

```bash
createdb abc_dashboard_test
NODE_ENV=test npm run migrate
npm run test:integration
```

## Next steps

- [ARCHITECTURE.md](./ARCHITECTURE.md) – Layers and design
- [DEPLOYMENT.md](./DEPLOYMENT.md) – Docker, production, troubleshooting
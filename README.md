# ABC Dashboard

Next.js + Node/Express license management platform.

## Quick Start

**Local development:**
```bash
export DOCKER_BUILDKIT=1
docker compose up -d

# Access
# Frontend: http://localhost:3000
# Backend:  http://localhost:5000/api/v1
# Database: localhost:5433
```

**Production deploy:** [QUICK-START.md](./QUICK-START.md) (CI/CD via GitHub Actions)

---

## Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind 4, Radix UI
- **Backend:** Node.js ESM, Express 5, PostgreSQL (Knex), JWT auth, Swagger
- **Infrastructure:** Docker Compose, Redis, CI/CD (GitHub Actions)

---

## Commands

### Development

```bash
# Start services
docker compose up -d

# Rebuild after changes
docker compose build frontend
docker compose up -d

# View logs
docker compose logs -f

# Database operations
docker compose exec backend npm run db:status
docker compose exec backend npm run seed:fresh
docker compose exec postgres psql -U abc_user -d abc_dashboard

# Reset DB + seed (+ optional license sync) – from repo root
./scripts/docker-db-reset-sync.sh              # migrate:fresh + seed
./scripts/docker-db-reset-sync.sh --drop --sync   # drop DB, migrate, seed, then sync licenses
```

### Building

```bash
export DOCKER_BUILDKIT=1
docker compose build                # All services
docker compose build --no-cache     # Clean build
```

### Deployment

- **Auto:** Push to `main` or `develop` (triggers CI/CD)
- **Manual:** `./scripts/build-and-save.sh` → transfer → `./scripts/load-and-run.sh` (see [QUICK-START.md](./QUICK-START.md))

---

## Database

**Migrations:** 6 complete (users, profiles, licenses, assignments, audit)
**Indexes:** 42 performance indexes
**Seed data:** 117 users, 50 licenses, 10 assignments

### Test Credentials

- **Admin:** admin@example.com / Admin123!
- **Manager:** hr.manager@example.com / Manager123!
- **Staff:** hr.staff1@example.com / Staff123!

---

## Project Structure

```
abc-dashboard/
├── backend/           # Node.js API (Express, PostgreSQL)
├── frontend/          # Next.js app (React, TypeScript)
├── scripts/           # Deploy scripts (build-and-save, load-and-run)
├── .github/workflows/ # CI/CD (deploy.yml)
└── docker-compose.yml # Services (postgres, backend, frontend)
```

**Path aliases (frontend):** `@/*`, `@/components/*`, `@/hooks/*`, `@/domain/*`, `@/infrastructure/*`, `@/application/*`

---

## Architecture

### Backend (`backend/src`)
- **domain/** – Entities, repository interfaces
- **application/** – DTOs, use-cases, validators
- **infrastructure/** – Config, routes, controllers, repositories, migrations
- **shared/** – DI container (Awilix), services, utils

### Frontend (`frontend/src`)
- **app/** – Next.js App Router
- **domain/** – Entities, repository interfaces
- **application/** – DTOs, use-cases, services
- **infrastructure/** – API client, repositories, stores (Zustand)
- **presentation/** – Components (atoms, molecules, organisms), hooks

---

## Performance

| Metric | Improvement |
|--------|-------------|
| Image Size | 87.7% smaller (305MB vs 2.48GB) |
| Clean Build | 88% faster (~7min vs ~60min) |
| Cached Build | 99% faster (~30sec vs ~60min) |

**Optimizations:** Multi-stage builds, BuildKit cache, standalone output, layer optimization.

---

## Key Features

- ✅ License management system
- ✅ User management (Admin, Manager, Staff roles)
- ✅ External license API sync (every 10 min)
- ✅ Email notifications (Mailjet)
- ✅ JWT authentication + refresh tokens
- ✅ Audit logging
- ✅ Swagger API docs
- ✅ Redis caching
- ✅ CI/CD pipeline

---

## Documentation

- **Deploy:** [QUICK-START.md](./QUICK-START.md) – Production deployment
- **CI/CD:** [.github/workflows/README.md](.github/workflows/README.md) – GitHub secrets
- **Scripts:** [scripts/README.md](./scripts/README.md) – Utility scripts
- **Architecture:** `backend/docs/`, `frontend/docs/` – Backend/frontend detailed docs

---

## Environment

**.env** (root, backend, frontend) – See `.env.example` files
- Local: `NEXT_PUBLIC_USE_RELATIVE_API=false` (use localhost:5000)
- Production: `NEXT_PUBLIC_USE_RELATIVE_API=true` (use /api/v1)

---

## Monitoring

```bash
docker compose ps              # Service status
docker compose logs -f         # All logs
docker stats                   # Resource usage
curl http://localhost:5000/api/v1/health  # Health check
```

---

## Troubleshooting

**Services not starting:**
```bash
docker compose down
docker compose up -d
docker compose logs backend frontend
```

**Database issues:**
```bash
docker compose exec backend npm run db:status
docker compose exec backend npm run migrate:fresh
docker compose exec backend npm run seed
```

**Port conflicts:**
- Edit `docker-compose.yml` to change ports (default: 3000, 5000, 5433, 6379)

---

## License

Private

## Support

Issues/questions: Create GitHub issue or contact team.

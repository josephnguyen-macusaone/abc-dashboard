# ABC Dashboard Backend

**Node.js/Express API** with JWT authentication, Clean Architecture, and comprehensive testing.

## Architecture

Built with **Clean Architecture** for maintainability and testability.

```txt
src/
├── domain/              # Business Logic Layer
│   ├── entities/        # Domain entities (User, UserProfile)
│   ├── exceptions/      # Domain-specific exceptions
│   └── repositories/    # Repository interfaces/contracts
├── application/         # Application Layer
│   ├── dto/             # Data Transfer Objects
│   ├── interfaces/      # Service interfaces
│   ├── services/        # Application services
│   ├── use-cases/       # Business use cases
│   └── validators/      # Input validation
├── infrastructure/      # Infrastructure Layer
│   ├── controllers/     # HTTP request handlers
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── config/           # Configuration
│   ├── middleware/      # HTTP middleware
│   └── repositories/    # Repository implementations
└── shared/              # Shared Kernel
    ├── kernel/          # Dependency injection container
    ├── services/        # Core services (Auth, Token, Email)
    ├── http/            # HTTP utilities
    └── utils/           # Utility functions
```

**Key Benefits**: Framework-independent business logic, dependency inversion, independent testing, scalable architecture, clear separation of concerns.

## Features

- ✅ **JWT Authentication** with role-based access
- ✅ **Email verification** and password reset
- ✅ **RESTful API** with OpenAPI documentation
- ✅ **Database migrations** and seeding
- ✅ **Input validation** and security middleware
- ✅ **In-memory caching** and API monitoring
- ✅ **Comprehensive test suite** with Jest (unit + integration + email testing)
- ✅ **0 security vulnerabilities**

## Quick Start

**Prerequisites**: Node.js 20+, PostgreSQL 14+, npm 8+

```bash
npm install
cp .env.example .env
npm run migrate           # Knex migrations (PostgreSQL)
npm run seed              # Seed test data
npm run dev
```

### Required Environment Variables (PostgreSQL)

Set these in your `.env` (replacing with your values):

```
DATABASE_TYPE=postgres
DATABASE_URL=postgres://postgres:postgres@localhost:5432/abc_dashboard
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=abc_dashboard
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
PORT=5000
```

**URLs**:

- API: <http://localhost:5001>
- Docs: <http://localhost:5001/api-docs>
- Health: <http://localhost:5001/api/v1/health>

## Scripts

```bash
npm run dev          # Development server
npm start            # Production server
npm test             # Run all tests (unit + integration)
npm run test:unit    # Unit tests only (no DB)
npm run test:integration  # Integration tests (requires test DB)
npm run lint         # Code linting
npm run format       # Code formatting
npm run migrate      # Database migrations
npm run seed         # Seed test data

# External license sync
npm run sync:test-connectivity   # Test connection to external license API
npm run sync:start              # Run one-off sync from external API
npm run sync:status             # Show sync status and DB/API health

# Email Testing Suite
npm run test:email:suite     # Complete email testing
npm run test:email:config    # Validate email config
npm run test:email:send      # Test email sending
npm run test:email:health    # Check email health
```

## Testing

Tests use **Jest** with ESM (`NODE_OPTIONS='--experimental-vm-modules'`). Unit tests are in `tests/unit/`, integration tests in `tests/integration/`.

### Unit tests (no database)

Unit tests mock dependencies and do not require PostgreSQL:

```bash
npm run test:unit
```

Runs all tests under `tests/unit/` (auth, use-cases, validators, token service, etc.). **No test DB needed.**

### Integration tests (database required)

Integration tests hit the real app and PostgreSQL. You need a **dedicated test database** and migrations applied.

**1. Create the test database** (once):

```bash
# Default name from tests/setup.js is abc_dashboard_test
createdb abc_dashboard_test
```

Or match the name to your test env (see `POSTGRES_DB` in `.env` when `NODE_ENV=test`).

**2. Run migrations for the test environment** (once, or after schema changes):

```bash
NODE_ENV=test npm run migrate
```

**3. Run integration tests:**

```bash
npm run test:integration
```

This runs `tests/integration/auth-integration.test.js` (login, refresh, profile, logout against the real API). If the test database is not available, those tests are skipped and the suite still passes.

**Note:** `tests/integration/license-dashboard-metrics.test.js` is excluded from the default Jest run (optional `TEST_ACCESS_TOKEN` and DB). Run it explicitly if needed.

### Full test run

```bash
npm test
```

Runs unit tests and integration tests (except the email suite and the license dashboard metrics integration test). Integration tests will be skipped if the test DB is not set up.

### Test environment variables

The test setup (`tests/setup.js`) sets `NODE_ENV=test` and expects these for the test DB (defaults shown):

- `POSTGRES_HOST=localhost`
- `POSTGRES_PORT=5432`
- `POSTGRES_DB=abc_dashboard_test`
- `POSTGRES_USER=abc_user`
- `POSTGRES_PASSWORD=abc_password`
- `JWT_SECRET=test-jwt-secret-for-testing-only`
- `BCRYPT_ROUNDS=4` (faster tests)

Override via `.env` or environment when running tests.

## Environment

Copy from `.env.example` and create a `.env` file:

### Development Setup

```bash
cp .env.example .env     # Copy environment template
# Edit .env with your configuration
```

### Email Configuration Options

**Development**: Uses MailHog (local email testing)

```env
EMAIL_SERVICE=mailhog
EMAIL_HOST=localhost
EMAIL_PORT=1025
```

**Production - Google Workspace** (Free):

```env
EMAIL_SERVICE=google-workspace
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASS=your-16-char-app-password
EMAIL_FROM=noreply@yourdomain.com
```

### Required Environment Variables

```env
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/abc_dashboard
JWT_SECRET=your-secure-secret-here
CLIENT_URL=http://localhost:3000
```

### Email Setup Guide

See `docs/guides/email-setup-guide.md` for complete email configuration instructions.

Test your email configuration:

```bash
npm run test:email-config
```

For comprehensive email testing:

```bash
npm run test:email:suite all  # Full email system test
```

## Test Accounts

After running `npm run seed`, these accounts are available:

| Role        | Email                 | Username | Password      |
| ----------- | --------------------- | -------- | ------------- |
| **Admin**   | <admin@example.com>   | admin    | `Admin123!`   |
| **Manager** | <manager@example.com> | manager  | `Manager123!` |
| **Staff**   | <staff@example.com>   | staff    | `Staff123!`   |

## API

**Interactive docs**: <http://localhost:5000/api-docs>

## Additional Features

- **User Roles**: admin, manager, staff with different permissions
- **Database Indexes**: Optimized for common query patterns
- **API Monitoring**: Response times, error rates, cache performance
- **Email Testing**: Comprehensive suite with MailHog at <http://localhost:8025>

## Deployment

### Local Development

For local development and testing, use the consolidated Docker configuration:

```bash
# Start development environment
docker-compose --profile dev up -d --build

# Run database setup (if needed)
docker compose exec abc-dashboard-backend npm run migrate
docker compose exec abc-dashboard-backend npm run seed
```

This starts:

- MongoDB, Redis, MailHog, Backend API, and Frontend
- Development environment with debug logging
- Hot reload enabled for both backend and frontend
- All services on localhost with exposed ports

### Production Deployment

For production deployment:

```bash
# Start production services
docker-compose up -d --build

# Run database setup (one-time)
docker-compose --profile setup up db-setup

# View logs
docker-compose logs -f backend
```

**Production Features:**

- Optimized Docker images
- Health checks for all services
- Persistent data volumes
- Production logging configuration
- Security hardening

See [Deployment Guide](./docs/operations/deployment-guide.md) for detailed instructions.

### Docker Compose (Production)

All services are configured in `docker-compose.yml`:

- **MongoDB**: Database service with persistent storage
- **Redis**: Cache service (optional)
- **MailHog**: Email testing service (included for development/testing)
- **API**: Backend application with health checks

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

**For local development testing:**

```bash
# Use the consolidated development configuration
docker-compose --profile dev up -d --build

# Run database setup
docker compose exec abc-dashboard-backend npm run migrate
docker compose exec abc-dashboard-backend npm run seed
```

### Single Container

For running only the backend API (requires external MongoDB/Redis):

```bash
docker build -t abc-dashboard-backend .

docker run -p 5000:5000 \
  -e NODE_ENV=production \
  -e MONGODB_URI=mongodb://your-mongodb-host:27017/abc_dashboard \
  -e JWT_SECRET=your-production-jwt-secret-here \
  -e CLIENT_URL=https://your-production-domain.com \
  -e EMAIL_SERVICE=google-workspace \
  -e EMAIL_FROM=noreply@yourdomain.com \
  -e EMAIL_USER=your-email@yourdomain.com \
  -e EMAIL_PASS=your-app-password \
  abc-dashboard-backend
```

**Required Environment Variables:**

- `NODE_ENV`: Environment mode (production, development)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Strong JWT secret key (min 32 characters)
- `CLIENT_URL`: Frontend application URL
- `EMAIL_SERVICE`: Email provider (google-workspace, mailhog)
- `EMAIL_FROM`: Sender email address
- `EMAIL_USER`/`EMAIL_PASS`: Email credentials (for Google Workspace)

**Production Setup**:

- Use strong, unique `JWT_SECRET`
- Configure production MongoDB/Redis URLs
- Set up proper logging and monitoring
- Use Docker secrets or environment variables for sensitive data
- Configure Google Workspace or other email service
- Set `CLIENT_URL` to your production domain

## Syncing with external license management

The backend can pull licenses from an **external license management API** into the local PostgreSQL database (and optionally into the internal `licenses` table). Sync can be run manually or on a schedule when the server is running.

### Prerequisites

- **PostgreSQL** running and migrated (same as normal API).
- **External API** reachable and **API key** from the license provider.

### 1. Configure environment

In `.env` (or your environment), set:

```env
EXTERNAL_LICENSE_API_URL=http://your-external-license-api.example.com
EXTERNAL_LICENSE_API_KEY=your-api-key-from-provider
```

Optional: `EXTERNAL_LICENSE_API_TIMEOUT_MS`, `LICENSE_SYNC_BATCH_SIZE`, etc. (see `src/infrastructure/config/license-sync-config.js`).

### 2. Test connectivity

Verify the backend can reach the external API and authenticate:

```bash
npm run sync:test-connectivity
```

On success you should see `Connectivity Test: { success: true, ... }`. If it fails, check the URL, API key, and network/firewall.

### 3. Run a sync

Run a one-off sync (fetches from external API and updates `external_licenses` and optionally internal `licenses`):

```bash
npm run sync:start
```

This uses the sync use case with comprehensive sync and duplicate detection. Logs show created/updated/failed counts and any errors.

### 4. Check sync status

Inspect internal DB counts, last sync time, and external API health:

```bash
npm run sync:status
```

### 5. Scheduled sync (when server is running)

When you start the API with `npm run dev` or `npm start`, the **license sync scheduler** starts and runs sync on a **cron schedule** (default: every 15 minutes). So with `EXTERNAL_LICENSE_API_URL` and `EXTERNAL_LICENSE_API_KEY` set, sync runs automatically. You can also trigger sync via the API (see license/sync routes and Swagger) if your role has the right permissions.

**Summary**

| Step              | Command                                                   |
| ----------------- | --------------------------------------------------------- |
| Test connectivity | `npm run sync:test-connectivity`                          |
| Run sync once     | `npm run sync:start`                                      |
| Check status      | `npm run sync:status`                                     |
| Automatic sync    | Start server (`npm run dev`); scheduler runs every 15 min |

### Docker: reset DB and run sync (root script)

From the **repo root** (not `backend/`), with the stack running (`docker compose up -d`), you can reset the database, re-seed, and optionally run a full license sync in one go:

```bash
./scripts/docker-db-reset-sync.sh              # migrate:fresh + seed
./scripts/docker-db-reset-sync.sh --drop      # drop DB, create, migrate + seed
./scripts/docker-db-reset-sync.sh --drop --sync   # same + license sync (npm run sync:start)
```

Requires the `backend` and `postgres` containers to be up. See [scripts/README.md](../scripts/README.md) for deploy and DB usage.

## Email Testing Suite

The backend includes a comprehensive email testing suite for validating email configuration and functionality:

```bash
# Run all email tests
npm run test:email:suite

# Individual test commands
npm run test:email:config    # Validate configuration (safe, no emails sent)
npm run test:email:send      # Test email sending (requires email service)
npm run test:email:templates # Test email templates (requires email service)
npm run test:email:health    # Check service health
```

**Available Email Services:**

- **MailHog** (Development): Local email testing
- **Google Workspace** (Production): SMTP via Gmail (free)

**Configuration:**

```bash
# Development (MailHog)
EMAIL_SERVICE=mailhog
EMAIL_HOST=localhost
EMAIL_PORT=1025

# Production (Google Workspace)
EMAIL_SERVICE=google-workspace
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Run `npm run lint:fix` and `npm test`
4. Test email functionality with `npm run test:email:suite`
5. Open a Pull Request

## Support

- [API Documentation](http://localhost:5000/api-docs) (Swagger UI)
- Server logs with correlation IDs

---

**v1.1.0** | ISC License

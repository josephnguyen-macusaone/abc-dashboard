# Backend Architecture

The ABC Dashboard backend follows **Clean Architecture**: concentric layers with dependencies flowing inward. Node.js, Express, PostgreSQL, JWT auth, Swagger/OpenAPI.

## Layers

- **Domain (core):** Entities (User, UserProfile, License), repository interfaces, domain exceptions. No framework or infra dependencies.
- **Application:** Use cases (Login, GetUsers, SyncLicenses, etc.), DTOs, validators (Joi), service interfaces. Orchestrates domain and calls repositories.
- **Infrastructure:** Controllers, routes, middleware, Knex migrations, repository implementations, config, adapters (Email, Auth, Token). Talks to DB, Redis, external APIs.
- **Shared:** DI container (Awilix), HTTP utils, logger, constants.

## Data flow

```txt
HTTP Request → Routes → Controllers → Use Cases → Domain / Repository interfaces
                                                         ↓
Database / External APIs ← Infrastructure Repositories
```

## Directory structure

```txt
src/
├── domain/              # Entities, exceptions, repository interfaces
├── application/          # Use cases, DTOs, validators, interfaces
├── infrastructure/      # Controllers, routes, config, middleware, repositories
└── shared/              # Kernel (Awilix), services (Auth, Token, Email), http, utils
```

## Patterns

- **Dependency inversion:** Domain defines repository interfaces; infrastructure implements them.
- **Dependency injection:** Awilix container wires controllers, use cases, repositories, services. See `shared/kernel/container.js`.
- **Repository pattern:** Data access behind interfaces; use cases depend on interfaces, not Knex.
- **Use case pattern:** One use case per business operation; controllers are thin HTTP adapters.

## License system (overview)

- **Internal licenses:** Stored in PostgreSQL; full CRUD, lifecycle (renew, expire, reactivate), bulk ops, analytics. Cached (e.g. Redis) where configured.
- **External licenses:** Synced from external API (x-api-key) into `external_licenses`; sync runs on a schedule and can be triggered via API. Internal API serves unified license data; internal DB is the source of truth for filtered/list responses.
- **Sync:** Background/cron sync, circuit breaker and retries, batch processing. Status and health: see `/api/v1/license-sync/*` and operations docs.

## Tech stack

- **Runtime:** Node.js (ESM). **Framework:** Express. **DB:** PostgreSQL (Knex). **Auth:** JWT (access + refresh). **Validation:** Joi. **Email:** Nodemailer (MailHog, Google Workspace, Mailjet). **Security:** Helmet, CORS, rate limiting. **Docs:** Swagger/OpenAPI. **Testing:** Jest, Supertest.

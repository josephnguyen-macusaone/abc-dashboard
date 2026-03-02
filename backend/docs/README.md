# Backend Documentation

Documentation for the ABC Dashboard backend API (Node.js, Express, PostgreSQL).

## Docs

| Doc | Description |
|-----|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, Clean Architecture layers, directory structure |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deploy with Docker, env config, production (PM2/Nginx), troubleshooting |
| [SETUP.md](./SETUP.md) | Quick start, env, DB, email, run and test |

## API reference

Full API reference is generated from code and served at **`/api-docs`** (Swagger UI) when the backend is running. Export spec: `npm run export:swagger` (writes `swagger-spec.json` for frontend codegen).

## Quick links

- Backend README: [../README.md](../README.md)
- Repo scripts (Docker, DB reset): [../../scripts/README.md](../../scripts/README.md)

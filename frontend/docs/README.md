# Frontend Documentation

Documentation for the ABC Dashboard frontend (Next.js 16, React 19, TypeScript, Tailwind, Clean Architecture).

## Docs

| Doc | Description |
|-----|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Clean Architecture layers, project structure, patterns, components |
| [SETUP.md](./SETUP.md) | Quick start, env, run, test |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deploy (Vercel, Docker), env config |
| [FEATURES.md](./FEATURES.md) | Feature overview and links |

## Guides

| Guide | Description |
|-------|-------------|
| [guides/license-management.md](./guides/license-management.md) | License UI: DataTable vs DataGrid, filters, code locations |
| [guides/authentication-flow.md](./guides/authentication-flow.md) | Auth flows and implementation |

## Development

| Doc | Description |
|-----|-------------|
| [development/README.md](./development/README.md) | Testing, conventions, quality checks |

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Backend API: set `NEXT_PUBLIC_API_URL` in `.env.local` (e.g. `http://localhost:5001/api/v1`).

## Project structure

```
src/
├── app/              # Next.js App Router
├── domain/           # Entities, repository interfaces
├── application/      # Use cases, DTOs, services
├── infrastructure/   # API clients, stores, repositories
├── presentation/     # Components, hooks, pages
└── shared/           # Types, utils, constants
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for details.

## Tables and grids

Column widths for license and user tables/grids are defined in a single place so one edit applies to both data-table and data-grid views:

- **License columns:** `src/shared/constants/license.ts` (`LICENSE_COLUMN_WIDTHS`) — used by dashboard license table and license management grid.
- **User columns:** `src/shared/constants/user.ts` (`USER_COLUMN_WIDTHS`) — used by user management table (and any future user grid).

To resize a column, edit the corresponding `*_COLUMN_WIDTHS` entry (e.g. `size`, `minSize`).

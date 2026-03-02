# Frontend Setup

Quick start for local development.

## Prerequisites

- Node.js 18+ (20+ recommended)
- npm 8+

## Quick start

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local: set NEXT_PUBLIC_API_URL to backend (e.g. http://localhost:5001/api/v1)
npm run dev
```

Open **http://localhost:3000**. Ensure the backend is running if you need API data.

## Environment variables

Create `.env.local` from `.env.example`. Minimum:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api/v1
```

Other `NEXT_PUBLIC_*` vars are optional (app name, env, analytics, etc.). Restart the dev server after changing env (Next inlines `NEXT_PUBLIC_*` at build time).

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript check |
| `npm run test` | Run tests |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:coverage` | Coverage report |

## Project structure

```
frontend/
├── src/
│   ├── app/              # Next.js App Router
│   ├── domain/           # Entities, repository interfaces
│   ├── application/      # Use cases, DTOs
│   ├── infrastructure/   # API, stores, repositories
│   ├── presentation/     # Components, hooks, pages
│   └── shared/           # Types, utils
├── docs/                 # This documentation
└── package.json
```

## Troubleshooting

**Port 3000 in use**

```bash
npm run dev -- -p 3001
```

**Env vars not loading**

- Use `.env.local` in frontend root; restart dev server after changes.

**API errors**

- Confirm backend is up and `NEXT_PUBLIC_API_URL` matches (e.g. `http://localhost:5001/api/v1`). Check CORS on backend.

**Build / type errors**

- `npm run type-check` and fix reported errors; clear `.next` and rebuild if needed.

## Next steps

- [ARCHITECTURE.md](./ARCHITECTURE.md) – Layers and patterns
- [DEPLOYMENT.md](./DEPLOYMENT.md) – Deploy and env config
- [development/README.md](./development/README.md) – Testing and conventions

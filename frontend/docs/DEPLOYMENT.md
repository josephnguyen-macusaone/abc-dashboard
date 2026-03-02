# Frontend Deployment

Deploy the Next.js frontend to Vercel, Docker, or static export. For full-stack deployment (CI/CD, server), see repo root [docs/DEPLOYMENT-GUIDE.md](../../docs/DEPLOYMENT-GUIDE.md).

## Environment variables

**Required at build time** (inlined by Next.js):

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_APP_ENV=production
```

Optional: `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_GA_TRACKING_ID`, etc.

Use `.env.production` or your host’s env config (e.g. Vercel dashboard). Restart or rebuild after changing `NEXT_PUBLIC_*`.

## Vercel (recommended)

1. Connect the repo to Vercel.
2. Set **Root Directory** to `frontend` (or run build from frontend).
3. Set env vars in Vercel (e.g. `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_ENV`).
4. Build command: `npm run build`. Output: Next.js default.
5. Deploy; Vercel uses Next.js automatically.

## Docker

From repo root the stack is usually run with `docker compose` (frontend + backend + postgres). To build only the frontend image:

```bash
cd frontend
docker build -t abc-dashboard-frontend .
# Build args: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_APP_ENV
```

Use multi-stage Dockerfile with `node:20-alpine`, `npm ci`, `npm run build`, and `output: 'standalone'` in `next.config` if you run the app with `node server.js`.

## Static export

For static export (no server):

- In `next.config`: `output: 'export'`, `images: { unoptimized: true }` if using next/image.
- Run `npm run build`; output goes to `out/`. Deploy `out/` to a CDN or static host.

Note: API calls will go from the browser to your backend URL; set `NEXT_PUBLIC_API_URL` to the public API.

## Build and run locally (production mode)

```bash
npm run build
npm run start
```

## Security headers

Next.js or your host can send security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy). Configure in `next.config` `headers` or in Vercel/Docker reverse proxy.

## Related

- [SETUP.md](./SETUP.md) – Local dev
- [../../docs/DEPLOYMENT-GUIDE.md](../../docs/DEPLOYMENT-GUIDE.md) – Full stack deploy

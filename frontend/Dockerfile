# Multi-stage build: development runner + production Next.js server
FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./

# Install all deps for building (includes dev deps for type checks)
RUN npm ci

COPY . .

# Development stage (kept for local convenience)
FROM base AS development
EXPOSE 3000
ENV NODE_ENV=development
CMD ["npm", "run", "dev"]

# Production build stage
FROM base AS builder
ARG NEXT_PUBLIC_API_URL
ARG NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=${NEXT_SERVER_ACTIONS_ENCRYPTION_KEY}
# Server Actions need a stable key across build and runtime; fail fast if missing
RUN test -n "$NEXT_SERVER_ACTIONS_ENCRYPTION_KEY" || (echo "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY is required for Server Actions" && exit 1)
RUN npm run build

# Production runtime stage - run Next.js server (needed for Server Actions)
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ARG NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
ENV NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=${NEXT_SERVER_ACTIONS_ENCRYPTION_KEY}

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the standalone server build produced by Next.js
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
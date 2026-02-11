# ============================================================
# OPTIMIZED MULTI-STAGE DOCKERFILE FOR 1GB RAM SERVERS
# ============================================================
# Key optimizations:
# - BuildKit cache mounts for npm (persistent across builds)
# - Separate dependency and build stages (better layer caching)
# - Reduced memory limits (1GB heap for Next.js)
# - Single npm install (no redundant installs)
# - Minimal production image (Node.js + built artifacts only)
# ============================================================

# ============================================================
# Stage 1: Dependencies - Install node_modules (CACHEABLE)
# ============================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Copy only package files for dependency installation
COPY package*.json ./

# Install dependencies with BuildKit cache mount
# This cache persists across builds - HUGE time saver!
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/app/.npm-cache \
    npm ci --prefer-offline --no-audit --cache=/app/.npm-cache

# ============================================================
# Stage 2: Builder - Build Next.js app (CACHEABLE CODE)
# ============================================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy node_modules from deps stage (no need to reinstall!)
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Build arguments for Next.js (these are inlined at build time by webpack)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_USE_RELATIVE_API
ARG NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_USE_RELATIVE_API=${NEXT_PUBLIC_USE_RELATIVE_API}
ENV NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=${NEXT_SERVER_ACTIONS_ENCRYPTION_KEY}

# Build Next.js with REDUCED memory limit for 1GB RAM servers
# Disable webpack build workers to save memory
# Use standalone output for minimal production size
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN NODE_OPTIONS="--max-old-space-size=1024" npm run build

# Verify standalone build was created
RUN ls -lah .next/standalone || (echo "ERROR: Standalone build not found!" && exit 1)

# ============================================================
# Stage 3: Production - Minimal runtime image
# ============================================================
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install only what's needed for health checks
RUN apk add --no-cache wget

# Copy standalone Next.js server (includes runtime deps)
COPY --from=builder /app/.next/standalone ./

# Copy static assets
COPY --from=builder /app/.next/static ./.next/static

# Create public directory (optional for Next.js, no assets to copy)
RUN mkdir -p ./public

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Configure Next.js to listen on all interfaces (0.0.0.0)
# This ensures health checks from localhost work properly
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Health check for docker-compose
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

# Start the standalone Next.js server
CMD ["node", "server.js"]

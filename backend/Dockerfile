# Use Node.js 20 Alpine for better security and performance (Active LTS)
FROM node:20-alpine

# Update Alpine packages and install curl for health checks
RUN apk update && apk upgrade && apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies based on NODE_ENV with BuildKit caching
ARG NODE_ENV=production
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/app/.npm-cache \
    if [ "$NODE_ENV" = "production" ]; then \
      npm ci --only=production --prefer-offline --no-audit; \
    else \
      npm ci --prefer-offline --no-audit; \
    fi && npm cache clean --force

# Copy source code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Change ownership of app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health || exit 1

# Start the application
CMD ["npm", "start"]
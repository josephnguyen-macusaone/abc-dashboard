# All-in-one: Backend API + Prometheus + Grafana (single container).
# Build from repo root: docker build -f backend/Dockerfile .
FROM node:20-bookworm-slim

# Install curl (healthcheck), wget, gpg (Grafana repo), and Grafana deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    ca-certificates \
    gnupg \
    adduser \
    libfontconfig1 \
    && rm -rf /var/lib/apt/lists/*

# Add Grafana APT repo and install Grafana
RUN wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor -o /usr/share/keyrings/grafana.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/grafana.gpg] https://apt.grafana.com stable main" > /etc/apt/sources.list.d/grafana.list \
    && apt-get update && apt-get install -y --no-install-recommends grafana \
    && rm -rf /var/lib/apt/lists/*

# Download Prometheus (official Linux amd64/arm64)
ARG PROMETHEUS_VERSION=2.52.0
ARG TARGETARCH
RUN case "${TARGETARCH}" in \
    "amd64")  PROM_ARCH="amd64" ;; \
    "arm64")  PROM_ARCH="arm64" ;; \
    *)        PROM_ARCH="amd64" ;; \
    esac \
    && wget -q "https://github.com/prometheus/prometheus/releases/download/v${PROMETHEUS_VERSION}/prometheus-${PROMETHEUS_VERSION}.linux-${PROM_ARCH}.tar.gz" -O /tmp/prom.tar.gz \
    && mkdir -p /opt/prometheus \
    && tar -xzf /tmp/prom.tar.gz -C /opt/prometheus --strip-components=1 \
    && rm /tmp/prom.tar.gz

# App directory
WORKDIR /app

# Copy backend (context is repo root when building with -f backend/Dockerfile)
COPY backend/package*.json ./
ARG NODE_ENV=production
RUN --mount=type=cache,target=/root/.npm \
    if [ "$NODE_ENV" = "production" ]; then \
      npm ci --only=production --prefer-offline --no-audit; \
    else \
      npm ci --prefer-offline --no-audit; \
    fi && npm cache clean --force

COPY backend/ ./

# Copy monitoring config (Prometheus + Grafana provisioning)
COPY monitoring/ /app/monitoring/
# Use in-container datasource (127.0.0.1:9090)
RUN cp /app/monitoring/grafana/provisioning/datasources/datasource-incontainer.yml \
       /app/monitoring/grafana/provisioning/datasources/datasource.yml
# Dashboard provider expects /etc/grafana/provisioning/dashboards/json
RUN mkdir -p /etc/grafana/provisioning/dashboards/json \
    && cp /app/monitoring/grafana/dashboards/json/*.json /etc/grafana/provisioning/dashboards/json/

# Entrypoint (already in COPY backend/; ensure executable) and non-root user
RUN chmod +x /app/docker-entrypoint.sh \
    && groupadd -g 1001 nodejs 2>/dev/null || true \
    && useradd -r -u 1001 -g nodejs -s /bin/false -d /app appuser 2>/dev/null || true \
    && mkdir -p /app/logs /prometheus /var/lib/grafana \
    && chown -R appuser:nodejs /app

EXPOSE 5000 9090 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]

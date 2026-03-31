#!/bin/bash
set -e

# Start Prometheus in background (listen on all interfaces so host can reach via -p 9090:9090)
if [ -x /opt/prometheus/prometheus ]; then
  mkdir -p /prometheus
  /opt/prometheus/prometheus \
    --config.file=/app/monitoring/prometheus/prometheus-incontainer.yml \
    --storage.tsdb.path=/prometheus \
    --web.enable-lifecycle \
    --web.listen-address=0.0.0.0:9090 &
fi

# Start Grafana in background (listen on all interfaces so host can reach via -p 3030:3000)
if command -v grafana-server >/dev/null 2>&1; then
  mkdir -p /var/lib/grafana
  export GF_PATHS_DATA=/var/lib/grafana
  export GF_PATHS_PROVISIONING=/app/monitoring/grafana/provisioning
  export GF_SECURITY_ADMIN_USER="${GRAFANA_ADMIN_USER:-admin}"
  export GF_SECURITY_ADMIN_PASSWORD="${GRAFANA_ADMIN_PASSWORD:-admin}"
  export GF_SERVER_HTTP_PORT=3000
  export GF_SERVER_HTTP_ADDRESS=0.0.0.0
  grafana-server --homepath=/usr/share/grafana &
fi

# Give Prometheus and Grafana a moment to bind
sleep 2

# Run Node backend (main process, PID 1 for healthcheck)
exec su -s /bin/sh appuser -c "exec node /app/server.js"

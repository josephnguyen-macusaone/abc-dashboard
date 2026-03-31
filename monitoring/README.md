# Monitoring (Prometheus + Grafana)

Server health, deployment, and API metrics for the ABC Dashboard backend.

**Default deployment:** Prometheus and Grafana run **inside the backend container** (all-in-one). One backend deploy gives you the API, metrics storage, and dashboards.

## Quick start

With the stack running via Docker Compose (from repo root):

```bash
docker compose up -d

# Grafana (inside backend container)
open http://localhost:3030
# Login: admin / admin (or GRAFANA_ADMIN_PASSWORD from .env)
# Dashboards → ABC Backend → "ABC Backend - Server health & deployment"

# Prometheus (inside backend container)
open http://localhost:9090
```

- **Grafana**: http://localhost:3030 (`GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD`, default `admin`/`admin`)
- **Prometheus**: http://localhost:9090 (scrapes `127.0.0.1:5000` inside the same container)

**Build:** The backend image is built from **repo root** so it can include `monitoring/` config:

```bash
docker compose build backend
# or: docker build -f backend/Dockerfile .
```

## Architecture (all-in-one container)

1. **Backend (Node)** exposes:
   - `GET /api/v1/health` – full health + metrics
   - `GET /api/v1/metrics` – JSON metrics (debugging)
   - `GET /api/v1/metrics/prometheus` – Prometheus text format

2. **Prometheus** runs in the same container, scrapes `http://127.0.0.1:5000/api/v1/metrics/prometheus` every 15s (config: `monitoring/prometheus/prometheus-incontainer.yml`).

3. **Grafana** runs in the same container, uses Prometheus at `http://127.0.0.1:9090`, and ships with a pre-provisioned dashboard:
   - **Server health:** Database, error health score, HTTP requests/errors, error rate %, P95 latency, uptime
   - **Resources:** Cache hit rate, memory %, CPU %, security events (failed logins, rate limited)
   - **License sync:** Last completed time, sync runs, sync errors, licenses processed, external API requests/errors; time series for sync history
   - **Info:** Short description of metrics and deployment

## Configuration

### Environment (optional)

In `.env` at repo root (or in the environment for `docker compose`):

| Variable | Default | Description |
|----------|---------|-------------|
| `GRAFANA_ADMIN_USER` | `admin` | Grafana admin username |
| `GRAFANA_ADMIN_PASSWORD` | `admin` | Grafana admin password (change in production) |
| `GRAFANA_ROOT_URL` | `http://localhost:3030` | Root URL for Grafana (e.g. for emails) |
| `APP_VERSION` | from `package.json` | Backend version label in metrics |

### Scrape config

- **All-in-one container:** Prometheus uses `monitoring/prometheus/prometheus-incontainer.yml` (target `127.0.0.1:5000`). To change interval or add targets, edit that file and rebuild the backend image.
- **Standalone Prometheus (optional):** If you run Prometheus in a separate container, use `monitoring/prometheus/prometheus.yml` (target `backend:5000`).

### Dashboards

- Pre-provisioned: `monitoring/grafana/dashboards/json/abc-backend.json`
- To add more: add JSON under `monitoring/grafana/dashboards/json/` and restart Grafana (or use the UI and export).

## Running without Docker

- Start the backend (e.g. `cd backend && npm run dev`).
- Run Prometheus with the same config, but set the backend target to `host.docker.internal:5001` (Mac/Windows) or your host IP and the port where the backend is exposed (e.g. 5001).
- Run Grafana and point it at your Prometheus URL (e.g. `http://localhost:9090`).

## Metrics reference (Prometheus)

| Metric | Type | Description |
|--------|------|-------------|
| `abc_backend_info` | gauge | App info (labels: version, env) |
| `abc_backend_http_requests_total` | gauge | Total HTTP requests in current 5-min window |
| `abc_backend_http_errors_total` | gauge | Total HTTP errors in window |
| `abc_backend_http_error_rate_percent` | gauge | Error rate % |
| `abc_backend_http_request_duration_seconds_avg` | gauge | Avg response time (s) |
| `abc_backend_http_request_duration_seconds_p95` | gauge | P95 response time (s) |
| `abc_backend_database_connected` | gauge | 1 = connected, 0 = not |
| `abc_backend_cache_hit_rate_percent` | gauge | Cache hit rate % |
| `abc_backend_error_health_score` | gauge | Error monitor health score (0–100) |
| `abc_backend_error_health_healthy` | gauge | 1 = healthy, 0 = not |
| `abc_backend_uptime_seconds` | gauge | Process uptime (s) |
| `abc_backend_memory_usage_percent` | gauge | Memory usage % |
| `abc_backend_security_failed_logins_total` | gauge | Failed logins in window |
| `abc_backend_security_rate_limited_total` | gauge | Rate-limited requests in window |
| `abc_backend_active_users_current` | gauge | Active users (approx) |
| `abc_backend_cpu_usage_percent` | gauge | Process CPU usage % |
| `abc_backend_license_sync_operations_total` | gauge | Total sync runs |
| `abc_backend_license_sync_errors_total` | gauge | Sync runs that failed |
| `abc_backend_license_sync_last_completed_timestamp_seconds` | gauge | Last successful sync (Unix seconds) |
| `abc_backend_license_sync_data_processed_total` | gauge | Licenses processed in sync |
| `abc_backend_license_sync_external_api_requests_total` | gauge | External API requests during sync |
| `abc_backend_license_sync_external_api_errors_total` | gauge | External API errors during sync |
| `abc_backend_license_sync_active_operations` | gauge | Syncs currently running |
| `abc_backend_license_sync_duration_seconds_avg` | gauge | Average sync run duration (s) |

Request/error counts reset every 5 minutes in the app; Prometheus keeps the history so you still see trends. License sync metrics are 0 until at least one sync has run.

## Alerting (optional)

With the all-in-one setup, Prometheus runs inside the backend container. To enable alert rules:

1. In `monitoring/prometheus/prometheus-incontainer.yml`, add `rule_files: [ '/app/monitoring/prometheus/alerts.yml' ]`.
2. Rebuild the backend image so the alerts file is included (it already is under `monitoring/`).
3. Optionally configure Alertmanager and point Prometheus at it (see Prometheus docs).

Included rules in `monitoring/prometheus/alerts.yml`:

- **BackendDown** – backend target down for 1m (critical)
- **DatabaseDisconnected** – DB disconnected for 2m (critical)
- **HighErrorRate** – API error rate > 10% for 5m (warning)
- **ErrorHealthUnhealthy** – error monitor unhealthy for 5m (warning)
- **LicenseSyncStale** – no successful sync in 24h (warning)

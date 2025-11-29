# Monitoring Setup - Prometheus & Grafana

This directory contains the configuration for monitoring the ABC Dashboard backend using Prometheus and Grafana.

## Overview

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Metrics Endpoint**: `/metrics` - Prometheus-compatible metrics endpoint

## Ports

- **Prometheus**: `9090`
- **Grafana**: `3001` (changed from 3000 to avoid conflict with frontend)

## Quick Start

### Development

```bash
# Start all services including monitoring
docker-compose -f docker-compose.dev.yml up -d

# Access Grafana
# URL: http://localhost:3001
# Username: admin
# Password: admin

# Access Prometheus
# URL: http://localhost:9090
```

### Production

```bash
# Start all services including monitoring
docker-compose up -d

# Access Grafana
# URL: http://localhost:3001
# Username: admin (or set via GRAFANA_ADMIN_USER)
# Password: admin (or set via GRAFANA_ADMIN_PASSWORD)
```

## Metrics Endpoint

The backend API exposes Prometheus-compatible metrics at:

```
GET /metrics
```

This endpoint returns metrics in Prometheus text format, including:

- API request metrics (total, errors, response times)
- System metrics (CPU, memory, uptime)
- Database metrics (connection status, collections, objects)
- Cache metrics (hit rate, connection status)
- Application metrics (active users, security events)
- Health status

## Prometheus Configuration

Location: `monitoring/prometheus/prometheus.yml`

### Scrape Targets

1. **Prometheus itself** - `localhost:9090`
2. **Backend API** - `api:5000/metrics`
3. **MongoDB Exporter** - `mongodb-exporter:9216` (optional)
4. **Redis Exporter** - `redis-exporter:9121` (optional)

### Retention

- **Development**: 7 days
- **Production**: 30 days

## Grafana Configuration

### Data Source

Prometheus data source is automatically provisioned from:
`monitoring/grafana/provisioning/datasources/prometheus.yml`

### Dashboards

Dashboards are automatically loaded from:
`monitoring/grafana/dashboards/`

#### Available Dashboards

1. **ABC Dashboard - API Metrics**
   - API request statistics
   - Response time distribution
   - Error rates
   - System resource usage
   - Database status
   - Security metrics

### Default Credentials

- **Username**: `admin`
- **Password**: `admin`

⚠️ **Important**: Change the default password in production!

## Metrics Available

### API Metrics

- `api_requests_total` - Total number of API requests
- `api_requests_errors_total` - Total number of API errors
- `api_request_duration_seconds` - Request duration histogram
- `api_request_duration_seconds_avg` - Average response time
- `api_error_rate` - Error rate (0-1)

### System Metrics

- `system_memory_usage_percent` - Memory usage percentage
- `system_cpu_usage_percent` - CPU usage percentage
- `system_uptime_seconds` - System uptime

### Database Metrics

- `database_connected` - Connection status (1=connected, 0=disconnected)
- `database_collections_total` - Number of collections
- `database_objects_total` - Number of database objects

### Cache Metrics

- `cache_hit_rate` - Cache hit rate (0-1)
- `cache_connected` - Connection status (1=connected, 0=disconnected)

### Application Metrics

- `application_active_users` - Active users count
- `application_endpoint_count` - Number of API endpoints
- `application_security_failed_logins_total` - Failed login attempts
- `application_security_rate_limited_requests_total` - Rate-limited requests
- `application_health_status` - Health status (1=healthy, 0=unhealthy)

## Query Examples

### Request Rate

```promql
rate(api_requests_total[5m])
```

### Error Rate

```promql
api_error_rate
```

### Average Response Time

```promql
api_request_duration_seconds_avg
```

### P95 Response Time

```promql
histogram_quantile(0.95, api_request_duration_seconds_bucket)
```

### Memory Usage

```promql
system_memory_usage_percent
```

## Troubleshooting

### Prometheus Not Scraping

1. Check if the API is running:
   ```bash
   docker-compose ps api
   ```

2. Test the metrics endpoint:
   ```bash
   curl http://localhost:5000/metrics
   ```

3. Check Prometheus targets:
   - Open http://localhost:9090/targets
   - Verify all targets are "UP"

### Grafana Not Loading Dashboards

1. Check Grafana logs:
   ```bash
   docker-compose logs grafana
   ```

2. Verify dashboard files exist:
   ```bash
   ls -la monitoring/grafana/dashboards/
   ```

3. Check provisioning configuration:
   ```bash
   cat monitoring/grafana/provisioning/dashboards/dashboards.yml
   ```

### Metrics Not Appearing

1. Verify the metrics endpoint is accessible:
   ```bash
   curl http://localhost:5000/metrics
   ```

2. Check Prometheus is scraping:
   - Open http://localhost:9090/targets
   - Verify the API target shows as "UP"

3. Query Prometheus directly:
   ```bash
   curl 'http://localhost:9090/api/v1/query?query=api_requests_total'
   ```

## Customization

### Adding Custom Metrics

Edit `src/infrastructure/config/prometheus-metrics.js` to add new metrics.

### Creating Custom Dashboards

1. Create a JSON file in `monitoring/grafana/dashboards/`
2. Follow Grafana dashboard JSON format
3. Restart Grafana to load the new dashboard

### Alerting Rules

Add alerting rules to `monitoring/prometheus/rules/` and reference them in `prometheus.yml`:

```yaml
rule_files:
  - "rules/*.yml"
```

## Security Considerations

1. **Change default Grafana credentials** in production
2. **Restrict access** to Prometheus and Grafana ports
3. **Use authentication** for the `/metrics` endpoint in production (currently open)
4. **Use HTTPS** in production environments
5. **Set up firewall rules** to limit access

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)


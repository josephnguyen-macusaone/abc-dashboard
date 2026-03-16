/**
 * Prometheus metrics exporter for server health, deployment, and API metrics.
 * Exposes the same data as JSON (GET /api/v1/metrics) and Prometheus text format
 * (GET /api/v1/metrics/prometheus) for Grafana and alerting.
 */
import { apiMonitor } from './monitoring.js';
import { getComprehensiveMetrics, applicationMetrics } from './metrics.js';
import { errorMonitor } from '../../shared/utils/monitoring/error-monitor.js';
import { licenseSyncMonitor } from '../monitoring/license-sync-monitor.js';

const APP_NAME = 'abc_backend';
const VERSION = process.env.APP_VERSION || process.env.npm_package_version || '1.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Escape string for Prometheus label value (backslash and quote).
 */
function escapeLabelValue(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Format a Prometheus metric line (gauge/counter).
 */
function metric(name, value, labels = {}) {
  const labelStr =
    Object.keys(labels).length === 0
      ? ''
      : `{${Object.entries(labels)
          .map(([k, v]) => `${k}="${escapeLabelValue(v)}"`)
          .join(',')}}`;
  const v = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  return `${name}${labelStr} ${v}\n`;
}

/**
 * Build Prometheus text format from current in-app metrics.
 */
export async function getPrometheusMetricsText() {
  const lines = [];
  const ts = Date.now();

  // Deployment / app info (static labels for Grafana)
  lines.push(`# HELP ${APP_NAME}_info Application and deployment info`);
  lines.push(`# TYPE ${APP_NAME}_info gauge`);
  lines.push(metric(`${APP_NAME}_info`, 1, { version: VERSION, env: NODE_ENV }));

  // API request metrics (from apiMonitor - resets every 5 min)
  const apiMetrics = apiMonitor.getMetrics();
  const summary = apiMetrics.summary || {};
  lines.push(`# HELP ${APP_NAME}_http_requests_total Total HTTP requests in current window`);
  lines.push(`# TYPE ${APP_NAME}_http_requests_total gauge`);
  lines.push(metric(`${APP_NAME}_http_requests_total`, Number(summary.totalRequests) || 0));
  lines.push(`# HELP ${APP_NAME}_http_errors_total Total HTTP errors (4xx/5xx) in current window`);
  lines.push(`# TYPE ${APP_NAME}_http_errors_total gauge`);
  lines.push(metric(`${APP_NAME}_http_errors_total`, Number(summary.totalErrors) || 0));
  lines.push(`# HELP ${APP_NAME}_http_error_rate_percent Error rate percentage`);
  lines.push(`# TYPE ${APP_NAME}_http_error_rate_percent gauge`);
  lines.push(metric(`${APP_NAME}_http_error_rate_percent`, parseFloat(summary.errorRate) || 0));
  lines.push(`# HELP ${APP_NAME}_http_request_duration_seconds_avg Average response time in seconds`);
  lines.push(`# TYPE ${APP_NAME}_http_request_duration_seconds_avg gauge`);
  lines.push(
    metric(
      `${APP_NAME}_http_request_duration_seconds_avg`,
      (parseFloat(summary.averageResponseTime) || 0) / 1000
    )
  );
  lines.push(`# HELP ${APP_NAME}_http_request_duration_seconds_p95 P95 response time in seconds`);
  lines.push(`# TYPE ${APP_NAME}_http_request_duration_seconds_p95 gauge`);
  lines.push(
    metric(
      `${APP_NAME}_http_request_duration_seconds_p95`,
      (parseFloat(summary.p95ResponseTime) || 0) / 1000
    )
  );

  // Application metrics (security, active users)
  const appMetrics = applicationMetrics.getApplicationMetrics();
  const security = appMetrics.security || {};
  lines.push(`# HELP ${APP_NAME}_security_failed_logins_total Failed login attempts in window`);
  lines.push(`# TYPE ${APP_NAME}_security_failed_logins_total gauge`);
  lines.push(metric(`${APP_NAME}_security_failed_logins_total`, security.failedLogins || 0));
  lines.push(`# HELP ${APP_NAME}_security_rate_limited_total Rate-limited requests in window`);
  lines.push(`# TYPE ${APP_NAME}_security_rate_limited_total gauge`);
  lines.push(metric(`${APP_NAME}_security_rate_limited_total`, security.rateLimitedRequests || 0));
  lines.push(`# HELP ${APP_NAME}_active_users_current Currently active users (approx)`);
  lines.push(`# TYPE ${APP_NAME}_active_users_current gauge`);
  lines.push(metric(`${APP_NAME}_active_users_current`, appMetrics.activeUsers || 0));

  // Error monitor
  const errMetrics = errorMonitor.getMetrics();
  const errHealth = errorMonitor.getHealthStatus();
  lines.push(`# HELP ${APP_NAME}_errors_total Total errors recorded by error monitor`);
  lines.push(`# TYPE ${APP_NAME}_errors_total gauge`);
  lines.push(metric(`${APP_NAME}_errors_total`, errMetrics.total || 0));
  lines.push(`# HELP ${APP_NAME}_error_health_score Error monitor health score (0-100)`);
  lines.push(`# TYPE ${APP_NAME}_error_health_score gauge`);
  lines.push(metric(`${APP_NAME}_error_health_score`, errHealth.score ?? 100));
  lines.push(`# HELP ${APP_NAME}_error_health_healthy 1 if error health is healthy, 0 otherwise`);
  lines.push(`# TYPE ${APP_NAME}_error_health_healthy gauge`);
  lines.push(
    metric(`${APP_NAME}_error_health_healthy`, errHealth.status === 'healthy' ? 1 : 0)
  );

  // License sync metrics (from LicenseSyncMonitor)
  try {
    const syncMetrics = licenseSyncMonitor.getMetrics();
    const syncPerf = licenseSyncMonitor.getPerformanceSummary();
    const syncVal = (key, def = 0) => {
      const v = syncMetrics[key]?.value;
      return typeof v === 'number' && !Number.isNaN(v) ? v : def;
    };
    lines.push(`# HELP ${APP_NAME}_license_sync_operations_total Total sync operations run`);
    lines.push(`# TYPE ${APP_NAME}_license_sync_operations_total gauge`);
    lines.push(metric(`${APP_NAME}_license_sync_operations_total`, syncVal('sync_operations_total')));
    lines.push(`# HELP ${APP_NAME}_license_sync_errors_total Total sync operations that failed`);
    lines.push(`# TYPE ${APP_NAME}_license_sync_errors_total gauge`);
    lines.push(metric(`${APP_NAME}_license_sync_errors_total`, syncVal('sync_operations_errors_total')));
    lines.push(`# HELP ${APP_NAME}_license_sync_last_completed_timestamp_seconds Last successful sync completion (Unix seconds)`);
    lines.push(`# TYPE ${APP_NAME}_license_sync_last_completed_timestamp_seconds gauge`);
    const lastMs = syncVal('sync_last_completed_timestamp');
    lines.push(metric(`${APP_NAME}_license_sync_last_completed_timestamp_seconds`, lastMs > 0 ? lastMs / 1000 : 0));
    lines.push(`# HELP ${APP_NAME}_license_sync_data_processed_total Licenses processed during sync`);
    lines.push(`# TYPE ${APP_NAME}_license_sync_data_processed_total gauge`);
    lines.push(metric(`${APP_NAME}_license_sync_data_processed_total`, syncVal('sync_data_processed_total')));
    lines.push(`# HELP ${APP_NAME}_license_sync_external_api_requests_total External API requests made during sync`);
    lines.push(`# TYPE ${APP_NAME}_license_sync_external_api_requests_total gauge`);
    lines.push(metric(`${APP_NAME}_license_sync_external_api_requests_total`, syncVal('external_api_requests_total')));
    lines.push(`# HELP ${APP_NAME}_license_sync_external_api_errors_total External API errors during sync`);
    lines.push(`# TYPE ${APP_NAME}_license_sync_external_api_errors_total gauge`);
    lines.push(metric(`${APP_NAME}_license_sync_external_api_errors_total`, syncVal('external_api_errors_total')));
    lines.push(`# HELP ${APP_NAME}_license_sync_active_operations Sync operations currently running`);
    lines.push(`# TYPE ${APP_NAME}_license_sync_active_operations gauge`);
    lines.push(metric(`${APP_NAME}_license_sync_active_operations`, syncVal('sync_active_operations')));
    const avgDurationMs = syncPerf?.syncOperations?.avgDuration;
    lines.push(`# HELP ${APP_NAME}_license_sync_duration_seconds_avg Average sync run duration in seconds`);
    lines.push(`# TYPE ${APP_NAME}_license_sync_duration_seconds_avg gauge`);
    lines.push(metric(`${APP_NAME}_license_sync_duration_seconds_avg`, typeof avgDurationMs === 'number' ? avgDurationMs / 1000 : 0));
  } catch (e) {
    // Sync monitor may not be initialized or sync disabled
    lines.push(metric(`${APP_NAME}_license_sync_operations_total`, 0));
    lines.push(metric(`${APP_NAME}_license_sync_errors_total`, 0));
    lines.push(metric(`${APP_NAME}_license_sync_last_completed_timestamp_seconds`, 0));
    lines.push(metric(`${APP_NAME}_license_sync_data_processed_total`, 0));
    lines.push(metric(`${APP_NAME}_license_sync_external_api_requests_total`, 0));
    lines.push(metric(`${APP_NAME}_license_sync_external_api_errors_total`, 0));
    lines.push(metric(`${APP_NAME}_license_sync_active_operations`, 0));
    lines.push(metric(`${APP_NAME}_license_sync_duration_seconds_avg`, 0));
  }

  // Comprehensive metrics (DB, cache, system) - async
  try {
    const comprehensive = await getComprehensiveMetrics();
    const db = comprehensive.database;
    const cacheData = comprehensive.cache;
    const sys = comprehensive.system;
    const summary = comprehensive.summary || {};

    lines.push(`# HELP ${APP_NAME}_database_connected 1 if database is connected`);
    lines.push(`# TYPE ${APP_NAME}_database_connected gauge`);
    lines.push(metric(`${APP_NAME}_database_connected`, db?.connected ? 1 : 0));
    lines.push(`# HELP ${APP_NAME}_cache_hit_rate_percent Cache hit rate percentage`);
    lines.push(`# TYPE ${APP_NAME}_cache_hit_rate_percent gauge`);
    lines.push(
      metric(
        `${APP_NAME}_cache_hit_rate_percent`,
        parseFloat(cacheData?.hitRate ?? summary?.cacheHitRate ?? 0) || 0
      )
    );
    lines.push(`# HELP ${APP_NAME}_memory_usage_percent Process memory usage percent`);
    lines.push(`# TYPE ${APP_NAME}_memory_usage_percent gauge`);
    lines.push(
      metric(
        `${APP_NAME}_memory_usage_percent`,
        parseFloat(sys?.memory?.usedPercent ?? summary?.memoryUsagePercent ?? 0) || 0
      )
    );
    lines.push(`# HELP ${APP_NAME}_cpu_usage_percent Process CPU usage percent`);
    lines.push(`# TYPE ${APP_NAME}_cpu_usage_percent gauge`);
    lines.push(
      metric(
        `${APP_NAME}_cpu_usage_percent`,
        parseFloat(sys?.cpu?.usagePercent ?? summary?.cpuUsagePercent ?? 0) || 0
      )
    );
    lines.push(`# HELP ${APP_NAME}_uptime_seconds Process uptime in seconds`);
    lines.push(`# TYPE ${APP_NAME}_uptime_seconds gauge`);
    lines.push(
      metric(
        `${APP_NAME}_uptime_seconds`,
        parseFloat(summary?.uptime ?? sys?.uptime ?? 0) || 0
      )
    );
  } catch (e) {
    lines.push(`# HELP ${APP_NAME}_database_connected 1 if database is connected`);
    lines.push(`# TYPE ${APP_NAME}_database_connected gauge`);
    lines.push(metric(`${APP_NAME}_database_connected`, 0));
    lines.push(metric(`${APP_NAME}_cache_hit_rate_percent`, 0));
    lines.push(metric(`${APP_NAME}_memory_usage_percent`, 0));
    lines.push(metric(`${APP_NAME}_cpu_usage_percent`, 0));
    lines.push(metric(`${APP_NAME}_uptime_seconds`, 0));
  }

  lines.push(`# HELP ${APP_NAME}_scrape_timestamp_seconds When this scrape was generated`);
  lines.push(`# TYPE ${APP_NAME}_scrape_timestamp_seconds gauge`);
  lines.push(metric(`${APP_NAME}_scrape_timestamp_seconds`, ts / 1000));

  return lines.join('');
}

/**
 * Return metrics as JSON for GET /api/v1/metrics (debugging and non-Prometheus consumers).
 */
export async function getJsonMetrics() {
  const apiMetrics = apiMonitor.getMetrics();
  const appMetrics = applicationMetrics.getApplicationMetrics();
  const errMetrics = errorMonitor.getMetrics();
  const errHealth = errorMonitor.getHealthStatus();

  let comprehensive = null;
  try {
    comprehensive = await getComprehensiveMetrics();
  } catch (e) {
    comprehensive = { error: e.message };
  }

  let licenseSync = null;
  try {
    const syncMetrics = licenseSyncMonitor.getMetrics();
    const syncPerf = licenseSyncMonitor.getPerformanceSummary();
    licenseSync = {
      operationsTotal: syncMetrics.sync_operations_total?.value ?? 0,
      errorsTotal: syncMetrics.sync_operations_errors_total?.value ?? 0,
      lastCompletedTimestamp: syncMetrics.sync_last_completed_timestamp?.value ?? 0,
      dataProcessed: syncMetrics.sync_data_processed_total?.value ?? 0,
      externalApiRequests: syncMetrics.external_api_requests_total?.value ?? 0,
      externalApiErrors: syncMetrics.external_api_errors_total?.value ?? 0,
      activeOperations: syncMetrics.sync_active_operations?.value ?? 0,
      avgDurationMs: syncPerf?.syncOperations?.avgDuration ?? null,
    };
  } catch (_e) {
    licenseSync = { error: 'not available' };
  }

  return {
    timestamp: new Date().toISOString(),
    version: VERSION,
    env: NODE_ENV,
    api: apiMetrics.summary || {},
    application: {
      activeUsers: appMetrics.activeUsers,
      security: appMetrics.security,
    },
    errors: {
      total: errMetrics.total,
      health: { status: errHealth.status, score: errHealth.score },
    },
    system: comprehensive?.summary || null,
    database: comprehensive?.database?.connected ?? null,
    cache: comprehensive?.cache?.hitRate ?? null,
    cpu: comprehensive?.summary?.cpuUsagePercent ?? comprehensive?.system?.cpu?.usagePercent ?? null,
    licenseSync,
  };
}

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
  if (s === null || s === undefined) {
    return '';
  }
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

function pushGauge(lines, name, help, value, labels = undefined) {
  lines.push(`# HELP ${name} ${help}`);
  lines.push(`# TYPE ${name} gauge`);
  lines.push(metric(name, value, labels));
}

function toPromNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toPromFloat(value, fallback = 0) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function getFirstFiniteNumber(values, fallback = 0) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return fallback;
}

function getSyncMetricValue(syncMetrics, key, fallback = 0) {
  const value = syncMetrics?.[key]?.value;
  return Number.isFinite(value) ? value : fallback;
}

function addApiRequestMetrics(lines) {
  const apiMetrics = apiMonitor.getMetrics();
  const summary = apiMetrics.summary || {};
  pushGauge(
    lines,
    `${APP_NAME}_http_requests_total`,
    'Total HTTP requests in current window',
    toPromNumber(summary.totalRequests)
  );
  pushGauge(
    lines,
    `${APP_NAME}_http_errors_total`,
    'Total HTTP errors (4xx/5xx) in current window',
    toPromNumber(summary.totalErrors)
  );
  pushGauge(
    lines,
    `${APP_NAME}_http_error_rate_percent`,
    'Error rate percentage',
    toPromFloat(summary.errorRate)
  );
  pushGauge(
    lines,
    `${APP_NAME}_http_request_duration_seconds_avg`,
    'Average response time in seconds',
    toPromFloat(summary.averageResponseTime) / 1000
  );
  pushGauge(
    lines,
    `${APP_NAME}_http_request_duration_seconds_p95`,
    'P95 response time in seconds',
    toPromFloat(summary.p95ResponseTime) / 1000
  );
}

function addApplicationMetrics(lines) {
  const appMetrics = applicationMetrics.getApplicationMetrics();
  const security = appMetrics.security || {};
  pushGauge(
    lines,
    `${APP_NAME}_security_failed_logins_total`,
    'Failed login attempts in window',
    toPromNumber(security.failedLogins)
  );
  pushGauge(
    lines,
    `${APP_NAME}_security_rate_limited_total`,
    'Rate-limited requests in window',
    toPromNumber(security.rateLimitedRequests)
  );
  pushGauge(
    lines,
    `${APP_NAME}_active_users_current`,
    'Currently active users (approx)',
    toPromNumber(appMetrics.activeUsers)
  );
}

function addErrorMetrics(lines) {
  const errMetrics = errorMonitor.getMetrics();
  const errHealth = errorMonitor.getHealthStatus();
  pushGauge(
    lines,
    `${APP_NAME}_errors_total`,
    'Total errors recorded by error monitor',
    toPromNumber(errMetrics.total)
  );
  pushGauge(
    lines,
    `${APP_NAME}_error_health_score`,
    'Error monitor health score (0-100)',
    Number.isFinite(errHealth.score) ? errHealth.score : 100
  );
  pushGauge(
    lines,
    `${APP_NAME}_error_health_healthy`,
    'Error monitor health status (1=healthy)',
    errHealth.status === 'healthy' ? 1 : 0
  );
}

function addLicenseSyncFallbackMetrics(lines) {
  pushGauge(lines, `${APP_NAME}_license_sync_operations_total`, 'Total sync operations run', 0);
  pushGauge(lines, `${APP_NAME}_license_sync_errors_total`, 'Total sync operations that failed', 0);
  pushGauge(
    lines,
    `${APP_NAME}_license_sync_last_completed_timestamp_seconds`,
    'Last successful sync completion (Unix seconds)',
    0
  );
  pushGauge(
    lines,
    `${APP_NAME}_license_sync_data_processed_total`,
    'Licenses processed during sync',
    0
  );
  pushGauge(
    lines,
    `${APP_NAME}_license_sync_external_api_requests_total`,
    'External API requests made during sync',
    0
  );
  pushGauge(
    lines,
    `${APP_NAME}_license_sync_external_api_errors_total`,
    'External API errors during sync',
    0
  );
  pushGauge(
    lines,
    `${APP_NAME}_license_sync_active_operations`,
    'Sync operations currently running',
    0
  );
  pushGauge(
    lines,
    `${APP_NAME}_license_sync_duration_seconds_avg`,
    'Average sync run duration in seconds',
    0
  );
}

function addLicenseSyncMetrics(lines) {
  try {
    const syncMetrics = licenseSyncMonitor.getMetrics();
    const syncPerf = licenseSyncMonitor.getPerformanceSummary();
    const lastMs = getSyncMetricValue(syncMetrics, 'sync_last_completed_timestamp');
    const avgDurationMs = syncPerf?.syncOperations?.avgDuration;

    pushGauge(
      lines,
      `${APP_NAME}_license_sync_operations_total`,
      'Total sync operations run',
      getSyncMetricValue(syncMetrics, 'sync_operations_total')
    );
    pushGauge(
      lines,
      `${APP_NAME}_license_sync_errors_total`,
      'Total sync operations that failed',
      getSyncMetricValue(syncMetrics, 'sync_operations_errors_total')
    );
    pushGauge(
      lines,
      `${APP_NAME}_license_sync_last_completed_timestamp_seconds`,
      'Last successful sync completion (Unix seconds)',
      lastMs > 0 ? lastMs / 1000 : 0
    );
    pushGauge(
      lines,
      `${APP_NAME}_license_sync_data_processed_total`,
      'Licenses processed during sync',
      getSyncMetricValue(syncMetrics, 'sync_data_processed_total')
    );
    pushGauge(
      lines,
      `${APP_NAME}_license_sync_external_api_requests_total`,
      'External API requests made during sync',
      getSyncMetricValue(syncMetrics, 'external_api_requests_total')
    );
    pushGauge(
      lines,
      `${APP_NAME}_license_sync_external_api_errors_total`,
      'External API errors during sync',
      getSyncMetricValue(syncMetrics, 'external_api_errors_total')
    );
    pushGauge(
      lines,
      `${APP_NAME}_license_sync_active_operations`,
      'Sync operations currently running',
      getSyncMetricValue(syncMetrics, 'sync_active_operations')
    );
    pushGauge(
      lines,
      `${APP_NAME}_license_sync_duration_seconds_avg`,
      'Average sync run duration in seconds',
      typeof avgDurationMs === 'number' ? avgDurationMs / 1000 : 0
    );
  } catch (_e) {
    // Sync monitor may not be initialized or sync disabled
    addLicenseSyncFallbackMetrics(lines);
  }
}

function addComprehensiveFallbackMetrics(lines) {
  pushGauge(lines, `${APP_NAME}_database_connected`, '1 if database is connected', 0);
  pushGauge(lines, `${APP_NAME}_cache_hit_rate_percent`, 'Cache hit rate percentage', 0);
  pushGauge(lines, `${APP_NAME}_memory_usage_percent`, 'Process memory usage percent', 0);
  pushGauge(lines, `${APP_NAME}_cpu_usage_percent`, 'Process CPU usage percent', 0);
  pushGauge(lines, `${APP_NAME}_uptime_seconds`, 'Process uptime in seconds', 0);
}

function getDatabaseConnectedValue(comprehensive) {
  return comprehensive?.database?.connected ? 1 : 0;
}

function getCacheHitRateValue(comprehensive) {
  return getFirstFiniteNumber([
    comprehensive?.cache?.hitRate,
    comprehensive?.summary?.cacheHitRate,
  ]);
}

function getMemoryUsageValue(comprehensive) {
  return getFirstFiniteNumber([
    comprehensive?.system?.memory?.usedPercent,
    comprehensive?.summary?.memoryUsagePercent,
  ]);
}

function getCpuUsageValue(comprehensive) {
  return getFirstFiniteNumber([
    comprehensive?.system?.cpu?.usagePercent,
    comprehensive?.summary?.cpuUsagePercent,
  ]);
}

function getUptimeValue(comprehensive) {
  return getFirstFiniteNumber([comprehensive?.summary?.uptime, comprehensive?.system?.uptime]);
}

function addComprehensiveMetricsFromData(lines, comprehensive) {
  pushGauge(
    lines,
    `${APP_NAME}_database_connected`,
    '1 if database is connected',
    getDatabaseConnectedValue(comprehensive)
  );
  pushGauge(
    lines,
    `${APP_NAME}_cache_hit_rate_percent`,
    'Cache hit rate percentage',
    getCacheHitRateValue(comprehensive)
  );
  pushGauge(
    lines,
    `${APP_NAME}_memory_usage_percent`,
    'Process memory usage percent',
    getMemoryUsageValue(comprehensive)
  );
  pushGauge(
    lines,
    `${APP_NAME}_cpu_usage_percent`,
    'Process CPU usage percent',
    getCpuUsageValue(comprehensive)
  );
  pushGauge(
    lines,
    `${APP_NAME}_uptime_seconds`,
    'Process uptime in seconds',
    getUptimeValue(comprehensive)
  );
}

async function getComprehensiveMetricsOrNull() {
  try {
    return await getComprehensiveMetrics();
  } catch (_e) {
    return null;
  }
}

async function addComprehensiveMetrics(lines) {
  const comprehensive = await getComprehensiveMetricsOrNull();
  if (!comprehensive) {
    addComprehensiveFallbackMetrics(lines);
    return;
  }
  addComprehensiveMetricsFromData(lines, comprehensive);
}

function getLicenseSyncJson() {
  try {
    const syncMetrics = licenseSyncMonitor.getMetrics();
    const syncPerf = licenseSyncMonitor.getPerformanceSummary();
    return {
      operationsTotal: getSyncMetricValue(syncMetrics, 'sync_operations_total'),
      errorsTotal: getSyncMetricValue(syncMetrics, 'sync_operations_errors_total'),
      lastCompletedTimestamp: getSyncMetricValue(syncMetrics, 'sync_last_completed_timestamp'),
      dataProcessed: getSyncMetricValue(syncMetrics, 'sync_data_processed_total'),
      externalApiRequests: getSyncMetricValue(syncMetrics, 'external_api_requests_total'),
      externalApiErrors: getSyncMetricValue(syncMetrics, 'external_api_errors_total'),
      activeOperations: getSyncMetricValue(syncMetrics, 'sync_active_operations'),
      avgDurationMs: syncPerf?.syncOperations?.avgDuration ?? null,
    };
  } catch (_e) {
    return { error: 'not available' };
  }
}

function getFirstDefined(values, fallback = null) {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return fallback;
}

function getJsonCpuValue(comprehensive) {
  return getFirstDefined(
    [comprehensive?.summary?.cpuUsagePercent, comprehensive?.system?.cpu?.usagePercent],
    null
  );
}

function getJsonSystemFields(comprehensive) {
  return {
    system: getFirstDefined([comprehensive?.summary], null),
    database: getFirstDefined([comprehensive?.database?.connected], null),
    cache: getFirstDefined([comprehensive?.cache?.hitRate], null),
    cpu: getJsonCpuValue(comprehensive),
  };
}

function buildJsonMetricsPayload(baseData) {
  const { apiMetrics, appMetrics, errMetrics, errHealth, comprehensive } = baseData;
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
    ...getJsonSystemFields(comprehensive),
    licenseSync: getLicenseSyncJson(),
  };
}

/**
 * Build Prometheus text format from current in-app metrics.
 */
export async function getPrometheusMetricsText() {
  const lines = [];
  const ts = Date.now();

  pushGauge(lines, `${APP_NAME}_info`, 'Application and deployment info', 1, {
    version: VERSION,
    env: NODE_ENV,
  });
  addApiRequestMetrics(lines);
  addApplicationMetrics(lines);
  addErrorMetrics(lines);
  addLicenseSyncMetrics(lines);
  await addComprehensiveMetrics(lines);
  pushGauge(
    lines,
    `${APP_NAME}_scrape_timestamp_seconds`,
    'When this scrape was generated',
    ts / 1000
  );

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
  const comprehensive = await getComprehensiveMetricsOrNull();
  return buildJsonMetricsPayload({
    apiMetrics,
    appMetrics,
    errMetrics,
    errHealth,
    comprehensive,
  });
}

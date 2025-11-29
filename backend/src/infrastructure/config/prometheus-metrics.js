/**
 * Prometheus-compatible metrics exporter
 * Exposes metrics in Prometheus text format for scraping
 */

import { apiMonitor } from './monitoring.js';
import { getComprehensiveMetrics } from './metrics.js';
import logger from './logger.js';

/**
 * Convert metrics to Prometheus text format
 */
export const getPrometheusMetrics = async () => {
  try {
    const apiMetrics = apiMonitor.getMetrics();
    const comprehensiveMetrics = await getComprehensiveMetrics();
    
    const lines = [];
    
    // API Request Metrics
    lines.push('# HELP api_requests_total Total number of API requests');
    lines.push('# TYPE api_requests_total counter');
    lines.push(`api_requests_total ${apiMetrics.summary.totalRequests || 0}`);
    
    lines.push('# HELP api_requests_errors_total Total number of API errors');
    lines.push('# TYPE api_requests_errors_total counter');
    lines.push(`api_requests_errors_total ${apiMetrics.summary.totalErrors || 0}`);
    
    lines.push('# HELP api_request_duration_seconds API request duration in seconds');
    lines.push('# TYPE api_request_duration_seconds histogram');
    lines.push(`api_request_duration_seconds_bucket{le="0.1"} ${apiMetrics.summary.responseTimes?.filter(t => t <= 0.1).length || 0}`);
    lines.push(`api_request_duration_seconds_bucket{le="0.5"} ${apiMetrics.summary.responseTimes?.filter(t => t <= 0.5).length || 0}`);
    lines.push(`api_request_duration_seconds_bucket{le="1.0"} ${apiMetrics.summary.responseTimes?.filter(t => t <= 1.0).length || 0}`);
    lines.push(`api_request_duration_seconds_bucket{le="5.0"} ${apiMetrics.summary.responseTimes?.filter(t => t <= 5.0).length || 0}`);
    lines.push(`api_request_duration_seconds_bucket{le="+Inf"} ${apiMetrics.summary.totalRequests || 0}`);
    lines.push(`api_request_duration_seconds_sum ${(apiMetrics.summary.totalResponseTime || 0) / 1000}`);
    lines.push(`api_request_duration_seconds_count ${apiMetrics.summary.totalRequests || 0}`);
    
    // Average response time
    lines.push('# HELP api_request_duration_seconds_avg Average API request duration in seconds');
    lines.push('# TYPE api_request_duration_seconds_avg gauge');
    lines.push(`api_request_duration_seconds_avg ${(apiMetrics.summary.averageResponseTime || 0) / 1000}`);
    
    // Error rate
    lines.push('# HELP api_error_rate Error rate (0-1)');
    lines.push('# TYPE api_error_rate gauge');
    lines.push(`api_error_rate ${apiMetrics.summary.errorRate || 0}`);
    
    // System Metrics
    if (comprehensiveMetrics.system) {
      const sys = comprehensiveMetrics.system;
      
      lines.push('# HELP system_memory_usage_percent Memory usage percentage');
      lines.push('# TYPE system_memory_usage_percent gauge');
      lines.push(`system_memory_usage_percent ${parseFloat(sys.memoryUsagePercent) || 0}`);
      
      lines.push('# HELP system_cpu_usage_percent CPU usage percentage');
      lines.push('# TYPE system_cpu_usage_percent gauge');
      lines.push(`system_cpu_usage_percent ${parseFloat(sys.cpuUsagePercent) || 0}`);
      
      lines.push('# HELP system_uptime_seconds System uptime in seconds');
      lines.push('# TYPE system_uptime_seconds gauge');
      lines.push(`system_uptime_seconds ${sys.uptime || 0}`);
    }
    
    // Database Metrics
    if (comprehensiveMetrics.database) {
      const db = comprehensiveMetrics.database;
      
      lines.push('# HELP database_connected Database connection status (1=connected, 0=disconnected)');
      lines.push('# TYPE database_connected gauge');
      lines.push(`database_connected ${db.connected ? 1 : 0}`);
      
      lines.push('# HELP database_collections_total Total number of collections');
      lines.push('# TYPE database_collections_total gauge');
      lines.push(`database_collections_total ${db.collections || 0}`);
      
      lines.push('# HELP database_objects_total Total number of database objects');
      lines.push('# TYPE database_objects_total gauge');
      lines.push(`database_objects_total ${db.objects || 0}`);
    }
    
    // Cache Metrics
    if (comprehensiveMetrics.cache) {
      const cache = comprehensiveMetrics.cache;
      
      lines.push('# HELP cache_hit_rate Cache hit rate (0-1)');
      lines.push('# TYPE cache_hit_rate gauge');
      lines.push(`cache_connected ${cache.connected ? 1 : 0}`);
      
      lines.push('# HELP cache_connected Cache connection status (1=connected, 0=disconnected)');
      lines.push('# TYPE cache_connected gauge');
      lines.push(`cache_hit_rate ${cache.hitRate || 0}`);
    }
    
    // Application Metrics
    if (comprehensiveMetrics.application) {
      const app = comprehensiveMetrics.application;
      
      lines.push('# HELP application_active_users Active users count');
      lines.push('# TYPE application_active_users gauge');
      lines.push(`application_active_users ${app.activeUsers || 0}`);
      
      lines.push('# HELP application_endpoint_count Total number of API endpoints');
      lines.push('# TYPE application_endpoint_count gauge');
      lines.push(`application_endpoint_count ${app.endpointCount || 0}`);
      
      if (app.security) {
        lines.push('# HELP application_security_failed_logins_total Total failed login attempts');
        lines.push('# TYPE application_security_failed_logins_total counter');
        lines.push(`application_security_failed_logins_total ${app.security.failedLogins || 0}`);
        
        lines.push('# HELP application_security_rate_limited_requests_total Total rate-limited requests');
        lines.push('# TYPE application_security_rate_limited_requests_total counter');
        lines.push(`application_security_rate_limited_requests_total ${app.security.rateLimitedRequests || 0}`);
      }
    }
    
    // Health Status
    lines.push('# HELP application_health_status Application health status (1=healthy, 0=unhealthy)');
    lines.push('# TYPE application_health_status gauge');
    lines.push(`application_health_status ${comprehensiveMetrics.status === 'healthy' ? 1 : 0}`);
    
    return lines.join('\n') + '\n';
  } catch (error) {
    logger.error('Error generating Prometheus metrics:', error);
    throw error;
  }
};


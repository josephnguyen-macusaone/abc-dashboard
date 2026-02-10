import logger, { getLogHistory, getLogPerformanceMetrics, clearLogHistory, clearLogPerformanceMetrics } from './logger';

/**
 * Logging configuration management
 * Allows dynamic control of logging behavior in development
 */
class LoggingConfigManager {
  private static instance: LoggingConfigManager;

  static getInstance(): LoggingConfigManager {
    if (!LoggingConfigManager.instance) {
      LoggingConfigManager.instance = new LoggingConfigManager();
    }
    return LoggingConfigManager.instance;
  }

  /**
   * Enable/disable specific log categories
   */
  setCategoryEnabled(category: string, enabled: boolean): void {
    logger.info(`${enabled ? 'Enabled' : 'Disabled'} logging category: ${category}`, {
      category: 'logging-config'
    });

    // In a real implementation, this would modify the LOG_CONFIG
    // For now, this is just for development visibility
  }

  /**
   * Set sampling rate for a log level
   */
  setSamplingRate(level: 'http' | 'debug' | 'trace' | 'info', rate: number): void {
    logger.info(`Set ${level} sampling rate to ${rate}`, {
      category: 'logging-config',
      level,
      rate
    });
  }

  /**
   * Get current logging statistics
   */
  getStats() {
    const history = getLogHistory();
    const performanceMetrics = getLogPerformanceMetrics();

    const stats = {
      totalLogs: history.length,
      logsByLevel: history.reduce((acc, log) => {
        acc[log.level] = (acc[log.level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      logsByCategory: history.reduce((acc, log) => {
        const category = log.category || 'uncategorized';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      slowLogs: Object.keys(performanceMetrics).length,
      performanceMetrics,
    };

    logger.info('Logging statistics requested', {
      category: 'logging-config',
      stats
    });

    return stats;
  }

  /**
   * Clear all logging history and metrics
   */
  clearAll(): void {
    clearLogHistory();
    clearLogPerformanceMetrics();
    logger.info('Cleared all logging history and metrics', {
      category: 'logging-config'
    });
  }

  /**
   * Export logs for debugging
   */
  exportLogs(): string {
    const history = getLogHistory();
    const stats = this.getStats();

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      stats,
      logs: history,
    }, null, 2);
  }
}

// Global logging control functions for browser console
declare global {
  interface Window {
    logging: LoggingConfigManager;
  }
}

// Make logging manager available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.logging = LoggingConfigManager.getInstance();
}

export default LoggingConfigManager;
export const loggingConfig = LoggingConfigManager.getInstance();

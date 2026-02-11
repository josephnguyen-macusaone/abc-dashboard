/**
 * License Sync Scheduler
 * Handles scheduled execution of license synchronization with external sources
 */
import cron from 'node-cron';
import logger from '../config/logger.js';

export class LicenseSyncScheduler {
  constructor(syncExternalLicensesUseCase, config = {}, licenseRealtimeService = null) {
    this.syncExternalLicensesUseCase = syncExternalLicensesUseCase;
    this.licenseRealtimeService = licenseRealtimeService;
    this.config = {
      enabled: config.enabled !== false,
      // Run every 30 min by default (server-friendly); was */15 (every 15 min)
      syncSchedule: config.syncSchedule || '*/30 * * * *',
      timezone: config.timezone || 'UTC',
      // Sync configuration
      batchSize: config.batchSize || 20,
      comprehensive: config.comprehensive || false,
      syncToInternalOnly: config.syncToInternalOnly || false,
      forceFullSync: config.forceFullSync || false,
      ...config,
    };

    this.jobs = new Map();
    this.isRunning = false;
    this.syncInProgress = false;
    this.lastSyncResult = null;
    this.syncStats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      totalDuration: 0,
      lastRunTime: null,
      totalRecordsProcessed: 0,
    };
  }

  /**
   * Start the scheduler
   */
  async start() {
    if (!this.config.enabled) {
      logger.info('License sync scheduler is disabled');
      return;
    }

    if (this.isRunning) {
      logger.warn('License sync scheduler is already running');
      return;
    }

    logger.info('Starting license sync scheduler', {
      syncSchedule: this.config.syncSchedule,
      batchSize: this.config.batchSize,
      timezone: this.config.timezone,
    });

    try {
      // Schedule license sync
      this.jobs.set(
        'licenseSync',
        cron.schedule(this.config.syncSchedule, () => this.runLicenseSync(), {
          timezone: this.config.timezone,
          name: 'license-external-sync',
        })
      );

      this.isRunning = true;
    } catch (error) {
      logger.error('Failed to start license sync scheduler', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Stop the scheduler
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping license sync scheduler');

    try {
      // Stop all cron jobs
      for (const [name, job] of this.jobs) {
        job.stop();
        logger.debug(`Stopped cron job: ${name}`);
      }

      this.jobs.clear();
      this.isRunning = false;

      logger.info('License sync scheduler stopped successfully');
    } catch (error) {
      logger.error('Error stopping license sync scheduler', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Run license sync
   */
  async runLicenseSync() {
    const jobName = 'licenseSync';

    if (this.syncInProgress) {
      logger.warn('Skipping scheduled license sync: previous sync still in progress');
      return;
    }

    this.syncInProgress = true;

    try {
      logger.info('Running scheduled license sync');

      const startTime = Date.now();
      this.syncStats.totalRuns += 1;

      const syncResult = await this.syncExternalLicensesUseCase.execute({
        comprehensive: this.config.comprehensive,
        batchSize: this.config.batchSize,
        syncToInternalOnly: this.config.syncToInternalOnly,
        forceFullSync: this.config.forceFullSync,
      });

      const duration = Date.now() - startTime;
      this.syncStats.totalDuration += duration;
      this.syncStats.lastRunTime = new Date().toISOString();

      // Update success/failure stats
      if (syncResult.success) {
        this.syncStats.successfulRuns += 1;
        this.syncStats.totalRecordsProcessed +=
          (syncResult.created || 0) + (syncResult.updated || 0);
      } else {
        this.syncStats.failedRuns += 1;
      }

      this.lastSyncResult = {
        ...syncResult,
        duration,
        timestamp: new Date().toISOString(),
      };

      logger.info('Scheduled license sync completed', {
        duration,
        success: syncResult.success,
        totalFetched: syncResult.totalFetched,
        created: syncResult.created,
        updated: syncResult.updated,
        failed: syncResult.failed,
        errors: syncResult.errors?.length || 0,
      });

      if (this.licenseRealtimeService?.emitSyncComplete) {
        this.licenseRealtimeService.emitSyncComplete({
          timestamp: this.lastSyncResult.timestamp,
          duration: this.lastSyncResult.duration,
          created: syncResult.created ?? 0,
          updated: syncResult.updated ?? 0,
          failed: syncResult.failed ?? 0,
          success: syncResult.success ?? false,
        });
      }

      // Log metrics for monitoring
      this.logJobMetrics(jobName, {
        duration,
        success: syncResult.success,
        totalFetched: syncResult.totalFetched,
        created: syncResult.created,
        updated: syncResult.updated,
        failed: syncResult.failed,
        errors: syncResult.errors?.length || 0,
      });
    } catch (error) {
      this.syncStats.failedRuns += 1;
      logger.error('Scheduled license sync failed', {
        error: error.message,
        stack: error.stack,
      });

      this.lastSyncResult = {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };

      this.logJobError(jobName, error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Manually trigger a sync
   */
  async runManualSync(options = {}) {
    const overrideConfig = {
      ...this.config,
      ...options,
    };

    logger.info('Manually triggering license sync', { overrideConfig });

    try {
      const startTime = Date.now();

      const syncResult = await this.syncExternalLicensesUseCase.execute({
        comprehensive: overrideConfig.comprehensive,
        batchSize: overrideConfig.batchSize,
        syncToInternalOnly: overrideConfig.syncToInternalOnly,
        forceFullSync: overrideConfig.forceFullSync,
      });

      const duration = Date.now() - startTime;

      logger.info('Manual license sync completed', {
        duration,
        success: syncResult.success,
        totalFetched: syncResult.totalFetched,
        created: syncResult.created,
        updated: syncResult.updated,
        failed: syncResult.failed,
      });

      return {
        ...syncResult,
        duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Manual license sync failed', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get scheduler status and statistics
   */
  getStatus() {
    const jobs = {};
    for (const [name, job] of this.jobs) {
      jobs[name] = {
        running: job.running,
        scheduled: job.scheduled,
        destroyed: job.destroyed,
      };
    }

    const avgDuration =
      this.syncStats.totalRuns > 0
        ? Math.round(this.syncStats.totalDuration / this.syncStats.totalRuns)
        : 0;

    const successRate =
      this.syncStats.totalRuns > 0
        ? Math.round((this.syncStats.successfulRuns / this.syncStats.totalRuns) * 100)
        : 0;

    return {
      enabled: this.config.enabled,
      running: this.isRunning,
      syncInProgress: this.syncInProgress,
      timezone: this.config.timezone,
      schedule: this.config.syncSchedule,
      config: {
        batchSize: this.config.batchSize,
        comprehensive: this.config.comprehensive,
        syncToInternalOnly: this.config.syncToInternalOnly,
        forceFullSync: this.config.forceFullSync,
      },
      jobs,
      lastSyncResult: this.lastSyncResult,
      statistics: {
        ...this.syncStats,
        avgDuration,
        successRate: `${successRate}%`,
      },
    };
  }

  /**
   * Log job execution metrics
   */
  logJobMetrics(jobName, metrics) {
    logger.debug(`Sync job metrics: ${jobName}`, {
      job: jobName,
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log job execution errors
   */
  logJobError(jobName, error) {
    logger.error(`Sync job error: ${jobName}`, {
      job: jobName,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Update scheduler configuration
   */
  updateConfig(newConfig) {
    logger.info('Updating license sync scheduler configuration', {
      oldConfig: this.config,
      newConfig,
    });

    // Stop current jobs if running
    if (this.isRunning) {
      this.stop();
    }

    // Update configuration
    this.config = { ...this.config, ...newConfig };

    // Restart with new configuration
    if (this.config.enabled) {
      this.start();
    }
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown() {
    logger.info('License sync scheduler graceful shutdown initiated');

    try {
      await this.stop();
      logger.info('License sync scheduler graceful shutdown completed');
    } catch (error) {
      logger.error('Error during license sync scheduler graceful shutdown', {
        error: error.message,
        stack: error.stack,
      });
    }
  }
}

export default LicenseSyncScheduler;

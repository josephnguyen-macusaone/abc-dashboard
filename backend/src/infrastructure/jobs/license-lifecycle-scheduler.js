/**
 * License Lifecycle Scheduler
 * Handles scheduled execution of license lifecycle operations
 */
import cron from 'node-cron';
import logger from '../config/logger.js';

export class LicenseLifecycleScheduler {
  constructor(licenseLifecycleService, config = {}) {
    this.licenseLifecycleService = licenseLifecycleService;
    this.config = {
      enabled: config.enabled !== false,
      // Run every 4 hours during business hours
      expiringReminderSchedule: config.expiringReminderSchedule || '0 9,13,17 * * 1-5',
      // Run daily at 2 AM
      expirationCheckSchedule: config.expirationCheckSchedule || '0 2 * * *',
      // Run weekly on Sunday at 3 AM
      gracePeriodUpdateSchedule: config.gracePeriodUpdateSchedule || '0 3 * * 0',
      timezone: config.timezone || 'UTC',
      ...config,
    };

    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Start the scheduler
   */
  async start() {
    if (!this.config.enabled) {
      logger.info('License lifecycle scheduler is disabled');
      return;
    }

    if (this.isRunning) {
      logger.warn('License lifecycle scheduler is already running');
      return;
    }

    logger.info('Starting license lifecycle scheduler', {
      expiringReminderSchedule: this.config.expiringReminderSchedule,
      expirationCheckSchedule: this.config.expirationCheckSchedule,
      gracePeriodUpdateSchedule: this.config.gracePeriodUpdateSchedule,
      timezone: this.config.timezone,
    });

    try {
      // Schedule expiring license reminders (30, 7, 1 day reminders)
      this.jobs.set('expiringReminders', cron.schedule(
        this.config.expiringReminderSchedule,
        () => this.runExpiringReminders(),
        {
          timezone: this.config.timezone,
          name: 'license-expiring-reminders',
        }
      ));

      // Schedule expired license processing (auto-suspension)
      this.jobs.set('expirationChecks', cron.schedule(
        this.config.expirationCheckSchedule,
        () => this.runExpirationChecks(),
        {
          timezone: this.config.timezone,
          name: 'license-expiration-checks',
        }
      ));

      // Schedule grace period updates
      this.jobs.set('gracePeriodUpdates', cron.schedule(
        this.config.gracePeriodUpdateSchedule,
        () => this.runGracePeriodUpdates(),
        {
          timezone: this.config.timezone,
          name: 'license-grace-period-updates',
        }
      ));

      this.isRunning = true;
      logger.info('License lifecycle scheduler started successfully');

    } catch (error) {
      logger.error('Failed to start license lifecycle scheduler', {
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

    logger.info('Stopping license lifecycle scheduler');

    try {
      // Stop all cron jobs
      for (const [name, job] of this.jobs) {
        job.stop();
        logger.debug(`Stopped cron job: ${name}`);
      }

      this.jobs.clear();
      this.isRunning = false;

      logger.info('License lifecycle scheduler stopped successfully');

    } catch (error) {
      logger.error('Error stopping license lifecycle scheduler', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Run expiring license reminders
   */
  async runExpiringReminders() {
    const jobName = 'expiringReminders';

    try {
      logger.info('Running scheduled expiring license reminders');

      const startTime = Date.now();
      const results = await this.licenseLifecycleService.processExpiringLicenses();
      const duration = Date.now() - startTime;

      logger.info('Scheduled expiring license reminders completed', {
        duration,
        processed: results.processed,
        success: results.success,
      });

      // Log metrics for monitoring
      this.logJobMetrics(jobName, {
        duration,
        processed: results.processed,
        success: results.success,
      });

    } catch (error) {
      logger.error('Scheduled expiring license reminders failed', {
        error: error.message,
        stack: error.stack,
      });

      this.logJobError(jobName, error);
    }
  }

  /**
   * Run expiration checks and auto-suspension
   */
  async runExpirationChecks() {
    const jobName = 'expirationChecks';

    try {
      logger.info('Running scheduled license expiration checks');

      const startTime = Date.now();
      const results = await this.licenseLifecycleService.processExpiredLicenses();
      const duration = Date.now() - startTime;

      logger.info('Scheduled license expiration checks completed', {
        duration,
        suspended: results.suspended,
        success: results.success,
      });

      // Log metrics for monitoring
      this.logJobMetrics(jobName, {
        duration,
        suspended: results.suspended,
        success: results.success,
      });

    } catch (error) {
      logger.error('Scheduled license expiration checks failed', {
        error: error.message,
        stack: error.stack,
      });

      this.logJobError(jobName, error);
    }
  }

  /**
   * Run grace period updates
   */
  async runGracePeriodUpdates() {
    const jobName = 'gracePeriodUpdates';

    try {
      logger.info('Running scheduled grace period updates');

      const startTime = Date.now();
      const results = await this.licenseLifecycleService.updateGracePeriods();
      const duration = Date.now() - startTime;

      logger.info('Scheduled grace period updates completed', {
        duration,
        updated: results.updated,
        success: results.success,
      });

      // Log metrics for monitoring
      this.logJobMetrics(jobName, {
        duration,
        updated: results.updated,
        success: results.success,
      });

    } catch (error) {
      logger.error('Scheduled grace period updates failed', {
        error: error.message,
        stack: error.stack,
      });

      this.logJobError(jobName, error);
    }
  }

  /**
   * Manually trigger a job execution
   */
  async runJob(jobName) {
    logger.info(`Manually triggering job: ${jobName}`);

    switch (jobName) {
      case 'expiringReminders':
        await this.runExpiringReminders();
        break;
      case 'expirationChecks':
        await this.runExpirationChecks();
        break;
      case 'gracePeriodUpdates':
        await this.runGracePeriodUpdates();
        break;
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }

  /**
   * Get scheduler status
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

    return {
      enabled: this.config.enabled,
      running: this.isRunning,
      timezone: this.config.timezone,
      schedules: {
        expiringReminders: this.config.expiringReminderSchedule,
        expirationChecks: this.config.expirationCheckSchedule,
        gracePeriodUpdates: this.config.gracePeriodUpdateSchedule,
      },
      jobs,
    };
  }

  /**
   * Log job execution metrics
   */
  logJobMetrics(jobName, metrics) {
    // This could be enhanced to send metrics to a monitoring system
    logger.info(`Job metrics: ${jobName}`, {
      job: jobName,
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log job execution errors
   */
  logJobError(jobName, error) {
    logger.error(`Job error: ${jobName}`, {
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
    logger.info('Updating license lifecycle scheduler configuration', {
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
    logger.info('License lifecycle scheduler graceful shutdown initiated');

    try {
      await this.stop();
      logger.info('License lifecycle scheduler graceful shutdown completed');
    } catch (error) {
      logger.error('Error during license lifecycle scheduler graceful shutdown', {
        error: error.message,
        stack: error.stack,
      });
    }
  }
}

export default LicenseLifecycleScheduler;
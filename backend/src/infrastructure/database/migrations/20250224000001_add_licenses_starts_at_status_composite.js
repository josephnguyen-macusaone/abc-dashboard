import logger from '../../config/logger.js';

/**
 * Migration: Add composite index for licenses(starts_at, status)
 * Optimizes common filter pattern: date range + status (e.g. /licenses?startDate=&endDate=&status=)
 */
export async function up(knex) {
  logger.info('Adding licenses(starts_at, status) composite index...');
  await knex.raw(
    'CREATE INDEX IF NOT EXISTS idx_licenses_starts_at_status ON licenses (starts_at, status)'
  );
  logger.info('Composite index idx_licenses_starts_at_status added');
}

export async function down(knex) {
  logger.info('Removing licenses(starts_at, status) composite index...');
  await knex.raw('DROP INDEX IF EXISTS idx_licenses_starts_at_status');
  logger.info('Composite index removed');
}

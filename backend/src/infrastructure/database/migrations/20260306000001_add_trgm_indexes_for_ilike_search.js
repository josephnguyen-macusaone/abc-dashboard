import logger from '../../../shared/utils/logger.js';

/**
 * Migration: GIN/pg_trgm indexes for ILIKE '%term%' searches on licenses
 *
 * Without these, every ILIKE '%…%' query does a full sequential scan.
 * With GIN + gin_trgm_ops, Postgres can use the trigram index even when
 * the pattern starts with '%', dropping search latency from O(rows) to
 * O(log n + results).
 *
 * agents_name is jsonb; trigram index uses the text representation.
 */
export async function up(knex) {
  logger.info('Adding pg_trgm extension and trigram search indexes...');

  // Enable the extension (idempotent — safe to run multiple times)
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pg_trgm');

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_licenses_dba_trgm
      ON licenses USING gin (dba gin_trgm_ops)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_licenses_key_trgm
      ON licenses USING gin (key gin_trgm_ops)
  `);

  // agents_name is jsonb; gin_trgm_ops requires text — index on cast to text
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_licenses_agents_name_trgm
      ON licenses USING gin ((agents_name::text) gin_trgm_ops)
      WHERE agents_name IS NOT NULL
  `);

  logger.info('Trigram indexes created: idx_licenses_dba_trgm, idx_licenses_key_trgm, idx_licenses_agents_name_trgm');
}

export async function down(knex) {
  logger.info('Dropping trigram search indexes...');

  await knex.raw('DROP INDEX IF EXISTS idx_licenses_dba_trgm');
  await knex.raw('DROP INDEX IF EXISTS idx_licenses_key_trgm');
  await knex.raw('DROP INDEX IF EXISTS idx_licenses_agents_name_trgm');

  logger.info('Trigram indexes dropped');
}

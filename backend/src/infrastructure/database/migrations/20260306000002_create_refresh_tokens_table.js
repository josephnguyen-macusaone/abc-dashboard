import logger from '../../../shared/utils/logger.js';

/**
 * Migration: refresh_tokens table for revocable refresh token support (SEC-4)
 *
 * Stores a SHA-256 hash of each issued refresh token alongside the user ID
 * and an expiry timestamp.  On logout or token rotation, the row is deleted.
 * Attempting to use an unknown hash → InvalidRefreshTokenException.
 *
 * A scheduled cleanup (or DB-level TTL via pg_cron) removes expired rows.
 */
export async function up(knex) {
  logger.info('Creating refresh_tokens table...');

  await knex.schema.createTable('refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token_hash', 64).notNullable().unique(); // SHA-256 hex digest
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('expires_at');
  });

  logger.info('refresh_tokens table created');
}

export async function down(knex) {
  logger.info('Dropping refresh_tokens table...');
  await knex.schema.dropTableIfExists('refresh_tokens');
  logger.info('refresh_tokens table dropped');
}

import logger from '../../../shared/utils/logger.js';

/**
 * Migration: sync_state + sync_failures tables
 *
 * sync_state (A2 — delta/incremental sync)
 * ─────────────────────────────────────────
 * Tracks the timestamp of the last successful external-API sync.
 * The sync use-case passes `?updatedAfter=<last_sync_at>` to the partner
 * API so only changed records are fetched — drastically reducing API call
 * volume on routine syncs.
 *
 * sync_failures (A5 — dead-letter queue)
 * ───────────────────────────────────────
 * Persists appids that failed during sync so they can be retried without
 * triggering a full re-sync.  The sync use-case writes failures here;
 * `syncPendingLicenses` reads and retries them.
 */
export async function up(knex) {
  logger.info('Creating sync_state table...');
  await knex.schema.createTable('sync_state', (table) => {
    // One row per named sync operation (e.g. 'external_licenses')
    table.string('sync_key', 100).primary();
    table.timestamp('last_sync_at').nullable();
    table.timestamp('last_successful_sync_at').nullable();
    table.integer('last_sync_count').defaultTo(0);
    table.string('last_sync_status', 50).defaultTo('never');
    table.text('last_sync_error').nullable();
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  logger.info('Creating sync_failures table...');
  await knex.schema.createTable('sync_failures', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('appid', 255).notNullable();
    table.text('error_message').notNullable();
    table.integer('retry_count').notNullable().defaultTo(0);
    table.integer('max_retries').notNullable().defaultTo(5);
    table.timestamp('last_attempted_at').nullable();
    table.timestamp('next_retry_at').nullable();
    table.boolean('resolved').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('appid');
    table.index(['resolved', 'next_retry_at']);
  });

  // Seed the single external-licenses sync state row
  await knex('sync_state').insert({
    sync_key: 'external_licenses',
    last_sync_status: 'never',
  });

  logger.info('sync_state and sync_failures tables created');
}

export async function down(knex) {
  logger.info('Dropping sync_state and sync_failures tables...');
  await knex.schema.dropTableIfExists('sync_failures');
  await knex.schema.dropTableIfExists('sync_state');
  logger.info('Tables dropped');
}

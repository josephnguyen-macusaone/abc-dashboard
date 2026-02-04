import logger from '../../config/logger.js';

/**
 * Migration: Add External Sync Performance Indexes
 * Adds database indexes specifically for external license synchronization operations
 * to improve performance of bulk operations and lookups
 */
export async function up(knex) {
  logger.info('Adding external sync performance indexes...');

  // licenses table has appid/countid from 20241217000001 (not external_appid/external_countid)
  const hasAppIdColumn = await knex.schema.hasColumn('licenses', 'appid');
  const hasCountIdColumn = await knex.schema.hasColumn('licenses', 'countid');

  if (!hasAppIdColumn || !hasCountIdColumn) {
    logger.info(
      'Required sync columns (appid, countid) not found on licenses. Skipping licenses sync indexes.',
      {
        hasAppIdColumn,
        hasCountIdColumn,
      }
    );
  } else {
    // ==========================================================================
    // Licenses Table - External Sync Indexes (appid, countid, external_sync_status)
    // ==========================================================================

    await knex.schema.table('licenses', (table) => {
      table.index('appid', 'idx_licenses_external_appid_sync');
      table.index('countid', 'idx_licenses_external_countid_sync');
    });

    const hasExternalSyncStatusColumn = await knex.schema.hasColumn(
      'licenses',
      'external_sync_status'
    );
    if (hasExternalSyncStatusColumn) {
      await knex.schema.table('licenses', (table) => {
        table.index('external_sync_status', 'idx_licenses_external_sync_status_sync');
      });
    }

    const hasLastExternalSyncColumn = await knex.schema.hasColumn('licenses', 'last_external_sync');
    if (hasLastExternalSyncColumn) {
      await knex.schema.table('licenses', (table) => {
        table.index('last_external_sync', 'idx_licenses_last_external_sync_sync');
      });
    }

    await knex.schema.table('licenses', (table) => {
      table.index(['appid', 'external_sync_status'], 'idx_licenses_external_appid_sync_status');
      table.index(['countid', 'external_sync_status'], 'idx_licenses_external_countid_sync_status');
      table.index(['external_sync_status', 'last_external_sync'], 'idx_licenses_sync_status_time');
    });
  }

  // ==========================================================================
  // External Licenses Table - Sync Operation Indexes
  // Use IF NOT EXISTS so migration is idempotent (safe when indexes already exist from 20241215000001 or re-runs).
  // ==========================================================================

  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_external_licenses_appid ON external_licenses (appid)`
  );
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_external_licenses_countid ON external_licenses (countid)`
  );
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_external_licenses_email ON external_licenses (email_license)
    WHERE email_license IS NOT NULL
  `);
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_external_licenses_license_type ON external_licenses (license_type)`
  );
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_external_licenses_status ON external_licenses (status)`
  );
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_external_licenses_sync_status ON external_licenses (sync_status)`
  );
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_external_licenses_last_synced_at ON external_licenses (last_synced_at)`
  );
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_external_licenses_monthly_fee ON external_licenses (monthly_fee)`
  );
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_external_licenses_status_sync ON external_licenses (status, sync_status)`
  );
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_external_licenses_sync_time ON external_licenses (sync_status, last_synced_at)`
  );
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_external_licenses_type_status ON external_licenses (license_type, status)`
  );

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_external_licenses_active_only ON external_licenses (appid, email_license, monthly_fee)
    WHERE status = 1
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_external_licenses_failed_sync ON external_licenses (appid, sync_error)
    WHERE sync_status = 'failed'
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_external_licenses_pending_sync ON external_licenses (created_at)
    WHERE sync_status = 'pending'
  `);

  logger.info('External sync performance indexes added successfully');
}

export async function down(knex) {
  logger.info('Removing external sync performance indexes...');

  // Use IF EXISTS so rollback never fails when an index was never created or already dropped
  const licensesIndexes = [
    'idx_licenses_external_appid_sync',
    'idx_licenses_external_countid_sync',
    'idx_licenses_external_email_sync',
    'idx_licenses_external_status_sync',
    'idx_licenses_external_sync_status_sync',
    'idx_licenses_last_external_sync_sync',
    'idx_licenses_external_sendbat_workspace_sync',
    'idx_licenses_external_coming_expired_sync',
    'idx_licenses_external_appid_sync_status',
    'idx_licenses_external_countid_sync_status',
    'idx_licenses_sync_status_time',
  ];
  const externalIndexes = [
    'idx_external_licenses_appid',
    'idx_external_licenses_countid',
    'idx_external_licenses_email',
    'idx_external_licenses_license_type',
    'idx_external_licenses_status',
    'idx_external_licenses_sync_status',
    'idx_external_licenses_last_synced_at',
    'idx_external_licenses_monthly_fee',
    'idx_external_licenses_status_sync',
    'idx_external_licenses_sync_time',
    'idx_external_licenses_type_status',
    'idx_external_licenses_active_only',
    'idx_external_licenses_failed_sync',
    'idx_external_licenses_pending_sync',
  ];

  for (const name of licensesIndexes) {
    await knex.raw(`DROP INDEX IF EXISTS "${name}"`);
  }
  for (const name of externalIndexes) {
    await knex.raw(`DROP INDEX IF EXISTS "${name}"`);
  }

  logger.info('External sync performance indexes removed');
}

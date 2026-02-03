import logger from '../../config/logger.js';

/**
 * Migration: Add External Sync Performance Indexes
 * Adds database indexes specifically for external license synchronization operations
 * to improve performance of bulk operations and lookups
 */
export async function up(knex) {
  logger.info('Adding external sync performance indexes...');

  const hasExternalAppIdColumn = await knex.schema.hasColumn('licenses', 'external_appid');
  const hasExternalCountIdColumn = await knex.schema.hasColumn('licenses', 'external_countid');

  if (!hasExternalAppIdColumn || !hasExternalCountIdColumn) {
    logger.info('Required external columns not found. Skipping performance indexes migration.', {
      hasExternalAppIdColumn,
      hasExternalCountIdColumn,
    });
    return;
  }

  // ==========================================================================
  // Licenses Table - External Sync Indexes
  // ==========================================================================

  // External appid index for fast lookups during sync
  await knex.schema.table('licenses', (table) => {
    table.index('external_appid', 'idx_licenses_external_appid_sync');
  });

  // External countid index for alternative identifier lookups
  await knex.schema.table('licenses', (table) => {
    table.index('external_countid', 'idx_licenses_external_countid_sync');
  });

  // External email index for email-based matching (case-insensitive)
  const hasExternalEmailColumn = await knex.schema.hasColumn('licenses', 'external_email');
  if (hasExternalEmailColumn) {
    await knex.raw(`
      CREATE INDEX CONCURRENTLY idx_licenses_external_email_sync ON licenses (external_email)
      WHERE external_email IS NOT NULL
    `);
  }

  // License type index for filtering external licenses
  const hasExternalStatusColumn = await knex.schema.hasColumn('licenses', 'external_status');
  if (hasExternalStatusColumn) {
    await knex.schema.table('licenses', (table) => {
      table.index('external_status', 'idx_licenses_external_status_sync');
    });
  }

  // External sync status index for monitoring sync progress
  const hasExternalSyncStatusColumn = await knex.schema.hasColumn(
    'licenses',
    'external_sync_status'
  );
  if (hasExternalSyncStatusColumn) {
    await knex.schema.table('licenses', (table) => {
      table.index('external_sync_status', 'idx_licenses_external_sync_status_sync');
    });
  }

  // Last external sync timestamp index for time-based queries
  const hasLastExternalSyncColumn = await knex.schema.hasColumn('licenses', 'last_external_sync');
  if (hasLastExternalSyncColumn) {
    await knex.schema.table('licenses', (table) => {
      table.index('last_external_sync', 'idx_licenses_last_external_sync_sync');
    });
  }

  // Sendbat workspace index for integration lookups
  const hasSendbatWorkspaceColumn = await knex.schema.hasColumn(
    'licenses',
    'external_sendbat_workspace'
  );
  if (hasSendbatWorkspaceColumn) {
    await knex.schema.table('licenses', (table) => {
      table.index('external_sendbat_workspace', 'idx_licenses_external_sendbat_workspace_sync');
    });
  }

  // Coming expired date index for expiration monitoring
  const hasComingExpiredColumn = await knex.schema.hasColumn('licenses', 'external_coming_expired');
  if (hasComingExpiredColumn) {
    await knex.schema.table('licenses', (table) => {
      table.index('external_coming_expired', 'idx_licenses_external_coming_expired_sync');
    });
  }

  // Composite indexes for common sync queries
  await knex.schema.table('licenses', (table) => {
    // External appid + sync status for sync progress tracking
    table.index(
      ['external_appid', 'external_sync_status'],
      'idx_licenses_external_appid_sync_status'
    );

    // External countid + sync status for alternative sync tracking
    table.index(
      ['external_countid', 'external_sync_status'],
      'idx_licenses_external_countid_sync_status'
    );

    // Sync status + last sync time for monitoring
    table.index(['external_sync_status', 'last_external_sync'], 'idx_licenses_sync_status_time');
  });

  // ==========================================================================
  // External Licenses Table - Sync Operation Indexes
  // ==========================================================================

  // Appid index (should already exist as unique, but ensure it's optimized)
  await knex.schema.table('external_licenses', (table) => {
    table.index('appid', 'idx_external_licenses_appid');
  });

  // Countid index for alternative lookups
  await knex.schema.table('external_licenses', (table) => {
    table.index('countid', 'idx_external_licenses_countid');
  });

  // Email license index for email-based operations
  await knex.raw(`
    CREATE INDEX idx_external_licenses_email ON external_licenses (email_license)
    WHERE email_license IS NOT NULL
  `);

  // License type index for filtering
  await knex.schema.table('external_licenses', (table) => {
    table.index('license_type', 'idx_external_licenses_license_type');
  });

  // Status index for active/inactive filtering
  await knex.schema.table('external_licenses', (table) => {
    table.index('status', 'idx_external_licenses_status');
  });

  // Sync status index for sync operation tracking
  await knex.schema.table('external_licenses', (table) => {
    table.index('sync_status', 'idx_external_licenses_sync_status');
  });

  // Last synced timestamp index for monitoring
  await knex.schema.table('external_licenses', (table) => {
    table.index('last_synced_at', 'idx_external_licenses_last_synced_at');
  });

  // Coming expired date index for expiration queries
  await knex.schema.table('external_licenses', (table) => {
    table.index('coming_expired', 'idx_external_licenses_coming_expired');
  });

  // Monthly fee index for financial reporting
  await knex.schema.table('external_licenses', (table) => {
    table.index('monthly_fee', 'idx_external_licenses_monthly_fee');
  });

  // Composite indexes for external sync operations
  await knex.schema.table('external_licenses', (table) => {
    // Status + sync status for sync candidate queries
    table.index(['status', 'sync_status'], 'idx_external_licenses_status_sync');

    // Sync status + last synced for monitoring
    table.index(['sync_status', 'last_synced_at'], 'idx_external_licenses_sync_time');

    // License type + status for reporting
    table.index(['license_type', 'status'], 'idx_external_licenses_type_status');
  });

  // Partial indexes for common filtered queries
  await knex.raw(`
    -- Active external licenses only
    CREATE INDEX idx_external_licenses_active_only ON external_licenses (appid, email_license, monthly_fee)
    WHERE status = 1
  `);

  await knex.raw(`
    -- Failed sync licenses for retry operations
    CREATE INDEX idx_external_licenses_failed_sync ON external_licenses (appid, sync_error)
    WHERE sync_status = 'failed'
  `);

  await knex.raw(`
    -- Pending sync licenses for batch processing
    CREATE INDEX idx_external_licenses_pending_sync ON external_licenses (created_at)
    WHERE sync_status = 'pending'
  `);

  logger.info('External sync performance indexes added successfully');
}

export async function down(knex) {
  logger.info('Removing external sync performance indexes...');

  // ==========================================================================
  // Licenses Table - External Sync Indexes (Rollback)
  // ==========================================================================

  await knex.schema.table('licenses', (table) => {
    table.dropIndex('appid', 'idx_licenses_appid');
    table.dropIndex('countid', 'idx_licenses_countid');
    table.dropIndex('mid', 'idx_licenses_mid');
    table.dropIndex('license_type', 'idx_licenses_license_type');
    table.dropIndex('external_sync_status', 'idx_licenses_external_sync_status');
    table.dropIndex('last_external_sync', 'idx_licenses_last_external_sync');
    table.dropIndex('sendbat_workspace', 'idx_licenses_sendbat_workspace');
    table.dropIndex('coming_expired', 'idx_licenses_coming_expired');

    // Composite indexes
    table.dropIndex(['appid', 'external_sync_status'], 'idx_licenses_appid_sync_status');
    table.dropIndex(['countid', 'external_sync_status'], 'idx_licenses_countid_sync_status');
    table.dropIndex(
      ['external_sync_status', 'last_external_sync'],
      'idx_licenses_sync_status_time'
    );
  });

  // Drop the partial index for external_email
  await knex.raw('DROP INDEX IF EXISTS idx_licenses_external_email');

  // ==========================================================================
  // External Licenses Table - Sync Operation Indexes (Rollback)
  // ==========================================================================

  await knex.schema.table('external_licenses', (table) => {
    table.dropIndex('appid', 'idx_external_licenses_appid');
    table.dropIndex('countid', 'idx_external_licenses_countid');
    table.dropIndex('license_type', 'idx_external_licenses_license_type');
    table.dropIndex('status', 'idx_external_licenses_status');
    table.dropIndex('sync_status', 'idx_external_licenses_sync_status');
    table.dropIndex('last_synced_at', 'idx_external_licenses_last_synced_at');
    table.dropIndex('coming_expired', 'idx_external_licenses_coming_expired');
    table.dropIndex('monthly_fee', 'idx_external_licenses_monthly_fee');

    // Composite indexes
    table.dropIndex(['status', 'sync_status'], 'idx_external_licenses_status_sync');
    table.dropIndex(['sync_status', 'last_synced_at'], 'idx_external_licenses_sync_time');
    table.dropIndex(['license_type', 'status'], 'idx_external_licenses_type_status');
  });

  // Drop partial indexes
  await knex.raw('DROP INDEX IF EXISTS idx_external_licenses_email');
  await knex.raw('DROP INDEX IF EXISTS idx_external_licenses_active_only');
  await knex.raw('DROP INDEX IF EXISTS idx_external_licenses_failed_sync');
  await knex.raw('DROP INDEX IF EXISTS idx_external_licenses_pending_sync');

  logger.info('External sync performance indexes removed');
}

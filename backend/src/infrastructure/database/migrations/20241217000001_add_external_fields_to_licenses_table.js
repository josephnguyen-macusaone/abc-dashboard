/**
 * Add external license data fields to licenses table
 * This migration enhances the licenses table to store external API data
 */
export async function up(knex) {
  await knex.schema.alterTable('licenses', (table) => {
    // External API synchronization fields (unified)
    table.string('appid', 255).nullable();
    table.integer('countid').nullable();
    table.string('mid', 255).nullable(); // Merchant ID
    table.string('license_type', 50).nullable(); // demo/product
    table.jsonb('package').nullable();
    table.string('sendbat_workspace', 255).nullable();
    table.timestamp('coming_expired', { useTz: true }).nullable();

    // Sync tracking
    table.enu('external_sync_status', ['pending', 'synced', 'failed']).defaultTo('pending');
    table.timestamp('last_external_sync', { useTz: true }).nullable();
    table.text('external_sync_error').nullable();

    // Indexes for external data
    table.index('appid');
    table.index('countid');
    table.index('mid');
    table.index('license_type');
    table.index('external_sync_status');
    table.index('last_external_sync');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('licenses', (table) => {
    // Drop external fields
    table.dropColumn('appid');
    table.dropColumn('countid');
    table.dropColumn('mid');
    table.dropColumn('license_type');
    table.dropColumn('package');
    table.dropColumn('sendbat_workspace');
    table.dropColumn('coming_expired');
    table.dropColumn('external_sync_status');
    table.dropColumn('last_external_sync');
    table.dropColumn('external_sync_error');
  });
}

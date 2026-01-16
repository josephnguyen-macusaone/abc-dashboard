/**
 * Add external license data fields to licenses table
 * This migration enhances the licenses table to store external API data
 */
export async function up(knex) {
  await knex.schema.alterTable('licenses', (table) => {
    // External API synchronization fields
    table.string('external_appid', 255).nullable();
    table.integer('external_countid').nullable();
    table.string('external_email', 255).nullable();
    table.integer('external_status').nullable();
    table.jsonb('external_package').nullable();
    table.string('external_sendbat_workspace', 255).nullable();
    table.timestamp('external_coming_expired', { useTz: true }).nullable();

    // Sync tracking
    table.enu('external_sync_status', ['pending', 'synced', 'failed']).defaultTo('pending');
    table.timestamp('last_external_sync', { useTz: true }).nullable();
    table.text('external_sync_error').nullable();

    // Indexes for external data
    table.index('external_appid');
    table.index('external_email');
    table.index('external_countid');
    table.index('external_sync_status');
    table.index('last_external_sync');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('licenses', (table) => {
    // Drop external fields
    table.dropColumn('external_appid');
    table.dropColumn('external_countid');
    table.dropColumn('external_email');
    table.dropColumn('external_status');
    table.dropColumn('external_package');
    table.dropColumn('external_sendbat_workspace');
    table.dropColumn('external_coming_expired');
    table.dropColumn('external_sync_status');
    table.dropColumn('last_external_sync');
    table.dropColumn('external_sync_error');
  });
}



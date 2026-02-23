/**
 * Add missing external license fields to licenses table
 * This migration adds the external_mid and external_license_type columns
 * that were missing from the previous migration
 */

export async function up(knex) {
  await knex.schema.alterTable('licenses', (table) => {
    // Add missing external fields
    table.string('external_mid', 255).nullable(); // Merchant ID
    table.string('external_license_type', 50).nullable(); // demo/product

    // Add indexes for the new columns
    table.index('external_mid');
    table.index('external_license_type');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('licenses', (table) => {
    // Drop the added columns
    table.dropColumn('external_mid');
    table.dropColumn('external_license_type');
  });
}

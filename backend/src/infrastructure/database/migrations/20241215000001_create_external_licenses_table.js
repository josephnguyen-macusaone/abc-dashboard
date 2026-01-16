/**
 * Create external licenses table
 * This table stores licenses synced from the external license management API
 */
export async function up(knex) {
  await knex.schema.createTable('external_licenses', (table) => {
    // Internal primary key (UUID)
    table.uuid('internal_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // External API fields (matching the OpenAPI spec)
    table.string('id', 255).nullable(); // External API uses string IDs, sometimes null
    table.integer('countid').nullable();
    table.string('appid', 255).nullable().unique(); // External app ID can also be null
    table.string('license_type', 50).defaultTo('product');
    table.string('dba', 255).nullable();
    table.string('zip', 10).nullable();
    table.string('mid', 255).nullable(); // Merchant ID
    table.integer('status').nullable(); // Status as integer (0=inactive, 1=active, etc.)
    table.timestamp('activate_date', { useTz: true }).nullable();
    table.timestamp('coming_expired', { useTz: true }).nullable();
    table.decimal('monthly_fee', 10, 2).defaultTo(0);
    table.decimal('sms_balance', 10, 2).defaultTo(0);
    table.string('email_license', 255).notNullable();
    table.string('pass', 255).notNullable(); // Encrypted/hashed password
    table.jsonb('package').nullable(); // Package configuration as JSON
    table.text('note').nullable();
    table.string('sendbat_workspace', 255).nullable();
    table.timestamp('last_active', { useTz: true }).nullable();

    // Sync tracking fields (internal use)
    table.timestamp('last_synced_at', { useTz: true }).nullable();
    table.enum('sync_status', ['pending', 'synced', 'failed']).defaultTo('pending');
    table.text('sync_error').nullable();

    // Audit fields
    table.timestamps(true, true);

    // Indexes for performance
    table.index('appid'); // Primary lookup by external app ID
    table.index('email_license'); // Email-based lookups
    table.index('countid'); // Count ID lookups
    table.index('status'); // Status filtering
    table.index('license_type'); // License type filtering
    table.index('sync_status'); // Sync status filtering
    table.index('last_synced_at'); // Sync timestamp queries
    table.index('coming_expired'); // Expiry date queries
    table.index('activate_date'); // Activation date queries
    table.index(['sync_status', 'updated_at']); // Sync priority queries
    table.index(['status', 'coming_expired']); // Active expiring licenses

    // Full-text search index for license search
    table.index(['dba', 'email_license', 'appid'], 'external_licenses_search_idx');
  });

  // Add constraints
  await knex.raw(`
    ALTER TABLE external_licenses
    ADD CONSTRAINT chk_external_licenses_monthly_fee_positive
    CHECK (monthly_fee >= 0);
  `);

  await knex.raw(`
    ALTER TABLE external_licenses
    ADD CONSTRAINT chk_external_licenses_sms_balance_non_negative
    CHECK (sms_balance >= 0);
  `);

  // Add index for expiring licenses queries (will be used with WHERE clauses)
  await knex.raw(`
    CREATE INDEX idx_external_licenses_coming_expired
    ON external_licenses (coming_expired)
    WHERE coming_expired IS NOT NULL;
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('external_licenses');
}
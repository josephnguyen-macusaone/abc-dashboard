/**
 * Create licenses table
 */
export async function up(knex) {
  // Create enum type for license status
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE license_status AS ENUM ('draft', 'active', 'expiring', 'expired', 'revoked', 'cancel', 'pending');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create enum type for license term
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE license_term AS ENUM ('monthly', 'yearly');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await knex.schema.createTable('licenses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // License identification
    table.string('key', 255).notNullable().unique();
    table.string('product', 100).notNullable();
    table.string('plan', 100).notNullable();

    // Status and lifecycle
    table.specificType('status', 'license_status').notNullable().defaultTo('pending');
    table.specificType('term', 'license_term').notNullable().defaultTo('monthly');

    // Seat management
    table.integer('seats_total').notNullable().defaultTo(1).checkPositive();
    table.integer('seats_used').notNullable().defaultTo(0).unsigned(); // Allow 0, just not negative

    // Dates
    table.timestamp('starts_at', { useTz: true }).notNullable();
    table.timestamp('expires_at', { useTz: true }).nullable();
    table.timestamp('cancel_date', { useTz: true }).nullable();
    table.timestamp('last_active', { useTz: true }).nullable();

    // Customer/Organization info (from current schema)
    table.string('dba', 255).nullable(); // Doing Business As / Company name
    table.string('zip', 10).nullable();

    // Payment and billing
    table.decimal('last_payment', 10, 2).defaultTo(0);

    // SMS/Communication credits (if applicable)
    table.integer('sms_purchased').defaultTo(0);
    table.integer('sms_sent').defaultTo(0);
    table.integer('sms_balance').defaultTo(0);

    // Agent/User management
    table.integer('agents').defaultTo(0);
    table.jsonb('agents_name').defaultTo('[]');
    table.decimal('agents_cost', 10, 2).defaultTo(0);

    // Additional info
    table.text('notes').nullable();

    // Audit fields
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);

    // Indexes for performance
    table.index('status');
    table.index('product');
    table.index('plan');
    table.index('created_at');
    table.index('starts_at');
    table.index('expires_at');
    table.index(['status', 'expires_at']); // For expiring licenses queries
    table.index(['product', 'status']); // For product-specific queries
    table.index(['dba']); // For customer search
  });

  // Add computed column for utilization percentage
  await knex.raw(`
    ALTER TABLE licenses
    ADD COLUMN utilization_percent DECIMAL(5,2)
    GENERATED ALWAYS AS (
      CASE
        WHEN seats_total > 0 THEN (seats_used::decimal / seats_total::decimal * 100)
        ELSE 0
      END
    ) STORED;
  `);

  // Create full-text search index for license search
  await knex.raw(`
    CREATE INDEX licenses_search_idx ON licenses
    USING GIN (to_tsvector('english',
      coalesce(key, '') || ' ' ||
      coalesce(dba, '') || ' ' ||
      coalesce(product, '') || ' ' ||
      coalesce(plan, '')
    ));
  `);

  // Add constraint to ensure seats_used doesn't exceed seats_total
  await knex.raw(`
    ALTER TABLE licenses
    ADD CONSTRAINT chk_seats_used_within_total
    CHECK (seats_used <= seats_total);
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('licenses');
  await knex.raw('DROP TYPE IF EXISTS license_status');
  await knex.raw('DROP TYPE IF EXISTS license_term');
}



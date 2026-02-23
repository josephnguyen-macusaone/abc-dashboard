/**
 * Create license_assignments table
 */
export async function up(knex) {
  // Create enum type for assignment status
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE assignment_status AS ENUM ('assigned', 'unassigned', 'revoked');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await knex.schema.createTable('license_assignments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Foreign keys
    table.uuid('license_id').notNullable().references('id').inTable('licenses').onDelete('CASCADE');

    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Assignment status
    table.specificType('status', 'assignment_status').notNullable().defaultTo('assigned');

    // Assignment dates
    table.timestamp('assigned_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.timestamp('revoked_at', { useTz: true }).nullable();

    // Audit fields
    table.uuid('assigned_by').references('id').inTable('users').onDelete('SET NULL');

    table.uuid('revoked_by').references('id').inTable('users').onDelete('SET NULL');

    table.timestamps(true, true);

    // Unique constraint: one user can only have one active assignment per license
    table.unique(['license_id', 'user_id'], {
      indexName: 'unique_license_user_assignment',
    });

    // Indexes for performance
    table.index('license_id');
    table.index('user_id');
    table.index('status');
    table.index(['license_id', 'status']); // For active assignments per license
    table.index(['user_id', 'status']); // For user's active licenses
    table.index('assigned_at');
    table.index('revoked_at');
  });

  // Create trigger to update seats_used on licenses table
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_license_seats_used()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Update seats_used count when assignment is created or updated
      UPDATE licenses
      SET seats_used = (
        SELECT COUNT(*)
        FROM license_assignments
        WHERE license_id = COALESCE(NEW.license_id, OLD.license_id)
          AND status = 'assigned'
      ),
      updated_at = NOW()
      WHERE id = COALESCE(NEW.license_id, OLD.license_id);

      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE TRIGGER trg_update_license_seats
    AFTER INSERT OR UPDATE OR DELETE ON license_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_license_seats_used();
  `);
}

export async function down(knex) {
  await knex.raw('DROP TRIGGER IF EXISTS trg_update_license_seats ON license_assignments');
  await knex.raw('DROP FUNCTION IF EXISTS update_license_seats_used');
  await knex.schema.dropTableIfExists('license_assignments');
  await knex.raw('DROP TYPE IF EXISTS assignment_status');
}

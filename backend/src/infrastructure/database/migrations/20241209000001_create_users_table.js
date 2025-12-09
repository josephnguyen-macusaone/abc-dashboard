/**
 * Create users table
 */
export async function up(knex) {
  // Create enum type for roles
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('admin', 'manager', 'staff');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('username', 100).notNullable().unique();
    table.string('hashed_password', 255).notNullable();
    table.string('email', 255).notNullable().unique();
    table.string('display_name', 255).notNullable();
    table.specificType('role', 'user_role').notNullable().defaultTo('staff');
    table.string('avatar_url', 500);
    table.string('phone', 50);
    table.boolean('is_active').notNullable().defaultTo(false);
    table.boolean('is_first_login').notNullable().defaultTo(true);
    table.boolean('requires_password_change').notNullable().defaultTo(false);
    table.string('lang_key', 10).notNullable().defaultTo('en');
    table.uuid('managed_by').references('id').inTable('users').onDelete('SET NULL');
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.uuid('last_modified_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);

    // Indexes for performance
    table.index('role');
    table.index('is_active');
    table.index('created_at');
    table.index('created_by');
    table.index(['role', 'is_active']);
    table.index(['email', 'is_active']);
    table.index(['role', 'created_at']);
    table.index(['is_active', 'created_at']);
    table.index(['managed_by', 'role']);
    table.index(['role', 'managed_by']);
  });

  // Create full-text search index
  await knex.raw(`
    CREATE INDEX users_search_idx ON users 
    USING GIN (to_tsvector('english', coalesce(display_name, '') || ' ' || coalesce(username, '') || ' ' || coalesce(email, '')));
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('users');
  await knex.raw('DROP TYPE IF EXISTS user_role');
}

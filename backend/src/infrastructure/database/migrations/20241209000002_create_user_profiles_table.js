/**
 * Create user_profiles table
 */
export async function up(knex) {
  await knex.schema.createTable('user_profiles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .unique()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.text('bio');
    table.timestamp('last_login_at');
    table.timestamp('last_activity_at');
    table.timestamps(true, true);

    // Indexes for performance
    table.index('last_login_at');
    table.index('last_activity_at');
    table.index(['last_login_at', 'user_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('user_profiles');
}

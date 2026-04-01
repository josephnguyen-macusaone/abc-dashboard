/**
 * Migration: add email_verified column to users table.
 *
 * Self-registered users start unverified (false). All existing rows
 * (admin-created, seeded) default to true so they are unaffected.
 */

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.boolean('email_verified').notNullable().defaultTo(false);
  });

  // Mark every existing row as already verified so admin-created accounts
  // and seeded test users keep working without requiring re-verification.
  await knex('users').update({ email_verified: true });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('email_verified');
  });
}

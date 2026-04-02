/**
 * Remove legacy `staff` role: reassign users to `agent`, replace PostgreSQL user_role enum.
 *
 * We cannot UPDATE ... SET role = 'agent'::user_role in the same transaction as
 * ALTER TYPE ... ADD VALUE (see prior migration): PostgreSQL returns
 * "unsafe use of new value \"agent\" of enum type user_role".
 *
 * Workaround: cast column to text, update as plain strings, drop old enum, create new enum, cast back.
 */
import logger from '../../../shared/utils/logger.js';

export async function up(knex) {
  logger.info('Removing staff from user_role: migrating users and recreating enum');

  await knex.raw(`ALTER TABLE users ALTER COLUMN role DROP DEFAULT`);

  await knex.raw(`
    ALTER TABLE users
    ALTER COLUMN role TYPE text
    USING role::text;
  `);

  const reassigned = await knex('users').where({ role: 'staff' }).update({ role: 'agent' });
  logger.info('Reassigned staff users to agent', { count: reassigned });

  await knex.raw(`DROP TYPE user_role`);

  await knex.raw(`
    CREATE TYPE user_role AS ENUM ('admin', 'accountant', 'manager', 'tech', 'agent');
  `);

  await knex.raw(`
    ALTER TABLE users
    ALTER COLUMN role TYPE user_role
    USING role::user_role;
  `);

  await knex.raw(`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'agent'::user_role`);

  logger.info('user_role enum no longer includes staff');
}

export async function down() {
  logger.warn('Down migration not supported for remove_staff_user_role (enum recreation)');
}

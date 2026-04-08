/**
 * Replace generic `manager` with account_manager, tech_manager, agent_manager.
 * Existing `manager` users become `account_manager` (closest default).
 */
import logger from '../../../shared/utils/logger.js';

export async function up(knex) {
  logger.info('Split manager role: migrating enum and user rows');

  await knex.raw(`ALTER TABLE users ALTER COLUMN role DROP DEFAULT`);

  await knex.raw(`
    ALTER TABLE users
    ALTER COLUMN role TYPE text
    USING role::text;
  `);

  const migrated = await knex('users')
    .where({ role: 'manager' })
    .update({ role: 'account_manager' });
  logger.info('Migrated manager users to account_manager', { count: migrated });

  await knex.raw(`DROP TYPE IF EXISTS user_role`);

  await knex.raw(`
    CREATE TYPE user_role AS ENUM (
      'admin',
      'accountant',
      'account_manager',
      'tech_manager',
      'agent_manager',
      'tech',
      'agent'
    );
  `);

  await knex.raw(`
    ALTER TABLE users
    ALTER COLUMN role TYPE user_role
    USING role::user_role;
  `);

  await knex.raw(`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'agent'::user_role`);

  logger.info('user_role enum now uses typed manager roles');
}

export async function down() {
  // Intentionally not reversible without losing manager-type distinction
}

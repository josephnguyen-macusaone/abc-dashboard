/**
 * Replace account_manager, tech_manager, agent_manager with a single `manager` role.
 * Tech and accountant continue to self-register via signup; managers provision agents in User Management.
 */
import logger from '../../../shared/utils/logger.js';

export async function up(knex) {
  logger.info('Consolidate typed manager roles into manager');

  await knex.raw(`ALTER TABLE users ALTER COLUMN role DROP DEFAULT`);

  await knex.raw(`
    ALTER TABLE users
    ALTER COLUMN role TYPE text
    USING role::text;
  `);

  const migrated = await knex('users')
    .whereIn('role', ['account_manager', 'tech_manager', 'agent_manager'])
    .update({ role: 'manager' });
  logger.info('Migrated typed manager users to manager', { count: migrated });

  await knex.raw(`DROP TYPE IF EXISTS user_role`);

  await knex.raw(`
    CREATE TYPE user_role AS ENUM (
      'admin',
      'accountant',
      'manager',
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

  logger.info('user_role enum now uses single manager role');
}

export async function down() {
  // Irreversible without knowing prior typed-manager assignment
}

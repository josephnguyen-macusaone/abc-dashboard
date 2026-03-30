import logger from '../../../shared/utils/logger.js';

const NEW_ROLES = ['accountant', 'tech', 'agent'];

export async function up(knex) {
  logger.info('Extending user_role enum with accountant, tech, and agent...');

  for (const role of NEW_ROLES) {
    await knex.raw(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS '${role}'`);
  }

  logger.info('user_role enum updated');
}

export async function down() {
  // PostgreSQL does not support dropping enum values safely in-place.
  logger.warn('Skipping down migration for user_role enum value additions');
}

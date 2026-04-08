/**
 * Removes former demo seed accounts (salon agents, staff, extra admin) so only real data + admin remain.
 * Runs after 001_create_admin_users. Safe to run when no matching usernames exist.
 */

import logger from '../../../shared/utils/logger.js';

/** Usernames introduced by older seeds (001 + 002–004 agent assignments). */
const LEGACY_SEED_USERNAMES = [
  'signature_spa',
  'blush_nail_bar',
  'nail_shadow',
  'agent',
  'agent_manager',
  'accountant',
  'tech',
  'manager',
];

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  const rows = await knex('users').select('id').whereIn('username', LEGACY_SEED_USERNAMES);
  if (rows.length === 0) {
    logger.info('No legacy demo seed users to remove');
    return;
  }

  const ids = rows.map((r) => r.id);

  await knex.transaction(async (trx) => {
    await trx('license_assignments').whereIn('user_id', ids).del();

    await trx('users').whereIn('managed_by', ids).update({ managed_by: null });
    await trx('users').whereIn('created_by', ids).update({ created_by: null });
    await trx('users').whereIn('last_modified_by', ids).update({ last_modified_by: null });

    await trx('users').whereIn('id', ids).del();
    logger.info('Removed legacy demo seed users', {
      count: ids.length,
      usernames: LEGACY_SEED_USERNAMES,
    });
  });
}

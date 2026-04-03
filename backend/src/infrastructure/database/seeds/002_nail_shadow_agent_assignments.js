/**
 * Demo / dev: agent "NAIL SHADOW" (`nail_shadow`) and `license_assignments` on internal `licenses`.
 *
 * Assignments are what the API uses for agents (`assignedUserId`). External ABC rows live in
 * `external_licenses`; the app syncs them into `licenses` (appid / countid). This seed:
 *
 * 1. Matches internal `licenses` where dba / agents_name contains "NAIL SHADOW".
 * 2. Matches `external_licenses` where dba / note contains "NAIL SHADOW", then resolves the
 *    corresponding internal row by appid (case-insensitive) or countid.
 *
 * Run after external sync has populated both tables:
 *   npm run seed
 *
 * Login: nail_shadow / NailShadow123! / nail.shadow@abcsalon.us
 */

import bcrypt from 'bcryptjs';
import logger from '../../../shared/utils/logger.js';

const MATCH = '%NAIL SHADOW%';

/**
 * @param { import("knex").Knex } knex
 * @param { Record<string, unknown> } ext
 * @returns { Promise<{ id: string; key?: string; dba?: string } | null> }
 */
async function resolveInternalLicenseFromExternalRow(knex, ext) {
  const appid = ext.appid != null ? String(ext.appid).trim() : '';
  if (appid) {
    const row = await knex('licenses')
      .select('id', 'key', 'dba')
      .whereRaw('LOWER(TRIM(appid)) = ?', [appid.toLowerCase()])
      .first();
    if (row) return row;
  }
  if (ext.countid != null && ext.countid !== '') {
    const row = await knex('licenses')
      .select('id', 'key', 'dba')
      .where('countid', ext.countid)
      .first();
    if (row) return row;
  }
  return null;
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  };

  const userPayload = {
    username: 'nail_shadow',
    email: 'nail.shadow@abcsalon.us',
    password: 'NailShadow123!',
    displayName: 'NAIL SHADOW',
    role: 'agent',
    phone: '+1-555-0199',
  };

  let userId;
  const existingUser = await knex('users').where({ username: userPayload.username }).first();
  if (existingUser) {
    userId = existingUser.id;
    await knex('users').where({ id: userId }).update({
      display_name: userPayload.displayName,
      role: 'agent',
      email_verified: true,
      is_active: true,
      updated_at: new Date(),
    });
    logger.info('nail_shadow user already exists; refreshed display name and agent role');
  } else {
    const hashedPassword = await hashPassword(userPayload.password);
    const [inserted] = await knex('users')
      .insert({
        id: knex.raw('gen_random_uuid()'),
        username: userPayload.username,
        hashed_password: hashedPassword,
        email: userPayload.email,
        display_name: userPayload.displayName,
        role: userPayload.role,
        phone: userPayload.phone,
        is_active: true,
        email_verified: true,
        is_first_login: false,
        requires_password_change: false,
        lang_key: 'en',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('id');
    userId = inserted.id;
    logger.info(
      `nail_shadow agent created: ${userPayload.username} / ${userPayload.email} / ${userPayload.password}`
    );
  }

  const admin = await knex('users').where({ username: 'admin' }).first();
  const assignedBy = admin?.id ?? null;

  /** @type {Map<string, { key?: string; dba?: string; source: string }>} */
  const byId = new Map();

  const fromInternal = await knex('licenses')
    .select('id', 'dba', 'key')
    .where(function nailShadowInternal() {
      this.whereILike('dba', MATCH).orWhereRaw('agents_name::text ILIKE ?', [MATCH]);
    });

  for (const lic of fromInternal) {
    byId.set(lic.id, { key: lic.key, dba: lic.dba, source: 'licenses.dba|agents_name' });
  }

  const hasExternal = await knex.schema.hasTable('external_licenses');
  let externalUnmapped = 0;

  if (hasExternal) {
    const fromExternal = await knex('external_licenses')
      .select('appid', 'countid', 'dba', 'email_license', 'note')
      .where(function nailShadowExternal() {
        this.whereILike('dba', MATCH).orWhereILike('note', MATCH);
      });

    for (const ext of fromExternal) {
      const internal = await resolveInternalLicenseFromExternalRow(knex, ext);
      if (!internal) {
        externalUnmapped += 1;
        logger.warn(
          `external_licenses row matched NAIL SHADOW but no internal license yet (sync internal from external): appid=${ext.appid ?? '—'} countid=${ext.countid ?? '—'} dba=${ext.dba ?? '—'}`
        );
        continue;
      }
      if (!byId.has(internal.id)) {
        byId.set(internal.id, {
          key: internal.key,
          dba: internal.dba,
          source: 'external_licenses→licenses(appid|countid)',
        });
      }
    }
  }

  if (byId.size === 0) {
    logger.warn(
      'No internal licenses to assign to nail_shadow. Ensure ABC sync populated external_licenses, then run internal sync (external → licenses), then npm run seed again.'
    );
    return;
  }

  let assigned = 0;
  for (const [licenseId, meta] of byId) {
    const already = await knex('license_assignments')
      .where({ license_id: licenseId, user_id: userId, status: 'assigned' })
      .first();
    if (already) continue;

    await knex('license_assignments').insert({
      id: knex.raw('gen_random_uuid()'),
      license_id: licenseId,
      user_id: userId,
      status: 'assigned',
      assigned_at: new Date(),
      assigned_by: assignedBy,
      created_at: new Date(),
      updated_at: new Date(),
    });
    assigned += 1;
    logger.info(
      `Assigned license ${meta.key ?? licenseId} (${meta.dba ?? '—'}) [${meta.source}] to nail_shadow`
    );
  }

  logger.info(
    `NAIL SHADOW agent: ${assigned} new assignment(s); ${byId.size} distinct internal license(s); ${externalUnmapped} external row(s) not yet linked to internal`
  );
}

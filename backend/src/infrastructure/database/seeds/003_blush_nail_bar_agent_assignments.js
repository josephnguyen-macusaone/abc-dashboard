/**
 * Demo / dev: agent for BLUSH NAIL BAR (`blush_nail_bar`) and `license_assignments`.
 *
 * Same flow as 002_nail_shadow_agent_assignments: match internal `licenses` by dba / agents_name,
 * and `external_licenses` by dba / note, then link to internal rows by appid or countid.
 *
 * Run after sync has populated licenses:
 *   npm run seed
 *
 * Login: blush_nail_bar / BlushNailBar123! / blush.nail.bar@abcsalon.us
 */

import bcrypt from 'bcryptjs';
import logger from '../../../shared/utils/logger.js';

const MATCH = '%BLUSH NAIL BAR%';

async function hashPasswordForSeed(password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * @param { import("knex").Knex } knex
 * @param { Record<string, unknown> } ext
 * @returns { Promise<{ id: string; key?: string; dba?: string } | null> }
 */
async function resolveInternalLicenseFromExternalRow(knex, ext) {
  const hasAppid = ext.appid !== undefined && ext.appid !== null;
  const appid = hasAppid ? String(ext.appid).trim() : '';
  if (appid !== '') {
    const row = await knex('licenses')
      .select('id', 'key', 'dba')
      .whereRaw('LOWER(TRIM(appid)) = ?', [appid.toLowerCase()])
      .first();
    if (row !== undefined && row !== null) {
      return row;
    }
  }
  const countid = ext.countid;
  const hasCountid = countid !== undefined && countid !== null && countid !== '';
  if (hasCountid) {
    const row = await knex('licenses').select('id', 'key', 'dba').where('countid', countid).first();
    if (row !== undefined && row !== null) {
      return row;
    }
  }
  return null;
}

/**
 * @param { import("knex").Knex } knex
 * @param {{
 *   username: string;
 *   email: string;
 *   password: string;
 *   displayName: string;
 *   role: string;
 *   phone: string;
 * }} userPayload
 * @returns { Promise<string> }
 */
async function upsertBlushAgentUser(knex, userPayload) {
  const existingUser = await knex('users').where({ username: userPayload.username }).first();
  if (existingUser !== undefined && existingUser !== null) {
    await knex('users').where({ id: existingUser.id }).update({
      display_name: userPayload.displayName,
      role: 'agent',
      email_verified: true,
      is_active: true,
      updated_at: new Date(),
    });
    logger.info('blush_nail_bar user already exists; refreshed display name and agent role');
    return existingUser.id;
  }

  const hashedPassword = await hashPasswordForSeed(userPayload.password);
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
  logger.info(
    `blush_nail_bar agent created: ${userPayload.username} / ${userPayload.email} / ${userPayload.password}`
  );
  return inserted.id;
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<{ byId: Map<string, { key?: string; dba?: string; source: string }>; externalUnmapped: number }>}
 */
async function buildBlushLicenseMap(knex) {
  /** @type {Map<string, { key?: string; dba?: string; source: string }>} */
  const byId = new Map();

  const fromInternal = await knex('licenses')
    .select('id', 'dba', 'key')
    .where(function blushInternal() {
      this.whereILike('dba', MATCH).orWhereRaw('agents_name::text ILIKE ?', [MATCH]);
    });

  for (const lic of fromInternal) {
    byId.set(lic.id, { key: lic.key, dba: lic.dba, source: 'licenses.dba|agents_name' });
  }

  const hasExternal = await knex.schema.hasTable('external_licenses');
  let externalUnmapped = 0;

  if (!hasExternal) {
    return { byId, externalUnmapped };
  }

  const fromExternal = await knex('external_licenses')
    .select('appid', 'countid', 'dba', 'email_license', 'note')
    .where(function blushExternal() {
      this.whereILike('dba', MATCH).orWhereILike('note', MATCH);
    });

  for (const ext of fromExternal) {
    const internal = await resolveInternalLicenseFromExternalRow(knex, ext);
    if (internal === undefined || internal === null) {
      externalUnmapped += 1;
      logger.warn(
        `external_licenses row matched BLUSH NAIL BAR but no internal license yet (sync internal from external): appid=${ext.appid ?? '—'} countid=${ext.countid ?? '—'} dba=${ext.dba ?? '—'}`
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

  return { byId, externalUnmapped };
}

/**
 * @param { import("knex").Knex } knex
 * @param {Map<string, { key?: string; dba?: string; source: string }>} byId
 * @param {string} userId
 * @param {string | null} assignedBy
 * @returns { Promise<number> }
 */
async function insertBlushAssignments(knex, byId, userId, assignedBy) {
  let assigned = 0;
  for (const [licenseId, meta] of byId) {
    const already = await knex('license_assignments')
      .where({ license_id: licenseId, user_id: userId, status: 'assigned' })
      .first();
    if (already !== undefined && already !== null) {
      continue;
    }

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
      `Assigned license ${meta.key ?? licenseId} (${meta.dba ?? '—'}) [${meta.source}] to blush_nail_bar`
    );
  }
  return assigned;
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  const userPayload = {
    username: 'blush_nail_bar',
    email: 'blush.nail.bar@abcsalon.us',
    password: 'BlushNailBar123!',
    displayName: 'BLUSH NAIL BAR',
    role: 'agent',
    phone: '+1-555-0200',
  };

  const userId = await upsertBlushAgentUser(knex, userPayload);

  const admin = await knex('users').where({ username: 'admin' }).first();
  const assignedBy = admin?.id ?? null;

  const { byId, externalUnmapped } = await buildBlushLicenseMap(knex);

  if (byId.size === 0) {
    logger.warn(
      'No internal licenses matched BLUSH NAIL BAR for blush_nail_bar. Ensure the license exists in `licenses` (dba/agents_name) or sync from `external_licenses`, then run npm run seed again.'
    );
    return;
  }

  const assigned = await insertBlushAssignments(knex, byId, userId, assignedBy);

  logger.info(
    `BLUSH NAIL BAR agent: ${assigned} new assignment(s); ${byId.size} distinct internal license(s); ${externalUnmapped} external row(s) not yet linked to internal`
  );
}

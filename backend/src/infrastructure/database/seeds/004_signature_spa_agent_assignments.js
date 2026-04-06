/**
 * Demo / dev: agent for Signature Spa and Nail (`signature_spa`) and `license_assignments`.
 *
 * Matches internal `licenses` by dba / agents_name and `external_licenses` by dba / note / appid / countid,
 * then links to internal rows by appid or countid (same pattern as 002 / 003).
 *
 * Run after sync has populated licenses:
 *   npm run seed
 *
 * Login: signature_spa / Signature@78665 / signaturespanailstx@outlook.com
 * (aligned with external sample: appid toJeMUW, countid 11, DBA "Signature Spa and Nail".)
 */

import bcrypt from 'bcryptjs';
import logger from '../../../shared/utils/logger.js';

const MATCH_DBA = '%Signature Spa%';
const KNOWN_APPID = 'toJeMUW';
const KNOWN_COUNTID = 11;

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
async function upsertSignatureSpaUser(knex, userPayload) {
  const existingUser = await knex('users').where({ username: userPayload.username }).first();
  if (existingUser !== undefined && existingUser !== null) {
    await knex('users').where({ id: existingUser.id }).update({
      display_name: userPayload.displayName,
      role: 'agent',
      email_verified: true,
      is_active: true,
      updated_at: new Date(),
    });
    logger.info('signature_spa user already exists; refreshed display name and agent role');
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
    `signature_spa agent created: ${userPayload.username} / ${userPayload.email} / ${userPayload.password}`
  );
  return inserted.id;
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<{ byId: Map<string, { key?: string; dba?: string; source: string }>; externalUnmapped: number }>}
 */
async function buildSignatureSpaLicenseMap(knex) {
  /** @type {Map<string, { key?: string; dba?: string; source: string }>} */
  const byId = new Map();

  const fromInternal = await knex('licenses')
    .select('id', 'dba', 'key')
    .where(function signatureSpaInternal() {
      this.whereILike('dba', MATCH_DBA).orWhereRaw('agents_name::text ILIKE ?', [MATCH_DBA]);
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
    .where(function signatureSpaExternal() {
      this.whereILike('dba', MATCH_DBA)
        .orWhereILike('note', MATCH_DBA)
        .orWhereRaw('LOWER(TRIM(appid)) = ?', [KNOWN_APPID.toLowerCase()])
        .orWhere('countid', KNOWN_COUNTID);
    });

  for (const ext of fromExternal) {
    const internal = await resolveInternalLicenseFromExternalRow(knex, ext);
    if (internal === undefined || internal === null) {
      externalUnmapped += 1;
      logger.warn(
        `external_licenses row matched Signature Spa but no internal license yet (sync internal from external): appid=${ext.appid ?? '—'} countid=${ext.countid ?? '—'} dba=${ext.dba ?? '—'}`
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
async function insertSignatureSpaAssignments(knex, byId, userId, assignedBy) {
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
      `Assigned license ${meta.key ?? licenseId} (${meta.dba ?? '—'}) [${meta.source}] to signature_spa`
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
    username: 'signature_spa',
    email: 'signaturespanailstx@outlook.com',
    password: 'Signature@78665',
    displayName: 'Signature Spa and Nail',
    role: 'agent',
    phone: '+1-555-7866',
  };

  const userId = await upsertSignatureSpaUser(knex, userPayload);

  const admin = await knex('users').where({ username: 'admin' }).first();
  const assignedBy = admin?.id ?? null;

  const { byId, externalUnmapped } = await buildSignatureSpaLicenseMap(knex);

  if (byId.size === 0) {
    logger.warn(
      'No internal licenses matched Signature Spa for signature_spa. Ensure the license exists in `licenses` or sync from `external_licenses` (appid toJeMUW / countid 11), then run npm run seed again.'
    );
    return;
  }

  const assigned = await insertSignatureSpaAssignments(knex, byId, userId, assignedBy);

  logger.info(
    `Signature Spa agent: ${assigned} new assignment(s); ${byId.size} distinct internal license(s); ${externalUnmapped} external row(s) not yet linked to internal`
  );
}

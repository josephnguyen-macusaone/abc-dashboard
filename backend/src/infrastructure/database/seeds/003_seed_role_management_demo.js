import bcrypt from 'bcryptjs';
import logger from '../../../shared/utils/logger.js';

const ENABLE_FLAG = 'SEED_ROLE_MANAGEMENT_DEMO';
const DEFAULT_PASSWORD = 'Demo123!';

const DEMO_USERS = [
  {
    username: 'account_manager_demo',
    email: 'account.manager.demo@abcsalon.us',
    displayName: 'Account Manager Demo',
    role: 'account_manager',
    phone: '+1-555-1001',
  },
  {
    username: 'tech_manager_demo',
    email: 'tech.manager.demo@abcsalon.us',
    displayName: 'Tech Manager Demo',
    role: 'tech_manager',
    phone: '+1-555-1002',
  },
  {
    username: 'agent_manager_demo',
    email: 'agent.manager.demo@abcsalon.us',
    displayName: 'Agent Manager Demo',
    role: 'agent_manager',
    phone: '+1-555-1003',
  },
  {
    username: 'accountant_demo',
    email: 'accountant.demo@abcsalon.us',
    displayName: 'Accountant Demo',
    role: 'accountant',
    managedByUsername: 'account_manager_demo',
    phone: '+1-555-2001',
  },
  {
    username: 'tech_demo',
    email: 'tech.demo@abcsalon.us',
    displayName: 'Tech Demo',
    role: 'tech',
    managedByUsername: 'tech_manager_demo',
    phone: '+1-555-2002',
  },
  {
    username: 'agent_demo_1',
    email: 'agent.demo.1@abcsalon.us',
    displayName: 'Agent Demo 1',
    role: 'agent',
    managedByUsername: 'agent_manager_demo',
    phone: '+1-555-3001',
  },
  {
    username: 'agent_demo_2',
    email: 'agent.demo.2@abcsalon.us',
    displayName: 'Agent Demo 2',
    role: 'agent',
    managedByUsername: 'agent_manager_demo',
    phone: '+1-555-3002',
  },
];

function isEnabled() {
  const raw = process.env[ENABLE_FLAG];
  return raw === '1' || raw === 'true' || raw === 'TRUE';
}

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

async function ensureUser(knex, spec, hashedPassword, idByUsername) {
  const managedById = spec.managedByUsername
    ? (idByUsername.get(spec.managedByUsername) ?? null)
    : null;
  const existing = await knex('users').where({ username: spec.username }).first();

  if (existing) {
    await knex('users').where({ id: existing.id }).update({
      email: spec.email,
      display_name: spec.displayName,
      role: spec.role,
      phone: spec.phone,
      managed_by: managedById,
      is_active: true,
      email_verified: true,
      requires_password_change: false,
      updated_at: new Date(),
    });
    idByUsername.set(spec.username, existing.id);
    logger.info('Seed user already exists; ensured role-management state', {
      username: spec.username,
      role: spec.role,
    });
    return existing.id;
  }

  const [inserted] = await knex('users')
    .insert({
      id: knex.raw('gen_random_uuid()'),
      username: spec.username,
      hashed_password: hashedPassword,
      email: spec.email,
      display_name: spec.displayName,
      role: spec.role,
      phone: spec.phone,
      managed_by: managedById,
      is_active: true,
      email_verified: true,
      is_first_login: false,
      requires_password_change: false,
      lang_key: 'en',
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning(['id']);

  const id = inserted?.id || inserted;
  idByUsername.set(spec.username, id);
  logger.info('Created demo role-management user', { username: spec.username, role: spec.role });
  return id;
}

async function assignMatchedLicenses(knex, user) {
  const externalRows = await knex('external_licenses')
    .select('appid', 'countid')
    .whereRaw('LOWER(email_license) = LOWER(?)', [user.email]);

  if (!externalRows.length) {
    return 0;
  }

  const appids = externalRows.map((row) => row.appid).filter(Boolean);
  const countids = externalRows
    .map((row) => row.countid)
    .filter((v) => v !== null && v !== undefined);

  let licensesQuery = knex('licenses').select('id');
  if (appids.length > 0) {
    licensesQuery = licensesQuery.whereIn('appid', appids);
  }
  if (countids.length > 0) {
    licensesQuery = appids.length
      ? licensesQuery.orWhereIn('countid', countids)
      : licensesQuery.whereIn('countid', countids);
  }

  const licenses = await licensesQuery;
  if (!licenses.length) {
    return 0;
  }

  let assigned = 0;
  for (const license of licenses) {
    const existing = await knex('license_assignments')
      .where({
        license_id: license.id,
        user_id: user.id,
      })
      .first();
    if (existing) {
      continue;
    }

    await knex('license_assignments').insert({
      id: knex.raw('gen_random_uuid()'),
      license_id: license.id,
      user_id: user.id,
      status: 'assigned',
      assigned_at: new Date(),
      assigned_by: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    assigned += 1;
  }

  return assigned;
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  if (!isEnabled()) {
    logger.info(`Skipping role-management demo seed (set ${ENABLE_FLAG}=true to enable)`);
    return;
  }

  logger.info('Seeding role-management demo users...');
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  const idByUsername = new Map();

  // Pass 1: seed managers first, then direct reports.
  const managers = DEMO_USERS.filter((u) => !u.managedByUsername);
  const directReports = DEMO_USERS.filter((u) => !!u.managedByUsername);
  for (const spec of [...managers, ...directReports]) {
    await ensureUser(knex, spec, hashedPassword, idByUsername);
  }

  // Optional convenience: auto-assign licenses for seeded agents by matching external email.
  const agents = await knex('users')
    .select('id', 'username', 'email')
    .whereIn(
      'username',
      DEMO_USERS.filter((u) => u.role === 'agent').map((u) => u.username)
    );

  let totalAssigned = 0;
  for (const agent of agents) {
    const count = await assignMatchedLicenses(knex, agent);
    totalAssigned += count;
    if (count > 0) {
      logger.info('Auto-assigned licenses to seeded agent', {
        username: agent.username,
        matchedCount: count,
      });
    }
  }

  logger.info('Role-management demo seed completed', {
    users: DEMO_USERS.length,
    credentials: `${DEMO_USERS[0].username}..${DEMO_USERS[DEMO_USERS.length - 1].username} / ${DEFAULT_PASSWORD}`,
    autoAssignedLicenses: totalAssigned,
  });
}

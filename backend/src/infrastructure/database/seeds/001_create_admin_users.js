// Seed: Create admin user only
// Note: Passwords need to be hashed before saving

import bcrypt from 'bcryptjs';
import logger from '../../../shared/utils/logger.js';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  logger.info('Creating default users...');

  // Hash password helper
  const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  };

  async function ensureUser(userData) {
    const existing = await knex('users').where({ username: userData.username }).first();
    if (existing) {
      logger.info(`${userData.username} user already exists, skipping creation`);
      return;
    }

    const hashedPassword = await hashPassword(userData.password);
    await knex('users').insert({
      id: knex.raw('gen_random_uuid()'),
      username: userData.username,
      hashed_password: hashedPassword,
      email: userData.email,
      display_name: userData.displayName,
      role: userData.role,
      phone: userData.phone,
      is_active: true,
      is_first_login: false,
      requires_password_change: false,
      lang_key: 'en',
      created_at: new Date(),
      updated_at: new Date(),
    });
    logger.info(`${userData.username} user created successfully`);
    logger.info(
      `Login credentials: ${userData.username} / ${userData.email} / ${userData.password}`
    );
  }

  await ensureUser({
    username: 'admin',
    email: 'admin@abcsalon.us',
    password: 'Admin123!',
    displayName: 'System Administrator',
    role: 'admin',
    phone: '+1-555-0100',
  });

  await ensureUser({
    username: 'manager',
    email: 'manager@abcsalon.us',
    password: 'Manager123!',
    displayName: 'Manager',
    role: 'admin',
    phone: '+1-555-0101',
  });

  await ensureUser({
    username: 'tech',
    email: 'tech@abcsalon.us',
    password: 'Tech123!',
    displayName: 'Tech User',
    role: 'tech',
    phone: '+1-555-0102',
  });

  await ensureUser({
    username: 'tech_smoke',
    email: 'tech.smoke@abcsalon.us',
    password: 'TechSmoke123!',
    displayName: 'Tech Smoke Tester',
    role: 'tech',
    phone: '+1-555-0112',
  });

  await ensureUser({
    username: 'accountant',
    email: 'accountant@abcsalon.us',
    password: 'Accountant123!',
    displayName: 'Accountant User',
    role: 'accountant',
    phone: '+1-555-0103',
  });

  await ensureUser({
    username: 'account_smoke',
    email: 'account.smoke@abcsalon.us',
    password: 'AccountSmoke123!',
    displayName: 'Account Smoke Tester',
    role: 'accountant',
    phone: '+1-555-0113',
  });

  await ensureUser({
    username: 'agent',
    email: 'agent@abcsalon.us',
    password: 'Agent123!',
    displayName: 'Agent User',
    role: 'agent',
    phone: '+1-555-0104',
  });

  await ensureUser({
    username: 'agent_smoke',
    email: 'agent.smoke@abcsalon.us',
    password: 'AgentSmoke123!',
    displayName: 'Agent Smoke Tester',
    role: 'agent',
    phone: '+1-555-0114',
  });
}

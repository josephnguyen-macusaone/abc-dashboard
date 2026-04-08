// Seed: Default dev administrator only (no demo staff/agents).
// Note: Password is hashed below; do not use these credentials in production.

import bcrypt from 'bcryptjs';
import logger from '../../../shared/utils/logger.js';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  logger.info('Creating default admin user...');

  const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  };

  async function ensureUser(userData) {
    const existing = await knex('users').where({ username: userData.username }).first();
    if (existing) {
      await knex('users').where({ username: userData.username }).update({
        email_verified: true,
        is_active: true,
        updated_at: new Date(),
      });
      logger.info(
        `${userData.username} user already exists; ensured email_verified and is_active for login`
      );
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
      email_verified: true,
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
}

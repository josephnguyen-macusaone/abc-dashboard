// Seed: Create admin user only
// Note: Passwords need to be hashed before saving

import bcrypt from 'bcryptjs';
import logger from '../../config/logger.js';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  logger.info('Creating admin and manager users...');

  // Hash password helper
  const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  };

  // Check and create admin user
  const existingAdmin = await knex('users').where({ username: 'admin' }).first();

  if (!existingAdmin) {
    const adminData = {
      username: 'admin',
      email: 'admin@abcsalon.us',
      password: 'Admin123!',
      displayName: 'System Administrator',
      role: 'admin',
      phone: '+1-555-0100',
      profile: {
        bio: 'System administrator with full access',
      },
    };

    const hashedPassword = await hashPassword(adminData.password);

    await knex('users').insert({
      id: knex.raw('gen_random_uuid()'),
      username: adminData.username,
      hashed_password: hashedPassword,
      email: adminData.email,
      display_name: adminData.displayName,
      role: adminData.role,
      phone: adminData.phone,
      is_active: true,
      is_first_login: false,
      requires_password_change: false,
      lang_key: 'en',
      created_at: new Date(),
      updated_at: new Date(),
    });

    logger.info('Admin user created successfully');
    logger.info('Login credentials: admin / admin@abcsalon.us / Admin123!');
  } else {
    logger.info('Admin user already exists, skipping creation');
  }

  // Check and create manager user
  const existingManager = await knex('users').where({ username: 'manager' }).first();

  if (!existingManager) {
    const managerData = {
      username: 'manager',
      email: 'manager@abcsalon.us',
      password: 'Manager123!',
      displayName: 'Manager',
      role: 'admin', // Use admin role for now (or create 'manager' role if needed)
      phone: '+1-555-0101',
      profile: {
        bio: 'Manager with administrative access',
      },
    };

    const hashedPassword = await hashPassword(managerData.password);

    await knex('users').insert({
      id: knex.raw('gen_random_uuid()'),
      username: managerData.username,
      hashed_password: hashedPassword,
      email: managerData.email,
      display_name: managerData.displayName,
      role: managerData.role,
      phone: managerData.phone,
      is_active: true,
      is_first_login: false,
      requires_password_change: false,
      lang_key: 'en',
      created_at: new Date(),
      updated_at: new Date(),
    });

    logger.info('Manager user created successfully');
    logger.info('Login credentials: manager / manager@abcsalon.us / Manager123!');
  } else {
    logger.info('Manager user already exists, skipping creation');
  }
}

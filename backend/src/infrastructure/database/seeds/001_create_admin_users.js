// Seed: Create admin user only
// Note: Passwords need to be hashed before saving

import bcrypt from 'bcryptjs';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  console.log('Creating admin user...');

  // Check if admin user already exists
  const existingAdmin = await knex('users').where({ username: 'admin' }).first();

  if (existingAdmin) {
    console.log('Admin user already exists, skipping creation');
    return;
  }

  // Hash password helper
  const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  };

  // Create only admin user
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

  console.log('Creating admin user...');

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

  console.log('Admin user created successfully!');
  console.log('');
  console.log('Login Credentials:');
  console.log('==================');
  console.log('Admin: admin@abcsalon.us / Admin123!');
}

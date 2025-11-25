// Seed: Create sample users with new schema
// Note: Passwords need to be hashed before saving

import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const run = async (mongoose) => {
  // Import User model using absolute path
  const userModelPath = path.join(__dirname, '../../models/user-model.js');
  const fileUrl = path.isAbsolute(userModelPath)
    ? `file://${userModelPath.replace(/\\/g, '/')}`
    : `file://${path.resolve(userModelPath).replace(/\\/g, '/')}`;

  const UserModule = await import(fileUrl);
  const User = UserModule.default;

  console.log('Creating sample users...');

  try {
    // Hash password helper
    const hashPassword = async (password) => {
      const salt = await bcrypt.genSalt(12);
      return await bcrypt.hash(password, salt);
    };

    // Create admin user
    const adminExists = await User.findOne({ email: 'admin@example.com' });
    if (!adminExists) {
      const hashedPassword = await hashPassword('Admin123!');
      await User.create({
        username: 'admin',
        hashedPassword,
        email: 'admin@example.com',
        displayName: 'System Administrator',
        bio: 'System administrator account',
      });
      console.log('Admin user created: admin@example.com (username: admin)');
    } else {
      console.log('Admin user already exists');
    }

    // Create sample user 1
    const user1Exists = await User.findOne({ email: 'john.doe@example.com' });
    if (!user1Exists) {
      const hashedPassword = await hashPassword('User123!');
      await User.create({
        username: 'johndoe',
        hashedPassword,
        email: 'john.doe@example.com',
        displayName: 'John Doe',
        bio: 'Sample user account',
        phone: '+1234567890',
      });
      console.log('User created: john.doe@example.com (username: johndoe)');
    } else {
      console.log('User john.doe@example.com already exists');
    }

    // Create sample user 2
    const user2Exists = await User.findOne({ email: 'jane.smith@example.com' });
    if (!user2Exists) {
      const hashedPassword = await hashPassword('User123!');
      await User.create({
        username: 'janesmith',
        hashedPassword,
        email: 'jane.smith@example.com',
        displayName: 'Jane Smith',
        bio: 'Another sample user account',
      });
      console.log('User created: jane.smith@example.com (username: janesmith)');
    } else {
      console.log('User jane.smith@example.com already exists');
    }

    // Create sample user 3
    const user3Exists = await User.findOne({ email: 'bob.wilson@example.com' });
    if (!user3Exists) {
      const hashedPassword = await hashPassword('User123!');
      await User.create({
        username: 'bobwilson',
        hashedPassword,
        email: 'bob.wilson@example.com',
        displayName: 'Bob Wilson',
        bio: 'Third sample user account',
        phone: '+0987654321',
      });
      console.log('User created: bob.wilson@example.com (username: bobwilson)');
    } else {
      console.log('User bob.wilson@example.com already exists');
    }

    console.log('Sample users seeding completed');

  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
};

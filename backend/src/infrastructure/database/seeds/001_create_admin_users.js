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

    // Create or update admin user
    const adminExists = await User.findOne({ email: 'admin@example.com' });
    if (!adminExists) {
      const hashedPassword = await hashPassword('Admin123!');
      await User.create({
        username: 'admin',
        hashedPassword,
        email: 'admin@example.com',
        displayName: 'System Administrator',
        bio: 'System administrator account',
        isActive: true, // Admin user is pre-activated
      });
      console.log('Admin user created: admin@example.com (username: admin)');
    } else {
      // Update existing admin user to be verified
      await User.updateOne(
        { email: 'admin@example.com' },
        { $set: { isActive: true } }
      );
      console.log('Admin user updated: admin@example.com (marked as verified)');
    }

    // Create sample user 1
    const user1Exists = await User.findOne({ email: 'user@example.com' });
    if (!user1Exists) {
      const hashedPassword = await hashPassword('User123!');
      await User.create({
        username: 'user',
        hashedPassword,
        email: 'user@example.com',
        displayName: 'John Doe',
        bio: 'Sample user account',
        phone: '+1234567890',
        isActive: true, // Sample users are pre-verified
      });
      console.log('User created: user@example.com (username: user)');
    } else {
      await User.updateOne(
        { email: 'user@example.com' },
        { $set: { isActive: true } }
      );
      console.log('User updated: user@example.com (marked as verified)');
    }
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
};

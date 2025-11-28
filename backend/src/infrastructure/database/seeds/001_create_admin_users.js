// Seed: Create sample users with different roles
// Note: Passwords need to be hashed before saving

import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROLES } from '../../../shared/constants/roles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const run = async (_mongoose) => {
  // Import User model using absolute path
  const userModelPath = path.join(__dirname, '../../models/user-model.js');
  const userProfileModelPath = path.join(__dirname, '../../models/user-profile-model.js');

  const userFileUrl = path.isAbsolute(userModelPath)
    ? `file://${userModelPath.replace(/\\/g, '/')}`
    : `file://${path.resolve(userModelPath).replace(/\\/g, '/')}`;

  const profileFileUrl = path.isAbsolute(userProfileModelPath)
    ? `file://${userProfileModelPath.replace(/\\/g, '/')}`
    : `file://${path.resolve(userProfileModelPath).replace(/\\/g, '/')}`;

  const UserModule = await import(userFileUrl);
  const ProfileModule = await import(profileFileUrl);

  const User = UserModule.default;
  const UserProfile = ProfileModule.default;

  console.log('Creating sample users...');

  try {
    // Hash password helper
    const hashPassword = async (password) => {
      const salt = await bcrypt.genSalt(12);
      return bcrypt.hash(password, salt);
    };

    // Define users to create with their roles
    const usersToCreate = [
      {
        username: 'admin',
        email: 'admin@example.com',
        password: 'Admin123!',
        displayName: 'System Administrator',
        role: ROLES.ADMIN,
        phone: '+1-555-0100',
        profile: {
          bio: 'System administrator with full access',
          emailVerified: true,
        },
      },
      {
        username: 'manager',
        email: 'manager@example.com',
        password: 'Manager123!',
        displayName: 'Operations Manager',
        role: ROLES.MANAGER,
        phone: '+1-555-0200',
        profile: {
          bio: 'Operations manager with user management permissions',
          emailVerified: true,
        },
      },
      {
        username: 'staff',
        email: 'staff@example.com',
        password: 'Staff123!',
        displayName: 'Staff Member',
        role: ROLES.STAFF,
        phone: '+1-555-0300',
        profile: {
          bio: 'Regular staff member with basic permissions',
          emailVerified: true,
        },
      },
    ];

    // Create or update each user
    for (const userData of usersToCreate) {
      const userExists = await User.findOne({ email: userData.email });

      if (!userExists) {
        const hashedPassword = await hashPassword(userData.password);
        const user = await User.create({
          username: userData.username,
          hashedPassword,
          email: userData.email,
          displayName: userData.displayName,
          role: userData.role,
          phone: userData.phone,
          isActive: true, // All seed users are pre-activated
          isFirstLogin: false, // Seed users don't need first login password change
        });

        // Create user profile
        await UserProfile.create({
          userId: user._id,
          bio: userData.profile.bio,
          emailVerified: userData.profile.emailVerified,
          emailVerifiedAt: userData.profile.emailVerified ? new Date() : undefined,
        });

        console.log(
          `${userData.role.charAt(0).toUpperCase() + userData.role.slice(1)} user created: ${userData.email} (username: ${userData.username})`
        );
      } else {
        // Update existing user to ensure they have the correct role and are active
        await User.updateOne(
          { email: userData.email },
          {
            $set: {
              role: userData.role,
              isActive: true,
              displayName: userData.displayName,
              phone: userData.phone,
              isFirstLogin: false,
            },
          }
        );

        // Update or create profile
        await UserProfile.findOneAndUpdate(
          { userId: userExists._id },
          {
            $set: {
              bio: userData.profile.bio,
              emailVerified: userData.profile.emailVerified,
              emailVerifiedAt: userData.profile.emailVerified ? new Date() : undefined,
            },
          },
          { upsert: true, new: true }
        );

        console.log(
          `${userData.role.charAt(0).toUpperCase() + userData.role.slice(1)} user updated: ${userData.email}`
        );
      }
    }
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
};

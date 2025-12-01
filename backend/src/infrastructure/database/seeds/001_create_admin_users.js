// Seed: Create sample users with hierarchical role-based management system
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

  console.log('Creating hierarchical user management system...');

  try {
    // Hash password helper
    const hashPassword = async (password) => {
      const salt = await bcrypt.genSalt(12);
      return bcrypt.hash(password, salt);
    };

    // Define users to create with their roles and relationships
    const usersToCreate = [
      // System Administrator
      {
        username: 'admin',
        email: 'admin@example.com',
        password: 'Admin123!',
        displayName: 'System Administrator',
        role: ROLES.ADMIN,
        phone: '+1-555-0100',
        profile: {
          bio: 'System administrator with full access to create managers and staff',
          emailVerified: true,
        },
      },

      // Department Managers
      {
        username: 'manager_hr',
        email: 'hr.manager@example.com',
        password: 'Manager123!',
        displayName: 'HR Manager',
        role: ROLES.MANAGER,
        phone: '+1-555-0201',
        profile: {
          bio: 'Human Resources manager responsible for staff management and recruitment',
          emailVerified: true,
        },
      },
      {
        username: 'manager_sales',
        email: 'sales.manager@example.com',
        password: 'Manager123!',
        displayName: 'Sales Manager',
        role: ROLES.MANAGER,
        phone: '+1-555-0202',
        profile: {
          bio: 'Sales department manager overseeing sales team and client relationships',
          emailVerified: true,
        },
      },
      {
        username: 'manager_tech',
        email: 'tech.manager@example.com',
        password: 'Manager123!',
        displayName: 'Technical Manager',
        role: ROLES.MANAGER,
        phone: '+1-555-0203',
        profile: {
          bio: 'Technical manager leading development and IT operations teams',
          emailVerified: true,
        },
      },

      // Staff members assigned to managers
      {
        username: 'hr_staff_1',
        email: 'hr.staff1@example.com',
        password: 'Staff123!',
        displayName: 'HR Specialist',
        role: ROLES.STAFF,
        phone: '+1-555-0301',
        profile: {
          bio: 'Human Resources specialist handling employee relations and onboarding',
          emailVerified: true,
        },
        managedByUsername: 'manager_hr',
      },
      {
        username: 'hr_staff_2',
        email: 'hr.staff2@example.com',
        password: 'Staff123!',
        displayName: 'HR Coordinator',
        role: ROLES.STAFF,
        phone: '+1-555-0302',
        profile: {
          bio: 'HR coordinator managing employee records and benefits administration',
          emailVerified: true,
        },
        managedByUsername: 'manager_hr',
      },
      {
        username: 'sales_staff_1',
        email: 'sales.staff1@example.com',
        password: 'Staff123!',
        displayName: 'Sales Representative',
        role: ROLES.STAFF,
        phone: '+1-555-0303',
        profile: {
          bio: 'Sales representative focused on client acquisition and relationship management',
          emailVerified: true,
        },
        managedByUsername: 'manager_sales',
      },
      {
        username: 'sales_staff_2',
        email: 'sales.staff2@example.com',
        password: 'Staff123!',
        displayName: 'Sales Associate',
        role: ROLES.STAFF,
        phone: '+1-555-0304',
        profile: {
          bio: 'Sales associate supporting lead generation and customer service',
          emailVerified: true,
        },
        managedByUsername: 'manager_sales',
      },
      {
        username: 'tech_staff_1',
        email: 'tech.staff1@example.com',
        password: 'Staff123!',
        displayName: 'Software Developer',
        role: ROLES.STAFF,
        phone: '+1-555-0305',
        profile: {
          bio: 'Full-stack software developer working on web applications and APIs',
          emailVerified: true,
        },
        managedByUsername: 'manager_tech',
      },
      {
        username: 'tech_staff_2',
        email: 'tech.staff2@example.com',
        password: 'Staff123!',
        displayName: 'DevOps Engineer',
        role: ROLES.STAFF,
        phone: '+1-555-0306',
        profile: {
          bio: 'DevOps engineer managing infrastructure, deployment, and system monitoring',
          emailVerified: true,
        },
        managedByUsername: 'manager_tech',
      },
      {
        username: 'tech_staff_3',
        email: 'tech.staff3@example.com',
        password: 'Staff123!',
        displayName: 'QA Tester',
        role: ROLES.STAFF,
        phone: '+1-555-0307',
        profile: {
          bio: 'Quality assurance specialist ensuring software quality and testing procedures',
          emailVerified: true,
        },
        managedByUsername: 'manager_tech',
      },
    ];

    // Create users in hierarchical order (admins first, then managers, then staff)
    // This ensures managers exist before we assign staff to them
    const adminUsers = usersToCreate.filter((u) => u.role === ROLES.ADMIN);
    const managerUsers = usersToCreate.filter((u) => u.role === ROLES.MANAGER);
    const staffUsers = usersToCreate.filter((u) => u.role === ROLES.STAFF);

    const allUserGroups = [adminUsers, managerUsers, staffUsers];

    // Store created manager IDs for staff assignment
    const managerMap = new Map();

    for (const userGroup of allUserGroups) {
      for (const userData of userGroup) {
        const userExists = await User.findOne({ email: userData.email });

        // Prepare user data with relationships
        const userFields = {
          username: userData.username,
          hashedPassword: await hashPassword(userData.password),
          email: userData.email,
          displayName: userData.displayName,
          role: userData.role,
          phone: userData.phone,
          isActive: true, // All seed users are pre-activated
          isFirstLogin: false, // Seed users don't need first login password change
          requiresPasswordChange: false, // Seed users have proper passwords
        };

        // Set relationships based on role
        if (userData.role === ROLES.ADMIN) {
          // Admins have no manager and are created by system
          userFields.createdBy = null; // System user
          userFields.managedBy = null;
        } else if (userData.role === ROLES.MANAGER) {
          // Managers are created by admin
          const adminUser = await User.findOne({ role: ROLES.ADMIN });
          userFields.createdBy = adminUser ? adminUser._id : null;
          userFields.managedBy = null; // Managers have no manager
        } else if (userData.role === ROLES.STAFF) {
          // Staff are created by their manager
          const managerId = managerMap.get(userData.managedByUsername);
          userFields.createdBy = managerId || null;
          userFields.managedBy = managerId || null;
        }

        if (!userExists) {
          const user = await User.create(userFields);

          // Store manager ID for staff assignment
          if (userData.role === ROLES.MANAGER) {
            managerMap.set(userData.username, user._id);
          }

          // Create user profile
          await UserProfile.create({
            userId: user._id,
            bio: userData.profile.bio,
            emailVerified: userData.profile.emailVerified,
            emailVerifiedAt: userData.profile.emailVerified ? new Date() : undefined,
          });

          console.log(
            `✅ ${userData.role.charAt(0).toUpperCase() + userData.role.slice(1)} user created: ${userData.email} (${userData.username})`
          );
        } else {
          // Update existing user with new fields
          const updateData = { ...userFields };
          delete updateData.hashedPassword; // Don't update password if user exists
          delete updateData.username; // Don't change username

          await User.updateOne({ email: userData.email }, { $set: updateData });

          // Store manager ID for existing managers too
          if (userData.role === ROLES.MANAGER) {
            managerMap.set(userData.username, userExists._id);
          }

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
            `🔄 ${userData.role.charAt(0).toUpperCase() + userData.role.slice(1)} user updated: ${userData.email}`
          );
        }
      }
    }

    console.log('\n📊 User Management Hierarchy Created:');
    console.log('👑 Admin: admin@example.com');
    console.log('👨‍💼 Managers:');
    for (const manager of [
      'hr.manager@example.com',
      'sales.manager@example.com',
      'tech.manager@example.com',
    ]) {
      console.log(`   • ${manager}`);
    }
    console.log('👥 Staff:');
    console.log('   • HR Department (managed by hr.manager@example.com):');
    console.log('     - hr.staff1@example.com (HR Specialist)');
    console.log('     - hr.staff2@example.com (HR Coordinator)');
    console.log('   • Sales Department (managed by sales.manager@example.com):');
    console.log('     - sales.staff1@example.com (Sales Representative)');
    console.log('     - sales.staff2@example.com (Sales Associate)');
    console.log('   • Technical Department (managed by tech.manager@example.com):');
    console.log('     - tech.staff1@example.com (Software Developer)');
    console.log('     - tech.staff2@example.com (DevOps Engineer)');
    console.log('     - tech.staff3@example.com (QA Tester)');

    console.log('\n🔐 Login Credentials:');
    console.log('Admin: admin@example.com / Admin123!');
    console.log('Managers: [manager]@example.com / Manager123!');
    console.log('Staff: [department].staff[number]@example.com / Staff123!');
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
};

// Seed: Create sample users with hierarchical role-based management system
// Note: Passwords need to be hashed before saving

import bcrypt from 'bcryptjs';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  console.log('Creating hierarchical user management system...');

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
      role: 'admin',
      phone: '+1-555-0100',
      profile: {
        bio: 'System administrator with full access to create managers and staff',
      },
    },

    // Department Managers
    {
      username: 'manager_hr',
      email: 'hr.manager@example.com',
      password: 'Manager123!',
      displayName: 'HR Manager',
      role: 'manager',
      phone: '+1-555-0201',
      profile: {
        bio: 'Human Resources manager responsible for staff management and recruitment',
      },
    },
    {
      username: 'manager_sales',
      email: 'sales.manager@example.com',
      password: 'Manager123!',
      displayName: 'Sales Manager',
      role: 'manager',
      phone: '+1-555-0202',
      profile: {
        bio: 'Sales department manager overseeing sales team and client relationships',
      },
    },
    {
      username: 'manager_tech',
      email: 'tech.manager@example.com',
      password: 'Manager123!',
      displayName: 'Technical Manager',
      role: 'manager',
      phone: '+1-555-0203',
      profile: {
        bio: 'Technical manager leading development and IT operations teams',
      },
    },

    // Staff members assigned to managers
    {
      username: 'hr_staff_1',
      email: 'hr.staff1@example.com',
      password: 'Staff123!',
      displayName: 'HR Specialist',
      role: 'staff',
      phone: '+1-555-0301',
      profile: {
        bio: 'Human Resources specialist handling employee relations and onboarding',
      },
      managedByUsername: 'manager_hr',
    },
    {
      username: 'hr_staff_2',
      email: 'hr.staff2@example.com',
      password: 'Staff123!',
      displayName: 'HR Coordinator',
      role: 'staff',
      phone: '+1-555-0302',
      profile: {
        bio: 'HR coordinator managing employee records and benefits administration',
      },
      managedByUsername: 'manager_hr',
    },
    {
      username: 'sales_staff_1',
      email: 'sales.staff1@example.com',
      password: 'Staff123!',
      displayName: 'Sales Representative',
      role: 'staff',
      phone: '+1-555-0303',
      profile: {
        bio: 'Sales representative focused on client acquisition and relationship management',
      },
      managedByUsername: 'manager_sales',
    },
    {
      username: 'sales_staff_2',
      email: 'sales.staff2@example.com',
      password: 'Staff123!',
      displayName: 'Sales Associate',
      role: 'staff',
      phone: '+1-555-0304',
      profile: {
        bio: 'Sales associate supporting lead generation and customer service',
      },
      managedByUsername: 'manager_sales',
    },
    {
      username: 'tech_staff_1',
      email: 'tech.staff1@example.com',
      password: 'Staff123!',
      displayName: 'Software Developer',
      role: 'staff',
      phone: '+1-555-0305',
      profile: {
        bio: 'Full-stack software developer working on web applications and APIs',
      },
      managedByUsername: 'manager_tech',
    },
    {
      username: 'tech_staff_2',
      email: 'tech.staff2@example.com',
      password: 'Staff123!',
      displayName: 'DevOps Engineer',
      role: 'staff',
      phone: '+1-555-0306',
      profile: {
        bio: 'DevOps engineer managing infrastructure, deployment, and system monitoring',
      },
      managedByUsername: 'manager_tech',
    },
    {
      username: 'tech_staff_3',
      email: 'tech.staff3@example.com',
      password: 'Staff123!',
      displayName: 'QA Tester',
      role: 'staff',
      phone: '+1-555-0307',
      profile: {
        bio: 'Quality assurance specialist ensuring software quality and testing procedures',
      },
      managedByUsername: 'manager_tech',
    },
  ];

  // Generate additional managers and staff for testing pagination, search, and filtering
  const additionalManagers = [];
  const additionalStaff = [];

  // Add 10 more managers
  const managerDepartments = ['finance', 'marketing', 'operations', 'support', 'legal', 'product', 'engineering', 'design', 'security', 'analytics'];
  for (let i = 0; i < 10; i++) {
    const dept = managerDepartments[i];
    additionalManagers.push({
      username: `manager_${dept}`,
      email: `${dept}.manager@example.com`,
      password: 'Manager123!',
      displayName: `${dept.charAt(0).toUpperCase() + dept.slice(1)} Manager`,
      role: 'manager',
      phone: `+1-555-${String(1000 + i).padStart(4, '0')}`,
      profile: {
        bio: `${dept.charAt(0).toUpperCase() + dept.slice(1)} department manager`,
      },
    });
  }

  // Add 90 more staff members (9 per manager)
  const staffRoles = [
    'Specialist', 'Coordinator', 'Analyst', 'Assistant', 'Representative',
    'Engineer', 'Consultant', 'Administrator', 'Technician'
  ];
  
  let staffIndex = 0;
  for (const manager of additionalManagers) {
    for (let j = 0; j < 9; j++) {
      const role = staffRoles[j];
      const dept = manager.username.replace('manager_', '');
      additionalStaff.push({
        username: `${dept}_staff_${j + 1}`,
        email: `${dept}.staff${j + 1}@example.com`,
        password: 'Staff123!',
        displayName: `${dept.charAt(0).toUpperCase() + dept.slice(1)} ${role}`,
        role: 'staff',
        phone: `+1-555-${String(2000 + staffIndex).padStart(4, '0')}`,
        profile: {
          bio: `${dept.charAt(0).toUpperCase() + dept.slice(1)} ${role.toLowerCase()} in the ${dept} department`,
        },
        managedByUsername: manager.username,
        isActive: staffIndex % 10 !== 0, // Make every 10th user inactive for testing
      });
      staffIndex++;
    }
  }

  // Add original managers and staff to the expanded list
  usersToCreate.push(...additionalManagers);
  usersToCreate.push(...additionalStaff);

  // Create users in hierarchical order (admins first, then managers, then staff)
  const adminUsers = usersToCreate.filter((u) => u.role === 'admin');
  const managerUsers = usersToCreate.filter((u) => u.role === 'manager');
  const staffUsers = usersToCreate.filter((u) => u.role === 'staff');

  const allUserGroups = [adminUsers, managerUsers, staffUsers];

  // Store created manager IDs for staff assignment
  const managerMap = new Map();

  for (const userGroup of allUserGroups) {
    for (const userData of userGroup) {
      // Check if user exists
      const existingUser = await knex('users').where('email', userData.email).first();

      // Prepare user data with relationships
      const userFields = {
        username: userData.username.toLowerCase(),
        hashed_password: await hashPassword(userData.password),
        email: userData.email.toLowerCase(),
        display_name: userData.displayName,
        role: userData.role,
        phone: userData.phone,
        is_active: userData.isActive !== undefined ? userData.isActive : true, // Use provided isActive or default to true
        is_first_login: false, // Seed users don't need first login password change
        requires_password_change: false, // Seed users have proper passwords
      };

      // Set relationships based on role
      if (userData.role === 'admin') {
        userFields.created_by = null; // System user
        userFields.managed_by = null;
      } else if (userData.role === 'manager') {
        // Managers are created by admin
        const adminUser = await knex('users').where('role', 'admin').first();
        userFields.created_by = adminUser ? adminUser.id : null;
        userFields.managed_by = null; // Managers have no manager
      } else if (userData.role === 'staff') {
        // Staff are created by their manager
        const managerId = managerMap.get(userData.managedByUsername);
        userFields.created_by = managerId || null;
        userFields.managed_by = managerId || null;
      }

      if (!existingUser) {
        const [user] = await knex('users').insert(userFields).returning('*');

        // Store manager ID for staff assignment
        if (userData.role === 'manager') {
          managerMap.set(userData.username, user.id);
        }

        // Create user profile
        await knex('user_profiles').insert({
          user_id: user.id,
          bio: userData.profile.bio,
        });

        console.log(
          `✅ ${userData.role.charAt(0).toUpperCase() + userData.role.slice(1)} user created: ${userData.email} (${userData.username})`
        );
      } else {
        // Update existing user with new fields
        const updateData = { ...userFields };
        delete updateData.hashed_password; // Don't update password if user exists
        delete updateData.username; // Don't change username

        await knex('users').where('email', userData.email).update(updateData);

        // Store manager ID for existing managers too
        if (userData.role === 'manager') {
          managerMap.set(userData.username, existingUser.id);
        }

        // Update or create profile (upsert)
        const existingProfile = await knex('user_profiles')
          .where('user_id', existingUser.id)
          .first();

        if (existingProfile) {
          await knex('user_profiles').where('user_id', existingUser.id).update({
            bio: userData.profile.bio,
            updated_at: new Date(),
          });
        } else {
          await knex('user_profiles').insert({
            user_id: existingUser.id,
            bio: userData.profile.bio,
          });
        }

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
}

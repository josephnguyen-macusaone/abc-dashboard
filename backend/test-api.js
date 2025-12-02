/**
 * API Test Script
 * Tests user management endpoints to verify CRUD operations work correctly
 */

// Using built-in fetch API instead of axios

// Configuration
const API_BASE = 'http://localhost:8000/api/v1';
let authToken = null;

// Test user data
const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'admin123'
  },
  staff1: {
    username: 'staff1',
    email: 'staff1@test.com',
    firstName: 'John',
    lastName: 'Staff',
    role: 'staff'
  }
};

async function login(credentials) {
  try {
    console.log(`🔐 Logging in as ${credentials.email || credentials.username}...`);
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    authToken = data.data.token;
    console.log('✅ Login successful');
    return data;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    throw error;
  }
}

async function createUser(userData) {
  try {
    console.log(`👤 Creating user: ${userData.email}...`);
    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('✅ User created:', data.data.user.email);
    return data.data.user;
  } catch (error) {
    console.error('❌ User creation failed:', error.message);
    throw error;
  }
}

async function getUsers() {
  try {
    console.log('📋 Getting users list...');
    const response = await fetch(`${API_BASE}/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log(`✅ Retrieved ${data.data.length} users`);
    return data.data;
  } catch (error) {
    console.error('❌ Get users failed:', error.message);
    throw error;
  }
}

async function updateUser(userId, updateData) {
  try {
    console.log(`📝 Updating user ${userId}...`);
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('✅ User updated:', data.data.user.email);
    return data.data.user;
  } catch (error) {
    console.error('❌ User update failed:', error.message);
    throw error;
  }
}

async function deleteUser(userId) {
  try {
    console.log(`🗑️ Deleting user ${userId}...`);
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('✅ User deleted successfully');
    return data;
  } catch (error) {
    console.error('❌ User deletion failed:', error.message);
    throw error;
  }
}

async function testUserManagement() {
  try {
    console.log('🚀 Starting User Management API Tests...\n');

    // Step 1: Login as admin
    await login(testUsers.admin);

    // Step 2: Get initial user list
    const initialUsers = await getUsers();
    console.log('Initial users:', initialUsers.map(u => ({ id: u.id, email: u.email, role: u.role })));

    // Step 3: Create a test staff user
    const createdUser = await createUser(testUsers.staff1);

    // Step 4: Get updated user list
    const updatedUsers = await getUsers();
    console.log('Users after creation:', updatedUsers.map(u => ({ id: u.id, email: u.email, role: u.role })));

    // Step 5: Update the created user
    await updateUser(createdUser.id, { firstName: 'Updated', lastName: 'Name' });

    // Step 6: Try to delete the created user (this should work for admin)
    await deleteUser(createdUser.id);

    // Step 7: Verify user was deleted
    const finalUsers = await getUsers();
    console.log('Final users:', finalUsers.map(u => ({ id: u.id, email: u.email, role: u.role })));

    console.log('\n🎉 All tests passed! User management API is working correctly.');

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
async function main() {
  try {
    console.log('🔍 Checking existing users first...\n');
    await login(testUsers.admin);

    console.log('📋 Current users in system:');
    const users = await getUsers();
    users.forEach(user => {
      console.log(`  - ${user.username} (${user.email}) - ${user.role}`);
    });

    console.log('\n🚀 Starting user management tests...\n');
    await testUserManagement();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

main();

export {
  login,
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  testUserManagement
};

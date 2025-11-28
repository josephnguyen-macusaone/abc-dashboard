/**
 * Migration: Add Indexes
 * Creates optimized indexes for common query patterns
 */

export const up = async (mongoose) => {
  const db = mongoose.connection.db;

  console.log('Creating indexes...');

  // User collection indexes
  const usersCollection = db.collection('users');

  // Compound indexes for User
  await usersCollection.createIndex({ role: 1, isActive: 1 }, { background: true });
  await usersCollection.createIndex({ email: 1, isActive: 1 }, { background: true });
  await usersCollection.createIndex({ role: 1, createdAt: -1 }, { background: true });
  await usersCollection.createIndex({ isActive: 1, createdAt: -1 }, { background: true });

  // Text index for search
  await usersCollection.createIndex(
    { displayName: 'text', username: 'text', email: 'text' },
    { background: true, name: 'user_search_text' }
  );

  console.log('User indexes created successfully');

  // UserProfile collection indexes
  const userProfilesCollection = db.collection('userprofiles');

  // Single field indexes
  await userProfilesCollection.createIndex({ lastActivityAt: -1 }, { background: true });
  await userProfilesCollection.createIndex({ emailVerified: 1 }, { background: true });

  // Compound indexes
  await userProfilesCollection.createIndex({ userId: 1, emailVerified: 1 }, { background: true });
  await userProfilesCollection.createIndex({ lastLoginAt: -1, userId: 1 }, { background: true });

  console.log('UserProfile indexes created successfully');
  console.log('Migration completed: Indexes added');
};

export const down = async (mongoose) => {
  const db = mongoose.connection.db;

  console.log('Removing indexes...');

  // User collection - drop indexes
  const usersCollection = db.collection('users');
  try {
    await usersCollection.dropIndex({ role: 1, isActive: 1 });
    await usersCollection.dropIndex({ email: 1, isActive: 1 });
    await usersCollection.dropIndex({ role: 1, createdAt: -1 });
    await usersCollection.dropIndex({ isActive: 1, createdAt: -1 });
    await usersCollection.dropIndex('user_search_text');
  } catch (error) {
    console.log('Some user indexes may not exist:', error.message);
  }

  // UserProfile collection - drop indexes
  const userProfilesCollection = db.collection('userprofiles');
  try {
    await userProfilesCollection.dropIndex({ lastActivityAt: -1 });
    await userProfilesCollection.dropIndex({ emailVerified: 1 });
    await userProfilesCollection.dropIndex({ userId: 1, emailVerified: 1 });
    await userProfilesCollection.dropIndex({ lastLoginAt: -1, userId: 1 });
  } catch (error) {
    console.log('Some userprofile indexes may not exist:', error.message);
  }

  console.log('Migration rolled back: Indexes removed');
};

/**
 * Jest Test Setup
 * Configures the test environment for ES modules
 */
import { jest } from '@jest/globals';
import knex from 'knex';

// Set test environment variables before anything else
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5432';
process.env.POSTGRES_DB = 'abc_dashboard_test';
process.env.POSTGRES_USER = 'abc_user';
process.env.POSTGRES_PASSWORD = 'abc_password';
process.env.EMAIL_SERVICE = 'test';
process.env.EMAIL_HOST = 'localhost';
process.env.EMAIL_PORT = '1025';
process.env.BCRYPT_ROUNDS = '4'; // Lower rounds for faster tests

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

// Database connection instance
let db = null;

// Global test utilities
global.testUtils = {
  // Helper to create test users
  createTestUser: (overrides = {}) => ({
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    displayName: 'Test User',
    role: 'staff',
    ...overrides,
  }),

  // Helper to wait for async operations
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

  // Helper to generate random email
  randomEmail: () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,

  // Helper to generate random username
  randomUsername: () => `user_${Date.now()}_${Math.random().toString(36).substring(7)}`,
};

// Database connection helper for integration tests
global.testDb = {
  connect: async () => {
    if (!db) {
      db = knex({
        client: 'pg',
        connection: {
          host: process.env.POSTGRES_HOST,
          port: parseInt(process.env.POSTGRES_PORT),
          database: process.env.POSTGRES_DB,
          user: process.env.POSTGRES_USER,
          password: process.env.POSTGRES_PASSWORD,
        },
        pool: {
          min: 2,
          max: 10,
        },
      });

      // Test connection
      await db.raw('SELECT 1');
    }
    return db;
  },

  getDb: () => db,

  disconnect: async () => {
    if (db) {
      await db.destroy();
      db = null;
    }
  },

  clearDatabase: async () => {
    if (db) {
      // Clear all tables in reverse order of dependencies
      await db('user_profiles').del();
      await db('users').del();
    }
  },

  dropDatabase: async () => {
    if (db) {
      // Drop tables in reverse order of dependencies
      await db.schema.dropTableIfExists('user_profiles');
      await db.schema.dropTableIfExists('users');
      await db.raw('DROP TYPE IF EXISTS user_role');
    }
  },
};

// Increase default timeout for async operations
jest.setTimeout(30000);

// Restore console after all tests
afterAll(async () => {
  // Restore original console
  Object.assign(console, originalConsole);

  // Close database connection if open
  await global.testDb.disconnect();

  // Give time for any pending operations to complete
  await new Promise((resolve) => setTimeout(resolve, 100));
});

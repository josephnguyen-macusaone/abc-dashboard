/**
 * Jest Test Setup
 * Configures the test environment for ES modules
 */
import { jest } from '@jest/globals';
import mongoose from 'mongoose';

// Set test environment variables before anything else
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.MONGODB_URI = 'mongodb://localhost:27017/abc_dashboard_test';
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
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
    }
  },

  disconnect: async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  },

  clearDatabase: async () => {
    if (mongoose.connection.readyState !== 0) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
    }
  },

  dropDatabase: async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
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

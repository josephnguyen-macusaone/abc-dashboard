/**
 * Jest Test Setup
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.MONGODB_URI = 'mongodb://localhost:27017/abc_dashboard_test';

// Mock console methods to reduce noise in tests
global.originalConsole = { ...console };
console.log = jest.fn();
console.info = jest.fn();
console.warn = jest.fn();
console.error = jest.fn();

// Restore console after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Clean up after all tests
afterAll(async () => {
  // Restore original console
  Object.assign(console, global.originalConsole);

  // Close any open database connections
  if (global.mongoose) {
    await global.mongoose.connection.close();
  }
});

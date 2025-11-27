/** @type {import('jest').Config} */
export default {
  // Test environment
  testEnvironment: 'node',

  // Test files location
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/infrastructure/config/database.js',
    '!src/infrastructure/config/logger.js',
    '!src/**/index.js',
    '!src/**/bootstrap/**'
  ],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Transform configuration for ES modules
  transform: {},

  // Module name mapping
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Force exit to prevent hanging
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true
};

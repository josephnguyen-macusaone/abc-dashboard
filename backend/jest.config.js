/** @type {import('jest').Config} */
export default {
  // Test environment
  testEnvironment: 'node',

  // ES Modules support (automatically handled by package.json "type": "module")
  extensionsToTreatAsEsm: [],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },

  // Test files location
  testMatch: ['<rootDir>/tests/**/*.test.js'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/infrastructure/config/database.js',
    '!src/infrastructure/config/logger.js',
    '!src/**/index.js',
  ],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Transform configuration for ES modules
  transform: {},

  // Transform ignore patterns for ES modules
  transformIgnorePatterns: ['node_modules/(?!(supertest)/)'],

  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'mjs'],

  // Test timeout (increased for integration tests)
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Force exit to prevent hanging from supertest/express timeouts
  forceExit: true,

  // Only enable detectOpenHandles for debugging (shows warnings for supertest timeouts)
  // detectOpenHandles: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,
};

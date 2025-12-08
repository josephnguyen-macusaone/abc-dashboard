import { container } from './container';

/**
 * Test Utilities for Dependency Injection
 * Provides utilities for testing with mocked dependencies
 *
 * This allows for:
 * - Easy mocking of services in unit tests
 * - Isolated testing of components
 * - Controlled test environments
 */

/**
 * Mock a service in the container
 * @param serviceKey - The service property name (e.g., 'authService')
 * @param mockImplementation - The mock implementation
 */
export const mockService = <T extends keyof typeof container>(
  serviceKey: T,
  mockImplementation: (typeof container)[T]
): void => {
  (container as unknown as Record<string, unknown>)[serviceKey as string] = mockImplementation;
};

/**
 * Reset all services to their original implementations
 */
export const resetServices = (): void => {
  container.reset();
};

/**
 * Create a test context with mocked services
 * @param mocks - Object containing service mocks
 */
export const createTestContext = (mocks: Partial<typeof container>): (() => void) => {
  const originalServices: Partial<typeof container> = {};

  // Store original implementations
  Object.keys(mocks).forEach(key => {
    const serviceKey = key as keyof typeof container;
    (originalServices as any)[serviceKey] = container[serviceKey];
  });

  // Apply mocks
  Object.entries(mocks).forEach(([key, mock]) => {
    mockService(key as keyof typeof container, mock as (typeof container)[keyof typeof container]);
  });

  // Return cleanup function
  return () => {
    // Restore original implementations
    Object.entries(originalServices).forEach(([key, original]) => {
      (container as unknown as Record<string, unknown>)[key] = original;
    });
  };
};

/**
 * Test wrapper that automatically resets services after test
 * @param testFn - The test function to wrap
 */
export const withTestContainer = (testFn: () => void | Promise<void>) => {
  return async () => {
    try {
      await testFn();
    } finally {
      resetServices();
    }
  };
};

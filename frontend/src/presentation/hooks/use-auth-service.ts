import { useMemo } from 'react';
import { container } from '@/shared/di/container';

/**
 * Presentation Hook: Authentication Service
 * Provides dependency-injected AuthService to presentation components
 *
 * This hook follows Clean Architecture principles by:
 * - Keeping infrastructure dependencies out of presentation components
 * - Providing a stable interface for components to use
 * - Allowing easy testing with mocked services
 * - Using centralized dependency injection container
 */
export const useAuthService = () => {
  return useMemo(() => {
    return container.authService;
  }, []); // Empty dependency array means this will be created once per component lifecycle
};

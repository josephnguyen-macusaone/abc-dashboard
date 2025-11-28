import { useMemo } from 'react';
import { container } from '@/shared/di/container';

/**
 * Presentation Hook: User Management Service
 * Provides dependency-injected UserManagementService to presentation components
 *
 * This hook follows Clean Architecture principles by:
 * - Keeping infrastructure dependencies out of presentation components
 * - Providing a stable interface for components to use
 * - Allowing easy testing with mocked services
 * - Using centralized dependency injection container
 */
export const useUserManagementService = () => {
  return useMemo(() => {
    return container.userManagementService;
  }, []); // Empty dependency array means this will be created once per component lifecycle
};

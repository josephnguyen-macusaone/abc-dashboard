// Export infrastructure concerns only - no API services or types
export * from '@/infrastructure/api/types'; // Only HTTP client types remain
export * from '@/infrastructure/api/errors';
export { httpClient, HttpClient } from '@/infrastructure/api/client';

// API services are internal to infrastructure and should not be exported
// Use repositories from infrastructure/repositories/ instead

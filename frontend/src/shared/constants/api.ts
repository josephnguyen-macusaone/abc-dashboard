/**
 * API Configuration
 * Contains the validated and normalized API base URL
 */

import logger from '@/shared/helpers/logger';

/**
 * Validates and normalizes the API base URL
 * Ensures the URL has a valid http:// or https:// scheme for CORS requests
 */
const validateAndNormalizeBaseURL = (url: string | undefined): string => {
  // In production, use relative URLs since OpenLiteSpeed proxies /api/* to the backend
  if (process.env.NODE_ENV === 'production') {
    return '/api/v1';
  }

  const DEFAULT_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

  // If URL is empty, undefined, or null, use default
  if (!url || url.trim() === '') {
    return DEFAULT_URL;
  }

  const trimmedUrl = url.trim();

  // Check if URL already has http:// or https:// protocol
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    try {
      // Validate it's a proper URL
      new URL(trimmedUrl);
      return trimmedUrl;
    } catch {
      // Invalid URL format, use default
      logger.warn(`Invalid API URL format: "${trimmedUrl}". Using default: ${DEFAULT_URL}`);
      return DEFAULT_URL;
    }
  }

  // If no protocol, assume http:// for localhost, https:// for others
  if (trimmedUrl.startsWith('localhost') || trimmedUrl.startsWith('127.0.0.1')) {
    return `http://${trimmedUrl}`;
  }

  // For other URLs without protocol, default to https://
  logger.warn(`API URL missing protocol: "${trimmedUrl}". Assuming https://`);
  return `https://${trimmedUrl}`;
};

/**
 * API Configuration - Only contains actively used properties
 */
export const API_CONFIG = {
  BASE_URL: validateAndNormalizeBaseURL(process.env.NEXT_PUBLIC_API_URL),
} as const;

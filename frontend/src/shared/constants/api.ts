/**
 * API Configuration
 *
 * Validated and normalized API base URL. Values are resolved once at module load.
 *
 * Build-time env: NEXT_PUBLIC_* are inlined at build time. Change .env and
 * rebuild (e.g. restart dev server or rebuild Docker image) for changes to take effect.
 */

/** Env key for the API base URL (e.g. http://localhost:5000/api/v1) */
export const API_URL_ENV_KEY = 'NEXT_PUBLIC_API_URL';

/** Env key to use relative API path (set to 'true' when behind a proxy that forwards /api/*) */
export const USE_RELATIVE_API_ENV_KEY = 'NEXT_PUBLIC_USE_RELATIVE_API';

/** Default base URL when NEXT_PUBLIC_API_URL is unset or invalid */
export const DEFAULT_API_BASE_URL = 'http://localhost:5000/api/v1';

/** Relative API path when NEXT_PUBLIC_USE_RELATIVE_API is 'true' */
export const RELATIVE_API_PATH = '/api/v1';

/**
 * Environment-like object used to resolve the API base URL (for testing and resolution).
 */
export interface ApiEnv {
  [key: string]: string | undefined;
}

/**
 * Resolved API configuration. BASE_URL has no trailing slash.
 */
export interface ApiConfig {
  readonly BASE_URL: string;
}

/**
 * Strips trailing slash from a URL path or full URL (except for root '/').
 */
function stripTrailingSlash(url: string): string {
  return url.endsWith('/') && url.length > 1 ? url.slice(0, -1) : url;
}

/**
 * Resolves the API base URL from an env-like object.
 * Pure function: safe to unit test with fake env.
 *
 * Rules:
 * - If USE_RELATIVE_API_ENV_KEY === 'true', returns RELATIVE_API_PATH (no trailing slash).
 * - If API_URL_ENV_KEY is empty/missing, returns DEFAULT_API_BASE_URL.
 * - Validates absolute URLs with new URL(); invalid URLs fall back to default.
 * - Adds http:// for localhost/127.0.0.1, https:// for other protocol-less hostnames.
 * - Result always has no trailing slash so baseURL + '/auth/login' is safe.
 */
export function resolveApiBaseUrl(env: ApiEnv): string {
  const useRelative = env[USE_RELATIVE_API_ENV_KEY] === 'true';
  if (useRelative) {
    return stripTrailingSlash(RELATIVE_API_PATH);
  }

  const raw = env[API_URL_ENV_KEY];
  if (raw === undefined || raw === null || raw.trim() === '') {
    return stripTrailingSlash(DEFAULT_API_BASE_URL);
  }

  const trimmed = raw.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      return stripTrailingSlash(parsed.toString());
    } catch {
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        console.warn(
          `[api] Invalid API URL format: "${trimmed}". Using default: ${DEFAULT_API_BASE_URL}`
        );
      }
      return stripTrailingSlash(DEFAULT_API_BASE_URL);
    }
  }

  if (trimmed.startsWith('localhost') || trimmed.startsWith('127.0.0.1')) {
    return stripTrailingSlash(`http://${trimmed}`);
  }

  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    console.warn(`[api] API URL missing protocol: "${trimmed}". Assuming https://`);
  }
  return stripTrailingSlash(`https://${trimmed}`);
}

/**
 * API configuration resolved from process.env at module load.
 * BASE_URL has no trailing slash; safe to use as axios baseURL with paths like '/auth/login'.
 */
export const API_CONFIG: Readonly<ApiConfig> = {
  BASE_URL: resolveApiBaseUrl(
    typeof process !== 'undefined' && process.env ? process.env : {}
  ),
} as const;

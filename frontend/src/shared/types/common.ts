/**
 * Common types for handling external data and errors
 */

/**
 * Type for external data that hasn't been validated yet
 * Use this instead of `any` for API responses, form data, etc.
 */
export type UnknownObject = Record<string, unknown>;

/**
 * Type for external arrays that haven't been validated yet
 */
export type UnknownArray = unknown[];

/**
 * Type for any value that could be anything (use sparingly)
 * This is safer than `any` as it forces type guards
 */
export type AnyValue = unknown;

/**
 * Type for error objects that can come from various sources
 */
export type ErrorLike = {
  message?: string;
  code?: string | number;
  status?: number;
  stack?: string;
  name?: string;
} & Record<string, unknown>;

/**
 * Branded types for IDs to prevent mixing different ID types
 */
export type UserId = string & { readonly __brand: 'UserId' };
export type LicenseId = string & { readonly __brand: 'LicenseId' };
export type TokenId = string & { readonly __brand: 'TokenId' };

/**
 * Type guards for branded types
 */
export const isUserId = (value: string): value is UserId => typeof value === 'string' && value.length > 0;
export const isLicenseId = (value: string): value is LicenseId => typeof value === 'string' && value.length > 0;
export const isTokenId = (value: string): value is TokenId => typeof value === 'string' && value.length > 0;

/**
 * Factory functions for branded types
 */
export const createUserId = (id: string): UserId => {
  if (!isUserId(id)) {
    throw new Error('Invalid UserId format');
  }
  return id as UserId;
};

export const createLicenseId = (id: string): LicenseId => {
  if (!isLicenseId(id)) {
    throw new Error('Invalid LicenseId format');
  }
  return id as LicenseId;
};

export const createTokenId = (id: string): TokenId => {
  if (!isTokenId(id)) {
    throw new Error('Invalid TokenId format');
  }
  return id as TokenId;
};

/**
 * Type for API response data
 */
export type ApiResponseData = UnknownObject;

/**
 * Type for form data
 */
export type FormData = UnknownObject;

/**
 * Type for metadata objects (logging, tracing, etc.)
 */
export type Metadata = Record<string, unknown>;

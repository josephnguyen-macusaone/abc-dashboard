/**
 * API layer - domain-based structure.
 * Use domain barrels (auth, users, licenses) or core for HTTP client.
 */
export * from './core';
export { authApi, AuthApiService } from './auth';
export { userApi, UserApiService } from './users';

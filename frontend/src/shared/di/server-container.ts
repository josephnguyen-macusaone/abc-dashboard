/**
 * Request-scoped DI for Server Components.
 * Uses React cache() for deduplication within a single request.
 */
import { cache } from 'react';
import { createServerHttpClient } from '@/infrastructure/api/core/server-client';
import { createLicenseApiClient } from '@/infrastructure/api/licenses/api-client';
import { LicenseRepository } from '@/infrastructure/repositories/license-repository';
import type { ServerHttpClient } from '@/infrastructure/api/core/server-client';
import type { ILicenseApiClient } from '@/infrastructure/api/interfaces/i-license-api-client';

/** Cached per-request server HTTP client */
export const getServerHttpClient = cache(async (): Promise<ServerHttpClient> => {
  return createServerHttpClient();
});

/** Cached per-request license API client (uses server fetch with cookies) */
export const getServerLicenseApiClient = cache(async (): Promise<ILicenseApiClient> => {
  const httpClient = await getServerHttpClient();
  const client: HttpClientLike = {
    get: (url) => httpClient.get(url),
    post: (url, data) => httpClient.post(url, data),
    put: (url, data) => httpClient.put(url, data),
    patch: (url, data) => httpClient.patch(url, data),
    delete: (url, data) => httpClient.delete(url, data),
  };
  return createLicenseApiClient(client);
});

type HttpClientLike = {
  get<T>(url: string): Promise<T>;
  post<T>(url: string, data?: unknown): Promise<T>;
  put<T>(url: string, data?: unknown): Promise<T>;
  patch<T>(url: string, data?: unknown): Promise<T>;
  delete<T>(url: string, data?: unknown): Promise<T>;
};

/** Cached per-request license repository (SSR-safe) */
export const getServerLicenseRepository = cache(async (): Promise<LicenseRepository> => {
  const apiClient = await getServerLicenseApiClient();
  return new LicenseRepository(apiClient);
});

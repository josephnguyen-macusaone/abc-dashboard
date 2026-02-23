/**
 * Server-side HTTP client for SSR.
 * Uses fetch with cookie forwarding for authenticated requests.
 */
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/shared/constants';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ServerHttpClient {
  get<T = unknown>(url: string): Promise<T>;
  post<T = unknown>(url: string, data?: unknown): Promise<T>;
  put<T = unknown>(url: string, data?: unknown): Promise<T>;
  patch<T = unknown>(url: string, data?: unknown): Promise<T>;
  delete<T = unknown>(url: string, data?: unknown): Promise<T>;
}

async function request<T>(
  method: HttpMethod,
  path: string,
  cookieHeader: string | undefined,
  data?: unknown
): Promise<T> {
  const baseUrl = API_CONFIG.BASE_URL.replace(/\/$/, '');
  const url = path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  const options: RequestInit = {
    method,
    headers,
    cache: 'no-store',
  };
  if (data !== undefined && method !== 'GET') {
    // Axios-style { data: X } → use X as body
    const body = typeof data === 'object' && data !== null && 'data' in data
      ? (data as { data: unknown }).data
      : data;
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Server fetch failed: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

/**
 * Create a server HTTP client that forwards cookies for auth.
 * Call from async Server Components or Route Handlers.
 */
export async function createServerHttpClient(): Promise<ServerHttpClient> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  return {
    get: <T>(url: string) => request<T>('GET', url, cookieHeader),
    post: <T>(url: string, data?: unknown) => request<T>('POST', url, cookieHeader, data),
    put: <T>(url: string, data?: unknown) => request<T>('PUT', url, cookieHeader, data),
    patch: <T>(url: string, data?: unknown) => request<T>('PATCH', url, cookieHeader, data),
    delete: <T>(url: string, data?: unknown) =>
      request<T>('DELETE', url, cookieHeader, data),
  };
}

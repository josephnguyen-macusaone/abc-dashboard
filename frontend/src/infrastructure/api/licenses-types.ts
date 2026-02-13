/**
 * License API request/response types (infrastructure layer).
 * Raw backend shapes and response wrappers used by LicenseApiService and InternalLicenseApiService.
 */

/** Query params for GET /licenses (list with pagination and filters) */
export interface GetLicensesParams {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  status?: string | string[];
  plan?: string | string[];
  term?: string | string[];
  dba?: string;
  zip?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  startsAtFrom?: string;
  startsAtTo?: string;
  [key: string]: string | number | string[] | undefined | null;
}

/** Pagination meta as returned by the licenses list API */
export interface LicensesListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Raw license shape from backend (internal or external API). Permissive for field name variants. */
export interface ApiLicenseRaw {
  id?: number | string;
  appid?: string;
  key?: string;
  product?: string;
  dba?: string;
  zip?: string;
  startDay?: string;
  ActivateDate?: string;
  startsAt?: string;
  status?: string | number;
  cancelDate?: string;
  plan?: string;
  license_type?: string;
  term?: string;
  monthlyFee?: number;
  lastPayment?: number;
  lastActive?: string;
  smsPurchased?: number;
  smsSent?: number;
  smsBalance?: number;
  seatsTotal?: number;
  seatsUsed?: number;
  agents?: number;
  agentsName?: string[];
  agentsCost?: number;
  Note?: string;
  notes?: string;
  emailLicense?: string;
  pass?: string;
  Package?: Record<string, unknown>;
  package_data?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/** API response: list of licenses with pagination */
export interface LicensesListApiResponse {
  success: boolean;
  message: string;
  timestamp?: string;
  data: ApiLicenseRaw[];
  meta: LicensesListMeta;
}

/** API response: single license (data may be wrapped in .license or at .data) */
export interface LicenseSingleApiResponse {
  success?: boolean;
  message?: string;
  data?: { license?: ApiLicenseRaw } | ApiLicenseRaw;
}

/** API response: bulk update PATCH /licenses/bulk */
export interface BulkUpdateApiResponse {
  success?: boolean;
  message?: string;
  data?: {
    results?: ApiLicenseRaw[];
    updated?: number;
    failed?: number;
  };
}

/** API response: bulk create */
export interface BulkCreateApiResponse {
  success?: boolean;
  message?: string;
  data?: {
    created?: number;
    failed?: number;
    results?: ApiLicenseRaw[];
    licenses?: ApiLicenseRaw[];
  };
}

/** Payload sent to backend for create/update (external or internal) */
export interface ApiLicensePayload {
  appid?: string;
  id?: string;
  key?: string;
  dba?: string;
  zip?: string;
  status?: number | string;
  monthlyFee?: number;
  Note?: string;
  notes?: string;
  emailLicense?: string;
  pass?: string;
  [key: string]: unknown;
}

/** Internal API: getLicense / updateLicense response wrapper */
export interface InternalLicenseResponse {
  success: boolean;
  message: string;
  data: { license: ApiLicenseRaw };
}

/** Internal API: bulk update request body */
export interface InternalBulkUpdateRequest {
  identifiers: { appids?: string[]; emails?: string[]; countids?: number[] };
  updates: Record<string, unknown>;
}

/** Type guard: value is a non-null object */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Extract single API license from response (handles .data.license or .data) */
export function extractApiLicenseFromResponse(response: unknown): ApiLicenseRaw | null {
  if (!isObject(response)) return null;
  const data = response.data;
  if (!isObject(data)) return null;
  if (data.license !== undefined && data.license !== null) {
    return data.license as ApiLicenseRaw;
  }
  return data as ApiLicenseRaw;
}

/** Extract array of API licenses from list response .data */
export function extractApiLicensesFromListResponse(response: LicensesListApiResponse): ApiLicenseRaw[] {
  return Array.isArray(response.data) ? response.data : [];
}

/** Extract results array from bulk update response */
export function extractBulkUpdateResults(response: unknown): ApiLicenseRaw[] {
  if (!isObject(response)) return [];
  const data = response.data;
  if (!isObject(data)) return [];
  if (Array.isArray(data.results)) return data.results as ApiLicenseRaw[];
  if (Array.isArray(data)) return data as ApiLicenseRaw[];
  return [];
}

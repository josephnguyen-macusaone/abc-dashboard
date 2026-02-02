import type { LicenseRecord } from '@/types';
import type { LicenseApiRow } from './types';

/**
 * Transform backend license data to frontend LicenseRecord.
 * Handles both external (ActivateDate, monthlyFee, license_type, status as number)
 * and internal (startDay, lastPayment, plan, status as string) API shapes.
 */
export function transformApiLicenseToRecord(apiLicense: LicenseApiRow): LicenseRecord {
  // Status: internal sends string ('active'|'cancel'|'pending'|etc); external may send number (1/0) or string
  let status: LicenseRecord['status'] = 'pending';
  if (apiLicense.status !== undefined && apiLicense.status !== null) {
    const s = apiLicense.status;
    if (typeof s === 'string' && ['active', 'cancel', 'pending', 'expired', 'draft', 'expiring', 'revoked'].includes(s)) {
      status = s as LicenseRecord['status'];
    } else {
      const statusValue = typeof s === 'string' ? parseInt(s, 10) : s;
      switch (statusValue) {
        case 1:
          status = 'active';
          break;
        case 0:
          status = 'cancel';
          break;
        default:
          status = 'pending';
      }
    }
  }

  // Convert date formats from MM/DD/YYYY to YYYY-MM-DD
  const convertDate = (dateStr: string | null): string => {
    if (!dateStr) return '';
    // Handle MM/DD/YYYY format
    if (dateStr.includes('/')) {
      const [month, day, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
  };

  // Convert datetime formats from MM/DD/YYYY HH:MM to YYYY-MM-DDTHH:MM
  const convertDateTime = (dateTimeStr: string | null): string => {
    if (!dateTimeStr) return '';
    // Handle "MM/DD/YYYY HH:MM" format
    if (dateTimeStr.includes('/')) {
      const [datePart, timePart] = dateTimeStr.split(' ');
      const [month, day, year] = datePart.split('/');
      const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      return `${dateStr}T${timePart}:00`;
    }
    return dateTimeStr;
  };

  // startsAt: internal uses startDay; external uses ActivateDate
  const startsAtRaw = String(apiLicense.startDay ?? apiLicense.ActivateDate ?? apiLicense.startsAt ?? '');
  const startsAt = startsAtRaw.includes('/') ? convertDate(startsAtRaw) : (startsAtRaw || '');

  // plan: internal has plan; external has license_type
  const plan = String(apiLicense.plan ?? apiLicense.license_type ?? 'Basic');

  const lastActiveVal = apiLicense.lastActive != null ? String(apiLicense.lastActive) : '';
  const lastActive = lastActiveVal.includes('/') ? convertDateTime(lastActiveVal) : lastActiveVal;

  return {
    id: (apiLicense.appid ?? apiLicense.id ?? `temp-${Date.now()}`) as LicenseRecord['id'],
    key: String(apiLicense.appid ?? apiLicense.key ?? ''),
    product: String(apiLicense.product ?? 'ABC Business Suite'),
    dba: String(apiLicense.dba ?? ''),
    zip: String(apiLicense.zip ?? ''),
    startsAt,
    status,
    plan,
    term: (apiLicense.term ?? 'monthly') as LicenseRecord['term'],
    cancelDate: String(apiLicense.cancelDate ?? ''),
    lastPayment: Number(apiLicense.monthlyFee ?? apiLicense.lastPayment ?? 0),
    lastActive,
    smsPurchased: Number(apiLicense.smsPurchased ?? 0),
    smsSent: Number(apiLicense.smsSent ?? 0),
    smsBalance: Number(apiLicense.smsBalance ?? 0),
    seatsTotal: Number(apiLicense.seatsTotal ?? 1),
    seatsUsed: Number(apiLicense.seatsUsed ?? 0),
    agents: Number(apiLicense.agents ?? 0),
    agentsName: Array.isArray(apiLicense.agentsName) ? apiLicense.agentsName : [],
    agentsCost: Number(apiLicense.agentsCost ?? 0),
    notes: String(apiLicense.Note ?? apiLicense.notes ?? ''),
  };
}

/** Payload shape for external license API (create/update). */
export interface ExternalLicensePayload {
  appid?: string;
  id?: string;
  dba?: string;
  zip?: string;
  status?: number;
  monthlyFee?: number;
  Note?: string;
  emailLicense?: string;
  pass?: string;
  [key: string]: unknown;
}

/**
 * Transform frontend LicenseRecord to external backend API format.
 * Filters out undefined, null, and empty values to ensure clean API payloads.
 */
export function transformRecordToApiLicense(license: Partial<LicenseRecord>): ExternalLicensePayload {
  const apiLicense: ExternalLicensePayload = {};

  const shouldInclude = (value: unknown): boolean => {
    return value !== undefined && value !== null && value !== '';
  };

  if (shouldInclude(license.key) || shouldInclude(license.id)) {
    apiLicense.appid = license.key != null ? String(license.key) : (license.id != null ? String(license.id) : undefined);
  }

  if (shouldInclude(license.id)) {
    apiLicense.appid = String(license.id);
  }

  // Map frontend fields to external API fields
  if (shouldInclude(license.dba)) {
    apiLicense.dba = license.dba;
  }

  if (shouldInclude(license.zip)) {
    apiLicense.zip = license.zip;
  }

  if (shouldInclude(license.id)) {
    apiLicense.appid = String(license.id);
  }

  // For external API, we need Email_license and pass as required fields
  // Generate dummy values if not provided (this is for compatibility)
  apiLicense.emailLicense = `license-${apiLicense.appid || Date.now()}@example.com`;
  apiLicense.pass = `pass-${apiLicense.appid || Date.now()}`;

  if (shouldInclude(license.status)) {
    // Convert string status to integer for external API
    switch (license.status) {
      case 'active':
        apiLicense.status = 1;
        break;
      case 'cancel': // Changed from 'inactive' to 'cancel' (valid LicenseStatus)
        apiLicense.status = 0;
        break;
      default:
        apiLicense.status = 1; // Default to active
    }
  }

  if (license.lastPayment !== undefined && license.lastPayment !== null) {
    apiLicense.monthlyFee = license.lastPayment; // External API uses monthlyFee
  }

  if (shouldInclude(license.notes)) {
    apiLicense.Note = license.notes; // External API uses Note
  }

  return apiLicense;
}

/**
 * License Management Types
 */

// Status: active or cancel only
export type LicenseStatus = 'active' | 'cancel';

// Term Enum
export type LicenseTerm = 'monthly' | 'yearly';

// License Record Interface
export interface LicenseRecord {
  id: number | string; // Backend uses string UUIDs, frontend may use temp numbers for new rows
  key?: string; // License key for identification (returned by backend)
  product?: string; // Product name (returned by backend)
  dba: string; // Database/Account identifier
  zip: string;
  startsAt: string; // ISO date string
  status: LicenseStatus;
  cancelDate?: string; // Required when status is 'cancel'
  plan: string;
  term: LicenseTerm;
  seatsTotal?: number; // Total number of seats
  seatsUsed?: number; // Number of seats used
  lastPayment: number;
  lastActive: string;
  smsPurchased: number;
  smsSent: number;
  smsBalance: number;
  agents: number;
  agentsName: string;
  agentsCost: number;
  notes: string;
}


/**
 * License Management Types
 */

// Status Enum - Updated to include all 7 status values from backend
export type LicenseStatus = 
  | 'draft'
  | 'active'
  | 'expiring'
  | 'expired'
  | 'revoked'
  | 'cancel'
  | 'pending';

// Term Enum
export type LicenseTerm = 'monthly' | 'yearly';

// License Record Interface
export interface LicenseRecord {
  id: number | string; // Backend uses string UUIDs, frontend may use temp numbers for new rows
  dba: string; // Database/Account identifier
  zip: string;
  startsAt: string; // ISO date string
  status: LicenseStatus;
  cancelDate?: string; // Required when status is 'cancel'
  plan: string;
  term: LicenseTerm;
  lastPayment: number;
  lastActive: string;
  smsPurchased: number;
  smsSent: number;
  smsBalance: number;
  agents: number;
  agentsName: string[];
  agentsCost: number;
  notes: string;
}


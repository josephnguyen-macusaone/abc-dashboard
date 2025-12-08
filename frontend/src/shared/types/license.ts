/**
 * License Management Types
 */

// Status Enum
export type LicenseStatus = 'active' | 'cancel' | 'pending' | 'expired';

// Term Enum
export type LicenseTerm = 'monthly' | 'yearly';

// License Record Interface
export interface LicenseRecord {
  id: number;
  dbA: string; // Database/Account identifier
  zip: string;
  startDay: string; // ISO date string
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


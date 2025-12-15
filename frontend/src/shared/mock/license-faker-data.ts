/**
 * License Helper Functions
 * Used for creating new empty license records in the DataGrid
 */

import type { LicenseRecord } from '@/shared/types';

/**
 * Generate a new empty license record for adding rows
 * This is used when users click "Add Row" in the license management grid
 */
export function createEmptyLicense(existingIds: number[]): LicenseRecord {
  const nextId = Math.max(...existingIds, 0) + 1;
  return {
    id: nextId,
    dba: '',
    zip: '',
    startsAt: new Date().toISOString().split('T')[0],
    status: 'pending',
    plan: 'Basic',
    term: 'monthly',
    lastPayment: 0,
    lastActive: new Date().toISOString().split('T')[0],
    smsPurchased: 0,
    smsSent: 0,
    smsBalance: 0,
    agents: 0,
    agentsName: [],
    agentsCost: 0,
    notes: '',
  };
}

